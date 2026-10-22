import assert from 'node:assert/strict';
import {WakeRace,COURSES} from './wake-rules.mjs';
const clamp=v=>Math.max(-1,Math.min(1,v));
// Follow the authored gate route while going around debris on the nearer side.
function pilot(r){const g=r.nextGate,o=r.debris.find(o=>!o.passed);let target=g?.x||0;if(o&&o.distance<(g?.distance??Infinity)&&Math.abs(target-o.x)<3)target=o.x+(target<o.x?-3.5:3.5);const h=r.nextHazard,gap=h?h.distance-r.distance:Infinity;if(h?.type==='wave'&&gap/r.velocity<.57&&r.height===0)r.jump();return {steer:clamp((target-r.x)*3),brake:h?.type==='bridge'&&gap/r.velocity<.5};}
function complete(hz){
 const r=new WakeRace();let rewards=0,finishes=0,earlyChecked=false;
 for(let frame=0;frame<hz*400&&!r.ended;frame++){
  r.step(1/hz,pilot(r));
  for(const e of r.drain()){if(e==='level')rewards++;if(e==='finish')finishes++;}
  if(r.level===0&&r.distance>=500&&!earlyChecked){assert.equal(rewards,0,'250m and500m are not upgrade checkpoints');assert.equal(r.state,'racing');earlyChecked=true;}
  if(r.state==='upgrade'){
   assert.equal(r.distance,r.course.length,'only the finish line ends a course');assert(r.cleared>=r.required);assert.equal(rewards,r.level+1);
   const frozen=JSON.stringify(r);for(let i=0;i<120;i++)r.step(1/60,{steer:1,brake:true});assert.equal(JSON.stringify(r),frozen,'the full simulation freezes during intermission');r.charge=100;assert.equal(r.activateBoost(),false);assert.equal(r.charge,100);
   assert(r.chooseUpgrade('repair'));
  }
 }
 assert(earlyChecked);assert(r.ended&&r.won);assert.equal(r.level,2);assert.equal(rewards,2,'exactly one reward between courses; none after victory');assert.equal(finishes,1);assert(Math.abs(r.totalDistance-COURSES.reduce((sum,c)=>sum+c.length,0))<1e-6);assert.equal(r.totalGates,46);assert.equal(r.hull,r.maxHull,'all authored courses have a damage-free path');assert.equal(r.state,'finished');assert.equal(r.chooseUpgrade('repair'),false);
 return r;
}
const a=complete(30),b=complete(60),c=complete(144);
assert(Math.abs(a.time-c.time)<1,'travel duration is stable across frame rates');assert.equal(a.totalGates,b.totalGates);assert.equal(b.totalGates,c.totalGates);
// Missing the minimum gate count fails at the finish, even with an intact hull.
const failed=new WakeRace();failed.distance=failed.course.length-.1;failed.gates.forEach(g=>g.passed=true);failed.debris.forEach(d=>d.passed=true);failed.hazards.forEach(h=>h.passed=true);failed.step(.05);assert(failed.ended&&!failed.won);assert.equal(failed.reason,'gates');assert.equal(failed.hull,4);assert.deepEqual(failed.drain(),['finish']);failed.step(.05);assert.equal(failed.drain().length,0);
failed.reset();assert.equal(failed.level,0);assert.equal(failed.distance,0);assert.equal(failed.totalDistance,0);assert.equal(failed.score,0);assert.equal(failed.hull,4);assert.equal(failed.ended,false);assert.equal(failed.won,false);assert.equal(failed.state,'racing');assert(!failed.reason,'replay clears the previous failure reason');assert.equal(failed.totalGates,0);assert.equal(failed.events.length,0);
a.reset();assert.equal(a.maxHull,4);assert.deepEqual(a.mods,{boost:0,handling:0});assert.equal(a.boosts,0);assert.equal(a.bestCombo,0);
console.log('Wake campaign passed: 3 complete courses at30/60/144Hz, exactly2finish-line rewards, frozen intermissions, no250m interruptions, gate requirement failure, clean replay.');
// New action encounters require timing, not just horizontal steering.
function encounter(type,react){const r=new WakeRace();r.gates=[];r.debris=[];r.hazards=[{type,distance:30,passed:false}];for(let i=0;i<180&&!r.hazards[0].passed;i++){const seconds=(30-r.distance)/r.velocity;if(react&&type==='wave'&&seconds<.55&&r.height===0)r.jump();r.step(1/60,{brake:react&&type==='bridge'&&seconds<.6});}return r;}
for(const type of ['wave','bridge']){const hit=encounter(type,false),clear=encounter(type,true);assert.equal(hit.hull,3,`${type} punishes no reaction`);assert.equal(clear.hull,4,`${type} has a safe timed response`);assert(clear.score>=150);assert(clear.charge>=25);}
const ramp=new WakeRace();ramp.gates=[];ramp.debris=[];ramp.hazards=[];for(let i=0;i<120;i++)ramp.step(1/60);const opening=ramp.velocity;ramp.distance=ramp.course.length*.8;for(let i=0;i<120;i++)ramp.step(1/60);assert(ramp.velocity>opening+5,'speed climbs perceptibly within a course');
const airborne=new WakeRace();assert(airborne.jump());assert.equal(airborne.jump(),false,'jump cannot stack');airborne.state='upgrade';assert.equal(airborne.jump(),false,'no action while picking upgrade');
console.log('Wake action encounters: jump waves, duck bridges, no-input damage, charge rewards, jump guards and mid-course speed ramp passed.');

// Opponents have independent progress, earned boosts and honest finish ranks.
const field=new WakeRace();assert.equal(field.rivals.length,5);assert.equal(new Set(field.rivals.map(b=>b.color)).size,5);assert.equal(field.rank,3);
for(let i=0;i<360;i++)field.step(1/60,{steer:0});assert(field.rivals.every(b=>b.distance>100));assert(new Set(field.rivals.map(b=>Math.round(b.distance))).size>2);assert(field.rivals.some(b=>b.x!==0));
const beforeBoost=field.distance-field.rivals[0].distance;field.charge=100;assert(field.activateBoost());for(let i=0;i<100;i++)field.step(1/60);assert(field.distance-field.rivals[0].distance>beforeBoost+10,'boost enables an actual overtake');
field.distance=100;field.finishTime=null;field.rivals.forEach((b,i)=>{b.distance=i<2?110:90;});assert.equal(field.rank,3);field.finishTime=50;field.rivals.forEach((b,i)=>{b.finishTime=i<2?49:i===2?51:null;});assert.equal(field.rank,3,'rank uses crossing times after player finishes');
field.state='upgrade';const still=JSON.stringify(field.rivals);for(let i=0;i<100;i++)field.step(1/60);assert.equal(JSON.stringify(field.rivals),still,'rivals freeze for upgrades');field.reset();assert.equal(field.rank,3);assert(field.rivals.every(b=>b.finishTime===null));
console.log('Wake rivals passed: five distinct bots, independent movement, boost overtakes, crossing-time ranking, frozen intermission and reset.');
