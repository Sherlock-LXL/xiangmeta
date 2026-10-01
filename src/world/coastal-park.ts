import * as T from 'three';
import {material,mesh,tree} from './architecture';
import {nightLight} from './hub';
import {islandFoundation} from './island-foundation';
import {batchStatic} from './optimizer';
import {sign,type Obstacle} from './scenery';
import {palm} from './season-style';
import {parkIslands,parkLinks} from '../../shared/park-layout.mjs';
import type {Region} from '../core/types';

type Point=[number,number,number];
export type Promenade={id:string;from:number[];to:number[];width:number};
const up=new T.Vector3(0,1,0);
function beam(root:T.Object3D,a:Point,b:Point,r:number,mat:T.Material){
  const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start);
  const bar=mesh(root,new T.CylinderGeometry(r,r,delta.length(),8),mat);
  bar.position.copy(start.add(end).multiplyScalar(.5));bar.quaternion.setFromUnitVectors(up,delta.normalize());return bar;
}
/** The deck's top uses exactly the same linearly interpolated plane as walking. */
export function promenade(link:Promenade,arches=false){
  const g=new T.Group();g.name=`promenade-${link.id}`;
  const [ax,ay,az]=link.from,[bx,by,bz]=link.to,dx=bx-ax,dz=bz-az,length=Math.hypot(dx,dz),nx=-dz/length,nz=dx/length,w=link.width/2;
  const stone=material('#e8dec9',.87,0,'paving'),timber=material('#a78c65',.83,0,'wood'),bronze=material('#506f70',.48,.4,'metal'),glow=nightLight('#f9dca2');
  const point=(t:number,side:number,y=0):Point=>[ax+dx*t+nx*side,ay+(by-ay)*t+y,az+dz*t+nz*side];
  const endGap=Math.min(3.2,length*.18),t0=endGap/length,t1=1-t0;
  const geo=new T.BufferGeometry(),vertices=[...point(0,-w),...point(1,-w),...point(1,w),...point(0,w)];
  geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new T.Float32BufferAttribute([0,0,0,length/3,link.width/3,length/3,link.width/3,0],2));geo.setIndex([0,2,1,0,3,2]);geo.computeVertexNormals();
  mesh(g,geo,stone).castShadow=false;
  for(const side of [-1,1]){
    beam(g,point(t0,side*(w-.09),-.17),point(t1,side*(w-.09),-.17),.18,timber);
    beam(g,point(t0,side*(w-.12),1.05),point(t1,side*(w-.12),1.05),.035,bronze);
    beam(g,point(t0,side*(w-.12),.48),point(t1,side*(w-.12),.48),.015,bronze);
    beam(g,point(t0,side*(w-.28),.035),point(t1,side*(w-.28),.035),.025,glow).castShadow=false;
    const posts=Math.max(2,Math.ceil((length-endGap*2)/2.8));
    for(let i=0;i<=posts;i++){
      const t=t0+(t1-t0)*i/posts;
      beam(g,point(t,side*(w-.12)),point(t,side*(w-.12),1.08),.04,bronze);
      if(i>0&&i<posts&&i%2===0)beam(g,point(t,side*(w-.35),-.1),[point(t,side*(w-.35))[0],-6,point(t,side*(w-.35))[2]],.15,timber);
    }
  }
  for(let p=.6;p<length;p+=1.2)beam(g,point(p/length,-w+.3,.008),point(p/length,w-.3,.008),.009,timber).castShadow=false;
  if(arches&&length>8)for(const side of [-1,1]){
    const pts=Array.from({length:25},(_,i)=>{const t=t0+(t1-t0)*i/24;return new T.Vector3(...point(t,side*(w+.1),Math.sin(i/24*Math.PI)*3.5-.32));});
    mesh(g,new T.TubeGeometry(new T.CatmullRomCurve3(pts),40,.105,8,false),stone);
    for(let i=2;i<23;i+=3){const t=t0+(t1-t0)*i/24;beam(g,point(t,side*(w+.1),.1),point(t,side*(w+.1),Math.sin(i/24*Math.PI)*3.5-.32),.022,bronze);}
  }
  return g;
}
function circularWalk(g:T.Group,r:number){
  const pathMat=material('#eee2cd',.93,0,'paving');pathMat.polygonOffset=true;pathMat.polygonOffsetFactor=-1;pathMat.polygonOffsetUnits=-1;
  const path=mesh(g,new T.RingGeometry(r-2.4,r,96),pathMat,0,.04);path.rotation.x=-Math.PI/2;path.castShadow=false;
  for(const radius of [r-2.4,r]){const line=mesh(g,new T.TorusGeometry(radius,.02,6,96),nightLight('#f5dfac'),0,.06);line.rotation.x=-Math.PI/2;line.castShadow=false;}
}
export class CoastalPark{
  private root=new T.Group();private releases:(()=>void)[]=[];private star=new T.Group();private time=0;
  private birds:T.InstancedMesh;private pose=new T.Object3D();
  private balloons:T.Group[]=[];
  constructor(scene:T.Scene,regions:Region[],obstacles:Obstacle[]){
    this.root.name='coastal-park';scene.add(this.root);
    for(const link of parkLinks(regions)){
      const bridge=promenade(link,true);this.root.add(bridge);this.releases.push(batchStatic(bridge));
    }
    for(const place of parkIslands){
      const [x,z]=place.position,foundation=islandFoundation(place.radius,x,z);this.root.add(foundation.group);this.releases.push(foundation.release);
      const g=new T.Group();g.name=place.id;g.position.set(x,0,z);this.root.add(g);
      mesh(g,new T.CylinderGeometry(place.radius,place.radius,.22,96),material('#e5dbbd',.95,0,'stone'),0,-.13);
      const ground=mesh(g,new T.CircleGeometry(place.radius,96),material(place.id==='tide-garden'?'#9eb8a2':'#b7c8c2',1,0,'grass'));ground.rotation.x=-Math.PI/2;ground.castShadow=false;
      circularWalk(g,place.radius-.65);
      const block=(px:number,pz:number,r:number,height=Infinity)=>obstacles.push({x:x+px,z:z+pz,radius:r,height});
      if(place.id==='tide-garden')this.garden(g,block);else this.observatory(g,block);
      const plaque=sign(g,place.title,place.english,'#5e8781',2.6,.66);plaque.position.set(-3.5,1.5,-7.8);plaque.rotation.y=Math.PI*.14;
      beam(g,[-3.5,0,-7.8],[-3.5,1.6,-7.8],.06,material('#597772',.5,.3));block(-3.5,-7.8,.2);
      this.releases.push(batchStatic(g));
    }
    const birdGeo=new T.BufferGeometry();birdGeo.setAttribute('position',new T.Float32BufferAttribute([-.7,0,.14,-.18,.13,0,0,0,0,0,0,0,.18,.13,0,.7,0,.14],3));birdGeo.computeVertexNormals();
    this.birds=new T.InstancedMesh(birdGeo,new T.MeshBasicMaterial({color:'#f5eedc',side:T.DoubleSide}),12);this.birds.frustumCulled=false;this.birds.name='coastal-birds';this.root.add(this.birds);
    this.update(0,false);
  }
  private garden(g:T.Group,block:(x:number,z:number,r:number,h?:number)=>void){
    const stone=material('#efe3c6',.88,.03,'stone'),warm=material('#d9b982',.85,.03,'stone'),timber=material('#9d7a4c',.86,0,'wood'),dark=material('#5f483a',.9,.02,'wood'),copper=material('#b17a4a',.4,.55,'metal'),glow=nightLight('#f7d4a0'),silk=new T.MeshStandardMaterial({color:'#fbf3dc',roughness:.88,side:T.DoubleSide});
    // Lowered granite plaza with concentric water channel.
    const plaza=mesh(g,new T.CylinderGeometry(6.8,7.1,.14,80),stone,0,-.03,0);plaza.receiveShadow=true;
    const channelMat=material('#8fc4c0',.55,.1);channelMat.polygonOffset=true;channelMat.polygonOffsetFactor=-1;channelMat.polygonOffsetUnits=-1;
    const channel=mesh(g,new T.RingGeometry(6.2,6.5,80),channelMat,0,.05,0);channel.rotation.x=-Math.PI/2;channel.castShadow=false;
    // Octagonal timber pavilion over the center.
    const pavilion=new T.Group();g.add(pavilion);
    for(let i=0;i<8;i++){const a=i/8*Math.PI*2;const col=mesh(pavilion,new T.CylinderGeometry(.11,.14,3.4,14),timber,Math.sin(a)*2.6,1.7,Math.cos(a)*2.6);col.castShadow=true;block(Math.sin(a)*2.6,Math.cos(a)*2.6,.18,3.5);
      // Decorative capital.
      mesh(pavilion,new T.BoxGeometry(.36,.1,.36),dark,Math.sin(a)*2.6,3.42,Math.cos(a)*2.6).rotation.y=a;
    }
    // Octagonal entablature.
    const entGeo=new T.CylinderGeometry(2.68,2.68,.26,8);
    mesh(pavilion,entGeo,warm,0,3.63,0);
    const trim=mesh(pavilion,new T.TorusGeometry(2.65,.04,6,80),copper,0,3.76);trim.rotation.x=Math.PI/2;trim.castShadow=false;
    // Pyramidal cedar roof. The panel seams provide enough structure without exposed rods.
    for(let i=0;i<8;i++){const a=i/8*Math.PI*2+Math.PI/8;
      const geo=new T.BufferGeometry();
      const r=2.6,apex=[0,6.1,0];
      const p0:[number,number,number]=[Math.sin(a-Math.PI/8)*r,3.78,Math.cos(a-Math.PI/8)*r],p1:[number,number,number]=[Math.sin(a+Math.PI/8)*r,3.78,Math.cos(a+Math.PI/8)*r];
      geo.setAttribute('position',new T.Float32BufferAttribute([...p0,...p1,...apex],3));geo.computeVertexNormals();
      mesh(pavilion,geo,material('#6e5236',.9,0,'wood')).castShadow=true;
    }
    // Finial.
    mesh(pavilion,new T.CylinderGeometry(.1,.16,.4,12),copper,0,6.3,0);
    mesh(pavilion,new T.OctahedronGeometry(.26,1),glow,0,6.68,0).castShadow=false;
    // Hanging lanterns at four cardinal points.
    for(let i=0;i<4;i++){const a=i/4*Math.PI*2,x=Math.sin(a)*2.0,z=Math.cos(a)*2.0;
      mesh(pavilion,new T.CylinderGeometry(.015,.015,1.1,6),copper,x,3.0,z).castShadow=false;
      const body=mesh(pavilion,new T.CylinderGeometry(.14,.14,.3,10),silk,x,2.4,z);body.castShadow=false;
      mesh(pavilion,new T.CylinderGeometry(.16,.11,.09,10),copper,x,2.6,z).castShadow=false;
      mesh(pavilion,new T.CylinderGeometry(.11,.16,.09,10),copper,x,2.22,z).castShadow=false;
      const flame=mesh(pavilion,new T.SphereGeometry(.09,10,8),glow,x,2.4,z);flame.castShadow=false;flame.name='lantern-flame';
    }
    // Marble bench ring under the roof.
    for(let i=0;i<4;i++){const a=i/4*Math.PI*2+Math.PI/4,bx=Math.sin(a)*1.9,bz=Math.cos(a)*1.9;
      const seat=mesh(pavilion,new T.BoxGeometry(1.8,.14,.42),stone,bx,.46,bz);seat.rotation.y=a;
      for(const dx of [-.75,.75]){const foot=mesh(pavilion,new T.BoxGeometry(.14,.4,.38),warm,bx+Math.cos(a)*dx,.2,bz-Math.sin(a)*dx);foot.rotation.y=a;}
      block(bx,bz,1.0,.52);
    }
    // Garden ring: four parterres at the compass points outside the pavilion.
    const flora=['#f0b8c8','#f6d898','#aed4b6','#dfc8a4'];
    for(let i=0;i<4;i++){const a=i/4*Math.PI*2+Math.PI/8,px=Math.sin(a)*4.4,pz=Math.cos(a)*4.4;
      mesh(g,new T.CylinderGeometry(1.0,1.1,.2,40),warm,px,.1,pz);
      for(let j=0;j<9;j++){const b=j/9*Math.PI*2+i,bx=px+Math.sin(b)*.6,bz=pz+Math.cos(b)*.6;
        mesh(g,new T.CylinderGeometry(.02,.02,.42,6),material('#86a07a',.95,0,'foliage'),bx,.42,bz).castShadow=false;
        mesh(g,new T.SphereGeometry(.08,10,8),material(flora[i],.85,0,'foliage'),bx,.68,bz).castShadow=false;
      }
      block(px,pz,1.1,.75);
    }
    // Palms at the four corners outside the garden ring.
    for(let i=0;i<4;i++){const a=i/4*Math.PI*2,px=Math.sin(a)*6.0,pz=Math.cos(a)*6.0;palm(g,px,pz,.95);block(px,pz,.32);}
    // Secondary border trees between them.
    for(let i=0;i<4;i++){const a=i/4*Math.PI*2+Math.PI/4,px=Math.sin(a)*6.2,pz=Math.cos(a)*6.2;tree(g,px,pz,.85,'#86a390');block(px,pz,.32);}
    // Little tide pool stepping down to the sea at the south edge.
    mesh(g,new T.CylinderGeometry(1.4,1.6,.18,32),stone,0,0,-7.6);
    mesh(g,new T.CylinderGeometry(1.3,1.3,.04,32),material('#7ab3b2',.4,.3),0,.11,-7.6).castShadow=false;
    for(let i=0;i<10;i++){const a=i/10*Math.PI*2;mesh(g,new T.SphereGeometry(.1,8,6),material('#a0b8a4',1,0,'stone'),Math.sin(a)*1.42,.15,-7.6+Math.cos(a)*1.42);}
    block(0,-7.6,1.5,.18);
    // Boundary rail lights along the arrival shore.
    for(let i=0;i<10;i++){const a=-Math.PI+i/9*Math.PI,x=Math.sin(a)*9.2,z=Math.cos(a)*9.2;
      mesh(g,new T.CylinderGeometry(.045,.06,.9,8),dark,x,.45,z);
      mesh(g,new T.SphereGeometry(.11,10,8),glow,x,1.02,z).castShadow=false;
      mesh(g,new T.CylinderGeometry(.14,.14,.06,10),copper,x,.98,z);
    }
    // Tethered hot-air balloon above the garden — a signature silhouette.
    const makeBalloon=(x:number,y:number,z:number,s:number,color:string)=>{
      const b=new T.Group();b.position.set(x,y,z);b.scale.setScalar(s);g.add(b);b.userData.dynamic=true;b.userData.baseY=y;
      const envelope=mesh(b,new T.SphereGeometry(1.5,24,18),material(color,.8,.1,'plaster'),0,0,0);envelope.scale.set(1,1.15,1);envelope.castShadow=false;
      const basket=mesh(b,new T.CylinderGeometry(.45,.4,.42,16),material('#8e6c42',.9,0,'wood'),0,-1.95,0);basket.castShadow=false;
      for(const sx of [-1,1])for(const sz of [-1,1])beam(b,[sx*.52,-1.02,sz*.52],[sx*.32,-1.73,sz*.32],.012,dark).castShadow=false;
      return b;
    };
    this.balloons.push(makeBalloon(-4.5,8.6,3.5,1,'#e8c788'),makeBalloon(5.6,7.4,-1.2,.65,'#d4abb2'));
  }
  private observatory(g:T.Group,block:(x:number,z:number,r:number,h?:number)=>void){
    const stone=material('#f2e7cd',.88,0,'stone'),bronze=material('#ac9160',.37,.62,'metal'),teal=material('#4d797d',.42,.4,'metal'),glow=nightLight('#bfedf0');
    const courtMat=material('#f2e7cd',.88,0,'stone');courtMat.polygonOffset=true;courtMat.polygonOffsetFactor=-1;courtMat.polygonOffsetUnits=-1;
    const court=mesh(g,new T.CircleGeometry(7,72),courtMat,2,.04,0);court.rotation.x=-Math.PI/2;
    // Lower, wider colonnade so the horizon reads through the north and south openings.
    for(let i=0;i<9;i++){
      const a=-Math.PI*.72+i/8*Math.PI*1.44,x=2+Math.cos(a)*5.6,z=Math.sin(a)*5.6;
      mesh(g,new T.CylinderGeometry(.15,.22,3.4,16),stone,x,1.7,z);block(x,z,.26,3.6);
      const rib=Array.from({length:21},(_,j)=>{const t=j/20;return new T.Vector3(2+Math.cos(a)*5.6*Math.cos(t*Math.PI/2),3.4+Math.sin(t*Math.PI/2)*2.1,Math.sin(a)*5.6*Math.cos(t*Math.PI/2));});
      mesh(g,new T.TubeGeometry(new T.CatmullRomCurve3(rib),24,.07,8,false),teal);
    }
    for(const radius of [5.6,5.35]){
      const rim=mesh(g,new T.TorusGeometry(radius,.09,8,96,Math.PI*1.44),stone,2,3.4);
      rim.rotation.set(Math.PI/2,0,-Math.PI*.72);
    }
    // Central brass astrolabe.
    mesh(g,new T.CylinderGeometry(1.25,1.6,.24,48),stone,2,.12,0);
    mesh(g,new T.CylinderGeometry(.43,.75,1.1,32),teal,2,.69,0);block(2,0,1.6,1.95);
    this.star.userData.dynamic=true;this.star.position.set(2,2.6,0);g.add(this.star);
    const planet=mesh(this.star,new T.IcosahedronGeometry(.95,3),material('#8ebdb5',.22,.35));planet.name='observatory-planet';
    for(let i=0;i<3;i++){const ring=mesh(this.star,new T.TorusGeometry(1.55+i*.22,.032,8,72),i===1?glow:bronze);ring.rotation.set(.6+i*.65,.3+i*.8,0);}
    for(let i=0;i<7;i++){const a=i/7*Math.PI*2;mesh(this.star,new T.SphereGeometry(.075,10,8),glow,Math.cos(a)*2,Math.sin(a)*1.2,Math.sin(a)*1.5);}
    const disc=mesh(g,new T.RingGeometry(2.8,3,64),bronze,2,.065);disc.rotation.x=-Math.PI/2;
    for(let i=0;i<24;i++){const a=i/24*Math.PI*2,tick=mesh(g,new T.BoxGeometry(.035,.02,i%3===0?.45:.18),bronze,2+Math.sin(a)*3.4,.04,Math.cos(a)*3.4);tick.rotation.y=a;}
    for(const z of [-8.2,8.2]){tree(g,3,z,1.05,'#8ba9a1');block(3,z,.3);}
    const telescope=new T.Group();telescope.position.set(6,.05,7);telescope.rotation.y=.5;g.add(telescope);
    for(let i=0;i<3;i++){const a=i/3*Math.PI*2;beam(telescope,[Math.sin(a)*.65,0,Math.cos(a)*.65],[0,1.5,0],.035,bronze);}
    const tube=mesh(telescope,new T.CylinderGeometry(.22,.28,1.75,24),teal,0,1.95,0);tube.rotation.z=-.7;block(6,7,.75,2.7);
  }
  update(dt:number,reduced:boolean){
    if(!reduced)this.time+=dt;
    this.star.rotation.y=this.time*.16;
    for(const [i,balloon] of this.balloons.entries()){
      const base=balloon.userData.baseY as number;
      balloon.position.y=base+Math.sin(this.time*.4+i*1.3)*.4;
      balloon.rotation.y=Math.sin(this.time*.18+i*2)*.1;
    }
    for(let i=0;i<12;i++){
      const a=this.time*(.023+i%3*.005)+i*2.39996,r=42+i%4*8;
      this.pose.position.set(10+Math.cos(a)*r,15+i%3*3+Math.sin(a*2)*1.5,20+Math.sin(a)*r);
      this.pose.rotation.set(0,-a,Math.sin(this.time*2+i)*.06);this.pose.scale.setScalar(.75+i%3*.12);this.pose.updateMatrix();this.birds.setMatrixAt(i,this.pose.matrix);
    }
    this.birds.instanceMatrix.needsUpdate=true;
  }
  dispose(){this.releases.forEach(release=>release());}
}
