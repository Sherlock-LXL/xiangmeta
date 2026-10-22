import test from 'node:test';
import assert from 'node:assert/strict';
import {animalSpecies,seasonalObjects,seededRandom,angleDelta} from '../shared/living-catalog.mjs';
import {LivingNavigation} from '../shared/living-navigation.mjs';
import {createAnimalState,updateAnimal,petAnimal} from '../shared/animal-behavior.mjs';
import {createWalker,advanceWalker,GRAVITY} from '../shared/locomotion.mjs';
import {WeatherCycle,weatherKinds} from '../shared/weather.mjs';
import {createServer} from 'vite';
import * as T from 'three';

const region={id:'test',position:[30,30],radius:16},regions=[region];
test('all four seasons have four portable objects and ten distinct, sparse species',()=>{
  assert.deepEqual(Object.values(seasonalObjects).map(items=>items.length),[4,4,4,4]);
  assert.equal(new Set(Object.values(seasonalObjects).flat().map(o=>o.kind)).size,16);
  assert.equal(new Set(animalSpecies.map(a=>a.kind)).size,10);
  assert.equal(animalSpecies.filter(a=>a.ride).length,2);
});
test('placement and swept navigation reject walls, shores, other inhabitants and reserved entrances',()=>{
  const wall={x:30,z:30,halfX:.05,halfZ:6,radius:0,height:5};
  const nav=new LivingNavigation(regions,[wall],[{x:25,z:25,radius:2}]);
  assert.equal(nav.segment({x:28,z:30},{x:32,z:30},.65,'test'),false);
  assert.equal(nav.ground(44.8,30,1.05,'test'),null);
  assert.equal(nav.ground(25,25,.3,'test',[],true),null);
  assert.equal(nav.ground(23,30,.65,'test',[{x:23,z:30,radius:.3}]),null);
  const occupied=[],random=seededRandom(8);
  for(const spec of [...animalSpecies,...Object.values(seasonalObjects).flat()]){
    const p=nav.place(region,spec.radius,random,occupied,!!spec.season);assert.ok(p,spec.kind);
    assert.notEqual(nav.ground(p.x,p.z,spec.radius,'test',occupied,true),null);occupied.push({...p,radius:spec.radius});
  }
});
test('ten minutes of animal decisions stay bounded and clear; pausing and pet cooldowns are stable',()=>{
  const random=seededRandom(85),obstacles=[{x:32,z:28,radius:1,height:3},{x:25,z:31,halfX:.1,halfZ:4,radius:0,height:4}];
  const nav=new LivingNavigation(regions,obstacles),player={x:30,y:0,z:33},states=[];
  for(const spec of animalSpecies.slice(0,3)){
    const home=nav.place(region,spec.radius,random,states,true);assert.ok(home);
    states.push(createAnimalState({...spec,regionId:'test'},home,random));
  }
  const modes=new Set(),positions=new Set();
  for(let step=0;step<6000;step++)for(const a of states){
    const previous={x:a.x,z:a.z,yaw:a.yaw},dynamic=states.filter(b=>b!==a);
    updateAnimal(a,.1,player,nav,dynamic,random);modes.add(a.mode);positions.add(`${a.x.toFixed(1)},${a.z.toFixed(1)}`);
    assert.ok(Math.hypot(a.x-a.home.x,a.z-a.home.z)<=4.51);
    assert.ok(Math.abs(angleDelta(previous.yaw,a.yaw))<=.086);
    assert.ok(Math.hypot(a.x-previous.x,a.z-previous.z)<=a.speed*.101);
    assert.notEqual(nav.ground(a.x,a.z,a.radius,'test',dynamic),null);
  }
  assert.ok(modes.has('wander')&&modes.has('rest')&&modes.has('graze'));assert.ok(positions.size>30);
  const a=states[0];assert.equal(petAnimal(a),true);assert.equal(petAnimal(a),false);
  const before=structuredClone(a);updateAnimal(a,0,player,nav,[],random);assert.deepEqual(a,before);
  updateAnimal(a,.1,player,nav,[],random);assert.equal(a.mode,'pet');assert.ok(a.affection>0);
});
test('curiosity is probabilistic, and a watched player never snaps the whole body around',()=>{
  const nav=new LivingNavigation(regions,[]),random=seededRandom(19),a=createAnimalState({...animalSpecies[0],regionId:'test'},{x:30,y:0,z:30},random),seen=new Set();
  for(let i=0;i<100;i++){a.timer=0;const yaw=a.yaw;updateAnimal(a,.01,{x:31,y:0,z:31},nav,[],random);seen.add(a.mode);assert.ok(Math.abs(angleDelta(yaw,a.yaw))<=.009);}
  assert.ok(seen.has('watch'));assert.ok(seen.has('rest')||seen.has('graze'));
});
test('ridden movement boosts jump height but cannot cross its full-footprint boundary even airborne',()=>{
  const nav=new LivingNavigation(regions,[]),walker=createWalker(42,30,regions);
  const options={jumpSpeed:10.2,canEnter:(x,z)=>nav.ground(x,z,1.12,'test')!==null};let peak=0;
  for(let i=0;i<120;i++){advanceWalker(walker,{x:12.325,z:0,jump:i===0},1/120,regions,[],options);peak=Math.max(peak,walker.y);}
  assert.ok(Math.abs(peak-10.2**2/(2*GRAVITY))<.01);assert.ok(walker.x<43.98);
  assert.equal(walker.grounded,true);assert.equal(walker.y,0);
});
test('every weather transition is continuous, interruption-safe and frozen in photography',()=>{
  const cycle=new WeatherCycle(seededRandom(22));cycle.automatic=false;
  for(const kind of weatherKinds){
    const before={...cycle.value};cycle.select(kind);assert.deepEqual(cycle.value,before);
    cycle.update(3);const frozen=structuredClone(cycle.snapshot);cycle.update(45,true);assert.deepEqual(cycle.snapshot,frozen);
    for(let i=0;i<90;i++)cycle.update(.1);
    assert.equal(cycle.target,kind);
    assert.ok(Object.values(cycle.value).every(v=>Number.isFinite(v)&&v>=0&&v<=1));
  }
  assert.ok(cycle.value.sunset>.999);
});
test('animated ears, tails, beaks and feet stay within the collision footprint',async()=>{
  const original=globalThis.document,context=new Proxy({},{get:()=>()=>{}});
  globalThis.document={createElement:()=>({width:512,height:512,getContext:()=>context})};
  const vite=await createServer({server:{middlewareMode:true},appType:'custom'});
  try{
    const {animalModel}=await vite.ssrLoadModule('/src/world/living-models.ts');
    for(const spec of animalSpecies){
      const rig=animalModel(spec.kind);
      for(let i=0;i<24;i++){
        rig.animate(i,1,(i-12)/16,i%2?'graze':'pet',i);rig.root.updateMatrixWorld(true);
        rig.root.traverse(o=>{
          if(!o.isMesh)return;const p=o.geometry.attributes.position,v=new T.Vector3();
          for(let j=0;j<p.count;j++){
            v.fromBufferAttribute(p,j).applyMatrix4(o.matrixWorld);
            assert.ok(Math.hypot(v.x,v.z)<spec.radius,`${spec.kind} footprint`);
            assert.ok(v.y>=-.008,`${spec.kind} feet ${v.y}`);
            assert.ok(v.y<=spec.height+.01,`${spec.kind} height`);
          }
        });
      }
    }
  }finally{await vite.close();if(original===undefined)delete globalThis.document;else globalThis.document=original;}
});
