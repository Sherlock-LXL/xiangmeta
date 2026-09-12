import type {Exhibit} from './types';
import {connectMedia,disconnectMedia,MEDIA_VOLUME} from '../audio/media-mixer';

export function mountAlbumGallery(host:HTMLElement,module:Exhibit,onMediaChange:()=>void,initialAlbum?:string){
  if(!module.albums?.length)return;
  const albums=[...module.albums].sort((a,b)=>a.order-b.order);
  const section=document.createElement('div');section.className='album-gallery';
  const shelf=document.createElement('div');shelf.className='album-shelf';section.append(shelf);
  const detail=document.createElement('article');detail.className='album-detail';section.append(detail);host.prepend(section);
  const buttons:HTMLButtonElement[]=[];
  const show=(index:number)=>{
    const previous=detail.querySelector('audio');if(previous){previous.pause();disconnectMedia(previous);}detail.replaceChildren();buttons.forEach((b,i)=>{b.classList.toggle('active',i===index);b.setAttribute('aria-pressed',String(i===index));});
    const album=albums[index],header=document.createElement('h3');header.textContent=`${String(album.order).padStart(2,'0')} / ${album.title}`;
    const credit=document.createElement('p');credit.className='album-credit';credit.textContent=album.credit+' · 精选曲目';detail.append(header,credit);
    const tracklist=document.createElement('div');tracklist.className='album-tracks';
    const audio=document.createElement('audio');audio.controls=true;audio.preload='none';audio.volume=MEDIA_VOLUME;audio.setAttribute('aria-label',album.title+' 试听');
    const title=document.createElement('h4'),lyrics=document.createElement('pre');lyrics.className='album-lyrics';
    const tracks:HTMLButtonElement[]=[];
    const select=(n:number)=>{audio.pause();const t=album.tracks[n];audio.src=t.src;audio.load();connectMedia(audio);audio.setAttribute('aria-label',t.title+' 试听');title.textContent=t.title;lyrics.textContent=t.lyrics;tracks.forEach((b,i)=>{b.classList.toggle('active',i===n);b.setAttribute('aria-pressed',String(i===n));});onMediaChange();};
    album.tracks.forEach((t,n)=>{const b=document.createElement('button');b.className='quiet-button';b.textContent='♫ '+t.title;b.onclick=()=>select(n);tracks.push(b);tracklist.append(b);});
    detail.append(tracklist,audio,title,lyrics);select(0);
  };
  albums.forEach((a,i)=>{const button=document.createElement('button');button.className='album-cover';button.dataset.album=a.id;const img=document.createElement('img');img.src=a.cover;img.alt=a.title+' 专辑封面';img.loading='lazy';const title=document.createElement('span');title.textContent=`${String(a.order).padStart(2,'0')} · ${a.title}`;button.append(img,title);button.onclick=()=>show(i);buttons.push(button);shelf.append(button);});show(Math.max(0,albums.findIndex(a=>a.id===initialAlbum)));
}
