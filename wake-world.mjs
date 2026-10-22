import * as T from './vendor/three.module.js';
import {EffectComposer} from './vendor/postprocessing/EffectComposer.js';
import {RenderPass} from './vendor/postprocessing/RenderPass.js';
import {UnrealBloomPass} from './vendor/postprocessing/UnrealBloomPass.js';
import {OutputPass} from './vendor/postprocessing/OutputPass.js';

export class WakeWorld{
 constructor(canvas,{low=false,reduced=false}={}){
  this.canvas=canvas;this.low=low;this.reduced=reduced;this.time=0;this.travel=0;this.lost=false;
  this.renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;
  this.scene=new T.Scene();this.scene.background=new T.Color('#252e4d');this.scene.fog=new T.FogExp2('#2a3f59',.0025);
  this.camera=new T.PerspectiveCamera(58,1,.1,2000);this.camera.position.set(20,9,23);
  this.scene.add(new T.HemisphereLight('#a6bfff','#151e2f',2));
  const key=new T.DirectionalLight('#ffb674',4);key.position.set(-50,30,-80);this.scene.add(key);
  const fill=new T.DirectionalLight('#82e8ff',2);fill.position.set(20,12,30);this.scene.add(fill);
  this.materials={orange:new T.MeshStandardMaterial({color:'#ff5b1a',metalness:.55,roughness:.23}),white:new T.MeshStandardMaterial({color:'#e6e9df',metalness:.5,roughness:.24}),metal:new T.MeshStandardMaterial({color:'#243347',metalness:.88,roughness:.22}),chrome:new T.MeshStandardMaterial({color:'#b4c4cb',metalness:.95,roughness:.17}),glass:new T.MeshStandardMaterial({color:'#042338',metalness:.85,roughness:.07}),cyan:new T.MeshStandardMaterial({color:'#65e9f9',emissive:'#11d9ee',emissiveIntensity:3,roughness:.3}),amber:new T.MeshStandardMaterial({color:'#ffc15b',emissive:'#ff7b25',emissiveIntensity:2.4}),dark:new T.MeshStandardMaterial({color:'#131e29',roughness:.8})};
  this.boxGeo=new T.BoxGeometry(1,1,1);this.cylinderGeo=new T.CylinderGeometry(1,1,1,16);
  this.materials.paint=this.materials.orange.clone();this.player=this.boat(this.materials.paint,'07');
  // Milestone moods tint the storm; lightning flashes when the chase gets tense.
  this.moodFog=new T.Color('#2a3f59');this.flash=0;this.rival=this.boat(this.materials.white,'02');this.scene.add(this.player,this.rival);
  this.sky=new T.TextureLoader().load('./assets/storm-horizon.png',texture=>{if(this.lost){texture.dispose();return;}texture.colorSpace=T.SRGBColorSpace;texture.mapping=T.EquirectangularReflectionMapping;this.scene.background=texture;this.scene.backgroundRotation.y=1.75;const pmrem=new T.PMREMGenerator(this.renderer);this.env=pmrem.fromEquirectangular(texture);this.scene.environment=this.env.texture;this.scene.environmentIntensity=.7;pmrem.dispose();});
  this.opponents=[];for(let i=0;i<5;i++){const paint=this.materials.orange.clone();paint.color.set(['#29c7bd','#e6d8ad','#e66a9d','#6594ff','#e7b344'][i]);const boat=this.boat(paint,String(i+1).padStart(2,'0'));boat.scale.set(.82+i*.025,.95,1+(i%2)*.08);if(i%2)this.box(boat,paint,0,2.4,1.6,.16,1.2,1.8);boat.visible=false;this.scene.add(boat);this.opponents.push(boat);}
  this.makeOcean();this.makeIslands();this.makeCourse();this.makeSpeedReferences();this.makeWake();this.rivalTrails=this.opponents.map(()=>{const trail=this.wake.clone();trail.visible=false;this.scene.add(trail);return trail;});
  this.composer=new EffectComposer(this.renderer);this.composer.addPass(new RenderPass(this.scene,this.camera));this.bloom=new UnrealBloomPass(new T.Vector2(900,600),.26,.5,1.1);this.composer.addPass(this.bloom);this.composer.addPass(new OutputPass());
  this.aim=new T.Vector3();this.cameraTarget=new T.Vector3();this.labelVector=new T.Vector3();this.resize();
 }
 batchBoat(group){group.updateMatrixWorld(true);const sets=new Map();group.traverse(o=>{if(!o.isMesh||o.userData.jet)return;const key=o.geometry.uuid+o.material.uuid;if(!sets.has(key))sets.set(key,[]);sets.get(key).push(o);});for(const meshes of sets.values()){if(meshes.length<2)continue;const inst=new T.InstancedMesh(meshes[0].geometry,meshes[0].material,meshes.length);for(let i=0;i<meshes.length;i++){inst.setMatrixAt(i,meshes[i].matrixWorld);meshes[i].parent.remove(meshes[i]);}group.add(inst);}}
 box(parent,material,x,y,z,sx,sy,sz){const m=new T.Mesh(this.boxGeo,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;}
 mesh(parent,geometry,material,x=0,y=0,z=0){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);parent.add(m);return m;}
 tube(parent,points,radius,material){return this.mesh(parent,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),16,radius,6,false),material);}
 decal(text,sub,color='#ff5b1a'){
  const c=document.createElement('canvas');c.width=512;c.height=256;const x=c.getContext('2d');x.fillStyle='#102135';x.fillRect(0,0,512,256);x.fillStyle=color;x.fillRect(0,202,512,54);x.fillStyle='#e8f5ed';x.font='900 108px sans-serif';x.fillText(text,24,130);x.font='bold 28px sans-serif';x.fillText(sub,26,178);for(let i=0;i<14;i++){x.fillStyle=i%3?'#6b8392':color;x.fillRect(295+i*13,27,7,38);}const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return new T.MeshStandardMaterial({map:t,roughness:.45,metalness:.3});
 }
 boat(paint,number){
  const g=new T.Group(),m=this.materials;
  // Three sculpted hulls and exposed foils give the craft a hydrofoil silhouette.
  const outline=new T.Shape();outline.moveTo(-.65,2.8);outline.lineTo(-1,-1.6);outline.quadraticCurveTo(-.7,-3.4,0,-4.1);outline.quadraticCurveTo(.7,-3.4,1,-1.6);outline.lineTo(.65,2.8);outline.closePath();
  const hullGeo=new T.ExtrudeGeometry(outline,{depth:.65,bevelEnabled:true,bevelSize:.18,bevelThickness:.18,bevelSegments:3,steps:1});
  for(const x of [-1.45,1.45]){const hull=this.mesh(g,hullGeo,paint,x,.25,0);hull.rotation.x=-Math.PI/2;}
  this.box(g,m.metal,0,.65,.2,3.4,.25,2.9);this.box(g,paint,0,1,-.2,1.7,.6,4.8);
  const hood=this.mesh(g,new T.SphereGeometry(1,24,16),paint,0,1.5,-1.8);hood.scale.set(.85,.38,1.7);
  const canopy=this.mesh(g,new T.SphereGeometry(1,28,18),m.glass,0,1.6,-.15);canopy.scale.set(.76,.65,1.55);
  this.box(g,m.metal,0,1.82,.7,1.55,.12,.12);this.box(g,m.chrome,0,1.3,2.05,3.8,.1,.6);
  for(const x of [-1.4,1.4]){
   const pod=this.mesh(g,new T.CylinderGeometry(.36,.42,1.8,20),m.chrome,x,1.15,1.6);pod.rotation.x=Math.PI/2;
   const nozzle=this.mesh(g,new T.CylinderGeometry(.3,.38,.3,20),m.dark,x,1.15,2.6);nozzle.rotation.x=Math.PI/2;
   const glow=this.mesh(g,new T.TorusGeometry(.22,.07,8,20),m.cyan,x,1.15,2.78);glow.userData.jet=true;
   this.box(g,m.metal,x,-.4,-.5,.13,1.7,.45);this.box(g,m.chrome,x,-1.1,-.5,1.8,.1,.8);
   this.tube(g,[[x,1.2,.3],[x*1.2,1.6,1],[x*1.2,1.5,2],[x,1.2,2.5]],.055,m.chrome);
   for(let i=0;i<5;i++)this.box(g,m.dark,x,1.03,-2+i*.28,.9,.035,.09);
   this.box(g,m.cyan,x,1.02,-.6,.06,.055,2.6);
  }
  const plate=this.mesh(g,new T.PlaneGeometry(.9,1.6),this.decal(number,'HYDRO / RACING'),0,1.39,-2.15);plate.rotation.x=-Math.PI/2;
  // Driver helmet sits behind the wraparound windscreen.
  const helmet=this.mesh(g,new T.SphereGeometry(.24,16,12),m.white,0,2,.55);const visor=this.mesh(g,new T.SphereGeometry(.245,16,10,0,Math.PI),m.glass,0,2,.55);visor.rotation.y=Math.PI/2;
  g.userData.jets=[];g.traverse(o=>{if(o.userData.jet)g.userData.jets.push(o);});this.batchBoat(g);return g;
 }
 makeOcean(){
  this.waterMaterial=new T.ShaderMaterial({uniforms:{uTime:{value:0},uTravel:{value:0},uSky:{value:this.sky},uCamera:{value:this.camera.position},uBoost:{value:0}},vertexShader:`
   uniform float uTime,uTravel;varying vec3 vWorld,vNormal;varying float vCrest;
   float wave(vec2 p){return sin(p.x*.12+p.y*.11+uTime*.9)*.37+sin(p.x*.31-p.y*.17+uTime*1.5)*.14+sin(p.y*.052+uTime*.6)*.46;}
   void main(){vec3 p=position;vec2 q=vec2(p.x,p.y+uTravel);float w=wave(q);p.z=w;vNormal=normalize(vec3(-(wave(q+vec2(.12,0.))-w)/.12,1.,-(wave(q+vec2(0.,.12))-w)/.12));vCrest=w;vec4 world=modelMatrix*vec4(p,1.);vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`,
   fragmentShader:`uniform float uTime,uTravel,uBoost;uniform sampler2D uSky;uniform vec3 uCamera;varying vec3 vWorld,vNormal;varying float vCrest;
   void main(){vec3 n=normalize(vNormal);vec3 view=normalize(uCamera-vWorld);vec3 reflected=reflect(-view,n);vec2 uv=vec2(atan(reflected.z,reflected.x)/6.283185+.5,asin(clamp(reflected.y,-1.,1.))/3.141593+.5);vec3 sky=pow(texture2D(uSky,uv).rgb,vec3(2.2));float fres=.14+.74*pow(1.-max(dot(n,view),0.),4.);vec3 base=mix(vec3(.003,.032,.055),vec3(.007,.11,.14),max(n.y,0.));vec3 col=mix(base,sky,fres);vec3 sun=normalize(vec3(-.6,.22,-.7));float spec=pow(max(dot(reflect(-sun,n),view),0.),95.);col+=vec3(1.,.37,.10)*spec*.6;float cap=smoothstep(.74,.94,vCrest)*.13;col+=vec3(.13,.32,.35)*cap;float glitter=pow(max(0.,sin(vWorld.x*2.3+vWorld.z*1.7-uTime*3.)),28.);col+=glitter*.008;
    vec2 water=vec2(vWorld.x,vWorld.z-uTravel);float ripple=pow(max(0.,sin(water.y*2.8+sin(water.x*1.7+sin(water.y*.23))*1.7)),18.);float foamMask=smoothstep(.2,.8,sin(water.x*3.1+sin(water.y*.13)));float near=1.-smoothstep(35.,160.,length(vWorld-uCamera));col+=vec3(.12,.24,.25)*ripple*foamMask*near*.12;float fog=1.-exp(-length(vWorld-uCamera)*.0025);col=mix(col,vec3(.055,.09,.14),fog);gl_FragColor=vec4(col,1.);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
   }
   `});
  this.ocean=this.mesh(this.scene,new T.PlaneGeometry(2200,2200,150,180),this.waterMaterial,0,-.65,-650);this.ocean.rotation.x=-Math.PI/2;
 }
 cliff(seed){
  const vertices=[],colors=[],indices=[],radial=24,rings=8;const color=new T.Color();
  for(let y=0;y<=rings;y++)for(let i=0;i<=radial;i++){const a=i/radial*Math.PI*2;const top=y/rings;const radius=(1-top*.35)*(10+Math.sin(a*3+seed)*3+Math.cos(a*7+seed)*1.4);const h=top*(15+Math.sin(a*2+seed)*2);vertices.push(Math.cos(a)*radius,h,Math.sin(a)*radius*1.35);color.set(top>.78?'#294e47':top<.12?'#a68a65':'#59636b');color.multiplyScalar(.8+.2*Math.sin(i*5+y));colors.push(color.r,color.g,color.b);if(y<rings&&i<radial){const s=y*(radial+1)+i;indices.push(s,s+1,s+radial+1,s+1,s+radial+2,s+radial+1);}}
  const center=vertices.length/3;vertices.push(0,15,0);color.set('#294e47');colors.push(color.r,color.g,color.b);for(let i=0;i<radial;i++)indices.push(center,rings*(radial+1)+i+1,rings*(radial+1)+i);
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g;
 }
 makeIslands(){this.islands=[];const rockMat=new T.MeshStandardMaterial({vertexColors:true,roughness:.94});
  for(let i=0;i<10;i++){const g=new T.Group(),side=i%2?1:-1;g.position.set(side*(34+(i%3)*21),-1,-i*95-60);const cliff=this.mesh(g,this.cliff(i),rockMat);cliff.scale.set(1,1+(i%3)*.65,1);
   const shore=this.mesh(g,new T.RingGeometry(8,15,32),new T.MeshBasicMaterial({color:'#7ac6c4',transparent:true,opacity:.09,depthWrite:false}),0,.25,0);shore.rotation.x=-Math.PI/2;shore.scale.y=1.4;
   if(i%3===0){const tower=this.mesh(g,new T.CylinderGeometry(.8,1.6,14,16),this.materials.white,0,25,0);this.mesh(g,new T.CylinderGeometry(1.7,1.7,2,16),this.materials.metal,0,32,0);this.mesh(g,new T.SphereGeometry(1.1,12,8),this.materials.amber,0,33,0);const roof=this.mesh(g,new T.ConeGeometry(2,1.8,16),this.materials.orange,0,34.5,0);}
   this.scene.add(g);this.islands.push({g,world:i*95+60});}
 }
 makeCourse(){this.course=[];this.rotors=[];
  for(let i=0;i<7;i++){const g=new T.Group();for(const x of [-12,12]){const buoy=this.mesh(g,new T.CylinderGeometry(.3,.9,2,12),this.materials.orange,x,.4,0);this.mesh(g,new T.CylinderGeometry(.05,.05,5,6),this.materials.chrome,x,3,0);this.box(g,this.materials.cyan,x+1,5.1,0,2,1,.03);}this.scene.add(g);this.course.push({g,world:55+i*150});}
  for(let i=0;i<3;i++){const g=new T.Group();for(const x of [-22,22]){this.box(g,this.materials.metal,x,12,0,4,26,8);for(let j=0;j<5;j++)this.box(g,this.materials.cyan,x,3+j*4,4.1,2,.3,.1);const plaque=this.mesh(g,new T.PlaneGeometry(3,6),this.decal('0'+(i+1),['THE HARBOR','TURBINE RUN','STORM FRONT'][i]),x,14,4.2);}
   const ring=this.mesh(g,new T.TorusGeometry(22,1,10,64),this.materials.chrome,0,13,0);const core=this.mesh(g,new T.TorusGeometry(20.6,.22,8,64),this.materials.cyan,0,13,0);const rotor=new T.Group();rotor.position.y=13;for(let b=0;b<8;b++){const blade=this.box(rotor,this.materials.metal,0,0,0,1,8,1);const angle=b*Math.PI/4;blade.position.set(Math.sin(angle)*24,Math.cos(angle)*24,0);blade.rotation.z=-angle;}g.add(rotor);this.rotors.push(rotor);this.scene.add(g);this.course.push({g,world:260+i*330});}
 }
 makeSpeedReferences(){
  this.flowBuoys=new T.InstancedMesh(this.cylinderGeo,this.materials.orange,64);this.flowCaps=new T.InstancedMesh(this.cylinderGeo,this.materials.white,64);this.scene.add(this.flowBuoys,this.flowCaps);this.flowMatrix=new T.Matrix4();this.flowObject=new T.Object3D();
 }
 makeWake(){const count=420;this.foamPositions=new Float32Array(count*3);this.foamLife=new Float32Array(count);this.foamSide=new Float32Array(count);for(let i=0;i<count;i++){this.foamLife[i]=Math.random()*2;this.foamSide[i]=(Math.random()-.5)*2;}this.foamGeo=new T.BufferGeometry();this.foamGeo.setAttribute('position',new T.BufferAttribute(this.foamPositions,3));this.foam=new T.Points(this.foamGeo,new T.PointsMaterial({color:'#d3faff',size:.23,opacity:.7,transparent:true,depthWrite:false}));this.scene.add(this.foam);
  const shape=new T.Shape();shape.moveTo(-1.1,0);shape.lineTo(-6,28);shape.quadraticCurveTo(0,24,6,28);shape.lineTo(1.1,0);shape.closePath();this.wake=this.mesh(this.scene,new T.ShapeGeometry(shape),new T.MeshBasicMaterial({color:'#9ae3e4',opacity:.12,transparent:true,depthWrite:false,side:T.DoubleSide}));this.wake.rotation.x=Math.PI/2;this.wake.position.y=-.45;
 }
 resize(){if(this.lost)return;const height=visualViewport?.height||innerHeight;this.renderer.setPixelRatio(Math.min(devicePixelRatio,this.low?1:1.5));this.renderer.setSize(innerWidth,height,false);this.canvas.style.height=height+'px';this.camera.aspect=innerWidth/height;this.camera.updateProjectionMatrix();this.composer?.setSize(innerWidth,height);}
 clearSlalom(){if(this.slalom){this.scene.remove(this.slalom);this.slalom.traverse(o=>{if(o.geometry&&o.geometry!==this.boxGeo&&o.geometry!==this.cylinderGeo)o.geometry.dispose();});this.slalom=null;}this.course.forEach(o=>o.g.visible=true);this.rival.visible=true;for(const boat of this.opponents||[])boat.visible=false;for(const trail of this.rivalTrails||[])trail.visible=false;}
 setSlalom(race){
  this.clearSlalom();this.camera.position.set(0,innerWidth<700?7:5.5,innerWidth<700?24:19);this.camera.lookAt(0,1,-42);this.slalom=new T.Group();this.scene.add(this.slalom);this.gateMeshes=[];this.debrisMeshes=[];this.course.forEach(o=>o.g.visible=false);this.rival.visible=false;
  for(const gate of race.gates){const g=new T.Group();
   for(const side of [-1,1]){const x=side*(gate.width+1.6);this.mesh(g,this.cylinderGeo,this.materials.orange,x,.5,0).scale.set(.65,2,.65);this.box(g,this.materials.chrome,x,2.6,0,.1,3,.1);this.box(g,this.materials.cyan,x-side*.8,3.7,0,1.6,.8,.08);}
   const line=this.box(g,this.materials.cyan,0,.02,0,gate.width*2,.045,.3);g.position.set(gate.x,0,-gate.distance);this.slalom.add(g);this.gateMeshes.push({g,line,gate});
  }
  for(const obstacle of race.debris){const g=new T.Group();this.box(g,this.materials.metal,0,.35,0,2.8,1.1,2.4);this.box(g,this.materials.amber,0,1,0,2.9,.14,2.5);for(const x of [-.9,.9])this.box(g,this.materials.chrome,x,.95,0,.14,.3,2.4);g.rotation.y=.28;g.position.set(obstacle.x,0,-obstacle.distance);this.slalom.add(g);this.debrisMeshes.push({g,obstacle});}
  this.actionMeshes=[];
  for(const hazard of race.hazards){const g=new T.Group();if(hazard.type==='wave'){
   const crest=this.mesh(g,new T.CylinderGeometry(.65,1.1,28,12),this.materials.cyan,0,.6,0);crest.rotation.z=Math.PI/2;this.box(g,this.materials.white,0,.65,-1,27,.13,2.4);
  }else{for(const x of [-14,14])this.box(g,this.materials.metal,x,4.5,0,1,9,2);this.box(g,this.materials.amber,0,2.5,0,28,.5,2.4);for(let x=-12;x<=12;x+=3)this.box(g,this.materials.dark,x,2.48,.02,1.5,.56,2.45);this.box(g,this.materials.chrome,0,5,0,28,4.5,1);}
   this.slalom.add(g);this.actionMeshes.push({g,hazard});}
  this.finishGate=new T.Group();for(const x of [-16,16])this.box(this.finishGate,this.materials.white,x,4,0,.6,9,.6);this.box(this.finishGate,this.materials.amber,0,8,0,32,.5,.5);this.finishGate.position.z=-race.course.length;this.slalom.add(this.finishGate);
 }
 setMood(fog){this.moodFog.set(fog);}
 strike(){this.flash=1;}
 render(dt,race,mode){if(this.lost)return;this.scene.fog.color.lerp(this.moodFog,1-Math.exp(-dt*1.2));this.flash=Math.max(0,this.flash-dt*3.5);this.renderer.toneMappingExposure=1.05+this.flash*(this.flash>.6?1.6:.4);const active=mode==='race';if(mode==='paused')dt=0;this.time+=dt;const targetTravel=mode==='menu'?this.time*4:race.distance;const prev=this.travel;this.travel=this.slalom?targetTravel:this.travel+(targetTravel-this.travel)*(1-Math.exp(-dt*8));const v=active?race.velocity:7,boost=active&&race.boost>0;
  this.waterMaterial.uniforms.uTime.value=this.time;this.waterMaterial.uniforms.uTravel.value=this.travel;this.waterMaterial.uniforms.uBoost.value=boost?1:0;
  if(this.flowBuoys){this.flowBuoys.visible=active;this.flowCaps.visible=active;for(let i=0;i<64;i++){const o=this.flowObject,d=i%32*12,z=24-((d-this.travel+384000)%384);o.position.set((i<32?-1:1)*(16+(i%3)*.7),-.05,z);o.scale.set(.32,1.3,.32);o.updateMatrix();this.flowBuoys.setMatrixAt(i,o.matrix);o.position.y=.55;o.scale.y=.18;o.updateMatrix();this.flowCaps.setMatrixAt(i,o.matrix);}this.flowBuoys.instanceMatrix.needsUpdate=true;this.flowCaps.instanceMatrix.needsUpdate=true;}
  const menu=mode==='menu';this.player.position.set(menu?8:(race.x||0),.35+(race.height||0)-(race.duck?.5:0)+Math.sin(this.time*2.6)*.14+(boost?.3:0),0);this.player.rotation.set(-.03-(boost?.09:0),menu?-.22:-(race.turn||0)*.16,this.reduced?0:-(race.turn||0)*.18+Math.sin(this.time*1.5)*.025);this.player.userData.jets.forEach(j=>j.scale.setScalar(boost?1.5:1));
  for(let i=0;i<(this.opponents?.length||0);i++){const boat=this.opponents[i],pilot=race.rivals?.[i];boat.visible=!menu&&!!pilot&&!!this.slalom&&pilot.distance-race.distance>-9&&pilot.distance-race.distance<350;const trail=this.rivalTrails?.[i];if(trail)trail.visible=boat.visible&&!this.low;if(!boat.visible)continue;boat.position.set(pilot.x,.35+pilot.height-(pilot.duck?.5:0)+Math.sin(this.time*2.4+i)*.14,race.distance-pilot.distance);if(trail){trail.position.set(pilot.x,-.45,race.distance-pilot.distance+3);trail.scale.set(.8,pilot.velocity/18,1);}boat.rotation.set(-.03,-pilot.turn*.16,-pilot.turn*.18);boat.userData.jets.forEach(j=>j.scale.setScalar(pilot.boost>0?1.6:1));}
  const gap=(race.rival??race.distance)-race.distance,narrow=innerWidth<700;this.rival.position.set(menu?16:(narrow?4.4:6.5),.35+Math.sin(this.time*2.4+1)*.14,menu?-16:T.MathUtils.clamp(-gap,-160,80));this.rival.rotation.z=-this.player.rotation.z;
  for(const o of this.islands){let z=(o.world-this.travel+110)%1100;if(z<0)z+=1100;o.g.position.z=110-z;}
  for(const o of this.course){let z=(o.world-this.travel+130)%1300;if(z<0)z+=1300;o.g.position.z=130-z;}
  this.rotors.forEach((r,i)=>r.rotation.z=this.time*(i%2?.08:-.1));
  if(this.slalom){for(const {g,line,gate} of this.gateMeshes){g.position.z=this.travel-gate.distance;g.visible=g.position.z<25&&g.position.z>-650;line.visible=!gate.passed;line.scale.y=gate===race.nextGate?.08:.045;}for(const {g,obstacle} of this.debrisMeshes){g.position.z=this.travel-obstacle.distance;g.position.y=Math.sin(this.time*2+obstacle.distance)*.14;g.visible=g.position.z<25&&g.position.z>-500;}for(const {g,hazard} of this.actionMeshes){g.position.z=this.travel-hazard.distance;g.visible=g.position.z<25&&g.position.z>-650;}this.finishGate.position.z=this.travel-race.course.length;}
  this.player.visible=!(active&&race.invulnerable>0&&Math.floor(this.time*12)%2);
  const mobile=innerWidth<700,short=(visualViewport?.height||innerHeight)<500;
  if(menu){this.cameraTarget.set(mobile?16:22,mobile?10:9,mobile?30:25);this.aim.set(mobile?6:1,1,-8);}else{this.cameraTarget.set(mobile?1.4:3.8,short?8:mobile?8.5:5.4,boost?20:mobile?21:18);this.aim.set(mobile?1.8:3,short?-.5:mobile?.4:1,-22);}
  if(!menu&&this.slalom){const px=race.x||0;const rush=this.reduced?0:T.MathUtils.clamp((v-18)/35,0,1);this.cameraTarget.set(px,(mobile?7:5.5)-rush*.8,(mobile?24:19)+(boost?1.5:0));this.aim.set(px,1,-42);}if(!menu&&this.cockpit){this.cameraTarget.set(this.player.position.x,this.player.position.y+2.4,-.6);this.aim.set(this.player.position.x,this.player.position.y+1.8,-55);}
  this.camera.position.lerp(this.cameraTarget,1-Math.exp(-dt*2.8));this.camera.lookAt(this.aim);const fov=menu?58:70+(!this.reduced&&active?T.MathUtils.clamp((v-18)*.38,0,12):0)+(boost&&!this.reduced?8:0);this.camera.fov+=(fov-this.camera.fov)*(1-Math.exp(-dt*4));this.camera.updateProjectionMatrix();
  for(let i=0;i<this.foamLife.length;i++){this.foamLife[i]+=dt;if(this.foamLife[i]>2.1){this.foamLife[i]=0;this.foamPositions[i*3]=this.player.position.x+this.foamSide[i]*1.6;this.foamPositions[i*3+1]=-.3+Math.random()*.4;this.foamPositions[i*3+2]=3.2;}this.foamPositions[i*3]+=this.foamSide[i]*dt*2;this.foamPositions[i*3+1]+=(this.foamLife[i]<.3?1:-1)*dt*.6;this.foamPositions[i*3+2]+=dt*(v*.8+2);}
  this.foamGeo.attributes.position.needsUpdate=true;this.foam.visible=!this.low;this.wake.position.x=this.player.position.x;this.wake.position.z=3;this.wake.scale.set(1,v/14,1);
  if(this.low)this.renderer.render(this.scene,this.camera);else{this.bloom.strength=boost?.5:.24;this.composer.render();}
 }
 rivalLabel(){this.labelVector.copy(this.rival.position).add(new T.Vector3(0,3,0)).project(this.camera);return {x:(this.labelVector.x*.5+.5)*innerWidth,y:(-.5*this.labelVector.y+.5)*(visualViewport?.height||innerHeight),visible:Math.abs(this.labelVector.x)<.9&&Math.abs(this.labelVector.y)<.9&&this.labelVector.z<1};}
}



