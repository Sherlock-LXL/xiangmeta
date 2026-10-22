import {advanceWalker,createWalker} from './locomotion.mjs';
import {groundHeight} from './terrain-height.mjs';
import {mountainRoutes} from './mountain-route.mjs';
import {supportedFootprint,bodyFootprint,onGround,overlaps,pointSegmentDistance} from './navigation.mjs';

export const gameCatalog=[
  {id:'spring',name:'春山骑行',vehicle:'山地摩托',tag:'LAND / 春',color:'#ba685e',description:'沿花径爬坡，在发卡弯前松开油门。',controls:'W / S 油门与倒车 · A / D 转向 · 空格 刹车 · Shift 冲刺'},
  {id:'summer',name:'逐浪航线',vehicle:'海滩快艇',tag:'SEA / 夏',color:'#497f7e',description:'切过海面，留一道弯弯的浪花。',controls:'W / S 油门与倒车 · A / D 舵向 · 空格 减速 · Shift 冲浪加速'},
  {id:'autumn',name:'乘风入画',vehicle:'滑翔伞',tag:'SKY / 秋',color:'#aa7b39',description:'掠过金色群岛，借上升气流再飞高一点。',controls:'W 俯冲 · S 抬升 · A / D 倾斜转弯 · 空格 空气刹车 · 金色气流补充高度'},
  {id:'winter',name:'雪夜游艺室',vehicle:'五款小游戏',tag:'ARCADE / 冬',color:'#687f9f',description:'围坐一盏暖灯，把下雪的时间交给游戏。',controls:'方向键 / 触屏操作 · P 暂停'},
];
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const angleDiff=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export const formatTime=t=>{
  if(!Number.isFinite(t))return '—';
  const ticks=Math.round(Math.max(0,t)*100);
  return `${Math.floor(ticks/6000).toString().padStart(2,'0')}:${(ticks%6000/100).toFixed(2).padStart(5,'0')}`;
};
export const thermals=[{x:-51,z:19,radius:9},{x:-19,z:52,radius:10},{x:4,z:19,radius:8}];
export const seaHeight=(x,z,t)=>-5.65+Math.sin(x*.17+t*1.8)*.13+Math.sin(z*.22-t*1.3)*.09;

/** Authored routes reuse existing terrain; the game adds no new walkable topology. */
export function makeCourse(id,regions){
  /** @type {{x:number;y:number;z:number}[]} */
  let path=[];
  if(id==='spring'){
    const r=regions.find(r=>r.season==='spring'),routes=mountainRoutes(r),main=routes.find(r=>r.kind==='main').points,shortcut=routes.find(r=>r.kind==='shortcut').points;
    const nearest=(p)=>main.reduce((best,q,i)=>Math.hypot(q.x-p.x,q.z-p.z)<Math.hypot(main[best].x-p.x,main[best].z-p.z)?i:best,0);
    const a=nearest(shortcut[0]),b=nearest(shortcut.at(-1));
    path=[...main.slice(a,b+1),...shortcut.slice().reverse()].map(p=>({x:p.x+r.position[0],z:p.z+r.position[1],y:groundHeight(p.x+r.position[0],p.z+r.position[1],regions)}));
  }else{
    for(let i=0;i<=96;i++){
      const a=i/96*Math.PI*2;
      path.push(id==='summer'?{x:70+Math.cos(a)*23,z:28+Math.sin(a)*26,y:-5.65}:{x:-23+Math.cos(a)*33,z:25+Math.sin(a)*30,y:24+Math.sin(a*2)*5});
    }
  }
  // Arc-length sampling gives each checkpoint enough separation to avoid accidental multi-hits.
  /** @type {{x:number;y:number;z:number;nx:number;nz:number;radius:number}[]} */
  const gates=[{...path[0],nx:0,nz:1,radius:1}];let distance=0,length=0;
  for(let i=1;i<path.length;i++){
    const d=Math.hypot(path[i].x-path[i-1].x,path[i].z-path[i-1].z,path[i].y-path[i-1].y);distance+=d;length+=d;
    if(distance>=(id==='spring'?8:22)&&i<path.length-3){gates.push({...path[i],nx:0,nz:1,radius:1});distance=0;}
  }
  if(Math.hypot(gates.at(-1).x-gates[0].x,gates.at(-1).z-gates[0].z)<(id==='spring'?5:15))gates.pop();
  const radius=id==='spring'?1.5:id==='summer'?5.6:6;
  gates.forEach((g,i)=>{const a=gates[(i-1+gates.length)%gates.length],b=gates[(i+1)%gates.length],d=Math.hypot(b.x-a.x,b.z-a.z);Object.assign(g,{nx:(b.x-a.x)/d,nz:(b.z-a.z)/d,radius});});
  const reference=length*2/(id==='spring'?5.3:id==='summer'?14:12);
  return {id,version:1,path,gates,laps:2,length,medals:[reference,reference*1.35],spawn:{...gates[0],yaw:Math.atan2(gates[0].nx,gates[0].nz)}};
}
/** @param {ReturnType<typeof makeCourse>} course */
export function createRace(course,leisure=false){return {course,leisure,next:1,lap:1,elapsed:0,penalty:0,countdown:3,finished:false,passed:0};}
export function advanceRace(race,previous,current,dt){
  if(race.finished)return false;
  if(race.countdown>0){race.countdown=Math.max(0,race.countdown-dt);return false;}
  race.elapsed+=dt;if(race.leisure)return false;
  const g=race.course.gates[race.next],a=(previous.x-g.x)*g.nx+(previous.z-g.z)*g.nz,b=(current.x-g.x)*g.nx+(current.z-g.z)*g.nz;
  if(a>0||b<=0)return false;
  const t=-a/(b-a),x=previous.x+(current.x-previous.x)*t,z=previous.z+(current.z-previous.z)*t,y=previous.y+(current.y-previous.y)*t;
  const horizontal=Math.hypot(x-g.x,z-g.z);
  if(race.course.id==='autumn'?Math.hypot(horizontal,y-g.y)>g.radius:horizontal>g.radius||Math.abs(y-g.y)>2.8)return false;
  race.passed++;
  if(race.next===0){if(race.lap===race.course.laps)race.finished=true;else race.lap++;}
  race.next=(race.next+1)%race.course.gates.length;return true;
}
export const raceGrade=(race)=>race.elapsed+race.penalty<=race.course.medals[0]?'gold':race.elapsed+race.penalty<=race.course.medals[1]?'silver':'bronze';
export function resetRaceVehicle(race){
  const g=race.course.gates[(race.next-1+race.course.gates.length)%race.course.gates.length];
  if(!race.leisure&&race.countdown===0)race.penalty+=5;
  return {...g,yaw:Math.atan2(g.nx,g.nz)};
}
/** Bad JSON, old formats and unavailable storage never prevent play. */
export function readBest(storage,key){
  try{const n=JSON.parse(storage.getItem('xiangmeta.games.v1.'+key));return typeof n==='number'&&Number.isFinite(n)&&n>=0?n:null;}catch{return null;}
}
export function saveBest(storage,key,value,lower=false){
  const before=readBest(storage,key),best=before===null?value:lower?Math.min(before,value):Math.max(before,value);
  if(!Number.isFinite(value)||value<0)return {best:before,record:false,saved:false};
  try{storage.setItem('xiangmeta.games.v1.'+key,JSON.stringify(best));return {best,record:before===null||best!==before,saved:true};}
  catch{return {best,record:before===null||best!==before,saved:false};}
}
export function createVehicle(kind,point){return {...createWalker(point.x,point.z),y:point.y,yaw:point.yaw,speed:kind==='autumn'?12:0,vx:0,vz:0,bank:0,pitch:0,boost:1,boostReady:true,kind,hit:false};}
export function seaClear(x,z,regions){
  return Math.hypot(x,z)<148&&Math.hypot(x,z)>14&&regions.every(r=>Math.hypot(x-r.position[0],z-r.position[1])>r.radius+4)&&pointSegmentDistance(x,z,-10,34,10,34)>8;
}
/** Fixed short integration steps preserve grip/collision at both 30 and 120 Hz. */
export function advanceVehicle(s,input,dt,regions,obstacles,time=0){
  const steps=Math.max(1,Math.ceil(clamp(dt,0,.1)*120)),h=clamp(dt,0,.1)/steps;s.hit=false;
  for(let k=0;k<steps;k++){
    const turn=clamp(input.turn||0,-1,1),throttle=clamp(input.throttle||0,-1,1),brake=!!input.brake;
    if(s.kind==='autumn'){
      s.bank+=(turn*-.58-s.bank)*(1-Math.exp(-h*4));
      s.pitch+=(throttle*.35-s.pitch)*(1-Math.exp(-h*3));
      s.speed=clamp(s.speed+(throttle*(throttle<0?1.7:4.5)+(12-s.speed)*.45-(brake?5:0))*h,5,23);
      s.yaw+=turn*(.35+s.speed*.025)*h;
      const lift=thermals.reduce((v,t)=>Math.max(v,Math.max(0,1-Math.hypot(s.x-t.x,s.z-t.z)/t.radius)*6),0);
      s.vy=-.62-throttle*(s.speed>8?3.7:1.1)+lift-(s.speed<8?(8-s.speed)*.6:0);
      s.x+=Math.sin(s.yaw)*s.speed*h;s.z+=Math.cos(s.yaw)*s.speed*h;s.y=clamp(s.y+s.vy*h,-3,64);
      const floor=onGround(s.x,s.z,regions)?groundHeight(s.x,s.z,regions):-5.65;
      if(s.y<floor+2.4||Math.hypot(s.x,s.z)>148||obstacles.some(o=>overlaps(s.x,s.z,o,3.2)&&s.y<(o.height??floor+8)+3.2))s.hit=true;
    }else{
      if(!input.boost&&s.boost>=.25)s.boostReady=true;
      const bike=s.kind==='spring',boost=!!input.boost&&s.boostReady&&s.boost>0&&throttle>0&&!brake;
      s.boost=clamp(s.boost+h*(boost?-.28:.13),0,1);
      if(s.boost===0)s.boostReady=false;
      const acceleration=bike?8:7,drag=bike?.6:.24,limit=(bike?11.5:18)*(boost?1.4:1);
      const beforeSpeed=s.speed;
      s.speed+=throttle*acceleration*h*(boost?1.65:1);s.speed*=Math.exp(-(drag+(brake?5:0))*h);
      s.speed=clamp(s.speed,-3.5,Math.max(limit,beforeSpeed-acceleration*h));
      const steer=(bike?1.55:1.4)/(1+Math.abs(s.speed)/(bike?16:30));
      const yaw=s.yaw+turn*steer*(s.speed<-.1?-1:1)*Math.min(1,Math.abs(s.speed)/(bike?1:3))*h;
      const footprint=bodyFootprint(yaw,.67);
      if(!bike||supportedFootprint(s.x,s.z,regions,.43,footprint)&&
        !obstacles.some(o=>(o.height??Infinity)>s.y+.55&&footprint.some(p=>overlaps(s.x+p.x,s.z+p.z,o,.43))))s.yaw=yaw;
      const grip=bike?14:2.3,blend=1-Math.exp(-grip*h);
      s.vx+=(Math.sin(s.yaw)*s.speed-s.vx)*blend;s.vz+=(Math.cos(s.yaw)*s.speed-s.vz)*blend;
      const x=s.x,z=s.z,oldY=s.y;
      if(bike){
        const support=bodyFootprint(s.yaw,.67);
        advanceWalker(s,{x:s.vx,z:s.vz},h,regions,obstacles,{radius:.43,footprint:support,stepHeight:.55,canEnter:(x,z)=>supportedFootprint(x,z,regions,.43,support)});
        const slope=(s.y-oldY)/(Math.abs(s.speed)*h+.001);s.pitch+=(Math.atan(slope)-s.pitch)*(1-Math.exp(-h*7));
      }else{
        const nx=s.x+s.vx*h,nz=s.z+s.vz*h;
        if(seaClear(nx,nz,regions)){s.x=nx;s.z=nz;}else s.hit=true;
        s.y=seaHeight(s.x,s.z,time);s.pitch=(Math.sin(time*3+s.x*.1)*.035)-Math.abs(s.speed)*.009;
      }
      if(Math.hypot(s.x-x,s.z-z)<Math.hypot(s.vx,s.vz)*h*.3&&Math.abs(s.speed)>1){s.speed*=.75;s.vx*=.7;s.vz*=.7;s.hit=true;}
      s.bank+=(-turn*Math.abs(s.speed)*(bike?.026:.012)-s.bank)*(1-Math.exp(-h*7));
    }
  }
  return s;
}
