import * as T from 'three';
import {mesh,softBox,material} from './architecture';
import {kit,roof,lantern} from './vernacular';
import {sign} from './scenery';

const rod=(g:T.Object3D,a:number[],b:number[],radius:number,mat:T.Material)=>{
  const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start);
  const m=mesh(g,new T.CylinderGeometry(radius,radius,delta.length(),8),mat);
  m.position.copy(start.add(end).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return m;
};
const box=(g:T.Object3D,w:number,h:number,d:number,mat:T.Material,x=0,y=0,z=0)=>mesh(g,softBox(w,h,d),mat,x,y,z);
/** Small sculpted vehicles share the world's painted materials and warm timber details. */
export function gameVehicle(kind:string,rider=true){
  const root=new T.Group(),body=new T.Group();root.add(body);root.name='game-vehicle-'+kind;
  const wheels:T.Object3D[]=[],paint=material(kind==='spring'?'#a95c52':kind==='summer'?'#528b84':'#d4aa64',.72,0);
  if(kind==='spring'){
    for(const z of [-.72,.76]){
      const wheel=new T.Group();wheel.position.set(0,.36,z);body.add(wheel);wheels.push(wheel);
      const tire=mesh(wheel,new T.TorusGeometry(.29,.085,10,24),kit.ink());tire.rotation.y=Math.PI/2;
      const hub=mesh(wheel,new T.CylinderGeometry(.07,.07,.24,12),kit.bronze());hub.rotation.z=Math.PI/2;
      for(let i=0;i<8;i++){const a=i*Math.PI/4;rod(wheel,[0,0,0],[0,Math.sin(a)*.26,Math.cos(a)*.26],.012,kit.marble());}
    }
    for(const s of [-1,1]){
      rod(body,[s*.12,.36,-.72],[s*.12,.72,.02],.045,kit.bronze());
      rod(body,[s*.12,.72,.02],[s*.12,.35,.76],.045,kit.bronze());
      rod(body,[s*.12,.38,.76],[s*.12,1.12,.55],.04,kit.marble());
      rod(body,[s*.12,.38,-.72],[s*.12,.78,-.32],.035,kit.marble());
    }
    box(body,.40,.27,.60,paint,0,.82,.16);box(body,.36,.12,.68,kit.ink(),0,.91,-.3);
    box(body,.22,.29,.30,kit.stoneDark(),0,.50,-.04);
    rod(body,[-.40,1.14,.56],[.40,1.14,.56],.034,kit.ink());
    for(const z of [-.74,.80])box(body,.26,.055,.43,paint,0,.75,z);
    const light=mesh(body,new T.SphereGeometry(.105,12,8),kit.lamp(),0,.96,.77);light.scale.z=.4;
    rod(body,[.22,.50,-.20],[.24,.46,-.76],.065,kit.bronze());
    for(const s of [-1,1])rod(body,[0,.48,-.12],[s*.29,.48,-.12],.04,kit.ink());
  }else if(kind==='summer'){
    const hull=new T.Shape();hull.moveTo(0,1.8);hull.bezierCurveTo(.58,1.5,.82,.45,.76,-1.45);hull.lineTo(-.76,-1.45);hull.bezierCurveTo(-.82,.45,-.58,1.5,0,1.8);
    const geo=new T.ExtrudeGeometry(hull,{depth:.38,bevelEnabled:true,bevelSize:.12,bevelThickness:.12,bevelSegments:2,steps:1,curveSegments:12});
    geo.rotateX(Math.PI/2);geo.translate(0,.25,0);mesh(body,geo,paint);
    box(body,1.25,.13,2.36,kit.paper(),0,.30,-.12);
    box(body,.92,.23,.67,kit.timberLight(),0,.46,.76);
    for(const x of [-.32,.32]){box(body,.44,.16,.52,kit.ink(),x,.45,-.55);box(body,.44,.42,.12,kit.paper(),x,.61,-.83);}
    const shield=box(body,1.0,.42,.07,kit.celadon(),0,.72,.33);shield.rotation.x=-.32;
    box(body,.28,.58,.25,kit.ink(),0,.15,-1.55);
    rod(body,[-.52,.50,1.15],[.52,.50,1.15],.025,kit.bronze());
    const wheel=mesh(body,new T.TorusGeometry(.13,.025,6,16),kit.bronze(),-.28,.70,.04);wheel.rotation.x=-.5;
  }else{
    const vertices:number[]=[],indices:number[]=[],uv:number[]=[];
    for(let j=0;j<=5;j++)for(let i=0;i<=32;i++){
      const x=(i/32-.5)*7.5,t=x/3.75,z=(j/5-.5)*1.8;
      vertices.push(x,3.0-.9*t*t+.22*Math.sin(j/5*Math.PI),z+.4*t*t);uv.push(i/32,j/5);
    }
    for(let j=0;j<5;j++)for(let i=0;i<32;i++){const a=j*33+i;indices.push(a,a+1,a+33,a+1,a+34,a+33);}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
    const sail=paint.clone();sail.side=T.DoubleSide;mesh(body,geo,sail).name='owned-material';
    for(let i=0;i<13;i++){
      const x=(i/12-.5)*7.5,t=x/3.75,y=3-.9*t*t;
      rod(body,[x,y,-.9+.4*t*t],[x,y+.20,.4*t*t],.018,kit.paper());
      if(i%2===0)for(const z of [-.6,.7])rod(body,[x,y,z+.4*t*t],[Math.sign(x)*.22,.85,0],.009,kit.timber());
    }
    box(body,.55,.45,.68,kit.ink(),0,.35,0);
    for(const s of [-1,1])rod(body,[s*.23,.30,-.3],[s*.24,.94,.05],.025,kit.bronze());
  }
  if(rider){
    const pilot=new T.Group();body.add(pilot);pilot.position.set(kind==='summer'?-.30:0,kind==='spring'?.98:kind==='summer'?.50:.42,kind==='spring'?-.28:kind==='summer'?-.50:0);
    const coat=mesh(pilot,new T.SphereGeometry(1,12,10),kit.paper(),0,.25,0);coat.scale.set(.19,.30,.15);coat.rotation.x=.18;
    mesh(pilot,new T.SphereGeometry(.18,16,10),kit.ink(),0,.63,.08);
    const visor=mesh(pilot,new T.SphereGeometry(.15,12,8),kit.celadon(),0,.63,.18);visor.scale.set(1,.60,.50);
    for(const s of [-1,1]){
      rod(pilot,[s*.16,.40,.04],[s*.30,kind==='autumn'?.65:.19,.37],.055,kit.paper());
      rod(pilot,[s*.13,.06,0],[s*.24,-.20,.20],.06,kit.timber());
      rod(pilot,[s*.24,-.20,.20],[s*.24,-.42,.12],.05,kit.ink());
    }
  }
  return {root,animate:(speed:number,bank:number,pitch:number,dt:number)=>{body.rotation.set(-pitch,0,bank,'YXZ');wheels.forEach(w=>w.rotation.x+=speed*dt/.36);}};
}
export function gameStall(id:string,title:string,color:string){
  const root=new T.Group();root.name='seasonal-stall-'+id;
  box(root,2.65,.14,2.2,kit.stone(),0,.02,0);
  for(const x of [-1.10,1.10])for(const z of [-.82,.82])box(root,.12,2.7,.12,kit.timber(),x,1.35,z);
  roof(root,{width:2.3,depth:1.85,height:.52,overhang:.30,lift:.17,y:2.68,material:id==='winter'?kit.marble():kit.tile()});
  const plaque=sign(root,title,id==='winter'?'V · 入室游玩':'V · 竞速 / 自由漫游',color,2.04,.51);plaque.position.set(0,2.32,1.03);
  lantern(root,-.9,.80,.30,1.55);
  if(id==='winter'){
    box(root,2.15,2.4,.1,kit.plaster(),0,1.2,-.88);
    for(const x of [-.57,.57]){
      box(root,.70,1.26,.65,kit.timber(),x,.70,-.2);
      box(root,.59,.57,.07,kit.ink(),x,1.22,.17);
      const screen=box(root,.45,.38,.025,kit.lamp('#9bc7cf'),x,1.25,.22);screen.name='arcade-screen';
      for(let i=0;i<4;i++)box(root,.07,.07,.018,kit.paper(),x-.14+i*.09,1.2+(i%2)*.1,.24);
      box(root,.6,.07,.38,kit.lacquer(),x,.86,.26);
      mesh(root,new T.SphereGeometry(.046,8,6),kit.gold(),x-.15,.96,.34);
    }
  }else{
    box(root,1.65,.12,.95,kit.timberLight(),0,.37,0);
    const display=gameVehicle(id,false).root;display.scale.setScalar(id==='autumn'?.23:id==='summer'?.39:.7);display.position.y=.44;display.rotation.y=Math.PI/2;root.add(display);
  }
  return root;
}
export function releaseGameObject(root:T.Object3D){
  root.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line||o instanceof T.Points){o.geometry.dispose();if(o.name==='owned-material')(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());}});
  root.removeFromParent();
}
