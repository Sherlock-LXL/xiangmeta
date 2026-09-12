import type { EventBus } from '../core/events';
import type {Catalog} from '../core/types';
import {MusicProgramme} from '../../shared/music-programme.mjs';
import {connectMedia,disconnectMedia} from './media-mixer';
type Channel='ambient'|'music'|'ui'|'interaction';
interface Track {id:string;title:string;src:string}
interface Manifest {volume:Record<Channel,number>;tracks:Record<Channel,string|null>;regions:Record<string,string>;playlist?:Track[];seasonal?:Record<string,Track>}
export class AudioSystem {
  private context?:AudioContext;private manifest?:Manifest;private muted=true;
  private players=new Map<Channel,HTMLAudioElement>();private region='';
  private voices=new Set<OscillatorNode>();
  private regionalAudio=new Map<string,string>();private nearbyAudio?:string;private fades=new Map<HTMLAudioElement,number>();
  private programme?:MusicProgramme;private loading?:Promise<void>;private exhibition=false;private disposed=false;private unsubscribers:(()=>void)[]=[];
  constructor(bus:EventBus,catalog?:Catalog,private status:(text:string)=>void=()=>{}){this.region=catalog?.regions[0]?.id??'';for(const m of catalog?.modules??[])if(m.world?.audio&&!this.regionalAudio.has(m.region))this.regionalAudio.set(m.region,m.world.audio);this.unsubscribers.push(bus.on('sound',kind=>this.play(kind)),bus.on('melody',notes=>this.melody(notes)),bus.on('region',id=>{this.region=id;this.nearbyAudio=undefined;this.background();}),bus.on('nearby',m=>{this.nearbyAudio=m?.world?.audio;this.background();}));}
  private publish(){const current=this.programme?.current;this.status(this.muted?'音乐已静音 · 点击右上角 ♪ 开启':this.exhibition?'正在试听个人作品':current?`${current.kind==='seasonal'?'四季首演':'伴奏电台'} · ${current.track.title}`:'音乐暂时不可用');}
  setExhibition(active:boolean){this.exhibition=active;if(active){this.stopFades();this.players.forEach(p=>p.pause());}else this.background();this.publish();}
  private fade(player:HTMLAudioElement,volume:number,stop=false){
    const existing=this.fades.get(player);if(existing)clearInterval(existing);const start=performance.now(),initial=player.volume;
    const timer=window.setInterval(()=>{const t=Math.min(1,(performance.now()-start)/1200);player.volume=initial+(volume-initial)*(t*t*(3-2*t));if(t===1){clearInterval(timer);this.fades.delete(player);if(stop){player.pause();disconnectMedia(player);}}},40);this.fades.set(player,timer);
  }
  private stopFades(){this.fades.forEach((timer,player)=>{clearInterval(timer);player.pause();disconnectMedia(player);});this.fades.clear();}
  private melody(notes:number[]){
    if(this.muted||!this.context)return;
    const ctx=this.context;
    notes.slice(0,8).forEach((frequency,i)=>{
      const oscillator=ctx.createOscillator(),gain=ctx.createGain(),start=ctx.currentTime+i*.18;
      oscillator.type='sine';oscillator.frequency.value=frequency;
      gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime((this.manifest?.volume.interaction??.1)*.55,start+.015);gain.gain.exponentialRampToValueAtTime(.0001,start+1.3);
      oscillator.connect(gain);gain.connect(ctx.destination);this.voices.add(oscillator);oscillator.start(start);oscillator.stop(start+1.35);
      oscillator.onended=()=>{this.voices.delete(oscillator);oscillator.disconnect();gain.disconnect();};
    });
  }
  async setMuted(muted:boolean){
    this.muted=muted;this.publish();if(muted){this.stopFades();this.players.forEach(p=>p.pause());this.voices.forEach(v=>v.stop());this.voices.clear();await this.context?.suspend();return;}
    this.context??=new AudioContext();void this.context.resume().catch(()=>{});
    if(!this.manifest){this.loading??=(async()=>{const response=await fetch('/assets/audio/manifest.json',{cache:'no-cache'});if(!response.ok)throw new Error('音频清单不可用');this.manifest=await response.json();let heard:string[]=[];try{const saved=JSON.parse(sessionStorage.getItem('xiangmeta:seasonal-journey:v2')??'[]');if(Array.isArray(saved))heard=saved.filter((id:unknown)=>typeof id==='string');}catch{}this.programme=new MusicProgramme(this.manifest,heard);})();try{await this.loading;}catch(error){this.loading=undefined;throw error;}}
    this.background();this.play('ui');
  }
  private background(){
    if(this.muted||!this.manifest||this.exhibition||this.disposed)return;
    // An ended event can be queued behind a proximity/region event. Retire its
    // selection before choosing, otherwise the same finished track is recreated.
    const finished=this.players.get('music');if(finished?.ended){if(this.programme?.current)this.programme.end(this.programme.current);this.players.delete('music');}
    for(const channel of ['ambient'] as const){
      const src=this.nearbyAudio??this.regionalAudio.get(this.region)??this.manifest.tracks.ambient;
      const old=this.players.get(channel);
      if(!src){if(old)this.fade(old,0,true);this.players.delete(channel);continue;}
      if(old?.getAttribute('src')===src){connectMedia(old);void old.play().catch(()=>{});this.fade(old,this.manifest.volume[channel]);continue;}
      if(old)this.fade(old,0,true);const player=new Audio(src);player.loop=true;player.volume=0;connectMedia(player);this.players.set(channel,player);void player.play().then(()=>{if(!this.muted&&this.players.get(channel)===player)this.fade(player,this.manifest!.volume[channel]);else player.pause();}).catch(()=>{});
    }
    const selection=this.programme?.choose(this.region);if(!selection){this.publish();return;}
    const old=this.players.get('music');if(old&&old.getAttribute('src')===selection.track.src&&!old.ended){connectMedia(old);void old.play().catch(()=>{});this.fade(old,this.manifest.volume.music);this.publish();return;}
    if(old)this.fade(old,0,true);
    const player=new Audio(selection.track.src);player.preload='metadata';player.loop=selection.kind==='legacy';player.volume=0;connectMedia(player);this.players.set('music',player);
    const current=()=>this.players.get('music')===player&&!this.muted&&!this.exhibition&&!this.disposed;
    player.addEventListener('playing',()=>{if(!current()){player.pause();return;}this.programme!.started(selection);try{sessionStorage.setItem('xiangmeta:seasonal-journey:v2',JSON.stringify([...this.programme!.heard]));localStorage.setItem('xiangmeta:seasonal-music:v1',JSON.stringify([...this.programme!.heard]));}catch{}this.fade(player,this.manifest!.volume.music);this.publish();});
    player.addEventListener('ended',()=>{disconnectMedia(player);if(this.players.get('music')!==player)return;this.programme!.end(selection);this.players.delete('music');this.background();});
    const failed=()=>{if(this.players.get('music')!==player)return;player.pause();this.programme!.fail(selection);this.players.delete('music');this.background();};
    player.addEventListener('error',failed,{once:true});
    void player.play().catch(error=>{if(error.name==='NotAllowedError'){this.status('音乐已开启 · 点击世界后开始播放');return;}if(error.name!=='AbortError')failed();});this.publish();
  }
  private play(channel:'ui'|'interaction'){
    if(this.muted||!this.context)return;
    const source=this.manifest?.tracks[channel];if(source){const audio=new Audio(source);audio.volume=this.manifest!.volume[channel];connectMedia(audio);audio.addEventListener('ended',()=>disconnectMedia(audio),{once:true});void audio.play().catch(()=>{});return;}
    const oscillator=this.context.createOscillator(),gain=this.context.createGain();oscillator.type='sine';oscillator.frequency.value=channel==='ui'?540:720;
    gain.gain.setValueAtTime(.0001,this.context.currentTime);gain.gain.linearRampToValueAtTime(this.manifest?.volume[channel]??.02,this.context.currentTime+.018);gain.gain.exponentialRampToValueAtTime(.0001,this.context.currentTime+.16);
    oscillator.connect(gain);gain.connect(this.context.destination);oscillator.start();oscillator.stop(this.context.currentTime+0.18);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
  }
  dispose(){this.disposed=true;this.muted=true;this.unsubscribers.forEach(f=>f());this.stopFades();this.players.forEach(p=>{p.pause();p.removeAttribute('src');p.load();});this.voices.forEach(v=>v.stop());this.voices.clear();void this.context?.close();}
}
