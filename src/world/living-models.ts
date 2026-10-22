import * as T from 'three';
import {material,mesh} from './architecture';

type Rig={root:T.Group;head:T.Group;legs:T.Group[];tail:T.Group;animate:(phase:number,moving:number,headYaw:number,mood:string,time:number)=>void};
const clay=(color:string)=>material(color,.92,0,'plaster');
const cream=clay('#fff3dd'),ink=clay('#303a37'),pink=clay('#dc9b91'),jade=clay('#82ad98'),wood=clay('#90775b');
const sphere=new T.SphereGeometry(1,14,10);
function oval(g:T.Object3D,m:T.Material,x:number,y:number,z:number,sx:number,sy:number,sz:number){
  const o=mesh(g,sphere,m,x,y,z);o.scale.set(sx,sy,sz);return o;
}
function rod(g:T.Object3D,m:T.Material,a:number[],b:number[],r:number,tip=r){
  const from=new T.Vector3(...a),to=new T.Vector3(...b),o=mesh(g,new T.CylinderGeometry(tip,r,from.distanceTo(to),8),m);
  o.position.copy(from).add(to).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),to.sub(from).normalize());return o;
}
function curl(g:T.Object3D,m:T.Material,points:number[][],r:number){
  return mesh(g,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),20,r,6,false),m);
}
function ear(g:T.Object3D,m:T.Material,x:number,y:number,z:number,h:number,w:number){
  const o=mesh(g,new T.ConeGeometry(w,h,4),m,x,y,z);o.rotation.y=Math.PI/4;
  oval(g,pink,x,y-.015,z+w*.45,w*.48,h*.3,w*.15);
}
function eyes(g:T.Object3D,x:number,y:number,z:number,r=.038){
  for(const s of [-1,1]){
    oval(g,ink,x*s,y,z,r,r*1.12,r*.65);
    oval(g,cream,x*s-r*.2,y+r*.3,z+r*.56,r*.26,r*.26,r*.2);
  }
}
function patternedCoat(color:string,kind:'deer'|'cat'){
  const m=clay(color),compile=m.onBeforeCompile;
  m.onBeforeCompile=(shader,renderer)=>{
    compile.call(m,shader,renderer);
    shader.vertexShader='varying vec3 vFur;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvFur=position;');
    shader.fragmentShader='varying vec3 vFur;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      ${kind==='deer'?`vec2 cell=vec2(vFur.z*3.6,vFur.y*4.);cell.x+=floor(cell.y)*.5;
        float mark=(1.-smoothstep(.13,.19,length(fract(cell)-.5)))*step(.05,vFur.y)*step(.4,abs(vFur.x));
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.9,.81,.62),mark*.88);`:
        `float mark=smoothstep(.79,.94,sin(vFur.z*13.+vFur.y*2.))*smoothstep(-.2,.3,vFur.y);
        diffuseColor.rgb*=1.-mark*.4;`}`);
  };m.customProgramCacheKey=()=>`living-coat-${kind}`;return m;
}
function paws(root:T.Group,m:T.Material,width:number,length:number,height:number,radius:number){
  const legs:T.Group[]=[];
  for(const z of [-length,length])for(const x of [-width,width]){
    const leg=new T.Group();leg.position.set(x,height,z);leg.userData.restY=height;root.add(leg);
    oval(leg,m,0,-height*.47,0,radius,height*.52,radius);
    oval(leg,m,0,-height+.065,.045,radius*1.08,.065,radius*1.4);legs.push(leg);
  }
  return legs;
}

/** Small sculpted silhouettes, restrained mineral colours and articulated details. +Z is forward. */
export function animalModel(kind:string):Rig{
  const root=new T.Group(),head=new T.Group(),tail=new T.Group();root.name=`animal-model-${kind}`;
  root.add(head,tail);let legs:T.Group[]=[],body:T.Mesh|undefined;
  if(['cat','fox','shiba','deer','polar-bear'].includes(kind)){
    const deer=kind==='deer',bear=kind==='polar-bear',fox=kind==='fox',cat=kind==='cat';
    const coat=clay(bear?'#f2eee0':deer?'#bf9470':fox?'#cc865d':cat?'#9b9685':'#d8ae76');
    const belly=deer?1.0:bear?.75:.37,len=deer?.48:bear?.6:.3,wide=bear?.38:deer?.24:.19;
    body=oval(root,deer||cat?patternedCoat(deer?'#bf9470':'#9b9685',deer?'deer':'cat'):coat,0,belly,0,wide,bear?.42:deer?.32:.23,len);
    oval(root,cream,0,belly-.12,.04,wide*.85,.15,len*.78);
    legs=paws(root,coat,wide*.57,len*.52,deer?.88:bear?.56:.26,deer?.057:bear?.13:.052);
    if(deer)for(const leg of legs)oval(leg,wood,0,-.815,.03,.065,.065,.09);
    head.position.set(0,deer?1.26:bear?.95:.56,deer?.37:bear?.5:.29);
    if(deer)oval(head,coat,0,-.16,-.025,.16,.36,.17);
    const hw=bear?.25:deer?.16:.18,hh=bear?.23:deer?.23:.17;
    oval(head,coat,0,0,0,hw,hh,hw*.87);
    const noseZ=bear?.23:deer?.21:fox?.23:cat?.135:.16;
    if(cat){
      for(const s of [-1,1])oval(head,cream,s*.045,-.065,.127,.061,.041,.048);
      const nose=mesh(head,new T.ConeGeometry(.022,.027,3),pink,0,-.043,.17);nose.rotation.z=Math.PI;
    }else if(fox){
      for(const s of [-1,1])oval(head,cream,s*.08,-.055,.11,.076,.065,.05);
      const snout=mesh(head,new T.ConeGeometry(.095,.21,10),cream,0,-.047,.195);snout.rotation.x=Math.PI/2;
      oval(head,ink,0,-.045,.299,.034,.023,.022);
    }else{
      oval(head,deer?coat:cream,0,-hh*.38,noseZ*.7,hw*(deer?.6:.72),hh*(deer?.39:.5),noseZ*(deer?.8:.7));
      oval(head,ink,0,-hh*.24,noseZ*1.26,hw*.25,hh*.14,hw*.16);
    }
    eyes(head,hw*.58,hh*.12,hw*.8,bear?.035:.028);
    if(bear){
      for(const s of [-1,1]){oval(head,coat,s*.21,.19,0,.084,.092,.06);oval(head,pink,s*.21,.19,.045,.045,.049,.02);}
      oval(tail,coat,0,.83,-.62,.1,.12,.12);
    }else{
      for(const s of [-1,1])ear(head,coat,s*hw*.77,hh*.98,0,deer?.29:fox?.23:.17,deer?.073:.078);
      if(deer){
        for(const s of [-1,1]){
          curl(head,wood,[[s*.085,.16,-.045],[s*.13,.35,-.09],[s*.22,.55,-.08],[s*.25,.69,-.04]],.021);
          rod(head,wood,[s*.17,.44,-.085],[s*.08,.58,.025],.017,.009);
          rod(head,wood,[s*.22,.55,-.08],[s*.34,.65,-.13],.016,.008);
        }
        oval(tail,cream,0,1.13,-.46,.09,.07,.17);
      }else if(cat){
        curl(tail,coat,[[0,.37,-.27],[.1,.5,-.42],[.17,.78,-.43],[.08,.88,-.38]],.043);
        for(const s of [-1,1])for(let i=0;i<2;i++)rod(head,cream,[s*.1,-.05,.15],[s*.25,-.035-i*.04,.14],.004);
      }else if(fox){
        const plume=oval(tail,coat,.07,.24,-.39,.14,.14,.32);plume.rotation.x=.25;
        oval(tail,cream,.075,.17,-.61,.11,.105,.13);
      }else{
        curl(tail,coat,[[0,.4,-.28],[.06,.64,-.34],[.16,.66,-.21],[.14,.54,-.18]],.075);
        for(const s of [-1,1])oval(head,cream,s*.11,.07,.145,.05,.033,.015);
      }
    }
  }else if(kind==='rabbit'){
    body=oval(root,cream,0,.22,-.05,.2,.22,.28);head.position.set(0,.38,.17);
    oval(head,cream,0,0,0,.17,.17,.15);eyes(head,.082,.022,.13,.026);
    oval(head,pink,0,-.03,.158,.025,.018,.014);
    for(const s of [-1,1]){const e=oval(head,cream,s*.077,.235,-.018,.056,.2,.048);e.rotation.z=-s*.15;oval(head,pink,s*.081,.25,.021,.029,.145,.012);}
    legs=paws(root,cream,.11,.1,.16,.075);oval(tail,cream,0,.26,-.32,.09,.085,.08);
  }else if(kind==='crab'){
    const shell=clay('#cf8e76');body=oval(root,shell,0,.15,0,.22,.1,.17);
    for(const s of [-1,1]){
      for(let i=0;i<3;i++){
        const leg=new T.Group();leg.position.y=.13;leg.userData.restY=.13;root.add(leg);legs.push(leg);
        curl(leg,shell,[[s*.15,0,-.12+i*.11],[s*.3,-.01,-.2+i*.15],[s*.36,-.105,-.2+i*.17]],.023);
      }
      rod(root,shell,[s*.17,.14,.1],[s*.29,.18,.24],.029);
      oval(root,shell,s*.3,.19,.28,.075,.055,.1);
      for(const j of [-1,1])rod(root,shell,[s*.3+j*.038,.2,.3],[s*.3+j*.027,.2,.39],.02,.008);
      rod(head,shell,[s*.085,.2,.08],[s*.105,.29,.1],.018);
    }
    eyes(head,.105,.3,.11,.027);
  }else if(kind==='heron'){
    const slate=clay('#7e9ba4');body=oval(root,slate,0,.79,-.04,.16,.25,.28);
    for(const s of [-1,1]){
      const leg=new T.Group();leg.position.set(s*.085,.79,0);leg.userData.restY=.79;root.add(leg);legs.push(leg);
      rod(leg,wood,[0,-.75,.03],[0,-.37,-.045],.021);
      rod(leg,wood,[0,-.37,-.045],[0,0,0],.025);
      for(const j of [-1,0,1])rod(leg,wood,[0,-.76,.03],[j*.06,-.764,.17],.011);
      oval(root,clay('#566e7b'),s*.13,.8,-.095,.05,.2,.23);
    }
    curl(root,cream,[[0,.87,.08],[0,1.06,.17],[0,1.16,.1],[0,1.29,.18]],.068);
    head.position.set(0,1.31,.2);oval(head,cream,0,0,0,.093,.1,.13);
    rod(head,wood,[0,-.015,.11],[0,-.025,.34],.045,.002);eyes(head,.069,.025,.065,.018);
    curl(head,ink,[[0,.07,-.02],[0,.08,-.13],[0,.02,-.23]],.015);
  }else if(kind==='tortoise'){
    const shell=clay('#879c75');body=oval(root,shell,0,.22,-.02,.27,.17,.31);
    oval(root,wood,0,.12,-.02,.28,.05,.32);
    for(const x of [-.14,0,.14])for(const z of [-.13,.04,.19])oval(root,jade,x,.335-Math.abs(x)*.26-Math.abs(z)*.13,z,.059,.019,.06);
    legs=paws(root,jade,.2,.14,.13,.056);head.position.set(0,.18,.32);
    oval(head,jade,0,0,0,.095,.085,.12);eyes(head,.062,.03,.078,.018);
    rod(tail,jade,[0,.14,-.29],[0,.08,-.4],.045,.005);
  }else{
    const slate=clay('#516d79');body=oval(root,slate,0,.34,0,.2,.32,.18);
    oval(root,cream,0,.33,.112,.156,.25,.071);head.position.set(0,.6,.015);
    oval(head,slate,0,0,0,.167,.158,.15);
    for(const s of [-1,1])oval(head,cream,s*.075,-.025,.117,.065,.08,.031);
    eyes(head,.074,.01,.147,.024);rod(head,wood,[0,-.046,.15],[0,-.055,.235],.05,.006);
    for(const s of [-1,1]){
      const wing=oval(root,slate,s*.21,.34,-.013,.042,.2,.089);wing.rotation.z=s*.23;
      const leg=new T.Group();leg.position.set(s*.1,.09,0);leg.userData.restY=.09;root.add(leg);legs.push(leg);
      oval(leg,wood,0,-.045,.075,.079,.038,.135);
    }
  }
  const baseY=body?.position.y??0;if(body)body.userData.dynamic=true;
  return {root,head,legs,tail,animate(phase,moving,headYaw,mood,time){
    head.rotation.y=headYaw*.7;head.rotation.x=mood==='graze'?.2:mood==='pet'?-.13:Math.sin(time*.7)*.018;
    legs.forEach((leg,i)=>{const step=Math.sin(phase+(i===0||i===3?0:Math.PI))*moving;leg.rotation.x=step*(kind==='crab'?.08:.24);leg.position.y=leg.userData.restY+Math.abs(step)*.045;});
    tail.rotation.y=Math.sin(time*(mood==='pet'?4:1.2))*(mood==='pet'?.18:.035);
    if(body)body.position.y=baseY+(1+Math.sin(time*1.4))*.003;
  }};
}

/** Portable objects use the same ceramic, bamboo and carved-stone language as the islands. */
export function seasonalModel(kind:string){
  const root=new T.Group();root.name=`portable-${kind}`;const coral=clay('#d69988'),blue=clay('#a4cccf'),gold=clay('#d7b978');
  const pot=(m:T.Material,r=.18,h=.35)=>{mesh(root,new T.CylinderGeometry(r,r*.68,h,16),m,0,h/2);mesh(root,new T.TorusGeometry(r,.022,6,24),m,0,h).rotation.x=Math.PI/2;};
  const basket=(tea:boolean)=>{
    pot(wood,.25,.24);
    for(let i=0;i<5;i++)mesh(root,new T.TorusGeometry(.19+i*.012,.013,5,24),gold,0,.035+i*.042).rotation.x=Math.PI/2;
    curl(root,wood,[[-.23,.2,0],[-.2,.4,0],[0,.49,0],[.2,.4,0],[.23,.2,0]],.022);
    for(let i=0;i<7;i++){const a=i*2.4,r=.13*Math.sqrt(i/7);oval(root,tea?jade:gold,Math.sin(a)*r,.27,Math.cos(a)*r,.065,tea?.045:.07,.049);}
  };
  if(kind==='peach-pot'){
    pot(blue,.14,.3);curl(root,wood,[[0,.22,0],[-.06,.48,0],[.05,.69,0]],.012);
    for(let i=0;i<5;i++){const x=Math.sin(i*3)*.12,y=.41+i*.056;rod(root,wood,[0,y-.02,0],[x,y,.01],.008);
      for(let j=0;j<5;j++)oval(root,coral,x+Math.cos(j*1.257)*.028,y+Math.sin(j*1.257)*.028,.014,.028,.025,.012);}
  }else if(kind==='pinwheel'){
    pot(cream,.12,.12);rod(root,wood,[0,.08,0],[0,.69,0],.016);
    const rotor=new T.Group();rotor.name='pinwheel-rotor';rotor.position.set(0,.62,.02);root.add(rotor);
    for(let i=0;i<4;i++){const petal=mesh(rotor,new T.ConeGeometry(.075,.23,3),i%2?coral:jade);petal.position.set(Math.sin(i*Math.PI/2)*.1,Math.cos(i*Math.PI/2)*.1,0);petal.rotation.z=-i*Math.PI/2;}
    oval(rotor,gold,0,0,.05,.028,.028,.025);
  }else if(kind.endsWith('basket'))basket(kind==='tea-basket');
  else if(kind==='inkstone'){
    const stone=clay('#688b85');oval(root,stone,0,.065,0,.27,.065,.19);oval(root,ink,0,.112,.025,.16,.015,.1);
    rod(root,wood,[-.2,.14,-.08],[.17,.14,-.08],.015);rod(root,ink,[.17,.14,-.08],[.23,.13,-.08],.014,.002);
  }else if(kind==='conch'){
    for(let i=0;i<7;i++){const a=i*.7,r=.13*(1-i/9);oval(root,i%2?cream:coral,Math.cos(a)*r,.12+i*.026,Math.sin(a)*r,.12-i*.011,.08-i*.006,.1-i*.009);}
    oval(root,coral,.17,.095,.04,.1,.07,.075);
  }else if(kind==='watering-can'){
    pot(jade,.17,.28);curl(root,wood,[[-.13,.23,0],[-.29,.34,0],[-.29,.07,0],[-.13,.08,0]],.023);
    rod(root,jade,[.12,.08,0],[.29,.3,0],.039,.055);oval(root,gold,.3,.315,0,.066,.025,.063);
  }else if(kind.includes('lantern')){
    const warm=new T.MeshStandardMaterial({color:kind==='sea-lantern'?'#d6eddf':'#f3cf9c',emissive:'#d6a575',emissiveIntensity:.18,roughness:.85});
    if(kind==='maple-lantern')oval(root,warm,0,.27,0,.22,.24,.21);else mesh(root,new T.CylinderGeometry(.17,.17,.36,8),warm,0,.24);
    for(const y of [.065,.45])mesh(root,new T.CylinderGeometry(.18,.18,.035,8),wood,0,y);
    for(let i=0;i<6;i++){const a=i*Math.PI/3;rod(root,wood,[Math.sin(a)*.175,.08,Math.cos(a)*.175],[Math.sin(a)*.175,.44,Math.cos(a)*.175],.012);}
    curl(root,wood,[[-.13,.46,0],[-.12,.59,0],[0,.62,0],[.12,.59,0],[.13,.46,0]],.017);
  }else if(kind==='shell-bowl'){
    oval(root,blue,0,.06,0,.26,.06,.2);
    for(let i=0;i<5;i++)oval(root,i%2?cream:coral,Math.sin(i*2.4)*.13,.13,Math.cos(i*2.4)*.12,.058,.043,.07);
  }else if(kind==='pumpkin'){
    for(let i=0;i<9;i++){const a=i*Math.PI*2/9;oval(root,clay(i%2?'#d8a064':'#e2af73'),Math.sin(a)*.13,.2,Math.cos(a)*.13,.145,.19,.145);}
    curl(root,wood,[[0,.32,0],[0,.42,0],[.055,.45,.01]],.029);oval(root,jade,.09,.38,0,.095,.014,.042);
  }else if(kind==='scroll-box'){
    mesh(root,new T.BoxGeometry(.54,.15,.3),wood,0,.075);mesh(root,new T.BoxGeometry(.56,.04,.32),jade,0,.17);
    for(const z of [-.08,.08]){const scroll=mesh(root,new T.CylinderGeometry(.046,.046,.43,10),cream,0,.226,z);scroll.rotation.z=Math.PI/2;}
  }else if(kind==='snow-bunny'){
    oval(root,cream,0,.17,0,.22,.17,.24);oval(root,cream,0,.26,.14,.14,.12,.13);
    for(const s of [-1,1])oval(root,jade,s*.066,.405,.09,.035,.12,.025);eyes(root,.067,.275,.249,.017);
  }else if(kind==='snow-globe'){
    mesh(root,new T.CylinderGeometry(.22,.24,.1,16),wood,0,.05);
    const glass=new T.MeshStandardMaterial({color:'#b9dfe3',transparent:true,opacity:.22,roughness:.2,depthWrite:false});
    oval(root,glass,0,.31,0,.23,.23,.23);oval(root,cream,0,.13,0,.19,.045,.17);
    mesh(root,new T.ConeGeometry(.1,.27,7),jade,0,.27);oval(root,cream,.1,.16,.05,.04,.04,.04);
  }else if(kind==='ice-crystal'){
    for(let i=0;i<3;i++){const crystal=mesh(root,new T.ConeGeometry(.105,.5-i*.08,5),i%2?blue:jade,(i-1)*.12,.25-i*.04,0);crystal.rotation.z=(i-1)*-.18;}
    oval(root,cream,0,.035,0,.24,.035,.16);
  }else{
    pot(coral,.125,.4);mesh(root,new T.CylinderGeometry(.13,.13,.09,16),cream,0,.45);
    curl(root,wood,[[-.1,.32,0],[-.2,.31,0],[-.2,.13,0],[-.1,.13,0]],.023);
  }
  return root;
}
