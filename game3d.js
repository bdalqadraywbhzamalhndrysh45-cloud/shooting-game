import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const screens = ["homeScreen","levelsScreen","gameScreen","resultScreen"];
  const levels = [
    {name:"غابة الغزلان",env:"صيد الغزلان",icon:"🦌",animal:"deer",distance:20,required:120,wind:.8,ground:0x344b37,fog:0x9aaf9b,sky:0xb7c9c0},
    {name:"وادي الأرانب",env:"صيد الأرانب",icon:"🐇",animal:"rabbit",distance:30,required:140,wind:1.8,ground:0x786047,fog:0xc2a17d,sky:0xe0c29d},
    {name:"مرتفعات الثعالب",env:"صيد الثعالب",icon:"🦊",animal:"fox",distance:42,required:160,wind:2.4,ground:0x596a62,fog:0xb4c4c6,sky:0xcbd6d4},
    {name:"سماء الطيور",env:"صيد الطيور",icon:"🕊️",animal:"bird",distance:55,required:180,wind:3.2,ground:0xa77e4c,fog:0xd6b98c,sky:0xf0d5a8},
    {name:"البحيرة البرية",env:"صيد البط البري",icon:"🦆",animal:"duck",distance:70,required:200,wind:4,ground:0x485b4d,fog:0x9daeb0,sky:0xc7d3d0}
  ];
  const state={level:0,score:0,arrows:3,angle:0,yaw:0,power:35,wind:0,drag:null,flight:null,shots:[],mode:"home",lastTime:0};
  const canvas=$("rangeCanvas");
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:"high-performance"});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.15;
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(62,1,.08,450);
  camera.position.set(0,1.68,0);
  camera.rotation.order="YXZ";
  const clock=new THREE.Clock();
  let width=1,height=1,world=[],bowRig=null,targetGroup=null,arrowRig=null,ground=null,cameraReturning=false,bowString=null,audioCtx=null;
  const mats={};
  function mat(color,roughness=.8,metalness=0){return new THREE.MeshStandardMaterial({color,roughness,metalness});}
  function show(id){screens.forEach(s=>$(s).hidden=s!==id);state.mode=id.replace("Screen","");if(id==="gameScreen")resize();}
  function levelData(){return levels[Math.min(state.level,levels.length-1)];}
  function clearWorld(){
    if(bowRig)camera.remove(bowRig);
    if(arrowRig)camera.remove(arrowRig);
    for(const o of world){
      scene.remove(o);
      o.traverse?.(n=>{n.geometry?.dispose?.();if(Array.isArray(n.material))n.material.forEach(m=>m.dispose?.());else n.material?.dispose?.();});
    }
    world=[];targetGroup=null;arrowRig=null;bowRig=null;
  }
  function add(mesh){scene.add(mesh);world.push(mesh);return mesh;}
  function resize(){if($("gameScreen").hidden)return;const r=canvas.getBoundingClientRect();width=Math.max(1,r.width);height=Math.max(1,r.height);renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();render();}
  function makeTree(x,z,s=1,kind="pine"){
    const group=new THREE.Group();group.position.set(x,0,z);group.scale.setScalar(s);
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.11,.18,2.1,7),mat(0x60472f));trunk.position.y=1.05;group.add(trunk);
    if(kind==="pine"){for(let i=0;i<4;i++){const c=new THREE.Mesh(new THREE.ConeGeometry(1.05-i*.17,2.0,8),mat(i%2?0x294a36:0x36583d));c.position.y=2.0+i*.66;group.add(c);}}
    else {const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(1.15,1),mat(0x476644));crown.position.y=3;group.add(crown);}
    return add(group);
  }
  function makeRock(x,z,s){const m=new THREE.Mesh(new THREE.DodecahedronGeometry(s,0),mat(0x77776b));m.position.set(x,s*.45,z);m.rotation.set(Math.random(),Math.random(),Math.random());return add(m);}
  function makeMountain(x,z,s,color){const m=new THREE.Mesh(new THREE.ConeGeometry(s, s*1.6,5),mat(color));m.position.set(x,s*.75,z);m.rotation.y=Math.random();return add(m);}
  function makeTarget(){
    const d=levelData();
    targetGroup=new THREE.Group();
    targetGroup.position.set(0,1.65,-d.distance);
    targetGroup.scale.setScalar((d.animal==="bird"||d.animal==="duck")?.9:Math.max(.78,1-d.distance/180));
    const fur=d.animal==="deer"?0x95633e:d.animal==="rabbit"?0xb7a18a:d.animal==="fox"?0xc66d32:d.animal==="duck"?0x4c6547:0x8a9b9c;
    const part=(geo,color,pos,rot)=>{const m=new THREE.Mesh(geo,mat(color,.78));m.position.set(...pos);if(rot)m.rotation.set(...rot);targetGroup.add(m);return m;};
    if(d.animal==="deer"||d.animal==="fox"){
      part(new THREE.SphereGeometry(.48,14,10),fur,[0,0,0],[0,0,Math.PI/2]);
      part(new THREE.SphereGeometry(.27,12,9),fur,[0,.48,-.02]);
      part(new THREE.SphereGeometry(.19,12,9),fur,[0,.78,-.02]);
      part(new THREE.SphereGeometry(.12,10,8),0x30251d,[0,.75,-.19]);
      for(const x of [-.27,.27])part(new THREE.CylinderGeometry(.055,.075,.65,8),fur,[x,-.45,0],[0,0,-x*.22]);
      if(d.animal==="deer"){
        for(const x of [-.13,.13]){
          part(new THREE.CylinderGeometry(.025,.045,.45,6),0x76502e,[x,.98,0],[0,0,x<0?.35:-.35]);
          part(new THREE.CylinderGeometry(.018,.025,.27,6),0x76502e,[x*1.9,1.22,0],[0,0,x<0?-.55:.55]);
        }
      }else part(new THREE.ConeGeometry(.11,.55,8),fur,[0,.15,.48],[Math.PI/2,0,0]);
      part(new THREE.SphereGeometry(.055,8,8),0x171717,[-.1,.83,-.18]);
      part(new THREE.SphereGeometry(.055,8,8),0x171717,[.1,.83,-.18]);
    }else if(d.animal==="rabbit"){
      part(new THREE.SphereGeometry(.38,14,10),fur,[0,0,0],[0,0,Math.PI/2]);
      part(new THREE.SphereGeometry(.24,12,9),fur,[0,.35,-.12]);
      part(new THREE.CapsuleGeometry(.075,.48,4,8),fur,[-.13,.76,-.1],[0,0,-.12]);
      part(new THREE.CapsuleGeometry(.075,.48,4,8),fur,[.13,.76,-.1],[0,0,.12]);
      part(new THREE.SphereGeometry(.06,8,8),0x171717,[-.08,.4,-.31]);
      part(new THREE.SphereGeometry(.06,8,8),0x171717,[.08,.4,-.31]);
    }else{
      part(new THREE.SphereGeometry(.4,14,10),fur,[0,0,0],[0,0,Math.PI/2]);
      part(new THREE.SphereGeometry(.19,12,9),fur,[0,.25,-.28]);
      part(new THREE.ConeGeometry(.1,.32,8),0xe2a63d,[0,.2,-.49],[Math.PI/2,0,0]);
      const left=part(new THREE.SphereGeometry(.12,10,8),0x293d36,[-.36,.08,0]);left.scale.set(.22,.09,.48);
      const right=part(new THREE.SphereGeometry(.12,10,8),0x293d36,[.36,.08,0]);right.scale.set(.22,.09,.48);
      targetGroup.userData.wings=[left,right];
      part(new THREE.SphereGeometry(.045,8,8),0x111111,[-.08,.32,-.4]);
      part(new THREE.SphereGeometry(.045,8,8),0x111111,[.08,.32,-.4]);
    }
    add(targetGroup);
  }
  function makeBow(){
    bowRig=new THREE.Group();bowRig.position.set(-.53,1.12,-1.55);bowRig.rotation.y=-.12;
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(.12,-.72,0),new THREE.Vector3(-.42,-.48,0),new THREE.Vector3(-.56,0,0),new THREE.Vector3(-.42,.48,0),new THREE.Vector3(.12,.72,0)]);
    const bow=new THREE.Mesh(new THREE.TubeGeometry(curve,36,.045,10,false),mat(0x8b5b32,.38,.22));bowRig.add(bow);
    const stringGeo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(.12,-.72,.015),new THREE.Vector3(.12,0,.015),new THREE.Vector3(.12,.72,.015)]);
    bowString=new THREE.Line(stringGeo,new THREE.LineBasicMaterial({color:0xe8dfc8}));bowRig.add(bowString);
    const grip=new THREE.Mesh(new THREE.CylinderGeometry(.075,.075,.34,12),mat(0x3c3025));grip.position.set(-.37,0,.015);grip.rotation.z=.12;bowRig.add(grip);
    camera.add(bowRig);
    const arrow=new THREE.Group();
    const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,1.75,8),mat(0x59432d,.42));shaft.rotation.x=Math.PI/2;arrow.add(shaft);
    const tip=new THREE.Mesh(new THREE.ConeGeometry(.045,.18,8),mat(0xbfc5c3,.25,.75));tip.rotation.x=-Math.PI/2;tip.position.z=-.95;arrow.add(tip);
    for(let i=0;i<3;i++){const f=new THREE.Mesh(new THREE.BoxGeometry(.012,.09,.2),mat(0x9c4938));f.position.set(Math.cos(i*2.094)*.035,Math.sin(i*2.094)*.035,.78);f.rotation.z=i*2.094;arrow.add(f);}
    arrow.position.set(-.52,1.1,-1.85);arrow.rotation.y=0;camera.add(arrow);arrowRig=arrow;
    return arrow;
  }
  function buildEnvironment(){
    clearWorld();const d=levelData();
    scene.background=new THREE.Color(d.sky);scene.fog=new THREE.Fog(d.fog,levelData().distance*.7,levelData().distance*4.2);
    scene.add(new THREE.HemisphereLight(0xe9f2e9,0x594a35,2.0));world.push(scene.children[scene.children.length-1]);
    const sun=new THREE.DirectionalLight(0xffedce,2.7);sun.position.set(-12,22,-18);scene.add(sun);world.push(sun);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(260,420,1,1),mat(d.ground,1));floor.rotation.x=-Math.PI/2;floor.position.set(0,-.06,-105);add(floor);
    const horizon=-levelData().distance*1.7;
    for(let i=0;i<22;i++){const x=(Math.random()-.5)*52,z=horizon-Math.random()*45; if(d.env.includes("غابة"))makeTree(x,z,.65+Math.random()*1.3);else if(d.env.includes("صحراء"))makeRock(x,z,.7+Math.random()*2);else makeMountain(x,z,4+Math.random()*11,d.env.includes("جبال")?0x778b8b:0x827867);}
    if(d.env.includes("غابة"))for(let i=0;i<24;i++){const side=i%2?1:-1;makeTree(side*(4+Math.random()*13),-4-Math.random()*levelData().distance*1.5,.55+Math.random()*.8);}
    if(d.env.includes("وادي"))for(let i=0;i<15;i++){const side=i%2?1:-1;makeRock(side*(4+Math.random()*12),-5-Math.random()*45,1+Math.random()*2.8);}
    makeTarget();makeBow();
    camera.position.set(0,1.68,0);camera.rotation.set(0,0,0);
    render();
  }
  function targetScreenPosition(){return targetGroup?targetGroup.position.clone():new THREE.Vector3(0,1.7,-20);}
  function render(){renderer.render(scene,camera);}
  function renderLevels(){
    $("levelList").innerHTML="";
    levels.forEach((l,i)=>{const b=document.createElement("button");b.className="level-card";b.disabled=i>state.level;b.innerHTML='<span class="level-icon">'+l.icon+'</span><span class="level-info"><strong>المستوى '+(i+1)+' — '+l.name+'</strong><small>'+l.distance+' متر • '+l.required+' نقطة للنجاح</small></span><span class="level-status">'+(i<state.level?"مكتمل":i===state.level?"متاح":"مغلق 🔒")+'</span>';b.addEventListener("click",()=>{if(i<=state.level)startLevel(i);});$("levelList").appendChild(b);});
  }
  function startLevel(index){
    state.level=index;state.score=0;state.arrows=3;state.angle=0;state.yaw=0;state.power=35;state.drag=null;cameraReturning=false;state.wind=(Math.random()*2-1)*levelData().wind;state.flight=null;state.shots=[];
    $("environmentLabel").textContent=levelData().env;$("levelLabel").textContent="المستوى "+(index+1);$("distanceLabel").textContent=levelData().distance+" م";$("requiredValue").textContent=levelData().required;$("scoreValue").textContent="0";$("arrowsValue").innerHTML='3 <span>● ● ●</span>';$("aimHint").hidden=false;$("aimHint").textContent="اسحب بإصبعك للتصويب وشد الوتر";$("flightTag").hidden=true;
    show("gameScreen");buildEnvironment();resize();
  }
  function updateHud(){$("scoreValue").textContent=state.score;$("arrowsValue").innerHTML=state.arrows+" / 3";$("drawPower").textContent=state.power+"%";$("drawFill").style.width=state.power+"%";}
  function aimCamera(){camera.rotation.order="YXZ";camera.rotation.x=THREE.MathUtils.degToRad(-state.angle*.58);camera.rotation.y=THREE.MathUtils.degToRad(state.yaw*.58);render();}
  function launch(){
    if(state.flight||state.arrows<=0||state.mode!=="game")return;
    camera.attach(arrowRig);arrowRig.position.set(-.52,1.1,-1.85);arrowRig.rotation.set(0,0,0);
    const dist=levelData().distance,power=state.power/100;
    const gravity=9.81,velocity=23+power*27,angle=THREE.MathUtils.degToRad(state.angle+3);
    const flightTime=Math.min(2.7,dist/(velocity*Math.cos(angle))+.25);
    const gravityDrop=.5*gravity*flightTime*flightTime*.13;
    const windDrift=state.wind*flightTime*.22;
    const aimY=Math.tan(angle)*dist*.34;
    const missX=windDrift+Math.tan(THREE.MathUtils.degToRad(state.yaw))*dist+(Math.random()-.5)*.12;
    const missY=gravityDrop-aimY+(Math.random()-.5)*.12;
    const start=arrowRig.getWorldPosition(new THREE.Vector3());
    scene.attach(arrowRig);
    arrowRig.position.copy(start);
    const end=new THREE.Vector3(missX,1.72+missY,-dist+.05);
    state.flight={elapsed:0,duration:flightTime,missX,missY,start,end};playSound("release");playSound("whoosh");
    cameraReturning=false;
    state.arrows--;updateHud();$("aimHint").hidden=true;$("flightTag").hidden=false;
  }
  function updateFlight(dt){
    const f=state.flight;if(!f)return;f.elapsed+=dt;const p=Math.min(1,f.elapsed/f.duration);
    const x=THREE.MathUtils.lerp(f.start.x,f.end.x,p),z=THREE.MathUtils.lerp(f.start.z,f.end.z,p);
    const y=THREE.MathUtils.lerp(f.start.y,f.end.y,p)+Math.sin(p*Math.PI)*Math.min(2.6,levelData().distance*.025);
    arrowRig.position.set(x,y,z);
    const direction=f.end.clone().sub(f.start).normalize();
    arrowRig.lookAt(x-direction.x,y-direction.y,z-direction.z);
    // Chase camera: stay behind and slightly above the arrow, looking ahead along its flight.
    const desiredCamera=new THREE.Vector3(x+direction.x*.15,y+1.05,z+4.6);
    camera.position.lerp(desiredCamera,1-Math.exp(-dt*5.5));
    const lookPoint=new THREE.Vector3(x+direction.x*7,y+direction.y*7+.15,z+direction.z*7);
    camera.lookAt(lookPoint);
    render();
    if(p>=1)finishFlight();
  }
  function finishFlight(){
    const f=state.flight,dx=f.missX-targetGroup.position.x,dy=(1.72+f.missY)-targetGroup.position.y,scale=targetGroup.scale.x,hitRadius=((levelData().animal==="bird"||levelData().animal==="duck")?.58:.82),ratio=Math.hypot(dx,dy)/(hitRadius*scale);
    let points=0,hit=false;if(ratio<=.12){points=100;hit=true;}else if(ratio<=.31){points=70;hit=true;}else if(ratio<=.52){points=40;hit=true;}else if(ratio<=.78){points=20;hit=true;}
    state.score+=points;state.shots.push({hit,x:dx,y:dy});state.flight=null;$("flightTag").hidden=true;
    if(hit){arrowRig.position.copy(f.end);targetGroup.attach(arrowRig);arrowRig.position.set(dx,dy,.28);playSound("impact");}
    else{arrowRig.position.copy(f.end);playSound("miss");}
    $("aimHint").textContent=hit?"إصابة! +"+points+" نقطة":"لم تصب الهدف — حاول مجدداً";$("aimHint").hidden=false;
    // Return the arrow to the bow and smoothly bring the camera back to the archer.
    cameraReturning=true;updateHud();render();
    if(state.arrows===0)setTimeout(showResult,1100);else{setTimeout(()=>{if(state.mode==="game"&&!state.flight)$("aimHint").textContent="اسحب بإصبعك للتصويب وشد الوتر";},1200);}
  }
  function showResult(){
    const passed=state.score>=levelData().required,last=state.level===levels.length-1;
    $("resultSymbol").textContent=passed?"🏆":"🎯";$("resultEyebrow").textContent=passed?"تم اجتياز المستوى":"انتهت المحاولة";$("resultTitle").textContent=passed?(last?"أكملت جميع المستويات!":"أحسنت الرماية!"):"تحتاج إلى دقة أكبر";$("finalScore").textContent=state.score;
    $("resultMessage").textContent=passed?(last?"إنجاز رائع! لقد أنهيت تحديات ساحة الرماية.":"حققت الحد المطلوب ("+levelData().required+" نقطة). المستوى التالي أصبح متاحاً."):"تحتاج إلى "+levelData().required+" نقطة لاجتياز هذا المستوى. يمكنك إعادة المحاولة وتحسين تصويبك.";
    $("continueBtn").hidden=!passed||last;$("retryBtn").textContent=passed&&last?"العب من جديد":"إعادة المستوى";$("continueBtn").onclick=()=>{renderLevels();startLevel(Math.min(state.level+1,levels.length-1));};$("retryBtn").onclick=()=>startLevel(state.level);show("resultScreen");renderLevels();
  }
  function animate(){
    requestAnimationFrame(animate);
    const dt=Math.min(clock.getDelta(),.04);
    if(state.flight)updateFlight(dt);
    if(targetGroup?.userData.wings){
      const flap=Math.sin(clock.elapsedTime*11)*.42;
      targetGroup.userData.wings[0].rotation.z=-.4-flap;targetGroup.userData.wings[1].rotation.z=.4+flap;
      targetGroup.position.x=Math.sin(clock.elapsedTime*.9)*1.05;
      targetGroup.position.y=1.65+Math.sin(clock.elapsedTime*1.7)*.22;
    }
    if(!state.flight&&cameraReturning){
      camera.position.lerp(new THREE.Vector3(0,1.68,0),1-Math.exp(-dt*4.2));
      const aimRotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(THREE.MathUtils.degToRad(-state.angle*.58),THREE.MathUtils.degToRad(state.yaw*.58),0,"YXZ"));
      camera.quaternion.slerp(aimRotation,1-Math.exp(-dt*4.2));
      if(camera.position.distanceTo(new THREE.Vector3(0,1.68,0))<.025){
        camera.position.set(0,1.68,0);camera.quaternion.copy(aimRotation);cameraReturning=false;
      }
      render();
    }
  }
  $("startBtn").addEventListener("click",()=>startLevel(0));$("levelsBtn").addEventListener("click",()=>{renderLevels();show("levelsScreen");});document.querySelectorAll("[data-back]").forEach(b=>b.addEventListener("click",()=>show("homeScreen")));$("exitGameBtn").addEventListener("click",()=>{state.flight=null;show("homeScreen");});
  function ensureAudio(){
    if(!audioCtx){const AC=window.AudioContext||window.webkitAudioContext;if(AC)audioCtx=new AC();}
    if(audioCtx&&audioCtx.state==="suspended")audioCtx.resume();
    $("soundStatus").textContent="🔊 المؤثرات الصوتية مفعّلة";
  }
  function playSound(kind){
    if(!audioCtx)return;
    const now=audioCtx.currentTime;
    const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
    const cfg=kind==="impact"?[105,.25,"triangle"]:kind==="release"?[190,.22,"sawtooth"]:kind==="whoosh"?[620,.35,"sine"]:kind==="miss"?[130,.13,"sine"]:[270,.08,"triangle"];
    osc.type=cfg[2];osc.frequency.setValueAtTime(cfg[0],now);osc.frequency.exponentialRampToValueAtTime(Math.max(35,cfg[0]*.4),now+cfg[1]);
    gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(kind==="impact"?.2:.09,now+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+cfg[1]);
    osc.connect(gain);gain.connect(audioCtx.destination);osc.start(now);osc.stop(now+cfg[1]+.02);
  }
  function updateDraw(x,y){
    if(!state.drag||state.flight)return;
    const dx=x-state.drag.x,dy=y-state.drag.y;
    state.yaw=THREE.MathUtils.clamp(state.drag.yaw+dx*.11,-22,22);
    state.angle=THREE.MathUtils.clamp(state.drag.angle-dy*.105,-18,18);
    state.power=Math.round(THREE.MathUtils.clamp(35+Math.hypot(dx,dy)*.42,35,100));
    arrowRig.position.set(-.52,1.1,-1.85+state.power*.006);
    if(bowString){const a=bowString.geometry.attributes.position;a.setXYZ(1,.12,0,.015+state.power*.007);a.needsUpdate=true;bowString.geometry.computeBoundingSphere();}
    aimCamera();updateHud();
    $("aimHint").textContent="شد الوتر "+state.power+"% — ارفع إصبعك للإطلاق";
  }
  canvas.addEventListener("pointerdown",e=>{
    if(state.mode!=="game"||state.flight||state.arrows<=0)return;
    e.preventDefault();ensureAudio();camera.attach(arrowRig);arrowRig.position.set(-.52,1.1,-1.85);arrowRig.rotation.set(0,0,0);cameraReturning=false;
    state.drag={x:e.clientX,y:e.clientY,angle:state.angle,yaw:state.yaw};
    try{canvas.setPointerCapture(e.pointerId);}catch(_){}
    playSound("draw");
  });
  canvas.addEventListener("pointermove",e=>{if(state.drag){e.preventDefault();updateDraw(e.clientX,e.clientY);}});
  function releaseTouch(e){
    if(!state.drag)return;
    updateDraw(e.clientX,e.clientY);state.drag=null;
    launch();
  }
  canvas.addEventListener("pointerup",releaseTouch);
  canvas.addEventListener("pointercancel",releaseTouch);
  $("homeBtn").addEventListener("click",()=>show("homeScreen"));
  window.addEventListener("resize",resize);window.addEventListener("orientationchange",()=>setTimeout(resize,180));
  document.addEventListener("visibilitychange",()=>{if(document.hidden)state.drag=null;});
  renderLevels();show("homeScreen");animate();
  let installPrompt=null;const installBtn=$("installBtn");
  window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installPrompt=e;installBtn.hidden=false;});
  installBtn.addEventListener("click",async()=>{if(!installPrompt)return;installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;installBtn.hidden=true;});
  window.addEventListener("appinstalled",()=>{installBtn.hidden=true;});
  if("serviceWorker" in navigator&&location.protocol!=="file:")window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(err=>console.warn("SW registration failed",err)));
  window.addEventListener("error",e=>{console.error("3D runtime error",e.message);$("aimHint").textContent="تعذر تشغيل الرسوم ثلاثية الأبعاد على هذا الجهاز";});
})();
