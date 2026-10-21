import assert from 'node:assert/strict';
import {WakeRace,COURSES} from './wake-rules.mjs';
const clamp=v=>Math.max(-1,Math.min(1,v));
// Follow the authored gate route while going around debris on the nearer side.
function pilot(r){const g=r.nextGate,o=r.debris.find(o=>!o.passed);let target=g?.x||0;if(o&&o.distance<(g?.distance??Infinity)&&Math.abs(target-o.x)<3)target=o.x+(target<o.x?-3.5:3.5);return {steer:clamp((target-r.x)*3)};}
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
assert(Math.abs(a.time-c.time)<.1,'travel duration is stable across frame rates');assert.equal(a.score,b.score);assert.equal(b.score,c.score);
// Missing the minimum gate count fails at the finish, even with an intact hull.
const failed=new WakeRace();failed.distance=failed.course.length-.1;failed.gates.forEach(g=>g.passed=true);failed.debris.forEach(d=>d.passed=true);failed.step(.05);assert(failed.ended&&!failed.won);assert.equal(failed.reason,'gates');assert.equal(failed.hull,4);assert.deepEqual(failed.drain(),['finish']);failed.step(.05);assert.equal(failed.drain().length,0);
failed.reset();assert.equal(failed.level,0);assert.equal(failed.distance,0);assert.equal(failed.totalDistance,0);assert.equal(failed.score,0);assert.equal(failed.hull,4);assert.equal(failed.ended,false);assert.equal(failed.won,false);assert.equal(failed.state,'racing');assert(!failed.reason,'replay clears the previous failure reason');assert.equal(failed.totalGates,0);assert.equal(failed.events.length,0);
a.reset();assert.equal(a.maxHull,4);assert.deepEqual(a.mods,{boost:0,handling:0});assert.equal(a.boosts,0);assert.equal(a.bestCombo,0);
console.log('Wake campaign passed: 3 complete courses at30/60/144Hz, exactly2finish-line rewards, frozen intermissions, no250m interruptions, gate requirement failure, clean replay.');
