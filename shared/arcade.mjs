import {clamp} from './seasonal-games.mjs';
export const arcadeCatalog=[
  {id:'blocks',name:'雪花方块',symbol:'▦',hint:'← → 移动 · ↑ 旋转 · ↓ 加速 · 空格落底',detail:'让一行落满，雪花便会消融。'},
  {id:'snake',name:'春芽贪吃蛇',symbol:'⌁',hint:'方向键转弯，避开边缘和自己',detail:'拾起春芽，一点点长大。'},
  {id:'bricks',name:'潮汐打砖块',symbol:'▤',hint:'← → / 拖动移动挡板 · 空格发球',detail:'用一颗小光球，敲开整面彩窗。'},
  {id:'merge',name:'秋色 2048',symbol:'◇',hint:'方向键 / 滑动合并相同数字',detail:'从 2 开始，让秋色层层相叠。'},
  {id:'pairs',name:'四季翻翻乐',symbol:'✿',hint:'点开两张卡片，找到相同的季节印记',detail:'记住一枚图案，也记住它的位置。'},
];
const shapes=[[[1,1,1,1]],[[2,2],[2,2]],[[0,3,0],[3,3,3]],[[0,4,4],[4,4,0]],[[5,5,0],[0,5,5]],[[6,0,0],[6,6,6]],[[0,0,7],[7,7,7]]];
const shuffle=(a,r)=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
export function mergeLine(line){
  const cells=line.filter(Boolean),out=[];let score=0;
  for(let i=0;i<cells.length;i++){if(cells[i]===cells[i+1]){out.push(cells[i]*2);score+=cells[i]*2;i++;}else out.push(cells[i]);}
  return {line:[...out,...Array(line.length-out.length).fill(0)],score};
}
/** Renderer-independent small games. Each instance owns its clock and random source. */
export class Arcade{
  constructor(kind,random=Math.random){
    this.kind=kind;this.random=random;this.score=0;this.over=false;this.won=false;this.time=0;this.tick=0;
    /** @type {number[][]} */ this.board=[];
    /** @type {number[]} */ this.bag=[];
    /** @type {number[][]} */ this.shape=[];
    /** @type {number[][]} */ this.next=[];
    this.px=3;this.py=0;this.lines=0;
    this.snake=[{x:7,y:8},{x:6,y:8},{x:5,y:8}];this.dir={x:1,y:0};this.queued={x:1,y:0};this.food={x:11,y:8};
    /** @type {{x:number;y:number}[]} */ this.turns=[];
    this.paddle=.5;this.ball={x:.5,y:.83,vx:.3,vy:-.52};this.serving=true;this.lives=3;this.bricks=Array(40).fill(1);this.axis=0;
    /** @type {number[]} */ this.cards=shuffle([...Array(8).keys(),...Array(8).keys()],random);
    /** @type {number[]} */ this.open=[];
    /** @type {number[]} */ this.matched=[];
    this.reveal=0;this.moves=0;
    if(kind==='blocks'){this.board=Array.from({length:20},()=>Array(10).fill(0));this.next=this.drawPiece();this.spawn();}
    if(kind==='merge'){this.board=Array.from({length:4},()=>Array(4).fill(0));this.addTile();this.addTile();}
  }
  drawPiece(){if(!this.bag.length)this.bag=shuffle([...Array(7).keys()],this.random);return shapes[this.bag.pop()].map(r=>r.slice());}
  fits(shape=this.shape,x=this.px,y=this.py){return shape.every((row,j)=>row.every((v,i)=>!v||x+i>=0&&x+i<10&&y+j<20&&(y+j<0||!this.board[y+j][x+i])));}
  spawn(){this.shape=this.next;this.next=this.drawPiece();this.px=Math.floor((10-this.shape[0].length)/2);this.py=0;if(!this.fits())this.over=true;}
  lock(){
    this.shape.forEach((row,j)=>row.forEach((v,i)=>{if(v&&this.py+j>=0)this.board[this.py+j][this.px+i]=v;}));
    const rows=this.board.filter(row=>row.some(v=>!v)),count=20-rows.length;this.lines+=count;this.score+=[0,100,300,500,800][count]*(1+Math.floor(this.lines/10));
    this.board=[...Array.from({length:count},()=>Array(10).fill(0)),...rows];this.spawn();
  }
  drop(){if(this.fits(this.shape,this.px,this.py+1)){this.py++;return true;}this.lock();this.tick=0;return false;}
  addTile(){
    const empty=[];this.board.forEach((r,y)=>r.forEach((v,x)=>{if(!v)empty.push({x,y});}));
    if(empty.length){const p=empty[Math.floor(this.random()*empty.length)];this.board[p.y][p.x]=this.random()<.9?2:4;}
  }
  action(key){
    if(this.over)return;
    if(this.kind==='blocks'){
      if(key==='left'&&this.fits(this.shape,this.px-1))this.px--;
      if(key==='right'&&this.fits(this.shape,this.px+1))this.px++;
      if(key==='up'){const rotated=this.shape[0].map((_,i)=>this.shape.map(r=>r[i]).reverse());for(const shift of [0,-1,1,-2,2])if(this.fits(rotated,this.px+shift)){this.shape=rotated;this.px+=shift;break;}}
      if(key==='down'&&this.drop())this.score++;
      if(key==='space'){while(this.fits(this.shape,this.px,this.py+1)){this.py++;this.score+=2;}this.lock();this.tick=0;}
    }else if(this.kind==='snake'){
      const d={left:{x:-1,y:0},right:{x:1,y:0},up:{x:0,y:-1},down:{x:0,y:1}}[key];
      const previous=this.turns.at(-1)??this.dir;
      if(d&&this.turns.length<2&&(d.x!==-previous.x||d.y!==-previous.y)&&(d.x!==previous.x||d.y!==previous.y)){this.turns.push(d);this.queued=d;}
    }else if(this.kind==='merge'&&['left','right','up','down'].includes(key)){
      const old=JSON.stringify(this.board),vertical=key==='up'||key==='down',reverse=key==='right'||key==='down';
      for(let i=0;i<4;i++){
        let line=Array.from({length:4},(_,j)=>vertical?this.board[j][i]:this.board[i][j]);if(reverse)line.reverse();
        const result=mergeLine(line);if(reverse)result.line.reverse();this.score+=result.score;
        for(let j=0;j<4;j++)if(vertical)this.board[j][i]=result.line[j];else this.board[i][j]=result.line[j];
      }
      if(JSON.stringify(this.board)!==old){this.moves++;this.addTile();}
      if(this.board.flat().includes(2048)){this.won=true;this.over=true;}
      else if(this.board.every((r,y)=>r.every((v,x)=>v&&v!==r[x+1]&&v!==this.board[y+1]?.[x])))this.over=true;
    }else if(this.kind==='bricks'){
      if(key==='space')this.serving=false;
      if(key==='left')this.paddle=clamp(this.paddle-.045,.1,.9);
      if(key==='right')this.paddle=clamp(this.paddle+.045,.1,.9);
    }
  }
  flip(i){
    if(this.kind!=='pairs'||this.over||this.reveal||i<0||i>=16||this.open.includes(i)||this.matched.includes(i))return;
    this.open.push(i);
    if(this.open.length===2){
      this.moves++;
      if(this.cards[this.open[0]]===this.cards[this.open[1]]){this.matched.push(...this.open);this.open=[];this.score+=100;if(this.matched.length===16){this.score+=Math.max(0,1200-this.moves*30-Math.floor(this.time)*3);this.won=this.over=true;}}
      else this.reveal=.8;
    }
  }
  update(dt){
    if(this.over)return;dt=clamp(dt,0,.1);this.time+=dt;this.tick+=dt;
    if(this.kind==='blocks'&&this.tick>=Math.max(.12,.75-Math.floor(this.lines/10)*.065)){this.tick=0;this.drop();}
    if(this.kind==='snake'&&this.tick>=Math.max(.065,.17-this.score*.00012)){
      this.tick=0;this.dir=this.turns.shift()??this.dir;const head={x:this.snake[0].x+this.dir.x,y:this.snake[0].y+this.dir.y},eat=head.x===this.food.x&&head.y===this.food.y;
      const body=eat?this.snake:this.snake.slice(0,-1);
      if(head.x<0||head.x>=16||head.y<0||head.y>=16||body.some(p=>p.x===head.x&&p.y===head.y)){this.over=true;return;}
      this.snake.unshift(head);if(!eat)this.snake.pop();
      else{this.score+=10;const empty=[];for(let y=0;y<16;y++)for(let x=0;x<16;x++)if(!this.snake.some(p=>p.x===x&&p.y===y))empty.push({x,y});if(!empty.length)this.won=this.over=true;else this.food=empty[Math.floor(this.random()*empty.length)];}
    }
    if(this.kind==='pairs'&&this.reveal){this.reveal=Math.max(0,this.reveal-dt);if(!this.reveal)this.open=[];}
    if(this.kind==='bricks'){
      this.paddle=clamp(this.paddle+this.axis*dt*.9,.1,.9);
      if(this.serving){this.ball.x=this.paddle;this.ball.y=.84;return;}
      const n=Math.ceil(dt*240),h=dt/n,b=this.ball;
      for(let step=0;step<n;step++){
        const oldX=b.x,oldY=b.y;b.x+=b.vx*h;b.y+=b.vy*h;
        if(b.x<.015){b.x=.015;b.vx=Math.abs(b.vx);}if(b.x>.985){b.x=.985;b.vx=-Math.abs(b.vx);}if(b.y<.02){b.y=.02;b.vy=Math.abs(b.vy);}
        if(b.vy>0&&oldY<.865&&b.y>=.865&&Math.abs(b.x-this.paddle)<.115){const offset=(b.x-this.paddle)/.115;b.vx=offset*.55;b.vy=-Math.sqrt(.65**2-b.vx**2);b.y=.864;}
        for(let i=0;i<40;i++)if(this.bricks[i]){
          const x=(i%8)*.116+.037,y=Math.floor(i/8)*.048+.10;
          if(b.x>x-.015&&b.x<x+.11+.015&&b.y>y-.015&&b.y<y+.036+.015){
            this.bricks[i]=0;this.score+=25;if(oldX<=x-.015||oldX>=x+.125)b.vx*=-1;else b.vy*=-1;break;
          }
        }
        if(!this.bricks.some(Boolean)){this.won=this.over=true;this.score+=this.lives*100;break;}
        if(b.y>1.03){this.lives--;if(!this.lives)this.over=true;else{this.serving=true;this.ball={x:this.paddle,y:.84,vx:.3,vy:-.52};}break;}
      }
    }
  }
}
