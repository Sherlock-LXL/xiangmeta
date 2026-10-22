import {Arcade,arcadeCatalog} from '../../shared/arcade.mjs';
import {readBest,saveBest} from '../../shared/seasonal-games.mjs';

const colors=['#ede4d2','#769b9c','#cdaf66','#b87a88','#83a787','#6b88a0','#bc8065','#a491b6'];
const symbols=['✿','❄','☀','☾','♧','♫','◇','✦'];
const mapping:Record<string,string>={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',Space:'space'};
export class ArcadeRoom{
  private game:Arcade;private canvas:HTMLCanvasElement;private ctx:CanvasRenderingContext2D;private status:HTMLElement;private result:HTMLElement;
  private paused=false;private recorded=false;private events=new AbortController();private held=new Set<string>();private repeat=0;private last=0;private frame=0;
  private pointers=new Map<number,string>();private dragPointer:number|null=null;
  private score=-1;private best:number|null;private drag:{x:number;y:number}|null=null;
  constructor(private host:HTMLElement,private id:string,private storage:Storage,back:()=>void){
    const spec=arcadeCatalog.find(g=>g.id===id)!;this.game=new Arcade(id);this.best=readBest(storage,'arcade.'+id);
    host.innerHTML=`<div class="game-dialog-head"><span class="game-eyebrow">WINTER / 雪夜游艺室</span><button data-back aria-label="返回小游戏列表">← 返回</button></div><h2>${spec.name}</h2><p class="game-description">${spec.hint}</p><div class="arcade-layout"><div class="arcade-stage"><canvas width="480" height="480" tabindex="0" aria-label="${spec.name}游戏画面"></canvas><div class="arcade-result" role="status" hidden></div></div><div class="arcade-side"><div class="arcade-score" aria-live="off"></div><p>${spec.detail}</p><div class="arcade-actions"><button data-pause>暂停</button><button data-restart>重新开始</button></div><div class="arcade-pad" aria-label="游戏触屏操作"><button data-key="up" aria-label="向上或旋转">↑</button><button data-key="left" aria-label="向左">←</button><button data-key="down" aria-label="向下">↓</button><button data-key="right" aria-label="向右">→</button><button data-key="space">${id==='bricks'?'发球':'落到底部'}</button></div><div class="arcade-cards" aria-label="翻牌选择"></div><small>最佳成绩保存在此浏览器。<br>P 暂停 / 继续 · Esc 返回列表</small></div></div>`;
    this.canvas=host.querySelector('canvas')!;this.ctx=this.canvas.getContext('2d')!;this.status=host.querySelector('.arcade-score')!;this.result=host.querySelector('.arcade-result')!;
    const opts={signal:this.events.signal};
    host.querySelector('[data-back]')!.addEventListener('click',back,opts);
    host.querySelector('[data-pause]')!.addEventListener('click',()=>this.pause(!this.paused),opts);
    host.querySelector('[data-restart]')!.addEventListener('click',()=>{this.store();this.game=new Arcade(id);this.recorded=false;this.result.hidden=true;this.score=-1;this.pause(false);},opts);
    const pad=host.querySelector<HTMLElement>('.arcade-pad')!;pad.hidden=id==='pairs';
    if(id!=='blocks'&&id!=='bricks')pad.querySelector<HTMLElement>('[data-key="space"]')!.hidden=true;
    if(id==='bricks')for(const key of ['up','down'])pad.querySelector<HTMLElement>(`[data-key="${key}"]`)!.hidden=true;
    host.querySelectorAll<HTMLButtonElement>('[data-key]').forEach(button=>{
      button.addEventListener('pointerdown',e=>{e.preventDefault();if(this.paused||e.button!==0)return;button.setPointerCapture(e.pointerId);const key=button.dataset.key!;this.press(key);this.pointers.set(e.pointerId,key);this.repeat=.20;},opts);
      button.addEventListener('click',e=>{if(e.detail===0)this.press(button.dataset.key!);},opts);
      const release=(e:PointerEvent)=>this.pointers.delete(e.pointerId);button.addEventListener('pointerup',release,opts);button.addEventListener('pointercancel',release,opts);button.addEventListener('lostpointercapture',release,opts);
    });
    const cards=host.querySelector<HTMLElement>('.arcade-cards')!;cards.hidden=id!=='pairs';
    if(id==='pairs'){cards.innerHTML=Array.from({length:16},(_,i)=>`<button data-card="${i}" aria-label="翻开第 ${i+1} 张卡片">${i+1}</button>`).join('');cards.addEventListener('click',e=>{const b=(e.target as HTMLElement).closest<HTMLButtonElement>('[data-card]');if(b&&!this.paused)this.game.flip(Number(b.dataset.card));},opts);}
    this.canvas.addEventListener('pointerdown',e=>{if(this.paused||e.button!==0||this.dragPointer!==null)return;this.canvas.focus();this.canvas.setPointerCapture(e.pointerId);const p=this.point(e);this.drag=p;this.dragPointer=e.pointerId;if(id==='bricks'){this.game.paddle=Math.max(.1,Math.min(.9,p.x));this.press('space');}if(id==='pairs')this.game.flip(Math.floor(p.y*4)*4+Math.floor(p.x*4));},opts);
    this.canvas.addEventListener('pointermove',e=>{if(e.pointerId===this.dragPointer&&this.drag&&id==='bricks'&&!this.paused)this.game.paddle=Math.max(.1,Math.min(.9,this.point(e).x));},opts);
    this.canvas.addEventListener('pointerup',e=>{if(e.pointerId!==this.dragPointer)return;if(this.drag&&id==='merge'){const p=this.point(e),dx=p.x-this.drag.x,dy=p.y-this.drag.y;if(Math.hypot(dx,dy)>.06)this.press(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up');}this.drag=null;this.dragPointer=null;},opts);
    const cancelDrag=(e:PointerEvent)=>{if(e.pointerId===this.dragPointer){this.drag=null;this.dragPointer=null;}};
    this.canvas.addEventListener('pointercancel',cancelDrag,opts);this.canvas.addEventListener('lostpointercapture',cancelDrag,opts);
    window.addEventListener('keydown',e=>{
      if(e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();back();return;}
      if(e.code==='KeyP'&&!e.repeat){e.preventDefault();this.pause(!this.paused);return;}
      if(e.code==='Space'&&e.target instanceof HTMLButtonElement)return;
      const key=mapping[e.code];if(!key)return;e.preventDefault();if(!e.repeat){this.press(key);this.held.add(key);this.repeat=.20;}
    },{...opts,capture:true});
    window.addEventListener('keyup',e=>this.held.delete(mapping[e.code]),opts);
    window.addEventListener('blur',()=>this.pause(true),opts);document.addEventListener('visibilitychange',()=>{if(document.hidden)this.pause(true);},opts);
    this.canvas.focus();this.frame=requestAnimationFrame(this.animate);
  }
  private point(e:PointerEvent){const b=this.canvas.getBoundingClientRect();return {x:Math.min(.999,Math.max(0,(e.clientX-b.left)/b.width)),y:Math.min(.999,Math.max(0,(e.clientY-b.top)/b.height))};}
  private press(key:string){if(!this.paused)this.game.action(key);}
  private pause(value:boolean){this.paused=value;this.held.clear();this.pointers.clear();this.game.axis=0;this.drag=null;this.dragPointer=null;this.host.querySelector('[data-pause]')!.textContent=value?'继续':'暂停';}
  private store(){if(this.recorded)return;const r=saveBest(this.storage,'arcade.'+this.id,this.game.score);this.best=r.best;this.recorded=this.game.over;return r;}
  private animate=(time:number)=>{
    this.frame=requestAnimationFrame(this.animate);const dt=this.last?Math.min(.1,(time-this.last)/1000):0;this.last=time;
    if(!this.paused){
      const held=new Set([...this.held,...this.pointers.values()]);
      this.repeat-=dt;
      if(this.repeat<=0){this.repeat=.09;if(this.id==='blocks')for(const key of held)if(['left','right','down'].includes(key))this.press(key);}
      this.game.axis=Number(held.has('right'))-Number(held.has('left'));this.game.update(dt);
    }
    if(this.game.over&&!this.recorded){const r=this.store();this.result.hidden=false;this.result.innerHTML=`<b>${this.game.won?'✦ 完成啦':'本局结束'}</b><span>${this.game.score} 分${r?.record?' · 新纪录':''}</span><small>${r?.saved?'成绩已保存':'暂时无法保存成绩'}</small>`;}
    if(this.game.score!==this.score||this.game.kind==='pairs'||this.game.kind==='bricks'){
      this.score=this.game.score;this.status.innerHTML=`<small>本局得分</small><strong>${this.score}</strong><span>最佳 ${this.best??'—'}</span><small>${this.id==='blocks'?`消除 ${this.game.lines} 行`:this.id==='bricks'?`剩余 ${this.game.lives} 次机会`:this.id==='pairs'?`${this.game.moves} 次翻牌 · ${Math.floor(this.game.time)} 秒`:''}</small>`;
    }
    this.draw();
  };
  private draw(){
    const c=this.ctx,g=this.game,w=480;c.fillStyle='#f3eddf';c.fillRect(0,0,w,w);
    const cell=(x:number,y:number,s:number,color:string,label='')=>{c.fillStyle=color;c.beginPath();c.roundRect(x+2,y+2,s-4,s-4,Math.min(8,s*.15));c.fill();if(label){c.fillStyle='#332e29';c.textAlign='center';c.textBaseline='middle';c.font=`600 ${s*.32}px "Georgia","Songti SC",serif`;c.fillText(label,x+s/2,y+s/2);}};
    if(this.id==='blocks'){
      c.fillStyle='#e0d8c9';c.fillRect(96,0,240,480);
      g.board.forEach((r,y)=>r.forEach((v,x)=>cell(96+x*24,y*24,24,colors[v])));
      let ghost=g.py;while(g.fits(g.shape,g.px,ghost+1))ghost++;
      c.globalAlpha=.23;g.shape.forEach((r,y)=>r.forEach((v,x)=>{if(v)cell(96+(g.px+x)*24,(ghost+y)*24,24,colors[v]);}));c.globalAlpha=1;
      g.shape.forEach((r,y)=>r.forEach((v,x)=>{if(v)cell(96+(g.px+x)*24,(g.py+y)*24,24,colors[v]);}));
      c.fillStyle='#6a6255';c.font='14px sans-serif';c.textAlign='left';c.fillText('下一块',354,30);g.next.forEach((r,y)=>r.forEach((v,x)=>{if(v)cell(350+x*23,48+y*23,23,colors[v]);}));
    }else if(this.id==='snake'){
      for(let i=0;i<256;i++)cell(i%16*30,Math.floor(i/16)*30,30,'#e8e1d0');
      g.snake.forEach((p,i)=>cell(p.x*30,p.y*30,30,i?'#83a787':'#426f61'));cell(g.food.x*30,g.food.y*30,30,'#bb7367','✿');
      const h=g.snake[0];c.fillStyle='#fff8e7';c.beginPath();c.arc(h.x*30+12,h.y*30+12,3,0,Math.PI*2);c.arc(h.x*30+22,h.y*30+12,3,0,Math.PI*2);c.fill();
    }else if(this.id==='merge')g.board.forEach((r,y)=>r.forEach((v,x)=>cell(x*120,y*120,120,v?colors[1+(Math.log2(v)-1)%7]:'#e6ddcc',v?String(v):'')));
    else if(this.id==='pairs'){
      g.cards.forEach((v,i)=>{const shown=g.open.includes(i)||g.matched.includes(i);cell(i%4*120,Math.floor(i/4)*120,120,g.matched.includes(i)?'#9fba9e':shown?'#e0be86':'#c5d4ce',shown?symbols[v]:'✧');});
      this.host.querySelectorAll<HTMLButtonElement>('[data-card]').forEach((b,i)=>{const shown=g.open.includes(i)||g.matched.includes(i);b.textContent=shown?symbols[g.cards[i]]:String(i+1);b.disabled=g.matched.includes(i);b.setAttribute('aria-label',`${i+1} 号卡片${shown?' '+symbols[g.cards[i]]:''}`);});
    }else{
      for(let i=0;i<40;i++)if(g.bricks[i]){c.fillStyle=colors[1+Math.floor(i/8)];c.beginPath();c.roundRect(((i%8)*.116+.037)*480,(Math.floor(i/8)*.048+.10)*480,.11*480,.036*480,3);c.fill();}
      c.fillStyle='#467c76';c.beginPath();c.roundRect((g.paddle-.1)*480,.88*480,.2*480,12,6);c.fill();
      c.fillStyle='#ba785a';c.beginPath();c.arc(g.ball.x*480,g.ball.y*480,7,0,Math.PI*2);c.fill();
      if(g.serving){c.fillStyle='#6a6255';c.textAlign='center';c.font='18px sans-serif';c.fillText('空格 / 点击画面发球',240,300);}
    }
    if(this.paused){c.fillStyle='#f3eddfdf';c.fillRect(0,0,w,w);c.fillStyle='#514c42';c.textAlign='center';c.font='28px serif';c.fillText('暂停 · 喝一口热茶',240,240);}
  }
  get snapshot(){return {id:this.id,score:this.game.score,over:this.game.over,paused:this.paused,won:this.game.won,lines:this.game.lines,moves:this.game.moves,time:this.game.time,piece:{x:this.game.px,y:this.game.py},paddle:this.game.paddle};}
  dispose(){this.store();cancelAnimationFrame(this.frame);this.events.abort();}
}
