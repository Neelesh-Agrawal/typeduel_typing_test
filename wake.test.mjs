import assert from 'node:assert/strict';
import {WakeRace,COURSES,UPGRADES,courseObjects} from './wake-rules.mjs';

assert.equal(COURSES.length,3);
for(let level=0;level<COURSES.length;level++){
 const c=COURSES[level],a=courseObjects(level),b=courseObjects(level);
 assert.deepEqual(a,b,'the authored course is deterministic');
 assert(c.length>=1400,'a course is a full run, not a short checkpoint');
 assert(a.gates.length>=10);
 for(const g of a.gates){assert(g.distance>0&&g.distance<c.length);assert(Math.abs(g.x)+g.width<=12);assert.equal(g.passed,false);}
 for(let i=1;i<a.gates.length;i++)assert(a.gates[i].distance>a.gates[i-1].distance);
 for(const o of a.debris)assert(o.distance>0&&o.distance<c.length&&Math.abs(o.x)<=12);
 if(level){assert(c.speed>COURSES[level-1].speed);assert(c.width<COURSES[level-1].width);assert(c.current>COURSES[level-1].current);}
 a.gates[0].passed=true;assert.equal(b.gates[0].passed,false,'course instances cannot share collision state');
}
assert.deepEqual(UPGRADES.map(u=>u.id).sort(),['boost','handling','repair']);
const empty=()=>{const r=new WakeRace();r.gates=[];r.debris=[];return r;};
function travel(r,seconds,input={}){for(let i=0;i<seconds*60;i++)r.step(1/60,input);}
const normal=empty(),braking=empty();travel(normal,3);travel(braking,3,{brake:true});
assert(normal.distance>50);assert(braking.velocity<normal.velocity*.65);assert(braking.distance<normal.distance);
const right=empty(),left=empty();travel(right,1,{steer:1});travel(left,1,{steer:-1});assert(right.x>10&&left.x<-10);
travel(right,5,{steer:1});travel(left,5,{steer:-1});assert.equal(right.x,12);assert.equal(left.x,-12);
const boosted=empty();assert.equal(boosted.activateBoost(),false);boosted.charge=100;assert(boosted.activateBoost());assert.equal(boosted.charge,0);assert.equal(boosted.boosts,1);assert.equal(boosted.activateBoost(),false);travel(boosted,1);const plain=empty();travel(plain,1);assert(boosted.velocity>plain.velocity+12,'boost changes real speed');travel(boosted,2);assert.equal(boosted.boost,0);
// Collision tests straddle a plane in a single frame. The endpoint is outside,
// but the hull intersects it earlier in the step, so endpoint-only checks fail.
const swept=empty();swept.distance=99.95;swept.velocity=23;swept.x=2.3;swept.debris=[{distance:100,x:0,radius:1.4,passed:false}];swept.step(.05,{steer:1});assert(swept.x>2.5);assert.equal(swept.hull,3,'swept collision must catch a crossing before steering clear');assert.equal(swept.drain().filter(e=>e==='hit').length,1);swept.damage();assert.equal(swept.hull,3,'invulnerability blocks stacked contact');travel(swept,1.5);swept.damage();assert.equal(swept.hull,2);
const through=empty();through.distance=99.95;through.velocity=23;through.x=4.4;through.gates=[{distance:100,x:0,width:4.5,passed:false}];through.step(.05,{steer:1});assert(through.x>4.5);assert.equal(through.cleared,1,'gate pass uses crossing position');assert(through.charge>0);assert(through.score>0);through.step(.05);assert.equal(through.cleared,1,'a gate is counted once');
const missed=empty();missed.distance=99.95;missed.velocity=23;missed.x=-10;missed.combo=5;missed.charge=40;missed.gates=[{distance:100,x:0,width:4.5,passed:false}];missed.step(.05);assert.equal(missed.missed,1);assert.equal(missed.cleared,0);assert.equal(missed.combo,0);assert.equal(missed.charge,30);assert(missed.penalty>0);
const post=empty();post.distance=99.95;post.velocity=23;post.x=6.1;post.gates=[{distance:100,x:0,width:4.5,passed:false}];post.step(.05);assert.equal(post.hull,3,'buoys are physical obstacles');
const destroyed=empty();destroyed.hull=1;destroyed.damage();assert(destroyed.ended);assert.equal(destroyed.state,'finished');const endTime=destroyed.time;destroyed.step(1);assert.equal(destroyed.time,endTime);assert.equal(destroyed.activateBoost(),false);
for(const id of UPGRADES.map(u=>u.id)){
 const r=empty();assert.equal(r.chooseUpgrade(id),false,'no upgrades during a course');r.state='upgrade';r.hull=2;assert.equal(r.chooseUpgrade('missing'),false);assert(r.chooseUpgrade(id));assert.equal(r.level,1);assert.equal(r.state,'racing');assert.equal(r.distance,0);assert.equal(r.chooseUpgrade(id),false,'one choice per level break');
 if(id==='repair'){assert.equal(r.maxHull,5);assert.equal(r.hull,4);}
 if(id==='boost'){assert.equal(r.mods.boost,1);r.charge=100;r.activateBoost();assert.equal(r.boost,3.5);}
 if(id==='handling'){assert.equal(r.mods.handling,1);const unmodified=empty();r.gates=[];r.debris=[];r.step(.05,{steer:1});unmodified.step(.05,{steer:1});assert(r.x>unmodified.x);}
}
console.log('Wake slalom rules passed: deterministic harder courses, steering/braking/boost, swept debris and gate collisions, gate scoring/misses, hull protection, upgrades.');

// Exercise the actual world camera and boat geometry without a WebGL renderer.
// Each vertex must remain in view during a full-speed phone steering sweep.
const {default:fs}=await import('node:fs'),{default:vm}=await import('node:vm');
const T=await import('./vendor/three.module.js');
const context=vm.createContext({T,innerWidth:390,innerHeight:844,visualViewport:{height:844}});
vm.runInContext(fs.readFileSync(new URL('./wake-world.mjs',import.meta.url),'utf8').replace(/^import .*$/gm,'').replace('export class WakeWorld','globalThis.WakeWorld=class WakeWorld'),context);
const world=Object.create(context.WakeWorld.prototype);
world.boxGeo=new T.BoxGeometry();world.cylinderGeo=new T.CylinderGeometry();world.materials={};
for(const k of ['metal','orange','white','chrome','glass','cyan','amber','dark'])world.materials[k]=new T.MeshBasicMaterial();
world.decal=()=>world.materials.orange;
Object.assign(world,{player:world.boat(world.materials.orange,'07'),rival:new T.Group(),camera:new T.PerspectiveCamera(58,390/844,.1,2000),cameraTarget:new T.Vector3(),aim:new T.Vector3(),time:0,travel:0,flash:0,low:true,reduced:false,scene:{fog:{color:new T.Color()}},moodFog:new T.Color(),renderer:{render(){}},waterMaterial:{uniforms:{uTime:{},uTravel:{},uBoost:{}}},islands:[],course:[],rotors:[],slalom:new T.Group(),gateMeshes:[],debrisMeshes:[],actionMeshes:[],finishGate:new T.Group(),foamLife:new Float32Array(0),foamGeo:{attributes:{position:{}}},foam:{},wake:new T.Group()});
const point=new T.Vector3();
for(const sign of [-1,1]){
 const race=new WakeRace();race.gates=[];race.debris=[];race.mods.handling=2;race.level=2;
 world.camera.position.set(0,10,28);
 for(let frame=0;frame<180;frame++){
  race.step(1/60,{steer:sign});world.render(1/60,race,'race');world.camera.updateMatrixWorld();world.player.updateMatrixWorld(true);
  world.player.traverse(mesh=>{if(!mesh.isMesh)return;const vertices=mesh.geometry.attributes.position;const instanceMatrix=new T.Matrix4();for(let instance=0;instance<(mesh.isInstancedMesh?mesh.count:1);instance++){if(mesh.isInstancedMesh)mesh.getMatrixAt(instance,instanceMatrix);else instanceMatrix.identity();for(let i=0;i<vertices.count;i++){
   point.fromBufferAttribute(vertices,i).applyMatrix4(instanceMatrix).applyMatrix4(mesh.matrixWorld).project(world.camera);
   const x=(point.x+1)*195,y=(1-point.y)*422;
   assert(x>=12&&x<=378,`Phone steering clips boat at x=${x.toFixed(1)}, frame=${frame}, direction=${sign}`);
   assert(y>=150&&y<=700,`Boat overlaps phone HUD or controls at y=${y.toFixed(1)}`);
  }}});
 }
 assert.equal(race.x,sign*12,'test reaches both channel edges');
}
console.log('Wake phone framing passed: actual boat geometry stays visible across both channel edges, including maximum handling and storm current at390x844.');

