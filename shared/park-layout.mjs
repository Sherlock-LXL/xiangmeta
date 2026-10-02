/** Public places are independent of project slots. Geometry and walking share this layout. */
export const parkIslands=[
  {id:'tide-garden',title:'潮汐花园',english:'TIDAL GARDEN',description:'走过海面，在风帆下休息，听海风经过。',position:[0,66],radius:12,color:'#b5d4bf',spawn:[0,-8],look:[0,2]},
  {id:'star-deck',title:'观星台',english:'STAR OBSERVATORY',description:'一座面向海天的开放天文台，转动星环，把世界留在喜欢的时刻。',position:[62,2],radius:12,color:'#bccfdb',spawn:[-7,0],look:[2,0]}
];
export const parkDeckVisualOffset=-.028;
export const parkConnections=[
  {id:'autumn-walk',regionId:'personal-museum',offset:[8,13],destination:'tide-garden',arrival:[-6,-9],width:3.4},
  {id:'summer-walk',regionId:'weiming-studio',offset:[-8,13],destination:'tide-garden',arrival:[6,-9],width:3.4},
  {id:'science-walk',regionId:'science-valley',offset:[13,6],destination:'star-deck',arrival:[-9,-6],width:3.4},
  {id:'starlight-walk',regionId:'weiming-studio',offset:[14,-6],destination:'star-deck',arrival:[-9,6],width:3.4},
];
const linkCache=new WeakMap();
export function parkLinks(regions){
  if(linkCache.has(regions))return linkCache.get(regions);
  const links=[];
  for(const {id,regionId,offset,destination,arrival,width} of parkConnections){
    const r=regions.find(r=>r.id===regionId),island=parkIslands.find(p=>p.id===destination);
    if(r&&island)links.push({id,regionId,destination,from:[r.position[0]+offset[0],0,r.position[1]+offset[1]],to:[island.position[0]+arrival[0],0,island.position[1]+arrival[1]],width});
  }
  linkCache.set(regions,links);
  return links;
}
/** Reserve a broad landing around every public-island bridge entrance. */
export function nearParkEntrance(regionId,x,z,margin=0){
  return parkConnections.some(link=>link.regionId===regionId&&Math.hypot(x-link.offset[0],z-link.offset[1])<4.2+margin);
}
export function linkSample(x,z,link){
  const [ax,ay,az]=link.from,[bx,by,bz]=link.to,dx=bx-ax,dz=bz-az;
  const t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));
  return {distance:Math.hypot(x-ax-t*dx,z-az-t*dz),height:ay+(by-ay)*t,t};
}
export function parkHeight(x,z,regions){
  if(parkIslands.some(p=>Math.hypot(x-p.position[0],z-p.position[1])<p.radius))return 0;
  for(const link of parkLinks(regions)){
    const hit=linkSample(x,z,link);
    if(hit.distance<link.width/2)return hit.height;
  }
  return null;
}
export function parkContains(x,z,regions){
  return parkIslands.some(p=>Math.hypot(x-p.position[0],z-p.position[1])<p.radius-.65)||
    parkLinks(regions).some(link=>linkSample(x,z,link).distance<link.width/2-.3);
}
export function parkPlace(x,z){
  return parkIslands.find(p=>Math.hypot(x-p.position[0],z-p.position[1])<p.radius);
}
