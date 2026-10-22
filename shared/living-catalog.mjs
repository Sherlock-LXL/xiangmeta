export const seasonalObjects={
  spring:[
    {kind:'peach-pot',name:'桃枝小陶瓶',radius:.26,height:.72},
    {kind:'pinwheel',name:'青竹风车',radius:.28,height:.82},
    {kind:'tea-basket',name:'春茶竹篮',radius:.32,height:.52},
    {kind:'inkstone',name:'青山砚台',radius:.3,height:.2},
  ],
  summer:[
    {kind:'conch',name:'海螺',radius:.3,height:.36},
    {kind:'watering-can',name:'薄荷洒水壶',radius:.35,height:.48},
    {kind:'sea-lantern',name:'海风提灯',radius:.26,height:.64},
    {kind:'shell-bowl',name:'贝壳小碟',radius:.32,height:.24},
  ],
  autumn:[
    {kind:'pumpkin',name:'小南瓜',radius:.32,height:.46},
    {kind:'acorn-basket',name:'橡果竹篮',radius:.33,height:.5},
    {kind:'maple-lantern',name:'枫叶灯笼',radius:.28,height:.64},
    {kind:'scroll-box',name:'画卷木匣',radius:.35,height:.25},
  ],
  winter:[
    {kind:'snow-bunny',name:'雪兔摆件',radius:.3,height:.5},
    {kind:'snow-globe',name:'雪景水晶球',radius:.28,height:.58},
    {kind:'ice-crystal',name:'冰晶',radius:.3,height:.62},
    {kind:'thermos',name:'暖茶保温壶',radius:.24,height:.58},
  ],
};

/** One of each species, distributed among the original four seasonal islands. */
export const animalSpecies=[
  {kind:'cat',name:'花狸猫',season:'spring',radius:.65,height:.94,speed:.6,ride:false,seat:0},
  {kind:'deer',name:'梅花鹿',season:'spring',radius:1.05,height:2,speed:.7,ride:true,seat:1.2},
  {kind:'rabbit',name:'桃花兔',season:'spring',radius:.65,height:.84,speed:.55,ride:false,seat:0},
  {kind:'crab',name:'沙滩蟹',season:'summer',radius:.65,height:.35,speed:.35,ride:false,seat:0},
  {kind:'heron',name:'苍鹭',season:'summer',radius:.65,height:1.45,speed:.4,ride:false,seat:0},
  {kind:'tortoise',name:'小陆龟',season:'summer',radius:.65,height:.42,speed:.18,ride:false,seat:0},
  {kind:'fox',name:'赤狐',season:'autumn',radius:.85,height:.9,speed:.7,ride:false,seat:0},
  {kind:'shiba',name:'柴犬',season:'autumn',radius:.65,height:.85,speed:.62,ride:false,seat:0},
  {kind:'polar-bear',name:'北极熊',season:'winter',radius:1.12,height:1.42,speed:.55,ride:true,seat:1.08},
  {kind:'penguin',name:'小企鹅',season:'winter',radius:.65,height:.8,speed:.35,ride:false,seat:0},
];

export const seededRandom=(seed=0x71a2)=>()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
export const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export function turnToward(a,b,limit){return a+Math.max(-limit,Math.min(limit,angleDelta(a,b)));}
