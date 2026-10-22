import {RivalFleet} from './wake-rivals.mjs';
export const COURSES=[
 {name:'Harbor run',length:1400,speed:23,spacing:110,width:4.5,current:.3},
 {name:'Turbine passage',length:1700,speed:28,spacing:100,width:3.8,current:.65},
 {name:'Storm crossing',length:2000,speed:33,spacing:90,width:3.2,current:1}
];
export const UPGRADES=[
 {id:'repair',name:'Reinforced hull',description:'Repair two hull points and add one extra point of protection.'},
 {id:'boost',name:'Surge battery',description:'Gates charge boost 35% faster. Boost lasts one second longer.'},
 {id:'handling',name:'Precision foils',description:'Turn 20% faster and reduce the pull of the current.'}
];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function courseObjects(level){
 const c=COURSES[level],gates=[],debris=[];
 for(let d=130,i=0;d<c.length-100;d+=c.spacing,i++){
  const x=Math.sin(i*1.15+level*.65)*7.5;
  gates.push({distance:d,x,width:c.width,passed:false,hit:false});
  if(i>0){const side=i%2?1:-1;debris.push({distance:d-c.spacing*.47,x:clamp(x+side*(5.8-level*.4),-11,11),radius:1.4,passed:false});}
 }
 const hazards=[];for(let d=320,i=0;d<c.length-110;d+=Math.max(175,270-level*35),i++)hazards.push({distance:d,type:i%2?'bridge':'wave',passed:false});
 return {gates,debris,hazards};
}
export class WakeRace{
 constructor(){this.reset();}
 reset(){this.level=0;this.time=0;this.totalDistance=0;this.score=0;this.hull=4;this.maxHull=4;this.charge=0;this.boosts=0;this.totalGates=0;this.bestCombo=0;this.mods={boost:0,handling:0};this.ended=false;this.won=false;this.reason=null;this.events=[];this.beginCourse();}
 beginCourse(){this.distance=0;this.velocity=12;this.x=0;this.turn=0;this.boost=0;this.invulnerable=0;this.penalty=0;this.combo=0;this.cleared=0;this.missed=0;this.height=0;this.verticalSpeed=0;this.jumpCooldown=0;this.duck=false;this.closePasses=0;this.courseTime=0;this.finishTime=null;this.state='racing';Object.assign(this,courseObjects(this.level));this.fleet=new RivalFleet();this.fleet.reset(this.course,this);}
 get rank(){return this.fleet.rank(this.distance,this.finishTime);}
 get rivals(){return this.fleet.boats;}
 get course(){return COURSES[this.level];}
 get required(){return Math.ceil(this.gates.length*.6);}
 get nextGate(){return this.gates.find(g=>!g.passed);}
 jump(){if(this.state!=='racing'||this.height>.01||this.jumpCooldown>0)return false;this.verticalSpeed=8;this.jumpCooldown=1.4;this.events.push('jump');return true;}
 get intensity(){return Math.min(1,this.distance/this.course.length);}
 get nextHazard(){return this.hazards.find(h=>!h.passed);}
 activateBoost(){if(this.state!=='racing'||this.charge<100||this.boost>0)return false;this.charge=0;this.boost=2.5+this.mods.boost;this.boosts++;this.events.push('boost');return true;}
 damage(){if(this.invulnerable>0)return;this.hull--;this.invulnerable=1.4;this.penalty=1.5;this.combo=0;this.events.push('hit');if(this.hull<=0){this.state='finished';this.ended=true;this.events.push('finish');}}
 step(dt,input={}){
  if(this.state!=='racing')return;dt=clamp(dt,0,.05);const oldDistance=this.distance,oldX=this.x,oldHeight=this.height;
  this.time+=dt;this.courseTime+=dt;this.fleet.step(dt,this.course,this);this.jumpCooldown=Math.max(0,this.jumpCooldown-dt);this.verticalSpeed-=14*dt;this.height=Math.max(0,this.height+this.verticalSpeed*dt);if(!this.height)this.verticalSpeed=0;this.duck=!!input.brake&&this.height===0;this.invulnerable=Math.max(0,this.invulnerable-dt);this.penalty=Math.max(0,this.penalty-dt);this.boost=Math.max(0,this.boost-dt);
  const steer=clamp(input.steer||0,-1,1),brake=!!input.brake;
  this.turn+=(steer-this.turn)*(1-Math.exp(-dt*10));
  const current=Math.sin(this.distance*.023)*this.course.current/(1+this.mods.handling);
  this.x=clamp(this.x+(steer*11*(1+.2*this.mods.handling)+current)*dt,-12,12);
  const desired=(this.course.speed+this.intensity*9)*(brake?.58:1)*(this.penalty>0?.6:1)+(this.boost>0?18:0);
  this.velocity+=(desired-this.velocity)*(1-Math.exp(-dt*3));this.distance=Math.min(this.course.length,this.distance+this.velocity*dt);this.totalDistance+=this.distance-oldDistance;
  if(this.distance>=this.course.length&&this.finishTime===null)this.finishTime=this.courseTime-dt+(this.course.length-oldDistance)/Math.max(this.velocity,.01);
  const crossingX=d=>oldX+(this.x-oldX)*clamp((d-oldDistance)/(this.distance-oldDistance||1),0,1);
  for(const g of this.gates){if(g.passed||g.distance>this.distance)continue;g.passed=true;const offset=Math.abs(crossingX(g.distance)-g.x);g.hit=offset<=g.width;
   if(g.hit){this.cleared++;this.totalGates++;this.combo++;this.bestCombo=Math.max(this.bestCombo,this.combo);this.score+=100+Math.min(this.combo,10)*25;this.charge=Math.min(100,this.charge+(offset<1.4?27:20)*(1+.35*this.mods.boost));this.events.push('gate');}
   else{this.missed++;this.combo=0;this.penalty=.7;this.charge=Math.max(0,this.charge-10);this.events.push('miss');}
   if(Math.abs(offset-(g.width+1.6))<1.35)this.damage();
  }
  for(const o of this.debris){if(o.passed||o.distance>this.distance)continue;o.passed=true;const separation=Math.abs(crossingX(o.distance)-o.x),crossHeight=oldHeight+(this.height-oldHeight)*clamp((o.distance-oldDistance)/(this.distance-oldDistance||1),0,1);if(separation<o.radius+1.1&&crossHeight<1.5)this.damage();else if(separation<o.radius+3.2&&crossHeight<1.5){this.closePasses++;this.score+=75;this.charge=Math.min(100,this.charge+15);this.events.push('close');}}
  for(const h of this.hazards){if(h.passed||h.distance>this.distance)continue;h.passed=true;const y=oldHeight+(this.height-oldHeight)*clamp((h.distance-oldDistance)/(this.distance-oldDistance||1),0,1);if(h.type==='wave'?y<.9:!this.duck||y>.1)this.damage();else{this.score+=150;this.charge=Math.min(100,this.charge+25);this.events.push('clear');}}
  if(this.ended)return;
  if(this.distance>=this.course.length){
   if(this.cleared<this.required){this.ended=true;this.state='finished';this.reason='gates';this.events.push('finish');}
   else if(this.level===COURSES.length-1){this.ended=true;this.won=true;this.state='finished';this.events.push('finish');}
   else{this.state='upgrade';this.events.push('level');}
  }
 }
 chooseUpgrade(id){if(this.state!=='upgrade'||!UPGRADES.some(u=>u.id===id))return false;
  if(id==='repair'){this.maxHull++;this.hull=Math.min(this.maxHull,this.hull+2);}else this.mods[id]++;
  this.level++;this.beginCourse();return true;
 }
 drain(){return this.events.splice(0);}
}

