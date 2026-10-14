import assert from 'node:assert/strict';
import {WakeRace,PHRASES,LOSE_GAP,START_PACE,paceAt,MAX_PACE} from './wake-rules.mjs';
// Idle thrust, boost charge, errors.
const empty=new WakeRace();for(let i=0;i<100;i++)empty.step(.05);assert.ok(empty.distance>20,'boat has idle thrust');empty.key(35);empty.phrase(true);empty.key(10);assert.equal(empty.charge,100);assert.equal(empty.activateBoost(),true);assert.equal(empty.activateBoost(),false);assert.equal(empty.boosts,1);empty.key(0,1);assert.equal(empty.combo,0);
// Idle players fall behind and lose.
const idle=new WakeRace();for(let i=0;i<20000&&!idle.ended;i++)idle.step(.05);assert.ok(idle.ended);assert.ok(idle.gap>=LOSE_GAP);
// The pace keeps rising, but is capped.
assert.ok(paceAt(START_PACE,120)>paceAt(START_PACE,10));assert.equal(paceAt(START_PACE,1e6),MAX_PACE);
// A steady typist survives far longer than the old 90 second race, at any frame rate.
function run(hz,interval){const r=new WakeRace();let next=0;for(let i=0;i<hz*400&&!r.ended;i++){if(i/hz>=next){r.key(1);next+=interval;}if(r.charge===100)r.activateBoost();r.step(1/hz);}return r;}
const a=run(60,.1),b=run(144,.1);assert.ok(a.time>120,'a 120 WPM typist lasts beyond two minutes');assert.ok(Math.abs(a.time-b.time)<2);assert.ok(a.milestone>0,'milestones fire');
a.reset();assert.equal(a.distance,0);assert.equal(a.boosts,0);assert.ok(PHRASES.every(p=>p.length<33&&p===p.toLowerCase()));
console.log('Wake endless: thrust, boost, errors, idle loss, rising capped pace, long survival at 60/144Hz and reset passed.');
