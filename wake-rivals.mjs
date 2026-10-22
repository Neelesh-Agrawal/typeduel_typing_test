// Deterministic local opponents: each follows the same course and earns boost.
export const PILOTS=[
 {name:'Vela',color:'#29c7bd',pace:1.015,line:-1.9},
 {name:'Rook',color:'#e6d8ad',pace:.985,line:1.9},
 {name:'Nova',color:'#e66a9d',pace:1.005,line:-1},
 {name:'Mako',color:'#6594ff',pace:.97,line:1},
 {name:'Ember',color:'#e7b344',pace:.995,line:0}
];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class RivalFleet{
 reset(course,objects){this.time=0;this.boats=PILOTS.map((p,i)=>({...p,index:i,distance:[6,6,-6,-6,-12][i],x:[-5,5,-5,5,0][i],velocity:12,height:0,verticalSpeed:0,duck:false,turn:0,charge:0,boost:0,penalty:0,gate:0,hazard:0,debris:0,finishTime:null}));this.gates=objects.gates;this.hazards=objects.hazards;this.debris=objects.debris;}
 step(dt,course,player){this.time+=dt;
  for(const b of this.boats){if(b.finishTime!==null)continue;
   const before=b.distance,g=this.gates[b.gate],h=this.hazards[b.hazard],o=this.debris[b.debris];
   let target=g?g.x+clamp(b.line,-g.width+1,g.width-1):b.line;
   if(o&&o.distance-b.distance<48&&o.distance>b.distance&&Math.abs(target-o.x)<3.5)target=clamp(o.x+(target<o.x?-3.8:3.8),-11,11);
   for(const other of this.boats)if(other!==b&&Math.abs(other.distance-b.distance)<7&&Math.abs(other.x-target)<2)target=clamp(target+(b.index<other.index?-1.2:1.2),-11,11);
   if(player&&Math.abs(player.distance-b.distance)<7&&Math.abs(target-player.x)<3.5)target=clamp(player.x+(b.x<player.x?-3.8:3.8),-11,11);
   b.turn=clamp((target-b.x)*2,-1,1);b.x+=b.turn*10.5*dt;
   const seconds=h?(h.distance-b.distance)/Math.max(b.velocity,1):Infinity;
   b.duck=h?.type==='bridge'&&seconds<.65&&seconds>=0;
   if(h?.type==='wave'&&seconds<.56&&seconds>=0&&b.height===0&&b.verticalSpeed===0)b.verticalSpeed=8;
   b.verticalSpeed-=14*dt;b.height=Math.max(0,b.height+b.verticalSpeed*dt);if(!b.height)b.verticalSpeed=0;
   b.boost=Math.max(0,b.boost-dt);b.penalty=Math.max(0,b.penalty-dt);
   if(b.charge>=100&&b.boost===0&&seconds>3){b.charge=0;b.boost=2.5;}
   const speed=(course.speed+Math.min(1,b.distance/course.length)*9)*b.pace*(b.duck?.58:1)*(b.penalty>0?.64:1)+(b.boost>0?18:0);
   b.velocity+=(speed-b.velocity)*(1-Math.exp(-dt*3));b.distance=Math.min(course.length,b.distance+b.velocity*dt);
   if(g&&b.distance>=g.distance){if(Math.abs(b.x-g.x)<=g.width)b.charge=Math.min(100,b.charge+23);else b.penalty=.8;b.gate++;}
   if(o&&b.distance>=o.distance){if(Math.abs(b.x-o.x)<o.radius+1.1&&b.height<1.5)b.penalty=1.5;b.debris++;}
   if(h&&b.distance>=h.distance){if(h.type==='wave'?b.height<.9:!b.duck)b.penalty=1.5;else b.charge=Math.min(100,b.charge+25);b.hazard++;}
   if(b.distance>=course.length)b.finishTime=this.time-dt+(course.length-before)/Math.max(b.velocity,.01);
  }
 }
 rank(distance,finishTime=null){return 1+this.boats.filter(b=>finishTime!==null?b.finishTime!==null&&b.finishTime<finishTime:b.distance>distance).length;}
}
