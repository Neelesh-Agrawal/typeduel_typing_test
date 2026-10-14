export const DURATION=90;
export const METERS_PER_CHAR=1.8;
export const PASSAGES=[
 'The sea opens ahead of you. Keep your eyes on the horizon and let each word become a little more speed.',
 'A bright orange buoy slips past the bow. Somewhere behind you, the wake draws a silver line across the blue.',
 'Find the rhythm between the waves. A clean turn feels effortless, but every small correction makes it possible.',
 'There is no shortcut across open water. Stay steady, breathe slowly, and make the next word your best one.',
 'The islands rise like sculptures in the afternoon sun. You pass beneath a stone arch and chase the light beyond.',
 'Speed is a conversation with the ocean. Listen to the engine, follow the current, and leave a beautiful wake.',
 'A good race is built one moment at a time. Forget the last mistake and give the next sentence your attention.',
 'Your rival is only a reference point. The real challenge is finding a pace that feels smooth enough to keep.',
 'Sunlight breaks into a thousand pieces on the water. The finish is coming closer, so hold your line and go.',
 'The boat lifts over a rolling wave. For a moment everything is quiet, then the engine answers with a roar.'
];
export function prefixLength(value,target){let i=0;while(i<value.length&&value[i]===target[i])i++;return i;}
export function changedInput(previous,next,target){let common=0;while(common<previous.length&&common<next.length&&previous[common]===next[common])common++;let attempts=0,errors=0;for(let i=common;i<next.length;i++){attempts++;if(next[i]!==target[i])errors++;}return {attempts,errors};}
export function metrics(correct,attempts,errors,elapsed){return {wpm:Math.round(correct/5/Math.max(elapsed/60,1/60)),accuracy:attempts?Math.max(0,Math.round((attempts-errors)/attempts*100)):100,distance:Math.round(correct*METERS_PER_CHAR)};}
export function rivalMeters(pace,elapsed){return pace*5/60*elapsed*METERS_PER_CHAR;}

export const RACE_LENGTH=1000;
export const PHRASES=['chase the last light','leave a silver wake','hold your line','ride the rising tide','ignite the horizon','find the open water','send it through the storm','keep the engine singing','make every word count','carve a cleaner course','fly above the foam','breathe and build speed','catch the amber light','thread the turbine gates','the sea belongs to you','full throttle into tomorrow','outpace your own shadow','one more perfect line'];
export class WakeRace{
 constructor(pace=40){this.reset(pace);}
 reset(pace=this.pace){this.pace=pace;this.time=0;this.distance=0;this.rival=0;this.velocity=5;this.rivalVelocity=5;this.charge=0;this.boost=0;this.boosts=0;this.correct=0;this.attempts=0;this.errors=0;this.combo=0;this.bestCombo=0;this.phrases=0;this.section=0;this.ended=false;this.won=false;this.rivalFinish=null;this.recent=[];this.events=[];}
 key(count=1,errors=0){if(this.ended)return;this.attempts+=count+errors;this.errors+=errors;if(errors){this.combo=0;this.charge=Math.max(0,this.charge-5);this.events.push('error');}if(count){this.correct+=count;this.recent.push({time:this.time,count});this.charge=Math.min(100,this.charge+count*2.2);}}
 phrase(clean=true){if(this.ended)return;this.phrases++;if(clean){this.combo++;this.bestCombo=Math.max(this.bestCombo,this.combo);this.charge=Math.min(100,this.charge+15);this.events.push('perfect');}else this.combo=0;}
 activateBoost(){if(this.ended||this.charge<100||this.boost>0)return false;this.charge=0;this.boost=3;this.boosts++;this.events.push('boost');return true;}
 step(dt){if(this.ended)return;dt=Math.min(.1,Math.max(0,dt));this.time=Math.min(DURATION,this.time+dt);this.recent=this.recent.filter(k=>k.time>this.time-2.4);const rate=this.recent.reduce((n,k)=>n+k.count,0)/2.4;const desired=5+Math.min(12,rate)*2.8+(this.boost>0?16:0);this.velocity+=(desired-this.velocity)*(1-Math.exp(-dt*3.5));this.boost=Math.max(0,this.boost-dt);this.distance+=this.velocity*dt;const rivalBoost=this.time%14>11?8:0;this.rivalVelocity+=(5+this.pace/12*2.8+rivalBoost-this.rivalVelocity)*(1-Math.exp(-dt*2));this.rival+=this.rivalVelocity*dt;if(this.rival>=RACE_LENGTH&&this.rivalFinish===null)this.rivalFinish=this.time;const next=Math.min(2,Math.floor(this.distance/RACE_LENGTH*3));if(next>this.section){this.section=next;this.events.push('sector');}if(this.distance>=RACE_LENGTH||this.time>=DURATION){this.distance=Math.min(RACE_LENGTH,this.distance);this.ended=true;this.won=this.distance>=RACE_LENGTH&&(!this.rivalFinish||this.time<=this.rivalFinish);this.events.push('finish');}}
 drain(){return this.events.splice(0);}
}
