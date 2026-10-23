import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {loadCatalog} from '../backend/catalog.mjs';
import {verifyTours} from './tour-navigation.mjs';
import {walkable} from '../shared/navigation.mjs';
const out=process.env.GAME_ARTIFACTS??'/private/tmp/seasonal-review',touch=process.env.GAME_TOUCH==='1';
await mkdir(out,{recursive:true});
const engine=process.env.GAME_ENGINE==='webkit'?webkit:chromium,browser=await engine.launch({headless:true,args:engine===chromium?['--use-angle=metal']:[]});
const page=await browser.newPage({viewport:touch?{width:390,height:844}:{width:1440,height:1000},hasTouch:touch,isMobile:touch});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
const inspect=()=>page.evaluate(()=>window.__xiangmetaInspect());
const frames=async(seconds)=>page.evaluate(seconds=>new Promise(resolve=>{const start=performance.now();const tick=()=>performance.now()-start>seconds*1000?resolve():requestAnimationFrame(tick);requestAnimationFrame(tick);}),seconds);
// Real pointer input; avoid Playwright's RAF-based stability check on the heavy WebGL scene.
const click=async(selector)=>{
  const element=page.locator(selector);await element.waitFor({state:'visible'});
  const b=await element.boundingBox();assert.ok(b);
  await page.mouse.click(b.x+b.width/2,b.y+b.height/2);
};
const menu=async()=>{if(touch){await click('#mobile-menu');await page.waitForFunction(()=>Math.abs(document.querySelector('.sidebar').getBoundingClientRect().x)<1);}await click('#seasonal-games');};
try{
  await page.goto((process.env.GAME_ORIGIN??'http://127.0.0.1:4191')+'/world/?inspect');
  await page.waitForFunction(()=>window.__xiangmetaInspect?.().calls>0,null,{timeout:90000});
  await page.waitForFunction(()=>!document.querySelector('#world-loading'));
  console.log('ready for input');
  await click('#help');await click('#low-quality');await click('#close-panel');
  const initial=await inspect();assert.equal(initial.games.stalls.length,4);assert.equal(initial.living.animals.length,10);
  assert.ok(initial.obstacles.every(o=>Number.isFinite(o.height)),'scene blockers have finite height for airborne travel');
  await writeFile(out+'/world.json',JSON.stringify(initial));
  console.log('boot',initial.games.stalls);
  const {regions}=(await loadCatalog(process.cwd())).public;
  for(const s of initial.games.stalls)assert.ok(walkable(s.approach.x,s.approach.z,regions,initial.obstacles),s.id+' approach');
  if(!touch){
    const routes=verifyTours(regions,initial.obstacles);
    await writeFile(out+'/route-simulation.json',JSON.stringify(routes));
  }
  await menu();assert.equal(await page.locator('.seasonal-card').count(),4);await page.screenshot({path:out+'/menu.png'});console.log('menu');
  await click('[data-start="spring"]');await page.waitForFunction(()=>window.__xiangmetaInspect().games.race?.countdown===0);
  const before=(await inspect()).games.vehicle;
  if(touch){const b=await page.locator('[data-drive="forward"]').boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await frames(1.5);await page.mouse.up();}
  else{await page.keyboard.down('w');await frames(1.5);await page.keyboard.up('w');}
  let s=(await inspect()).games;assert.ok(Math.hypot(s.vehicle.x-before.x,s.vehicle.z-before.z)>.5,'bike moves with real input');
  await page.screenshot({path:out+'/spring.png'});console.log('spring driven');await click('.game-hud [data-pause]');
  const time=(await inspect()).games.race.elapsed;await frames(.35);assert.equal((await inspect()).games.race.elapsed,time);
  await click('[data-reset]');assert.equal((await inspect()).games.race.penalty,5);
  if(!touch){
    await page.keyboard.down('w');await page.waitForFunction(()=>window.__xiangmetaInspect().games.vehicle.speed>3);
    await page.keyboard.down('Shift');await page.keyboard.down('a');await frames(.25);
    assert.ok((await inspect()).games.vehicle.drift>.7,'Shift turns the bike into a drift');
    await page.keyboard.up('Shift');await page.keyboard.up('a');await page.keyboard.up('w');
    await frames(.6);assert.ok((await inspect()).games.vehicle.drift<.01,'releasing Shift restores grip');
  }
  await click('.game-hud [data-pause]');await click('[data-exit]');assert.equal((await inspect()).games.vehicle,null);
  for(const id of ['summer','autumn']){
    await menu();await click(`[data-free="${id}"]`);await page.waitForFunction(()=>window.__xiangmetaInspect().games.race?.countdown===0);
    if(!touch){await page.keyboard.down('w');await page.keyboard.down('a');await frames(1);await page.keyboard.up('w');await page.keyboard.up('a');}
    else if(id==='summer'&&engine===chromium){
      const cdp=await page.context().newCDPSession(page),gas=await page.locator('[data-drive="forward"]').boundingBox(),left=await page.locator('[data-drive="left"]').boundingBox();
      const points=[{x:gas.x+gas.width/2,y:gas.y+gas.height/2,id:1},{x:left.x+left.width/2,y:left.y+left.height/2,id:2}];
      const yaw=(await inspect()).games.vehicle.yaw;
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});await frames(.9);
      assert.ok((await inspect()).games.vehicle.yaw-yaw>.05,'two fingers accelerate and turn together');
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[points[1]]});
      const straight=(await inspect()).games.vehicle.yaw;await frames(.3);
      assert.ok(Math.abs((await inspect()).games.vehicle.yaw-straight)<.001,'releasing steering keeps throttle and clears turn');
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[points[0]]});await cdp.detach();
    }else await frames(1);
    s=(await inspect()).games;assert.equal(s.race.leisure,true);assert.equal(s.race.passed,0);assert.ok(Number.isFinite(s.vehicle.y));await page.screenshot({path:out+'/'+id+'.png'});
    await click('.game-hud [data-pause]');await click('[data-exit]');
    console.log('driven',id);
  }
  await menu();await click('[data-arcade]');
  for(const id of ['blocks','snake','bricks','merge','pairs']){
    await click(`[data-game="${id}"]`);await page.waitForFunction(id=>window.__xiangmetaInspect().games.arcade?.id===id,id);
    if(id==='pairs'){await click('[data-card="0"]');await click('[data-card="1"]');}
    else{await click('.arcade-pad [data-key="left"]');if(id==='blocks'||id==='bricks')await click('.arcade-pad [data-key="space"]');await frames(.3);}
    await click('.seasonal-dialog [data-pause]');assert.equal((await inspect()).games.arcade.paused,true);
    await click('.seasonal-dialog [data-pause]');await page.screenshot({path:out+'/'+id+'.png'});await click('[data-back]');
    console.log('arcade',id);
  }
  await click('[data-close]');assert.equal(await page.locator('.seasonal-dialog').evaluate(d=>d.open),false);
  const best=await page.evaluate(()=>localStorage.getItem('xiangmeta.games.v1.arcade.blocks.v2'));assert.ok(best!==null);
  const horizontal=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(horizontal,false);
  assert.deepEqual(errors,[]);console.log('PASS seasonal UI, driving, pause/reset, five arcade games, saved record',best);
}catch(e){await page.screenshot({path:out+'/failure.png'});console.error('page errors',errors);throw e;}
finally{await browser.close();}
