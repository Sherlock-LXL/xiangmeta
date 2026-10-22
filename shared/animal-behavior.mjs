import {turnToward} from './living-catalog.mjs';

export const createAnimalState=(spec,home,random)=>({
  ...spec,...home,home:{...home},yaw:random()*Math.PI*2,headYaw:0,mode:'rest',timer:2+random()*5,
  target:null,walkPhase:0,petCooldown:0,affection:0,velocity:0,blocked:0,
});

/** Slow, probabilistic decisions, short swept steps and bounded head turns. */
export function updateAnimal(a,dt,player,nav,dynamic,random){
  dt=Math.max(0,Math.min(.1,dt));a.petCooldown=Math.max(0,a.petCooldown-dt);a.affection=Math.max(0,a.affection-dt);
  if(a.mode==='ridden')return;
  const distance=Math.hypot(player.x-a.x,player.z-a.z),sees=distance<5&&Math.abs(player.y-a.y)<2&&nav.sight({...a,y:a.y+.5},{...player,y:player.y+.7});
  a.timer-=dt;a.velocity=0;
  if(a.mode==='pet'){
    a.headYaw=turnToward(a.headYaw,0,dt);
    if(a.timer<=0){a.mode='rest';a.timer=2+random()*3;}
    return;
  }
  if(a.timer<=0){
    const roll=random();a.target=null;
    if(sees&&roll<.4){a.mode='watch';a.timer=2+random()*3;}
    else if(roll<.66){a.mode=random()<.5?'graze':'rest';a.timer=3+random()*5;}
    else{
      for(let i=0;i<18;i++){
        const angle=random()*Math.PI*2,r=1.1+random()*2.2,p={x:a.x+Math.sin(angle)*r,z:a.z+Math.cos(angle)*r};
        if(Math.hypot(p.x-a.home.x,p.z-a.home.z)>4.5||Math.hypot(p.x-player.x,p.z-player.z)<a.radius+.8)continue;
        if(nav.segment(a,p,a.radius,a.regionId,dynamic,true)){a.target=p;break;}
      }
      a.mode=a.target?'wander':'rest';a.timer=a.target?12:3+random()*3;
    }
  }
  const desired=a.mode==='watch'&&sees?Math.atan2(player.x-a.x,player.z-a.z):a.yaw;
  a.headYaw=turnToward(a.headYaw,Math.max(-.75,Math.min(.75,Math.atan2(Math.sin(desired-a.yaw),Math.cos(desired-a.yaw)))),dt*.8);
  if(a.mode==='wander'&&a.target){
    const dx=a.target.x-a.x,dz=a.target.z-a.z,d=Math.hypot(dx,dz),heading=Math.atan2(dx,dz);
    a.yaw=turnToward(a.yaw,heading,dt*.85);
    if(d<.12){a.mode='rest';a.timer=2+random()*4;a.target=null;return;}
    const alignment=Math.cos(heading-a.yaw);
    if(alignment<.85)return;
    const step=Math.min(d,a.speed*dt),next={x:a.x+dx/d*step,z:a.z+dz/d*step};
    const occupied=[...dynamic,{x:player.x,z:player.z,radius:.4}];
    if(nav.segment(a,next,a.radius,a.regionId,occupied)){
      a.x=next.x;a.z=next.z;a.y=nav.ground(a.x,a.z,a.radius,a.regionId)??a.y;
      a.velocity=a.speed;a.walkPhase+=step*7;a.blocked=0;
    }else{
      a.blocked++;a.mode='rest';a.target=null;a.timer=1.8+random()*3;
    }
  }
}

export function petAnimal(animal){
  if(animal.petCooldown>0||animal.mode==='ridden')return false;
  animal.mode='pet';animal.target=null;animal.timer=2.4;animal.petCooldown=5;animal.affection=3.2;animal.velocity=0;return true;
}
