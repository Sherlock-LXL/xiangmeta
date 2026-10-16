import * as T from 'three';
import {harbor,harborHeight} from '../../shared/harbor.mjs';
import {material,mesh,softBox} from './architecture';
import {sign,type Obstacle} from './scenery';
import {batchStatic} from './optimizer';
import {kit,place,roof,beam as paintedBeam,lantern} from './vernacular';

/** A timber landing stage below the hub: rope-railed ramp, a roofed ticket kiosk and a moored sail junk. */
export function buildHarbor(scene:T.Scene,obstacles:Obstacle[]){
 const root=new T.Group();root.name='harbor';scene.add(root);
 const wood=kit.timberLight(),post=kit.timber(),cap=kit.stoneDark(),rope=material('#b59a6c',.92,0,'wood');
 const box=(w:number,h:number,d:number,x:number,y:number,z:number,m:T.Material=wood)=>mesh(root,softBox(w,h,d),m,x,y,z);
 const beam=(a:T.Vector3,b:T.Vector3,r:number,m:T.Material)=>{const v=b.clone().sub(a),o=mesh(root,new T.CylinderGeometry(r,r,v.length(),6),m);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return o;};
 // Short sloped planks follow the exact walking surface instead of forming floating steps.
 for(let z=harbor.rampStart;z<harbor.deckEnd;z+=.32){const end=Math.min(z+.318,harbor.deckEnd),a=harborHeight(0,z)!,b=harborHeight(0,end)!,plank=box(z<22?3.6:7.4,.16,Math.hypot(end-z,b-a),0,(a+b)/2-.085,(z+end)/2,Math.round(z/.32)%5?wood:post);plank.rotation.x=-Math.atan2(b-a,end-z);}
 for(const side of [-1,1]){
  for(const z of [9.2,11,12.8,14.6,16.4,18.2,20,22]){const y=harborHeight(0,z)!;const p=box(.13,1.08,.13,side*1.68,y+.48,z,post);p.name=z===22?'harbor-ramp-end-post':'harbor-ramp-post';box(.17,.07,.17,side*1.68,y+1.06,z,cap);}
  for(const h of [.38,.92])beam(new T.Vector3(side*1.68,h,9.2),new T.Vector3(side*1.68,harbor.level+h,22),.03,rope);
  obstacles.push({x:side*1.68,z:15.6,radius:.025,segment:[side*1.68,9.2,side*1.68,22],height:1.3});
  for(const z of [22.2,24.2,26.2,28.6]){box(.18,1.08,.18,side*3.52,harbor.level+.48,z,post);box(.28,.1,.28,side*3.52,harbor.level+1.05,z,cap);box(.24,2.8,.24,side*3.3,-6,z,post);}
  for(const h of [.4,.95])beam(new T.Vector3(side*3.52,harbor.level+h,22.2),new T.Vector3(side*3.52,harbor.level+h,28.6),.03,rope);
  obstacles.push({x:side*3.52,z:25.5,radius:.04,segment:[side*3.52,22,side*3.52,29],height:harbor.level+1.3});
 }
 // Ticket kiosk: lacquered posts under a small tiled roof; the counter faces back up the ramp.
 const y=harbor.level;
 for(const x of [-1.4,1.4])for(const z of [26.3,27.9]){place(root,new T.CylinderGeometry(.13,.15,.12,10),kit.stone(),x,y+.06,z);place(root,new T.CylinderGeometry(.08,.09,2.38,10),kit.lacquer(),x,y+1.31,z);obstacles.push({x,z,radius:.15,height:y+2.5});}
 paintedBeam(root,3.1,0,y+2.5,26.3,0,.2,.14);paintedBeam(root,3.1,0,y+2.5,27.9,0,.2,.14);
 roof(root,{width:3,depth:1.7,height:.62,overhang:.42,lift:.22,y:y+2.6,z:27.1});
 box(2.5,.88,.8,0,y+.44,26.7,post);box(2.8,.12,1,0,y+.94,26.7,wood);
 for(let i=0;i<5;i++)box(.36,.6,.03,-1+i*.5,y+.45,26.29,kit.lattice());
 const name=sign(root,'海风港口','等下一次，向海出发','#acd9c5',2.7,.55);name.position.set(0,y+1.9,27.1);name.rotation.y=Math.PI;
 obstacles.push({x:0,z:26.7,radius:0,halfX:1.35,halfZ:.5,height:y+1.06});
 box(7.25,.09,.09,0,y+.95,28.75,rope);obstacles.push({x:0,z:28.75,radius:.04,segment:[-3.6,28.75,3.6,28.75],height:y+1.3});
 // Stone bollards and coiled lines stay outside the clear walking strip.
 for(const x of [-2.9,2.9])for(const z of [23,27.6]){place(root,new T.CylinderGeometry(.12,.15,.3,10),kit.stone(),x,y+.15,z);place(root,new T.SphereGeometry(.13,10,6),kit.stone(),x,y+.33,z).scale.y=.6;}
 for(let i=0;i<3;i++){const coil=mesh(root,new T.TorusGeometry(.22-i*.05,.03,5,20),rope,-3.1,y+.04+i*.05,25.2);coil.rotation.x=Math.PI/2;}
 lantern(root,3.05,25.2,.62,y);obstacles.push({x:3.05,z:25.2,radius:.25,height:y+1.2});
 for(const z of [23,27.6]){const curve=new T.CatmullRomCurve3([new T.Vector3(2.9,y+.3,z),new T.Vector3(3.85,-5.2,z+.12),new T.Vector3(5.3,-4.82,z+.15)]);mesh(root,new T.TubeGeometry(curve,12,.018,5,false),rope).castShadow=false;}
 const release=batchStatic(root);
 // A moored junk rests at sea level, separate from the accessible pier.
 const boat=new T.Group();boat.name='harbor-launch';boat.position.set(5.65,-5.35,25.5);scene.add(boat);
 // An open-topped shell meets a matching oval deck; bow and stern sweep up as separate blocks.
 const hullWood=material('#4a3527',.82,.02,'wood'),cut=Math.acos(.6),hull=mesh(boat,new T.SphereGeometry(1,40,18,0,Math.PI*2,cut,Math.PI-cut),hullWood);hull.scale.set(1.25,.7,3.1);
 const outline=new T.Shape();outline.absellipse(0,0,1.03,2.51,0,Math.PI*2,false,0);
 const deck=mesh(boat,new T.ExtrudeGeometry(outline,{depth:.12,bevelEnabled:false,curveSegments:48}),wood,0,.42);deck.rotation.x=-Math.PI/2;deck.name='launch-oval-deck';
 const seam=material('#7d5c3e',.92,0,'wood');
 for(let z=-2.3;z<=2.3;z+=.28){const w=2.04*Math.sqrt(1-(z/2.51)**2);mesh(boat,new T.BoxGeometry(w,.006,.012),seam,0,.544,z);}
 const gunwale=mesh(boat,new T.TorusGeometry(1,.04,6,64),post,0,.55);gunwale.rotation.x=Math.PI/2;gunwale.scale.set(1.06,2.55,1);
 for(const s of [-1,1]){const end=mesh(boat,softBox(.9,.42,.7),hullWood,0,.7,s*2.45);end.rotation.x=-s*.32;}
 // Arched woven cabin (wupeng) of split bamboo: a half-cylinder along the hull, ribbed in timber.
 const mat=material('#c9a86a',.95,0,'wood');mat.side=T.DoubleSide;
 const cabin=mesh(boat,new T.CylinderGeometry(.82,.82,1.7,18,1,true,-Math.PI/2,Math.PI),mat,0,.54,-.35);cabin.rotation.x=-Math.PI/2;
 for(let i=0;i<5;i++)mesh(boat,new T.TorusGeometry(.83,.025,4,18,Math.PI),post,0,.54,-1.15+i*.4);
 // Mast with a battened junk sail in ochre; sail and battens share one rig frame trailing aft.
 mesh(boat,new T.CylinderGeometry(.045,.06,3.3,8),post,0,2.15,1.25);
 const rig=new T.Group();rig.position.set(0,1.45,1.25);rig.rotation.y=Math.PI/2-.35;boat.add(rig);
 const sail=new T.Shape();sail.moveTo(0,0);sail.lineTo(1.5,.05);sail.quadraticCurveTo(1.7,1.2,1.25,2.35);sail.lineTo(0,2.2);sail.closePath();
 const canvas=material('#b4623a',.95,0,'plaster');canvas.side=T.DoubleSide;
 const cloth=mesh(rig,new T.ShapeGeometry(sail,10),canvas,0,0,.07);cloth.castShadow=false;
 for(let i=0;i<6;i++){const h=.05+i*.44,w=i<3?1.5+i*.06:1.62-(i-2)*.12;mesh(rig,new T.BoxGeometry(w,.035,.035),post,w/2,h,.1);}
 // Sculling oar (yuloh) trails astern.
 const oar=mesh(boat,new T.BoxGeometry(.06,.05,2.2),post,.35,.75,-2.9);oar.rotation.x=-.45;
 const boatRelease=batchStatic(boat);let time=0;
 return {root,boat,update(dt:number){time+=dt;boat.position.y=-5.35+Math.sin(time*.7)*.055;boat.rotation.z=Math.sin(time*.55)*.018;},dispose(){release();boatRelease();}};
}
