(()=>{
"use strict";
const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
let W=innerWidth,H=innerHeight,DPR=Math.min(devicePixelRatio||1,2),running=false,paused=false,gameState="menu",last=0,cameraY=0,shake=0;
let score=0,height=0,health=3,rush=0,rushing=false,rushTime=0,rushMessageTimer=0,combo=1,bestCombo=1,dodges=0,collected=0,yellowMangoes=0,goldenMangoes=0,hitFlash=0,deathTimer=0;
let currentRun=null,player=null,monkeys=[],mangoes=[],collectibles=[],particles=[],branchSeed=[],worldTop=-100000000,audioOn=true,audioCtx=null,lastMilestone=0;
const $=id=>document.getElementById(id),bgMusic=$("bgMusic"),keys=new Set(),input={left:false,right:false,up:false,down:false,rush:false};
const HISTORY_KEY="mangoTreeHistoryV2";
const OLD_HISTORY_KEY="mangoTreeHistoryV1";
const LEGACY_BOARD_KEY="mangoTreeBoardV5";

function normalizeHistory(list){
  if(!Array.isArray(list)) return [];
  return list.map(r=>({
    name:String(r?.name||r?.[0]||"PLAYER").slice(0,12),
    company:String(r?.company||r?.[1]||"—").slice(0,28),
    playedAt:String(r?.playedAt||r?.time||"N/A"),
    score:Number(r?.score??r?.[2]??0)
  })).filter(r=>Number.isFinite(r.score));
}
function readStored(key){
  try{return JSON.parse(localStorage.getItem(key)||"null")}catch(e){return null}
}

// Keep the complete historical record separately from the visible leaderboard.
// Older V1/legacy records are migrated unchanged so their original names, times, and scores remain available in CSV/Excel.
const v2History=normalizeHistory(readStored(HISTORY_KEY));
const v1History=normalizeHistory(readStored(OLD_HISTORY_KEY));
const legacyHistory=normalizeHistory(readStored(LEGACY_BOARD_KEY));
const seen=new Set();
let history=[...v2History,...v1History,...legacyHistory].filter(r=>{
  const key=`${r.name}|${r.company}|${r.playedAt}|${r.score}`;
  if(seen.has(key)) return false;
  seen.add(key);
  return true;
});
function saveHistory(){localStorage.setItem(HISTORY_KEY,JSON.stringify(history))}
saveHistory();

// The leaderboard starts empty, while historical records remain available for CSV export.
// New scores are added to both the historical CSV and the current leaderboard.
let leaderboard=[];
function topBoard(){return leaderboard.slice().sort((a,b)=>b.score-a.score).slice(0,10)}
function escapeHTML(value){
  return String(value)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#39;");
}
function boardHTML(id){
  const el=$(id); if(!el)return;
  const top=topBoard();
  if(!top.length){el.innerHTML='<div class="leader-empty">No scores yet.<br>Be the first climber!</div>';return}
  el.innerHTML=top.map((r,i)=>`<div class="leader"><span>#${i+1}</span><span class="leader-player"><b>🥭 ${escapeHTML(r.name)}</b><small>${escapeHTML(r.company)}</small></span><span>${r.score.toLocaleString()}</span></div>`).join("");
}
function refreshLeaderboards(){boardHTML("leaderboard");boardHTML("menuLeaderboard");boardHTML("menuLeaderboardSide")}
function csvCell(value){return '"'+String(value).replace(/"/g,'""')+'"'}
function downloadLeaderboardCSV(){
  const rows=[["Player Name","Company Name","Time Played","Score"],...history.map(r=>[r.name,r.company,r.playedAt,Number(r.score)])];
  const csv="\uFEFF"+rows.map(row=>row.map(csvCell).join(",")).join("\r\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download="mango-tree-climb-all-players.csv"; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
refreshLeaderboards();
function resize(){W=innerWidth;H=innerHeight;DPR=Math.min(devicePixelRatio||1,2);canvas.width=W*DPR;canvas.height=H*DPR;canvas.style.width=W+"px";canvas.style.height=H+"px";ctx.setTransform(DPR,0,0,DPR,0,0)}addEventListener("resize",resize);resize();
function setInput(k,v){input[k]=v;if(k==="rush"&&v)activateRush()}
const keyMap={ArrowLeft:"left",a:"left",A:"left",ArrowRight:"right",d:"right",D:"right",ArrowUp:"up",w:"up",W:"up",ArrowDown:"down",s:"down",S:"down"," ":"rush",Shift:"rush",r:"rush",R:"rush"};
function isTypingTarget(e){const el=e.target;return el&&((el.tagName==="INPUT")||(el.tagName==="TEXTAREA")||(el.tagName==="SELECT")||el.isContentEditable)}
addEventListener("keydown",e=>{
  if(isTypingTarget(e)) return;
  if((e.key==="p"||e.key==="P"||e.key==="Escape")&&running){e.preventDefault();togglePause();return}
  if(keyMap[e.key]){e.preventDefault();setInput(keyMap[e.key],true);startAudio()}
});
addEventListener("keyup",e=>{
  if(isTypingTarget(e)) return;
  if(keyMap[e.key])setInput(keyMap[e.key],false)
});
addEventListener("blur",()=>{
  Object.keys(input).forEach(k=>input[k]=false);
});
document.addEventListener("visibilitychange",()=>{
  if(document.hidden) Object.keys(input).forEach(k=>input[k]=false);
});
["playerName","nameInput","companyName","companyInput"].forEach(id=>{
  const el=$(id);
  if(!el)return;
  el.addEventListener("keydown",e=>e.stopPropagation());
  el.addEventListener("keyup",e=>e.stopPropagation());
  el.addEventListener("keypress",e=>e.stopPropagation());
  el.addEventListener("input",()=>{
    if(id==="playerName"||id==="nameInput") el.value=el.value.replace(/[^a-zA-Z0-9 _-]/g,"").slice(0,12);
    else el.value=el.value.replace(/[^a-zA-Z0-9 .&,'()_-]/g,"").slice(0,28);
  });
});
document.querySelectorAll("#mobileControls button").forEach(b=>{const k=b.dataset.key;b.addEventListener("pointerdown",e=>{e.preventDefault();setInput(k,true);startAudio()});["pointerup","pointercancel","pointerleave"].forEach(ev=>b.addEventListener(ev,()=>setInput(k,false)))});
$("playBtn").onclick=startGame;$("retryBtn").onclick=startGame;$("resumeBtn").onclick=togglePause;$("quitBtn").onclick=quitToMenu;$("pauseBtn").onclick=togglePause;$("submitBtn").onclick=submitScore;$("soundBtn").onclick=()=>{audioOn=!audioOn;$("soundBtn").textContent=audioOn?"🔊":"🔇";if(audioOn){startAudio()}else{stopBackgroundMusic()}};document.querySelectorAll(".download-board-btn").forEach(b=>b.addEventListener("click",downloadLeaderboardCSV));$("controlsBtn")?.addEventListener("click",()=>showModal("controls"));$("tipsBtn")?.addEventListener("click",()=>showModal("tips"));document.querySelectorAll("[data-close]").forEach(b=>b.onclick=hideModals);
window.addEventListener("load",()=>{
  if(bgMusic){
    bgMusic.autoplay=true;
    bgMusic.loop=true;
    bgMusic.volume=0.12;
    bgMusic.load();
  }
  startAudio();
});
// Browsers may block audible autoplay. Retry immediately after the first user interaction.
["pointerdown","touchstart","mousedown","keydown"].forEach(ev=>{
  window.addEventListener(ev,()=>startAudio(),{once:false,passive:true,capture:true});
});
function showModal(id){$(id).classList.remove("hidden")}function hideModals(){["controls","tips"].forEach(id=>$(id).classList.add("hidden"))}
function ensureAudioContext(){
  if(!audioOn)return null;
  try{
    if(!audioCtx){
      const AudioCtx=window.AudioContext||window.webkitAudioContext;
      if(!AudioCtx)return null;
      audioCtx=new AudioCtx();
    }
    if(audioCtx.state==="suspended")audioCtx.resume().catch(()=>{});
    return audioCtx;
  }catch(e){
    return null;
  }
}
function startAudio(){
  if(!audioOn)return;
  ensureAudioContext();
  if(bgMusic){
    bgMusic.volume=0.12;
    bgMusic.loop=true;
    try{
      const p=bgMusic.play();
      if(p&&typeof p.catch==="function")p.catch(()=>{});
    }catch(e){}
  }
}
function stopBackgroundMusic(){
  if(!bgMusic)return;
  bgMusic.pause();
  bgMusic.currentTime=0;
}
function beep(freq=440,dur=.07,type="sine",gain=.035){
  const ac=ensureAudioContext();
  if(!ac)return;
  try{
    const o=ac.createOscillator(),g=ac.createGain();
    o.type=type;o.frequency.value=freq;
    g.gain.setValueAtTime(gain,ac.currentTime);
    g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+dur);
    o.connect(g).connect(ac.destination);o.start();o.stop(ac.currentTime+dur);
  }catch(e){}
}
function makeBranch(y, side, idx){
  return {
    y,
    x:side*(30+Math.random()*20),
    len:230+Math.random()*105,
    side,
    w:26+Math.random()*5,
    idx
  };
}

function appendWorldUntil(targetY){
  // Endless-world generator. Branches are deliberately staggered vertically
  // so the player never sees two monkeys sitting beside each other at the
  // same height. The side alternates left/right, leaving a clear climbing gap.
  let y;
  if(branchSeed.length){
    y=Math.min(...branchSeed.map(b=>b.y))-210;
  }else{
    y=-120;
  }
  let idx=branchSeed.length;
  while(y>targetY){
    const side=(idx%2===0)?-1:1;
    branchSeed.push(makeBranch(y, side, idx++));
    y-=205+Math.random()*75;
  }
}

function createMonkeyForBranch(branch, i){
  const branchT=.38+Math.random()*.20;
  const branchX=branch.x + branch.side*branch.len*branchT;
  const u=1-branchT;
  const branchSurfaceY=(u*u*4)+(2*u*branchT*(-32))+(branchT*branchT*(-48));
  return {
    branch, branchT,
    x:branchX,
    y:branch.y+branchSurfaceY-62,
    side:branch.side,
    cool:2.4+Math.random()*1.8,
    scale:.86+Math.random()*.14,
    anger:0,
    throwing:0,
    throwFlash:0,
    bob:Math.random()*Math.PI*2,
    id:i
  };
}

function ensureMonkeysForNewBranches(){
  // Exactly one seated monkey per branch. Because branches alternate sides
  // and are vertically separated, the player gets one readable threat at a
  // time instead of a wall of monkeys.
  const existing=new Set(monkeys.map(m=>m.branch));
  for(let i=0;i<branchSeed.length;i++){
    const b=branchSeed[i];
    if(existing.has(b)) continue;
    monkeys.push(createMonkeyForBranch(b,i));
  }
}

function resetWorld(){
  score=0;height=0;health=3;rush=0;rushing=false;rushTime=0;rushMessageTimer=0;combo=1;bestCombo=1;dodges=0;collected=0;yellowMangoes=0;goldenMangoes=0;deathTimer=0;
  hitFlash=0;cameraY=0;shake=0;mangoes=[];collectibles=[];particles=[];
  player={x:0,y:40,anim:0,inv:0,climbing:false};

  branchSeed=[];
  monkeys=[];

  // Generate a generous starting area, then keep extending it forever.
  appendWorldUntil(-5000);
  ensureMonkeysForNewBranches();
}

function recordCurrentRun(){
  if(!currentRun || currentRun.recorded)return;
  const finalScore=Number.isFinite(score)?Math.floor(score):0;
  const result={name:currentRun.name,company:currentRun.company,playedAt:currentRun.startedAt.toLocaleString(),score:finalScore};
  history.push(result);
  leaderboard.push(result);
  currentRun.recorded=true;
  saveHistory();
  refreshLeaderboards();
}
// Save an active player's run when the browser/tab is closed, refreshed, or navigated away.
addEventListener("pagehide",()=>{
  if(running)recordCurrentRun();
});

function startGame(){
  const name=$("playerName").value.trim();
  const company=$("companyName").value.trim();
  if(!name||!company){
    $("profileError").classList.remove("hidden");
    if(!name)$("playerName").focus();else $("companyName").focus();
    return;
  }
  $("profileError").classList.add("hidden");
  document.body.classList.remove("rush-active");
  Object.keys(input).forEach(k=>input[k]=false);
  hideModals();$("menu").classList.add("hidden");$("gameover").classList.add("hidden");$("pause").classList.add("hidden");
  $("hud").classList.remove("hidden");
  $("mobileControls").classList.remove("hidden");
  resetWorld();
  const cleanName=name.toUpperCase().slice(0,12);
  const cleanCompany=company.slice(0,28);
  currentRun={name:cleanName,company:cleanCompany,startedAt:new Date()};
  $("nameInput").value=cleanName;$("companyInput").value=cleanCompany;
  running=true;paused=false;gameState="playing";last=performance.now();
  startAudio();beep(660,.1,"triangle",.04);requestAnimationFrame(loop);
}
function quitToMenu(){
  if(running)recordCurrentRun();
  running=false;paused=false;gameState="menu";rushing=false;document.body.classList.remove("rush-active");stopBackgroundMusic();
  Object.keys(input).forEach(k=>input[k]=false);
  mangoes.length=0;
  ["hud","mobileControls","pause","gameover"].forEach(id=>$(id).classList.add("hidden"));
  $("profileError").classList.add("hidden");
  $("menu").classList.remove("hidden");
}

function togglePause(){if(!running)return;paused=!paused;$("pause").classList.toggle("hidden",!paused);if(!paused){last=performance.now();requestAnimationFrame(loop)}}
function activateRush(){
  // Mango Rush is a strategic survival ability. Every run starts at 0%, so
  // players must earn charge through skill before they can use it.
  if(!running||rushing)return;
  if(rush<25){
    rushMessageTimer=.9;
    beep(180,.08,"square",.025);
    return;
  }
  const charge=rush;
  rush=0;
  rushing=true;
  // More charge means a longer emergency window, but the meter is always
  // consumed completely when activated.
  rushTime=2.0 + charge/100*2.5;
  combo=Math.max(combo,2);
  burst(player.x,player.y,"#ffe14b",42);
  document.body.classList.add("rush-active");
  beep(880,.15,"square",.05);
}
function update(dt){
  // IMPORTANT: there is NO automatic climbing.
  // A dead run is completely frozen; the game-over state owns the screen.
  if(!running || health<=0) return;
  // The player changes height only while UP/W is held.
  // Rush does NOT make the player magically climb faster. Its purpose is to
  // slow the incoming danger, giving a skilled player a short survival window.
  const climbSpeed=175;
  const sideSpeed=220;
  const simDt=rushing?dt*0.42:dt;

  if(rushing){
    rushTime-=dt;
    if(rushTime<=0){
      rushTime=0;
      rushing=false;
      document.body.classList.remove("rush-active");
    }
  }
  if(rushMessageTimer>0)rushMessageTimer-=dt;

  const wasMovingUp=input.up;
  const wasMovingDown=input.down;
  player.climbing=wasMovingUp || wasMovingDown;

  if(input.left) player.x-=sideSpeed*dt;
  if(input.right) player.x+=sideSpeed*dt;

  // UP = climb, DOWN = descend. No key = no vertical movement.
  if(wasMovingUp) player.y-=climbSpeed*dt;
  if(wasMovingDown) player.y+=climbSpeed*.72*dt;

  const half=145;
  player.x=Math.max(-half,Math.min(half,player.x));
  // Endless climb: there is no upper boundary. Generate more tree above
  // the player before they can ever reach the end of the world.
  appendWorldUntil(player.y-5200);
  ensureMonkeysForNewBranches();

  // Keep the endless run lightweight by forgetting only the world far below
  // the camera. The frontier above is always retained/generated.
  const keepBelow=player.y+2600;
  branchSeed=branchSeed.filter(b=>b.y<keepBelow);
  monkeys=monkeys.filter(m=>m.branch.y<keepBelow);

  // Height is derived only from the player's actual position.
  height=Math.max(0,Math.floor((40-player.y)/5));

  // Height stays a real measurement in meters. The final score is always
  // the real climbing height plus the mango reward bonuses.
  score=height + (yellowMangoes*20) + (goldenMangoes*40);

  // Rush slowly charges only from successful mango interactions.
  if(player.inv>0) player.inv-=dt;
  if(hitFlash>0) hitFlash-=dt;

  player.anim+=dt*(player.climbing?12:2);

  cameraY+=(player.y-cameraY-H*.53)*Math.min(1,dt*4);
  if(cameraY>45) cameraY=45;

  // Monkeys attack ONLY from above the player. A monkey that is below or
  // level with the climber is never allowed to throw a mango upward.
  // Difficulty ramps continuously, like an endless-runner:
  // early game = sparse, slow attacks; later game = denser, faster attacks.
  // Gentle opening, then a smooth endless difficulty curve. The first
  // section is intentionally calm: one slow mango at a time with generous
  // reaction time. Every additional height tier increases speed and volume.
  const difficulty=Math.min(18, Math.pow(Math.max(height,0)/240,0.86));
  const attackAboveMin=115;
  const attackAboveMax=Math.min(1350,780+difficulty*32);
  const maxActiveMangoes=Math.min(9,1+Math.floor(height/170));
  const attackIntervalBase=Math.max(0.62,4.15-height/330);

  for(const m of monkeys){
    // Keep the monkey physically attached to its branch at all times.
    const t=m.branchT, u=1-t;
    const branchSurfaceY=(u*u*4)+(2*u*t*(-32))+(t*t*(-48));
    m.x=m.branch.x + m.branch.side*m.branch.len*t;
    m.y=m.branch.y+branchSurfaceY-62;

    m.cool-=simDt;
    if(m.throwing>0)m.throwing-=simDt;
    if(m.throwFlash>0)m.throwFlash-=simDt;
    m.bob+=simDt*2.8;

    const verticalAbove=player.y-m.y;
    const isAbove=verticalAbove>=attackAboveMin && verticalAbove<=attackAboveMax;
    const canSeePlayer=Math.abs(player.x-m.x)<390;

    if(m.cool<=0 && isAbove && canSeePlayer && mangoes.length<maxActiveMangoes){
      throwMango(m);
      // Only one monkey throws at a time early on. Later, the active-mango
      // cap rises and several separated monkeys can contribute to the storm.
      const interval=attackIntervalBase+Math.random()*(0.45+Math.max(0,1.5-difficulty*.08));
      m.cool=interval;
      m.anger=difficulty;
    }
  }

  // Update thrown mangoes. They visibly travel from monkey to player.
  for(const m of mangoes){
    m.x+=m.vx*simDt;
    m.y+=m.vy*simDt;
    m.vy+=m.gravity*simDt;
    m.rot+=m.spin*simDt;
    m.life-=simDt;
    m.near=(m.near||0)+simDt;

    const distance=Math.hypot(m.x-player.x,m.y-player.y);

    if(!m.counted && m.near>.10 && distance>48 && distance<92){
      m.counted=true;
      nearMiss(m);
    }
  }

  // Collision is based on the actual projectile type.
  for(let i=mangoes.length-1;i>=0;i--){
    const m=mangoes[i];
    const hitDistance=Math.hypot(m.x-player.x,m.y-(player.y-18));

    if(player.inv<=0 && hitDistance<48){
      mangoes.splice(i,1);

      if(m.kind==="rotten"){
        // Rotten mango = the only damaging projectile.
        damage();
        if(!running) break;
      }else if(m.kind==="yellow"){
        // Yellow mango = small reward for a risky catch.
        collected++;
        yellowMangoes++;
        rush=Math.min(100,rush+12);
        burst(player.x,player.y,"#ffd22e",22);
        beep(760,.10,"triangle",.035);
      }else if(m.kind==="gold"){
        // Golden mango = premium reward and a large Rush boost.
        collected++;
        goldenMangoes++;
        rush=Math.min(100,rush+38);
        burst(player.x,player.y,"#fff06a",32);
        beep(980,.12,"triangle",.045);
      }
    }
  }

  // Recalculate immediately so every collected mango is part of the
  // player's score even if the run ends in this same frame.
  score=height + (yellowMangoes*20) + (goldenMangoes*40);

  // Once the player dies, do not run any more gameplay work in this frame.
  if(!running){
    updateHUD();
    return;
  }

  mangoes=mangoes.filter(m=>
    m.life>0 &&
    m.x>-600 && m.x<600 &&
    m.y<player.y+1400 &&
    m.y>player.y-1400
  );

  for(const p of particles){
    p.x+=p.vx*dt;
    p.y+=p.vy*dt;
    p.vy+=35*dt;
    p.life-=dt;
  }
  particles=particles.filter(p=>p.life>0);

  if(Math.random()<dt*(rushing?28:9)){
    particles.push({
      x:player.x+(Math.random()-.5)*35,
      y:player.y+25,
      vx:(Math.random()-.5)*25,
      vy:-25-Math.random()*45,
      life:.45+Math.random()*.25,
      color:rushing?"#ffe36b":"#c9e58a"
    });
  }

  updateHUD();
}
function nearMiss(m){
  // Near miss is only awarded for an actual rotten projectile passing close by.
  if(m.kind!=="rotten") return;
  dodges++;
  combo=Math.min(9,combo+1);
  bestCombo=Math.max(bestCombo,combo);
  rush=Math.min(100,rush+5);
  shake=2;
  beep(740+combo*45,.055,"sine",.025);
}

function throwMango(m){
  // This function is intentionally one-directional:
  // the monkey is above the player and the mango is thrown DOWN toward them.
  const targetX=player.x+((Math.random()-.5)*22);
  const targetY=player.y-18;
  const dx=targetX-m.x;
  const dy=targetY-m.y; // must be positive because the monkey is above the player

  // Stronger gravity gives the projectile a clearly downward arc instead of
  // making it look like a laser fired from the monkey.
  // Slow, readable opening throws; speed rises continuously with height.
  const speed=185+Math.min(720,height*.56)+m.anger*22;
  const gravity=165+Math.min(250,height*.16);

  // Choose a predictable travel time, then solve the initial velocity for
  // that time. Because dy is positive, the resulting trajectory remains
  // predominantly downward.
  const travelTime=Math.max(.72,Math.min(1.35,Math.abs(dx)/speed+.50));
  const vx=dx/travelTime;
  const vy=(dy-(.5*gravity*travelTime*travelTime))/travelTime;

  // Three clearly different mango outcomes. Rotten is common and dangerous;
  // yellow is a smaller reward; golden is rare and highly valuable.
  const roll=Math.random();
  const kind=roll<0.07?"gold":roll<0.30?"yellow":"rotten";

  m.throwing=.42;
  m.throwFlash=.5;

  mangoes.push({
    x:m.x-m.side*18,
    y:m.y+54,
    vx,
    vy,
    gravity,
    rot:0,
    spin:8*(Math.random()>.5?1:-1),
    life:5,
    near:0,
    counted:false,
    kind,
    sourceMonkey:m
  });

  beep(kind==="gold"?700:kind==="yellow"?610:520,.06,"square",.025);
}
function damage(){
  if(health<=0 || !running) return;

  health--;
  combo=1;
  player.inv=1.35;
  hitFlash=.45;
  shake=13;
  burst(player.x,player.y,"#ff4f32",28);
  beep(120,.18,"sawtooth",.05);

  if(health<=0){
    // Remove every active projectile immediately so nothing can keep
    // interacting with the dead player while the result screen opens.
    health=0;
    mangoes.length=0;
    input.left=input.right=input.up=input.down=input.rush=false;
    endGame();
  }
}
function burst(x,y,color,n){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*210,vy:(Math.random()-.5)*210,life:.45+Math.random()*.45,color})}
function updateHUD(){
  $("height").textContent=height.toLocaleString();
  $("score").textContent=Math.floor(score).toLocaleString();
  $("yellowBonus").textContent="🟡 +20 × "+yellowMangoes;
  $("goldBonus").textContent="✨ +40 × "+goldenMangoes;
  $("hearts").textContent="♥ ".repeat(health).trim()+" ♡ ".repeat(3-health);
  $("rushBar").style.width=rush+"%";
  $("rushText").textContent=Math.floor(rush)+"%";
  let hint;
  if(rushing) hint="RUSH ACTIVE · MANGOES SLOWED";
  else if(rushMessageTimer>0) hint="NEED 25% CHARGE · CATCH / DODGE TO BUILD";
  else if(rush>=25) hint="SPACE = SLOW INCOMING MANGOES";
  else hint="CATCH 🟡✨ · DODGE 🟢 TO CHARGE";
  $("rushHint").textContent=hint;
}
function endGame(){
  // Enter a dedicated game-over state instead of leaving the game loop in a dead state.
  running=false;
  gameState="gameover";
  paused=false;
  stopBackgroundMusic();
  rushing=false;
  rushTime=0;
  document.body.classList.remove("rush-active");
  input.left=input.right=input.up=input.down=input.rush=false;
  mangoes.length=0;
  const previousTop=topBoard();
  const previousBest=previousTop.length?previousTop[0].score:0;
  recordCurrentRun();
  ["hud","mobileControls"].forEach(id=>$(id).classList.add("hidden"));
  $("pause").classList.add("hidden");
  $("gameover").classList.remove("hidden");setTimeout(()=>$("nameInput").focus(),80);$("finalHeight").textContent=height;$("finalScore").textContent=Math.floor(score).toLocaleString();$("finalMangoes").textContent=collected;$("finalDodges").textContent=dodges;$("finalCombo").textContent="x"+bestCombo;const rank=topBoard().filter(r=>score>r.score).length+1;$("finalRank").textContent=rank<=10?"#"+rank:"#—";const record=score>previousBest;$("recordBadge").textContent=record?"🏆 NEW RECORD!":"RUN COMPLETE";$("recordBadge").style.background=record?"#9b6b19":"#4f3b1d";$("resultTitle").textContent=height>=500?"LEGENDARY CLIMB!":height>=300?"AMAZING CLIMB!":"GREAT CLIMB!";beep(record?990:330,.16,"triangle",.045)}
function submitScore(){
  recordCurrentRun();
  gameState="menu";
  $("gameover").classList.add("hidden");$("menu").classList.remove("hidden");stopBackgroundMusic();
}

function sy(y){return y-cameraY}
function draw(){ctx.save();if(shake){ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);shake*=.88;if(shake<.2)shake=0}drawBackground();drawTree();drawBranches();drawRope();for(const c of collectibles)drawCollectible(c);for(const m of monkeys)drawMonkey(m);for(const m of mangoes){drawMangoTrail(m);drawMango(W/2+m.x,sy(m.y),m.rot,m.kind)}drawPlayer();for(const p of particles)drawParticle(p);ctx.restore()}
function drawBackground(){const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,"#78cbe6");g.addColorStop(.42,"#cbe8d0");g.addColorStop(1,"#d9b963");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);const glow=ctx.createRadialGradient(W*.75,H*.18,10,W*.75,H*.18,Math.max(W,H)*.55);glow.addColorStop(0,"#fff1a755");glow.addColorStop(1,"#fff0a900");ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);for(let i=0;i<11;i++){const x=(i*190+80)%W,y=H-75-(i%4)*45;drawDistantTree(x,y,.65+(i%3)*.15)}ctx.globalAlpha=.22;for(let i=0;i<15;i++){const x=(i*113+(performance.now()/90)*(i%2?1:-1))%W,y=(i*73)%H;ctx.fillStyle=i%2?"#2d753c":"#eaa51d";ctx.save();ctx.translate(x,y);ctx.rotate(i);ctx.beginPath();ctx.ellipse(0,0,11,5,.3,0,Math.PI*2);ctx.fill();ctx.restore()}ctx.globalAlpha=1}
function drawDistantTree(x,y,s){ctx.fillStyle="#6a4827";ctx.fillRect(x-6*s,y-80*s,12*s,80*s);ctx.fillStyle="#2e7140";for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(x+(i%2?25:-20)*s,y-92*s+i*13*s,32*s,0,Math.PI*2);ctx.fill()}}
function drawTree(){
  const cx=W/2;
  // Draw only the portion of the trunk the camera can see. The world itself
  // has no top, so the tree can visually continue forever.
  const topY=sy(player ? player.y-2600 : -2600);
  const bottom=H+300;
  const g=ctx.createLinearGradient(cx-170,0,cx+170,0);
  g.addColorStop(0,"#4e2815");
  g.addColorStop(.22,"#925322");
  g.addColorStop(.48,"#bd7130");
  g.addColorStop(.72,"#7b3f19");
  g.addColorStop(1,"#43200f");
  ctx.fillStyle=g;
  ctx.beginPath();
  ctx.moveTo(cx-125,bottom);
  ctx.bezierCurveTo(cx-165,sy(player?player.y-900: -900),cx-118,sy(player?player.y-1800:-1800),cx-76,topY);
  ctx.lineTo(cx+76,topY);
  ctx.bezierCurveTo(cx+118,sy(player?player.y-1800:-1800),cx+165,sy(player?player.y-900:-900),cx+125,bottom);
  ctx.closePath();
  ctx.fill();

  for(let i=-5;i<=5;i++){
    ctx.strokeStyle=i%2?"#2d160c77":"#e3a05233";
    ctx.lineWidth=i%2?8:12;
    ctx.beginPath();
    ctx.moveTo(cx+i*23,bottom);
    ctx.bezierCurveTo(cx+i*30,sy(player?player.y-700:-700),cx+i*17,sy(player?player.y-1600:-1600),cx+i*13,topY);
    ctx.stroke();
  }

  // Dense canopy pockets around the visible climb area.
  const baseY=sy(Math.floor((player?player.y:0)/900)*900-500);
  drawCanopy(cx,baseY,1.7);
  drawCanopy(cx-150,baseY-360,1.05);
  drawCanopy(cx+160,baseY-610,1.1);
}

function drawBranches(){const cx=W/2;for(const b of branchSeed){const x=cx+b.x,y=sy(b.y);if(y<-200||y>H+160)continue;ctx.strokeStyle="#4e2712";ctx.lineWidth=b.w+8;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(cx+b.side*25,y+10);ctx.quadraticCurveTo(x+b.side*b.len*.5,y-28,x+b.side*b.len,y-42);ctx.stroke();ctx.strokeStyle="#9c5728";ctx.lineWidth=b.w;ctx.beginPath();ctx.moveTo(cx+b.side*25,y+4);ctx.quadraticCurveTo(x+b.side*b.len*.5,y-32,x+b.side*b.len,y-48);ctx.stroke();ctx.strokeStyle="#cf8240aa";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(cx+b.side*35,y-2);ctx.quadraticCurveTo(x+b.side*b.len*.5,y-31,x+b.side*b.len-10*b.side,y-45);ctx.stroke();for(let j=0;j<4;j++)drawLeafCluster(x+b.side*(b.len*.52+j*34),y-55-j*6,.5)}}
function drawCanopy(x,y,s){for(let i=0;i<18;i++){const a=i*.68,rx=Math.cos(a)*78*s,ry=Math.sin(a)*47*s;drawLeafCluster(x+rx,y+ry,.8*s)}}
function drawLeafCluster(x,y,s){const cols=["#173f20","#245d2b","#397d34","#5a8f2d"];for(let i=0;i<6;i++){ctx.fillStyle=cols[i%4];ctx.beginPath();ctx.ellipse(x+Math.cos(i)*20*s,y+Math.sin(i)*15*s,38*s,20*s,i*.45,0,Math.PI*2);ctx.fill()}}
function drawRope(){
  // One continuous, light climbing rope extends beyond the entire viewport.
  const ropeX=W/2+player.x;
  const time=performance.now()/1000;
  const sway=Math.sin(time*.9+player.x*.01)*1.8;
  const x=ropeX+sway;

  ctx.save();ctx.lineCap="round";
  // Soft shadow keeps the rope readable against the tree without making it dark.
  ctx.strokeStyle="#6d5137aa";ctx.lineWidth=10;
  ctx.beginPath();ctx.moveTo(x+2,-100);ctx.lineTo(x+2,H+100);ctx.stroke();
  // Main rope is deliberately much lighter than the previous brown rope.
  ctx.strokeStyle="#f0d39a";ctx.lineWidth=7;
  ctx.beginPath();ctx.moveTo(x,-100);ctx.lineTo(x,H+100);ctx.stroke();
  ctx.strokeStyle="#fff0c7";ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(x-1,-100);ctx.lineTo(x-1,H+100);ctx.stroke();

  // Subtle braid detail.
  for(let y=-30;y<H+50;y+=30){
    const wave=Math.sin((y+time*18)*.25)*1.7;
    ctx.strokeStyle="#c79b62";ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(x-3+wave,y);ctx.lineTo(x+3+wave,y+6);ctx.lineTo(x-3+wave,y+12);ctx.stroke();
  }
  ctx.restore();
}
function drawPlayer(){
  if(!player)return;
  const x=W/2+player.x,y=sy(player.y),blink=player.inv>0&&Math.floor(player.inv*14)%2===0;
  if(blink)return;
  ctx.save();ctx.translate(x,y);ctx.scale(1.08,1.08);
  if(hitFlash>0){ctx.globalAlpha=.7;ctx.fillStyle="#ff3b22";ctx.beginPath();ctx.arc(0,-16,66+hitFlash*12,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1}

  const swing=player.climbing?Math.sin(player.anim)*8:Math.sin(player.anim*.5)*2;
  // Soft contact shadow.
  ctx.fillStyle="#0005";ctx.beginPath();ctx.ellipse(0,52,43,9,0,0,Math.PI*2);ctx.fill();

  // More natural climbing legs: visible thighs, bent knees, lower legs and
  // proper boots, instead of two straight floating strokes.
  ctx.lineCap="round";
  ctx.strokeStyle="#244b89";ctx.lineWidth=15;
  ctx.beginPath();
  ctx.moveTo(-12,24);ctx.quadraticCurveTo(-18,36,-24+swing,48);
  ctx.moveTo(12,24);ctx.quadraticCurveTo(18,36,24-swing,48);
  ctx.stroke();
  ctx.strokeStyle="#2f63ad";ctx.lineWidth=13;
  ctx.beginPath();
  ctx.moveTo(-24+swing,48);ctx.quadraticCurveTo(-29+swing,56,-39+swing,61);
  ctx.moveTo(24-swing,48);ctx.quadraticCurveTo(29-swing,56,39-swing,61);
  ctx.stroke();
  // Brown hiking boots with soles and rounded toes.
  ctx.fillStyle="#5a321f";
  ctx.beginPath();ctx.ellipse(-46+swing,63,15,8,-.12,0,Math.PI*2);ctx.ellipse(46-swing,63,15,8,.12,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#3a2418";
  ctx.beginPath();ctx.ellipse(-48+swing,66,14,4,-.1,0,Math.PI*2);ctx.ellipse(48-swing,66,14,4,.1,0,Math.PI*2);ctx.fill();

  // Shirt and small climbing harness detail.
  const shirt=ctx.createLinearGradient(-26,-5,26,40);shirt.addColorStop(0,"#ffd34a");shirt.addColorStop(.55,"#f5a71b");shirt.addColorStop(1,"#e86a12");
  ctx.fillStyle=shirt;roundRect(-25,-7,50,42,13);ctx.fill();
  ctx.strokeStyle="#ffe9a9";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-18,5);ctx.lineTo(18,5);ctx.moveTo(-12,4);ctx.lineTo(-6,33);ctx.moveTo(12,4);ctx.lineTo(6,33);ctx.stroke();
  ctx.strokeStyle="#6e3b20";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-18,31);ctx.lineTo(18,31);ctx.stroke();

  // Arms are deliberately positioned around the rope: both hands visibly grip it.
  ctx.strokeStyle="#d99770";ctx.lineWidth=13;ctx.lineCap="round";
  ctx.beginPath();
  ctx.moveTo(-19,2);ctx.quadraticCurveTo(-12,-25,-8,-50);
  ctx.moveTo(19,2);ctx.quadraticCurveTo(12,-25,8,-50);
  ctx.stroke();
  ctx.fillStyle="#f0b184";ctx.beginPath();ctx.arc(-8,-53,8,0,Math.PI*2);ctx.arc(8,-53,8,0,Math.PI*2);ctx.fill();
  // Finger wraps around the rope.
  ctx.strokeStyle="#a9654d";ctx.lineWidth=2;ctx.beginPath();ctx.arc(-8,-53,6,-1.2,1.3);ctx.arc(8,-53,6,1.8,4.3);ctx.stroke();

  // Neck and head.
  ctx.fillStyle="#c67b57";ctx.fillRect(-7,-15,14,13);
  const skin=ctx.createRadialGradient(-5,-28,2,0,-20,26);skin.addColorStop(0,"#ffd0a6");skin.addColorStop(.65,"#e8a27e");skin.addColorStop(1,"#b76b51");
  ctx.fillStyle=skin;ctx.beginPath();ctx.arc(0,-29,25,0,Math.PI*2);ctx.fill();
  // Ears.
  ctx.fillStyle="#e2a07b";ctx.beginPath();ctx.arc(-24,-28,7,0,Math.PI*2);ctx.arc(24,-28,7,0,Math.PI*2);ctx.fill();
  // Hair with a clean silhouette.
  ctx.fillStyle="#17191f";ctx.beginPath();ctx.moveTo(-24,-29);ctx.quadraticCurveTo(-22,-53,0,-55);ctx.quadraticCurveTo(24,-53,25,-28);ctx.lineTo(15,-34);ctx.quadraticCurveTo(4,-43,-9,-40);ctx.quadraticCurveTo(-18,-38,-24,-29);ctx.closePath();ctx.fill();
  // Face.
  ctx.fillStyle="#221817";ctx.beginPath();ctx.arc(-8,-28,2.4,0,Math.PI*2);ctx.arc(8,-28,2.4,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="#703c31";ctx.lineWidth=2.2;ctx.beginPath();ctx.arc(0,-21,8,.1,3.05);ctx.stroke();
  // Small wrist strap/phone-like accessory from the reference character.
  ctx.fillStyle="#1d9a9a";roundRect(18,0,17,31,6);ctx.fill();
  ctx.restore();
}
function drawMonkey(m){
  const x=W/2+m.x,y=sy(m.y);
  if(y<-140||y>H+140)return;
  ctx.save();ctx.translate(x,y);ctx.scale(m.side*m.scale,m.scale);
  const bob=Math.sin(m.bob)*2;
  ctx.translate(0,bob);
  // Clear attack telegraph: the monkey raises its throwing arm before release.
  if(m.throwing>0){
    ctx.save();
    ctx.globalAlpha=.7;
    ctx.strokeStyle="#ffd83d";ctx.lineWidth=4;
    ctx.beginPath();ctx.arc(0,-8,52+Math.sin(m.throwing*20)*4,0,Math.PI*2);ctx.stroke();
    ctx.restore();
  }ctx.strokeStyle="#5c2e18";ctx.lineWidth=10;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(-5,30);ctx.bezierCurveTo(55,72,68,-5,31,-18);ctx.stroke();ctx.fillStyle="#6b351e";ctx.beginPath();ctx.ellipse(0,26,29,39,0,0,7);ctx.fill();
  // Seated pose: feet/haunches visibly rest on the branch below.
  ctx.strokeStyle="#5a2c18";ctx.lineWidth=13;ctx.lineCap="round";
  ctx.beginPath();ctx.moveTo(-14,48);ctx.lineTo(-27,61);ctx.moveTo(14,48);ctx.lineTo(27,61);ctx.stroke();
  ctx.fillStyle="#87502d";ctx.beginPath();ctx.ellipse(-29,62,13,7,.15,0,7);ctx.ellipse(29,62,13,7,-.15,0,7);ctx.fill();
  ctx.strokeStyle="#824525";ctx.lineWidth=12;ctx.beginPath();
  ctx.moveTo(-21,10);ctx.lineTo(-45,38);
  if(m.throwing>0){
    ctx.moveTo(21,10);ctx.lineTo(43,-20);ctx.lineTo(48,18);
  }else{
    ctx.moveTo(21,10);ctx.lineTo(44,31);
  }
  ctx.stroke();ctx.fillStyle="#87502d";ctx.beginPath();ctx.arc(0,-17,31,0,7);ctx.fill();ctx.fillStyle="#b66f49";ctx.beginPath();ctx.arc(-29,-18,12,0,7);ctx.arc(29,-18,12,0,7);ctx.fill();ctx.fillStyle="#d49a70";ctx.beginPath();ctx.ellipse(0,-10,22,18,0,0,7);ctx.fill();ctx.fillStyle="#120d0b";ctx.beginPath();ctx.arc(-10,-20,4,0,7);ctx.arc(10,-20,4,0,7);ctx.fill();ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(-9,-21,1.2,0,7);ctx.arc(11,-21,1.2,0,7);ctx.fill();ctx.fillStyle="#fff1d8";roundRect(-15,-5,30,12,5);ctx.fill();ctx.strokeStyle="#4b2316";ctx.lineWidth=2;ctx.stroke();if(m.throwing>0) drawMango(48,-18,0,"rotten");ctx.restore()}
function drawMangoTrail(m){
  const x=W/2+m.x,y=sy(m.y);
  const mag=Math.hypot(m.vx,m.vy)||1;
  const tx=m.vx/mag*46,ty=-m.vy/mag*46;

  ctx.save();
  ctx.globalAlpha=.55;
  ctx.strokeStyle=m.kind==="gold"?"#fff06a":"#b7d36a";
  ctx.lineWidth=m.kind==="gold"?5:4;
  ctx.lineCap="round";
  ctx.beginPath();
  ctx.moveTo(x-tx,y-ty);
  ctx.lineTo(x-tx*2.8,y-ty*2.8);
  ctx.stroke();

  // Small directional dots make the projectile motion unmistakable.
  ctx.globalAlpha=.28;
  ctx.beginPath();
  ctx.arc(x-tx*3.2,y-ty*3.2,4,0,Math.PI*2);
  ctx.fillStyle=m.kind==="gold"?"#fff6a0":"#a4c26b";
  ctx.fill();
  ctx.restore();
}
function drawMango(x,y,r,kind="gold"){
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(r);

  if(kind==="rotten"){
    // Rotten mango: bruised, olive-brown and unmistakably dangerous.
    const g=ctx.createLinearGradient(-13,-17,15,20);
    g.addColorStop(0,"#a2a83a");
    g.addColorStop(.42,"#76501f");
    g.addColorStop(1,"#3d2516");
    ctx.fillStyle=g;
    ctx.beginPath();ctx.moveTo(0,-18);ctx.bezierCurveTo(20,-13,17,14,0,22);ctx.bezierCurveTo(-18,15,-18,-12,0,-18);ctx.fill();
    ctx.fillStyle="#2b1c13";
    for(const [sx,sy,rr] of [[-7,-2,3],[7,6,2.5],[1,13,2],[-10,9,1.8]]){ctx.beginPath();ctx.arc(sx,sy,rr,0,Math.PI*2);ctx.fill()}
    ctx.fillStyle="#557f2f";ctx.beginPath();ctx.ellipse(10,-17,8,4,-.5,0,Math.PI*2);ctx.fill();
  }else if(kind==="yellow"){
    // Yellow mango: bright reward, but less valuable than gold.
    const g=ctx.createLinearGradient(-12,-16,14,18);
    g.addColorStop(0,"#fff27a");g.addColorStop(.5,"#ffd52c");g.addColorStop(1,"#efad0a");
    ctx.fillStyle=g;
    ctx.beginPath();ctx.moveTo(0,-18);ctx.bezierCurveTo(20,-13,17,14,0,22);ctx.bezierCurveTo(-18,15,-18,-12,0,-18);ctx.fill();
    ctx.fillStyle="#4d9836";ctx.beginPath();ctx.ellipse(10,-17,8,4,-.5,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#fff8a7";ctx.globalAlpha=.75;ctx.beginPath();ctx.ellipse(-6,-4,4,10,-.4,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  }else{
    // Golden mango: premium reward with a much brighter metallic-gold glow. It is worth +40 for new games; historical scores are never recalculated.
    const glow=ctx.createRadialGradient(0,0,4,0,0,48);
    glow.addColorStop(0,"#ffffff");glow.addColorStop(.18,"#fffbd9ee");glow.addColorStop(.38,"#fff19a99");glow.addColorStop(.62,"#ffd43a66");glow.addColorStop(1,"#ffd43a00");
    ctx.fillStyle=glow;ctx.beginPath();ctx.arc(0,0,48,0,Math.PI*2);ctx.fill();
    const g=ctx.createLinearGradient(-15,-18,15,22);
    g.addColorStop(0,"#ffffff");g.addColorStop(.14,"#fffbd0");g.addColorStop(.30,"#ffe96b");g.addColorStop(.52,"#ffc400");g.addColorStop(.76,"#e99a00");g.addColorStop(1,"#a95d00");
    ctx.fillStyle=g;
    ctx.beginPath();ctx.moveTo(0,-19);ctx.bezierCurveTo(21,-14,18,14,0,23);ctx.bezierCurveTo(-19,16,-19,-13,0,-19);ctx.fill();
    ctx.strokeStyle="#fffbd0";ctx.lineWidth=2.5;ctx.stroke();
    ctx.fillStyle="#4b9836";ctx.beginPath();ctx.ellipse(10,-18,8,4,-.5,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=.9;ctx.fillStyle="#fffef0";ctx.beginPath();ctx.ellipse(-6,-6,4.5,11,-.4,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    // Four crisp sparkle points make the golden mango unmistakable.
    ctx.strokeStyle="#fffbd0";ctx.lineWidth=2.8;
    for(const [sx,sy,ss] of [[29,-22,9],[-27,-18,7],[28,24,7],[-28,22,6]]){
      ctx.beginPath();ctx.moveTo(sx-ss,sy);ctx.lineTo(sx+ss,sy);ctx.moveTo(sx,sy-ss);ctx.lineTo(sx,sy+ss);ctx.stroke();
    }
  }
  ctx.restore();
}
function drawCollectible(c){const x=W/2+c.x,y=sy(c.y);if(y<-80||y>H+80)return;ctx.save();ctx.translate(x,y);ctx.rotate(c.spin);if(c.kind==="gold"){ctx.globalAlpha=.28;ctx.fillStyle="#ffe94e";ctx.beginPath();ctx.arc(0,0,38,0,7);ctx.fill();ctx.globalAlpha=1}drawMango(0,0,0);ctx.restore()}
function drawParticle(p){ctx.globalAlpha=Math.max(0,p.life*1.7);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(W/2+p.x,sy(p.y),3+p.life*3,0,7);ctx.fill();ctx.globalAlpha=1}
function roundRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function loop(t){
  if(gameState==="menu") return;
  if(paused){ draw(); requestAnimationFrame(loop); return; }
  const dt=Math.min(.033,Math.max(.001,(t-last)/1000));
  last=t;
  if(gameState==="playing") update(dt);
  draw();
  requestAnimationFrame(loop);
}
resetWorld();draw();
})();
