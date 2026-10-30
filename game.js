(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const screens = ["homeScreen","levelsScreen","gameScreen","resultScreen"];
  const levels = [
    {name:"الغابة الهادئة",env:"غابة",icon:"🌲",distance:20,required:120,wind:0.8,sky:["#8cae9b","#d6c79c"],ground:"#506d4c"},
    {name:"وادي الرياح",env:"وادي",icon:"⛰️",distance:30,required:140,wind:1.8,sky:["#c18e69","#e2bd87"],ground:"#806449"},
    {name:"مرتفعات الجبال",env:"جبال",icon:"🏔️",distance:42,required:160,wind:2.4,sky:["#83a8b0","#d5d5bd"],ground:"#64746b"},
    {name:"الصحراء الذهبية",env:"صحراء",icon:"🏜️",distance:55,required:180,wind:3.2,sky:["#d69b61","#f0d09a"],ground:"#b18a58"},
    {name:"ساحة البطولة",env:"مرتفعات",icon:"🏹",distance:70,required:200,wind:4,sky:["#788e9b","#c8c7b1"],ground:"#5b6655"}
  ];
  const state = {level:0,score:0,arrows:3,angle:0,power:75,wind:0,flight:null,shots:[],mode:"home",lastTime:0};
  const canvas=$("rangeCanvas"),ctx=canvas.getContext("2d");
  let width=0,height=0,raf=0;
  function show(id){screens.forEach(s=>$(s).hidden=s!==id);state.mode=id.replace("Screen","");if(id==="gameScreen")resizeCanvas();}
  function resizeCanvas(){if(!$("gameScreen").hidden){const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);width=r.width;height=r.height;canvas.width=Math.round(width*d);canvas.height=Math.round(height*d);ctx.setTransform(d,0,0,d,0,0);drawScene();}}
  function levelData(){return levels[Math.min(state.level,levels.length-1)];}
  function renderLevels(){
    $("levelList").innerHTML="";
    levels.forEach((l,i)=>{const b=document.createElement("button");b.className="level-card";b.disabled=i>state.level;b.innerHTML='<span class="level-icon">'+l.icon+'</span><span class="level-info"><strong>المستوى '+(i+1)+' — '+l.name+'</strong><small>'+l.distance+' متر • '+l.required+' نقطة للنجاح</small></span><span class="level-status">'+(i<state.level?"مكتمل":i===state.level?"متاح":"مغلق 🔒")+'</span>';b.addEventListener("click",()=>{if(i<=state.level)startLevel(i);});$("levelList").appendChild(b);});
  }
  function startLevel(index){
    state.level=index;state.score=0;state.arrows=3;state.angle=0;state.power=75;state.wind=(Math.random()*2-1)*levelData().wind;state.flight=null;state.shots=[];
    $("environmentLabel").textContent=levelData().env;$("levelLabel").textContent="المستوى "+(index+1);$("distanceLabel").textContent=levelData().distance+" م";$("requiredValue").textContent=levelData().required;$("scoreValue").textContent="0";$("arrowsValue").innerHTML='3 <span>● ● ●</span>';$("angleValue").textContent="0°";$("powerRange").value=75;$("powerValue").textContent="75%";$("aimHint").hidden=false;$("flightTag").hidden=true;$("fireBtn").disabled=false;$("fireBtn").classList.remove("charging");
    show("gameScreen");drawScene();
  }
  function updateHud(){$("scoreValue").textContent=state.score;$("arrowsValue").innerHTML=state.arrows+' <span>'+Array.from({length:3},(_,i)=>i<state.arrows?"●":"○").join(" ")+'</span>';$("angleValue").textContent=(state.angle>0?"+":"")+state.angle+"°";$("powerValue").textContent=state.power+"%";}
  function drawBackground(){
    const l=levelData(),g=ctx.createLinearGradient(0,0,0,height);g.addColorStop(0,l.sky[0]);g.addColorStop(1,l.sky[1]);ctx.fillStyle=g;ctx.fillRect(0,0,width,height);
    const horizon=height*.65;
    // Distant terrain silhouettes
    ctx.fillStyle=l.env==="غابة"?"#496b59":l.env==="صحراء"?"#bd925e":"#68796f";
    ctx.beginPath();ctx.moveTo(0,horizon);for(let x=0;x<=width+30;x+=30){let y=horizon-22-Math.sin(x*.013+state.level)*20-Math.sin(x*.032)*10;ctx.lineTo(x,y);}ctx.lineTo(width,height);ctx.lineTo(0,height);ctx.fill();
    ctx.fillStyle=l.ground;ctx.beginPath();ctx.moveTo(0,horizon+12);ctx.quadraticCurveTo(width*.5,horizon-8,width,horizon+18);ctx.lineTo(width,height);ctx.lineTo(0,height);ctx.fill();
    // Perspective ground marks
    ctx.strokeStyle="#e6d9b255";ctx.lineWidth=1;for(let i=0;i<7;i++){let y=horizon+18+i*i*5;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();}
    for(let i=0;i<8;i++){let x=width*i/7;ctx.beginPath();ctx.moveTo(width*.5,horizon);ctx.lineTo(x,height);ctx.stroke();}
    if(l.env==="غابة"){for(let i=0;i<8;i++){let x=i*width/7;drawTree(x,horizon-15-(i%3)*13,.65+(i%3)*.15);}}
    if(l.env==="صحراء"){ctx.fillStyle="#f2d9a055";ctx.beginPath();ctx.arc(width*.78,height*.19,22,0,Math.PI*2);ctx.fill();}
    if(l.env==="جبال"||l.env==="مرتفعات"){ctx.fillStyle="#536b70";for(let i=0;i<4;i++){let x=i*width*.34-20;ctx.beginPath();ctx.moveTo(x,horizon+8);ctx.lineTo(x+width*.19,horizon-105-(i%2)*35);ctx.lineTo(x+width*.38,horizon+8);ctx.fill();}}
  }
  function drawTree(x,y,s){ctx.fillStyle="#294b3a";ctx.beginPath();ctx.moveTo(x,y-70*s);ctx.lineTo(x-28*s,y+10*s);ctx.lineTo(x+28*s,y+10*s);ctx.fill();ctx.fillStyle="#765b3e";ctx.fillRect(x-4*s,y+5*s,8*s,24*s);}
  function targetGeometry(){const l=levelData(),scale=Math.max(.25,1-(state.level*.105));const radius=Math.min(width,height)*.19*scale;return{x:width*.76,y:height*.43,r:radius};}
  function drawTarget(){const t=targetGeometry();ctx.save();ctx.shadowColor="#172018";ctx.shadowBlur=12;ctx.fillStyle="#765b3d";ctx.fillRect(t.x-t.r*.08,t.y+t.r*.75,t.r*.16,t.r*.95);ctx.shadowBlur=0;
    const rings=["#e8ddc2","#a84d38","#e8ddc2","#a84d38","#e3bd62"];rings.forEach((c,i)=>{ctx.beginPath();ctx.fillStyle=c;ctx.arc(t.x,t.y,t.r*(1-i*.19),0,Math.PI*2);ctx.fill();});
    ctx.beginPath();ctx.fillStyle="#f6d98b";ctx.arc(t.x,t.y,t.r*.12,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#fff2cf";ctx.lineWidth=1;ctx.stroke();ctx.restore();}
  function drawBow(){const x=width*.16,y=height*.72,r=Math.min(width,height)*.17;ctx.save();ctx.strokeStyle="#c28d4f";ctx.lineWidth=7;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(x+r*.12,y-r);ctx.quadraticCurveTo(x-r*.8,y,x+r*.12,y+r);ctx.stroke();ctx.strokeStyle="#e5d9b9";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x+r*.12,y-r);ctx.lineTo(x+r*.12,y+r);ctx.stroke();ctx.strokeStyle="#9a7447";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+r*.12,y);ctx.stroke();ctx.restore();}
  function drawArrow(x,y,angle,color="#463a2c"){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-24,0);ctx.lineTo(22,0);ctx.stroke();ctx.fillStyle="#d8d0bd";ctx.beginPath();ctx.moveTo(22,0);ctx.lineTo(12,-5);ctx.lineTo(12,5);ctx.fill();ctx.fillStyle="#a64e39";ctx.beginPath();ctx.moveTo(-18,0);ctx.lineTo(-27,-6);ctx.lineTo(-24,0);ctx.lineTo(-27,6);ctx.fill();ctx.restore();}
  function drawScene(){
    if(!width||!height)return;ctx.clearRect(0,0,width,height);drawBackground();drawTarget();drawBow();
    const bx=width*.16,by=height*.72;
    state.shots.forEach(s=>{if(s.hit){ctx.save();ctx.translate(s.x,s.y);ctx.rotate(s.angle);ctx.strokeStyle="#473b2c";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-12,0);ctx.lineTo(14,0);ctx.stroke();ctx.restore();}});
    if(state.flight){const f=state.flight,t=targetGeometry();const p=Math.min(1,f.elapsed/f.duration);const endX=t.x+f.missX,endY=t.y+f.missY;const x=bx+(endX-bx)*p;const y=by+(endY-by)*p-Math.sin(p*Math.PI)*Math.min(height*.22,70)+(f.missY*(p*(1-p)));drawArrow(x,y,Math.atan2((endY-by),endX-bx));}
    else drawArrow(bx+width*.12,by-state.angle*1.25,-state.angle*Math.PI/180);
    // Reticle at current aim point, without a predicted trajectory
    if(!state.flight){const t=targetGeometry();const offset=state.angle*height*.009;ctx.strokeStyle="#f8e8bd99";ctx.lineWidth=1;ctx.beginPath();ctx.arc(t.x,t.y-offset,5,0,Math.PI*2);ctx.moveTo(t.x-9,t.y-offset);ctx.lineTo(t.x+9,t.y-offset);ctx.moveTo(t.x,t.y-offset-9);ctx.lineTo(t.x,t.y-offset+9);ctx.stroke();}
  }
  function launch(){
    if(state.flight||state.arrows<=0||state.mode!=="game")return;
    const t=targetGeometry(),distance=levelData().distance;
    // Simplified ballistic model: aim, launch energy, gravity and hidden crosswind all affect impact.
    const power=state.power/100,gravityDrop=(distance/22)*(1.08-power)*height*.12;
    const aimError=-state.angle*height*.009;
    const windDrift=state.wind*(distance/30)*height*.025;
    const missY=aimError+gravityDrop+(Math.random()-.5)*height*.012;
    const missX=windDrift+(Math.random()-.5)*height*.012;
    const duration=1.05+(distance/100)*.8;
    state.flight={elapsed:0,duration,missX,missY,wind:state.wind};state.arrows--;updateHud();$("aimHint").hidden=true;$("flightTag").hidden=false;$("fireBtn").disabled=true;$("fireBtn").classList.remove("charging");drawScene();
  }
  function finishFlight(){
    const t=targetGeometry(),f=state.flight;const dx=f.missX,dy=f.missY,dist=Math.hypot(dx,dy),ratio=dist/t.r;
    let points=0,hit=false;
    if(ratio<=.12){points=100;hit=true;}else if(ratio<=.31){points=70;hit=true;}else if(ratio<=.52){points=40;hit=true;}else if(ratio<=.78){points=20;hit=true;}
    state.score+=points;state.shots.push({hit,x:t.x+dx,y:t.y+dy,angle:Math.atan2(dy,dx)});state.flight=null;$("flightTag").hidden=true;
    $("aimHint").textContent=hit?"إصابة! +"+points+" نقطة":"لم تصب الهدف — حاول مجدداً";$("aimHint").hidden=false;
    updateHud();drawScene();
    if(state.arrows===0){setTimeout(showResult,850);}else{$("fireBtn").disabled=false;setTimeout(()=>{if(state.mode==="game"&&!state.flight)$("aimHint").textContent="اضبط التصويب ثم أطلق";},1200);}
  }
  function showResult(){
    const passed=state.score>=levelData().required;const last=state.level===levels.length-1;
    $("resultSymbol").textContent=passed?"🏆":"🎯";$("resultEyebrow").textContent=passed?"تم اجتياز المستوى":"انتهت المحاولة";$("resultTitle").textContent=passed?(last?"أكملت جميع المستويات!":"أحسنت الرماية!"):"تحتاج إلى دقة أكبر";$("finalScore").textContent=state.score;
    $("resultMessage").textContent=passed?(last?"إنجاز رائع! لقد أنهيت تحديات ساحة الرماية.":"حققت الحد المطلوب ("+levelData().required+" نقطة). المستوى التالي أصبح متاحاً."):"تحتاج إلى "+levelData().required+" نقطة لاجتياز هذا المستوى. يمكنك إعادة المحاولة وتحسين تصويبك.";
    $("continueBtn").hidden=!passed||last;$("retryBtn").textContent=passed&&last?"العب من جديد":"إعادة المستوى";$("continueBtn").onclick=()=>{renderLevels();startLevel(Math.min(state.level+1,levels.length-1));};$("retryBtn").onclick=()=>startLevel(state.level);show("resultScreen");renderLevels();
  }
  function animate(ts){if(state.flight){const dt=Math.min(.05,(ts-state.lastTime)/1000||0);state.flight.elapsed+=dt;if(state.flight.elapsed>=state.flight.duration)finishFlight();else drawScene();}state.lastTime=ts;raf=requestAnimationFrame(animate);}
  $("startBtn").addEventListener("click",()=>startLevel(0));$("levelsBtn").addEventListener("click",()=>{renderLevels();show("levelsScreen");});document.querySelectorAll("[data-back]").forEach(b=>b.addEventListener("click",()=>show("homeScreen")));$("exitGameBtn").addEventListener("click",()=>{state.flight=null;show("homeScreen");});
  $("aimUp").addEventListener("click",()=>{if(!state.flight){state.angle=Math.min(18,state.angle+1);updateHud();drawScene();}});$("aimDown").addEventListener("click",()=>{if(!state.flight){state.angle=Math.max(-18,state.angle-1);updateHud();drawScene();}});
  $("powerRange").addEventListener("input",e=>{state.power=Number(e.target.value);updateHud();});
  const fire=$("fireBtn");let holding=false;
  function release(){if(!holding)return;holding=false;launch();}
  fire.addEventListener("pointerdown",e=>{if(fire.disabled||state.flight)return;e.preventDefault();holding=true;fire.classList.add("charging");try{fire.setPointerCapture(e.pointerId);}catch(_){}});
  fire.addEventListener("pointerup",release);fire.addEventListener("pointercancel",release);fire.addEventListener("lostpointercapture",release);
  $("homeBtn").addEventListener("click",()=>show("homeScreen"));
  window.addEventListener("resize",resizeCanvas);window.addEventListener("orientationchange",()=>setTimeout(resizeCanvas,180));
  document.addEventListener("visibilitychange",()=>{if(document.hidden&&holding)release();});
  renderLevels();show("homeScreen");raf=requestAnimationFrame(animate);

  // PWA installation: browsers decide when installation can be offered.
  let installPrompt=null;const installBtn=$("installBtn");
  window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installPrompt=e;installBtn.hidden=false;});
  installBtn.addEventListener("click",async()=>{if(!installPrompt)return;installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;installBtn.hidden=true;});
  window.addEventListener("appinstalled",()=>{installBtn.hidden=true;});
  if("serviceWorker" in navigator && location.protocol!=="file:"){window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(err=>console.warn("SW registration failed",err)));}
})();