import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeCourse,createRace,advanceRace,raceGrade,resetRaceVehicle,createVehicle,advanceVehicle,seaClear,readBest,saveBest,formatTime} from '../shared/seasonal-games.mjs';
import {Arcade,mergeLine} from '../shared/arcade.mjs';
import {seededRandom} from '../shared/living-catalog.mjs';
const regions=JSON.parse(readFileSync(new URL('../data/world.json',import.meta.url))).regions;
const crossing=g=>[{x:g.x-g.nx*8,y:g.y,z:g.z-g.nz*8},{x:g.x+g.nx*8,y:g.y,z:g.z+g.nz*8}];
test('three courses require ordered forward crossings, two laps, and ignore later or reverse gates',()=>{
  for(const id of ['spring','summer','autumn']){
    const course=makeCourse(id,regions),race=createRace(course);race.countdown=0;
    assert.ok(course.gates.length>=6);assert.ok(course.path.every(p=>Object.values(p).every(Number.isFinite)));
    const future=course.gates[3];advanceRace(race,...crossing(future),.1);assert.equal(race.passed,0);
    advanceRace(race,...crossing(course.gates[1]).reverse(),.1);assert.equal(race.passed,0);
    for(let i=0;i<course.gates.length*2;i++){assert.equal(race.finished,false);assert.equal(advanceRace(race,...crossing(course.gates[race.next]),.1),true);}
    assert.equal(race.finished,true);assert.equal(race.passed,course.gates.length*2);assert.equal(race.lap,2);
    const elapsed=race.elapsed;advanceRace(race,...crossing(course.gates[0]),1);assert.equal(race.elapsed,elapsed);
  }
});
test('countdown, free roam, reset penalty, vertical misses and medal boundaries are distinct',()=>{
  const course=makeCourse('autumn',regions),race=createRace(course);
  advanceRace(race,...crossing(course.gates[1]),1);assert.equal(race.elapsed,0);assert.equal(race.countdown,2);
  race.countdown=0;advanceRace(race,...crossing(course.gates[1]).map(p=>({...p,y:100})),1);assert.equal(race.passed,0);
  resetRaceVehicle(race);assert.equal(race.penalty,5);race.elapsed=course.medals[0]-5;assert.equal(raceGrade(race),'gold');
  race.elapsed+=.01;assert.equal(raceGrade(race),'silver');race.elapsed=course.medals[1];assert.equal(raceGrade(race),'bronze');
  const free=createRace(course,true);free.countdown=0;advanceRace(free,...crossing(course.gates[1]),1);resetRaceVehicle(free);assert.equal(free.passed,0);assert.equal(free.penalty,0);assert.equal(free.elapsed,1);
});
test('boat course avoids shores; steering and braking work at low frame rates without tunneling',()=>{
  const course=makeCourse('summer',regions);assert.ok(course.path.every(p=>seaClear(p.x,p.z,regions)));
  const s=createVehicle('summer',{x:51,y:-5.65,z:24,yaw:-Math.PI/2});
  for(let i=0;i<100;i++)advanceVehicle(s,{throttle:1,boost:true},.1,regions,[],i*.1);
  assert.ok(seaClear(s.x,s.z,regions));assert.ok(s.x>45);
  const state=createVehicle('summer',course.spawn);
  for(let i=0;i<120;i++)advanceVehicle(state,{throttle:1,turn:.2},1/60,regions,[]);
  const speed=state.speed;assert.ok(speed>5);assert.ok(Math.abs(state.yaw-course.spawn.yaw)>.2);
  for(let i=0;i<120;i++)advanceVehicle(state,{brake:true},1/60,regions,[]);
  assert.ok(Math.abs(state.speed)<speed*.1);
});
test('motorcycle crosses small curbs and stays on the shared island/bridge surface',()=>{
  const world=[{position:[30,0],radius:30}],s=createVehicle('spring',{x:30,y:0,z:0,yaw:0});
  const curb={x:30,z:3,halfX:3,halfZ:.2,radius:0,height:.4};
  for(let i=0;i<240;i++)advanceVehicle(s,{throttle:1},1/120,world,[curb]);
  assert.ok(s.z>8);assert.equal(s.y,0);assert.equal(s.grounded,true);
  for(let i=0;i<100;i++)advanceVehicle(s,{throttle:1,boost:true},.1,world,[]);
  assert.ok(s.z<29);
});
test('vehicle integration is stable across frame rates; glider gains altitude in thermals',()=>{
  const run=dt=>{const s=createVehicle('summer',{x:72,y:-5.65,z:18,yaw:0});for(let i=0;i<2/dt;i++)advanceVehicle(s,{throttle:1,turn:.25},dt,regions,[],i*dt);return s;};
  const slow=run(.1),fast=run(1/120);assert.ok(Math.hypot(slow.x-fast.x,slow.z-fast.z)<.01);assert.ok(Math.abs(slow.speed-fast.speed)<.001);
  const s=createVehicle('autumn',{x:-51,y:25,z:19,yaw:0}),before=s.y;
  advanceVehicle(s,{throttle:0,turn:.5},.1,regions,[]);assert.ok(s.y>before);assert.ok(s.bank<0);assert.equal(s.hit,false);
});
test('best records persist, favor appropriate score direction and tolerate storage failures',()=>{
  const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
  assert.equal(readBest(storage,'race'),null);saveBest(storage,'race',90,true);saveBest(storage,'race',100,true);assert.equal(readBest(storage,'race'),90);
  assert.equal(saveBest(storage,'race',80,true).record,true);saveBest(storage,'arcade',800);saveBest(storage,'arcade',400);assert.equal(readBest(storage,'arcade'),800);
  values.set('xiangmeta.games.v1.bad','{"broken":1}');assert.equal(readBest(storage,'bad'),null);
  assert.equal(saveBest({getItem:()=>null,setItem:()=>{throw Error();}},'x',3).saved,false);
  assert.equal(saveBest(storage,'race',NaN,true).saved,false);
});
test('2048 merges each tile once, ignores no-op moves and detects wins/losses',()=>{
  assert.deepEqual(mergeLine([2,2,2,2]),{line:[4,4,0,0],score:8});
  assert.deepEqual(mergeLine([2,2,4,0]),{line:[4,4,0,0],score:4});
  const g=new Arcade('merge',seededRandom(5));g.board=[[1024,1024,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];g.action('left');assert.equal(g.won,true);assert.equal(g.score,2048);
  const loss=new Arcade('merge');loss.board=[[2,4,2,4],[4,2,4,2],[2,4,2,4],[4,2,4,2]];loss.action('left');assert.equal(loss.over,true);assert.equal(loss.moves,0);
});
test('blocks clear complete rows, rotate with wall kicks and end when spawn is occupied',()=>{
  const g=new Arcade('blocks',seededRandom(5));g.board[19]=[1,1,1,1,1,1,0,0,0,0];g.shape=[[1,1,1,1]];g.px=6;g.py=0;g.action('space');
  assert.equal(g.lines,1);assert.ok(g.score>=100);assert.equal(g.board[19].filter(Boolean).length,0);
  g.shape=[[1],[1],[1],[1]];g.px=9;g.py=3;g.action('up');assert.ok(g.fits());
  g.board[0].fill(1);g.spawn();assert.equal(g.over,true);
});
test('snake rejects reversal, grows and ends at a wall; pairs lock mismatches and finish',()=>{
  const snake=new Arcade('snake',seededRandom(3));snake.action('left');snake.update(.1);snake.update(.1);assert.equal(snake.snake[0].x,8);
  snake.food={x:9,y:8};snake.update(.1);snake.update(.1);assert.equal(snake.score,10);assert.equal(snake.snake.length,4);
  for(let i=0;i<30;i++)snake.update(.1);assert.equal(snake.over,true);
  const pairs=new Arcade('pairs',seededRandom(9));let a=0,b=pairs.cards.findIndex(v=>v!==pairs.cards[0]);pairs.flip(a);pairs.flip(b);pairs.flip(3);assert.equal(pairs.open.length,2);
  for(let i=0;i<9;i++)pairs.update(.1);assert.equal(pairs.open.length,0);
  for(let value=0;value<8;value++){pairs.cards.forEach((v,i)=>{if(v===value)pairs.flip(i);});}
  assert.equal(pairs.won,true);assert.equal(pairs.matched.length,16);assert.ok(pairs.score>=800);
});
test('breakout paddle bounce, brick hits, lives and victory use swept short steps',()=>{
  const g=new Arcade('bricks');g.serving=false;g.ball={x:.5,y:.85,vx:0,vy:.6};g.update(.05);assert.ok(g.ball.vy<0);
  g.ball={x:.08,y:.08,vx:0,vy:.6};g.update(.06);assert.equal(g.bricks[0],0);assert.equal(g.score,25);
  g.ball={x:.9,y:1.02,vx:0,vy:.6};g.update(.1);assert.equal(g.lives,2);assert.equal(g.serving,true);
  g.bricks.fill(0);g.bricks[0]=1;g.serving=false;g.ball={x:.08,y:.08,vx:0,vy:.6};g.update(.06);assert.equal(g.won,true);
});
test('time rounding carries into the next minute and flight gates match their circular opening',()=>{
  assert.equal(formatTime(59.999),'01:00.00');assert.equal(formatTime(119.999),'02:00.00');assert.equal(formatTime(Infinity),'—');
  const course=makeCourse('autumn',regions),race=createRace(course),g=course.gates[1];race.countdown=0;
  const miss=crossing(g).map(p=>({...p,x:p.x+g.nz*g.radius*.8,z:p.z-g.nx*g.radius*.8,y:p.y+g.radius*.8}));
  assert.equal(advanceRace(race,...miss,.1),false);assert.equal(race.passed,0);
});
test('releasing boost preserves momentum, depletion waits for release, and the full motorcycle body stops at walls',()=>{
  for(const kind of ['spring','summer']){
    const s=createVehicle(kind,{x:70,y:kind==='spring'?0:-5.65,z:30,yaw:0}),world=kind==='spring'?[{position:[70,30],radius:100}]:regions;
    s.speed=kind==='spring'?16:25;s.vx=0;s.vz=s.speed;
    advanceVehicle(s,{},1/120,world,[]);assert.ok(s.speed>(kind==='spring'?15.8:24.8),'no sudden clamp on boost release');
    s.boost=.001;advanceVehicle(s,{boost:true,throttle:1},.1,world,[]);assert.equal(s.boostReady,false);
    for(let i=0;i<25;i++)advanceVehicle(s,{boost:true,throttle:1},.1,world,[]);
    assert.equal(s.boostReady,false);advanceVehicle(s,{},1/120,world,[]);assert.equal(s.boostReady,true);
  }
  const s=createVehicle('spring',{x:30,y:0,z:0,yaw:0}),world=[{position:[30,0],radius:30}],wall={x:30,z:3,halfX:3,halfZ:.1,radius:0,height:4};
  for(let i=0;i<240;i++)advanceVehicle(s,{throttle:1},1/120,world,[wall]);
  assert.ok(s.z<1.85,'front wheel stays outside the wall');
  for(let i=0;i<240;i++)advanceVehicle(s,{throttle:-1},1/120,world,[wall]);
  assert.ok(s.z<-.5,'backing away is always available');
});
test('snake buffers two quick corners and rejects a reversal against the queued turn',()=>{
  const g=new Arcade('snake');g.action('up');g.action('left');g.action('down');
  for(let i=0;i<2;i++)g.update(.1);assert.deepEqual(g.snake[0],{x:7,y:7});
  for(let i=0;i<2;i++)g.update(.1);assert.deepEqual(g.snake[0],{x:6,y:7});assert.equal(g.over,false);
});
