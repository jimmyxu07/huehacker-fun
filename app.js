/* ========== HueHacker - Core Logic ========== */

// ===== 1. HSB → RGB =====
function hsbToRgb(h,s,b){
  s/=100; b/=100;
  const k=n=>(n+h/60)%6;
  const f=n=>b*(1-s*Math.max(0,Math.min(k(n),4-k(n),1)));
  return {
    r:Math.round(f(5)*255),
    g:Math.round(f(3)*255),
    bl:Math.round(f(1)*255)
  };
}

// ===== 2. RGB → XYZ → Lab (简化 D65) =====
function rgbToLab(r,g,b){
  // gamma 反解
  const invGamma=c=>{
    c/=255;
    return c>0.04045?Math.pow((c+0.055)/1.055,2.4):c/12.92;
  };
  let R=invGamma(r), G=invGamma(g), B=invGamma(b);
  // D65 matrix
  let X=R*0.4124564 + G*0.3575761 + B*0.1804375;
  let Y=R*0.2126729 + G*0.7151522 + B*0.0721750;
  let Z=R*0.0193339 + G*0.1191920 + B*0.9503041;
  const eps=216/24389, kap=24389/27;
  const f=t=>t>eps?Math.cbrt(t):(kap*t+16)/116;
  let fx=f(X/0.95047), fy=f(Y/1.00000), fz=f(Z/1.08883);
  return {
    L:116*fy-16,
    a:500*(fx-fy),
    b:200*(fy-fz)
  };
}

// ===== 3. CIEDE2000 简化版 (充分精度用于游戏) =====
function ciede2000(lab1,lab2){
  const dL=lab2.L-lab1.L;
  const C1=Math.sqrt(lab1.a*lab1.a+lab1.b*lab1.b);
  const C2=Math.sqrt(lab2.a*lab2.a+lab2.b*lab2.b);
  const dC=C2-C1;
  let da=lab2.a-lab1.a, db=lab2.b-lab1.b;
  const dH=Math.sqrt(Math.max(0,da*da+db*db-dC*dC));
  // 简化常数
  const SL=1, SC=1+0.045*C1, SH=1+0.015*C1;
  return Math.sqrt( (dL/SL)**2 + (dC/SC)**2 + (dH/SH)**2 );
}

// ===== 4. 得分映射: ΔE → 0~100 =====
function scoreFromDeltaE(de){
  // 当 ΔE<1 时完美匹配(100分); ΔE>30 时接近 0 分
  const s=Math.max(0,100-de*3.33);
  return Math.round(s);
}

// ===== 5. 每日 Seed PRNG (线性同余) =====
function mulberry32(a){
  return function(){
    let t=a+=0x6D2B79F5;
    t=Math.imul(t^(t>>>15),t|1);
    t^=t+Math.imul(t^(t>>>7),t|61);
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}
function getDaySeed(){
  const d=new Date();
  return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate();
}
function todayRandom(){
  const rng=mulberry32(getDaySeed());
  // 用户可能刷新多次，需要先幻数次来避免首值偏移
  for(let i=0;i<10;i++) rng();
  return rng;
}

// ===== 6. 数据 =====
const CHARACTERS=[
  {name:"Cyan Surfer", img:"assets/ch1.jpg"},
  {name:"Magenta Mage", img:"assets/ch2.jpg"},
  {name:"Lime Ninja", img:"assets/ch3.jpg"},
  {name:"Coral Pilot", img:"assets/ch4.jpg"},
  {name:"Violet Bot", img:"assets/ch5.jpg"},
  {name:"Amber Monk", img:"assets/ch6.jpg"},
  {name:"Teal Hacker", img:"assets/ch7.jpg"},
];

// ===== 7. 状态 =====
const state={
  hue:180, sat:50, bri:50,
  targetH:0, targetS:0, targetB:0,
  submitted:false,
  todayScore:null,
  todayDeltaE:null,
};

// ===== 8. DOM 引用 =====
const $=id=>document.getElementById(id);
const els={
  hue:$('hue'), sat:$('sat'), bri:$('bri'),
  hVal:$('h-val'), sVal:$('s-val'), bVal:$('b-val'),
  preview:$('user-color'), overlay:$('target-overlay'),
  charImg:$('character-img'),
  submit:$('submit-btn'), modal:$('result-modal'),
  scoreTitle:$('score-title'), targetDot:$('target-dot'), userDot:$('user-dot'),
  deltaE:$('delta-e'), comment:$('comment'),
  shareBtn:$('share-btn'), closeModal:$('close-modal'),
  lbList:$('lb-list'), dayLabel:$('day-label'), streak:$('streak'),
  satTrack:document.querySelector('.sat-track'),
  briTrack:document.querySelector('.bri-track'),
};

// ===== 9. 初始化每日颜色与角色 =====
function initDaily(){
  const rng=todayRandom();
  const idx=Math.floor(rng()*CHARACTERS.length);
  const ch=CHARACTERS[idx];
  // 目标 HSB
  state.targetH=Math.floor(rng()*360);
  state.targetS=Math.floor(rng()*60+20); // 20~80%
  state.targetB=Math.floor(rng()*50+30); // 30~80%

  // 加载图片 (如果本地不存在则用网络 placeholder)
  els.charImg.src=ch.img;
  els.charImg.onerror=()=>{
    els.charImg.src=`https://placehold.co/600x600/1a1a20/7c5cff?text=${encodeURIComponent(ch.name)}`;
  };

  // 标题
  document.querySelector('h1').textContent=`🎨 HueHacker - ${ch.name}`;

  // 日期标签
  const d=new Date();
  const start=new Date(d.getFullYear(),0,0);
  const diff=d-start+((start.getTimezoneOffset()-d.getTimezoneOffset())*60*1000);
  const day=Math.floor(diff/(1000*60*60*24));
  els.dayLabel.textContent=`Day ${day}`;

  // 连胜
  const last=Number(localStorage.getItem('cm_lastDay')||0);
  let streak=Number(localStorage.getItem('cm_streak')||0);
  if(last && last!==day){
    if(last===day-1) streak++;
    else streak=0;
    localStorage.setItem('cm_streak',streak);
    localStorage.setItem('cm_lastDay',day);
  }else if(!last){
    localStorage.setItem('cm_lastDay',day);
  }
  els.streak.textContent=`🔥 ${streak}`;

  // 检查今天是否已经提交
  const todayKey='cm_day_'+day;
  const saved=localStorage.getItem(todayKey);
  if(saved){
    const data=JSON.parse(saved);
    state.todayScore=data.score;
    state.todayDeltaE=data.de;
    state.hue=data.h||180; state.sat=data.s||50; state.bri=data.b||50;
    showResult(false);
  }

  applySliders();
  updatePreview();
}

// ===== 10. 滑块事件 =====
function applySliders(){
  els.hue.value=state.hue; els.sat.value=state.sat; els.bri.value=state.bri;
  els.hVal.textContent=state.hue;
  els.sVal.textContent=state.sat;
  els.bVal.textContent=state.bri;
}
function updatePreview(){
  const rgb=hsbToRgb(state.hue,state.sat,state.bri);
  const css=`rgb(${rgb.r},${rgb.g},${rgb.bl})`;
  els.preview.style.background=css;
  els.overlay.style.setProperty('--preview',css);
  document.documentElement.style.setProperty('--sat-color',css);
  document.documentElement.style.setProperty('--bri-color',css);
}
['input','change'].forEach(evt=>{
  els.hue.addEventListener(evt,e=>{state.hue=+e.target.value; els.hVal.textContent=state.hue; updatePreview();});
  els.sat.addEventListener(evt,e=>{state.sat=+e.target.value; els.sVal.textContent=state.sat; updatePreview();});
  els.bri.addEventListener(evt,e=>{state.bri=+e.target.value; els.bVal.textContent=state.bri; updatePreview();});
});

// ===== 11. 提交 =====
els.submit.addEventListener('click',()=>{
  if(state.submitted && state.todayScore!==null) return;
  const userRgb=hsbToRgb(state.hue,state.sat,state.bri);
  const tgtRgb=hsbToRgb(state.targetH,state.targetS,state.targetB);
  const lab1=rgbToLab(userRgb.r,userRgb.g,userRgb.bl);
  const lab2=rgbToLab(tgtRgb.r,tgtRgb.g,tgtRgb.bl);
  const de=ciede2000(lab1,lab2);
  const score=scoreFromDeltaE(de);
  state.todayDeltaE=de;
  state.todayScore=score;
  state.submitted=true;

  // 保存
  const d=new Date();
  const start=new Date(d.getFullYear(),0,0);
  const diff=d-start+((start.getTimezoneOffset()-d.getTimezoneOffset())*60*1000);
  const day=Math.floor(diff/(1000*60*60*24));
  localStorage.setItem('cm_day_'+day, JSON.stringify({score:score,de:de,h:state.hue,s:state.sat,b:state.bri}));

  // 排行榜
  saveLeaderboard(day,score);
  showResult(true);
});

function saveLeaderboard(day,score){
  let lb=JSON.parse(localStorage.getItem('cm_lb')||'[]');
  lb.push({day,score,time:Date.now()});
  // 每天只保留最高分
  const map=new Map();
  lb.forEach(r=>{ const prev=map.get(r.day)||0; if(r.score>prev) map.set(r.day,r.score); });
  lb=Array.from(map,( [day,score] )=>({day,score})).sort((a,b)=>b.score-a.score).slice(0,30);
  localStorage.setItem('cm_lb',JSON.stringify(lb));
  renderLB(lb);
}
function renderLB(lb){
  const today=new Date();
  const start=new Date(today.getFullYear(),0,0);
  const diff=today-start+((start.getTimezoneOffset()-today.getTimezoneOffset())*60*1000);
  const day=Math.floor(diff/(1000*60*60*24));
  const todayBest=lb.find(x=>x.day===day);
  let html='';
  if(todayBest) html+=`<li><span class="rank">👑</span><span class="name">Today's Best</span><span class="score">${todayBest.score}</span></li>`;
  lb.slice(0,7).forEach((r,i)=>{
    html+=`<li><span class="rank">#${i+1}</span><span class="name">Day ${r.day}</span><span class="score">${r.score}</span></li>`;
  });
  els.lbList.innerHTML=html||'<li style="color:var(--muted)">No records yet</li>';
}

function showResult(animate){
  els.scoreTitle.textContent=`Score ${state.todayScore}`;
  const tgtRgb=hsbToRgb(state.targetH,state.targetS,state.targetB);
  const userRgb=hsbToRgb(state.hue,state.sat,state.bri);
  els.targetDot.style.background=`rgb(${tgtRgb.r},${tgtRgb.g},${tgtRgb.bl})`;
  els.userDot.style.background=`rgb(${userRgb.r},${userRgb.g},${userRgb.bl})`;
  els.deltaE.textContent=`ΔE ${state.todayDeltaE.toFixed(2)}`;
  const c=state.todayScore;
  const text=c>=95?"🔥 Legendary eye!":c>=85?"🎯 Amazing!":c>=70?"🌟 Not bad":c>=50?"🎭 Keep trying":"💜 Practice more";
  els.comment.textContent=text;
  els.modal.classList.remove('hidden');
}

els.closeModal.addEventListener('click',()=>{
  els.modal.classList.add('hidden');
});

// ===== 12. Canvas 分享卡片生成 =====
function drawShareCard(){
  const c=document.getElementById('share-canvas');
  const ctx=c.getContext('2d');
  const w=c.width, h=c.height;
  // 背景
  const grd=ctx.createLinearGradient(0,0,w,h);
  grd.addColorStop(0,'#1a0b2e');
  grd.addColorStop(1,'#0f172a');
  ctx.fillStyle=grd; ctx.fillRect(0,0,w,h);

  // 装饰
  ctx.fillStyle='rgba(124,92,255,.15)';
  ctx.beginPath(); ctx.arc(w*.85,h*.2,180,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='rgba(0,210,255,.12)';
  ctx.beginPath(); ctx.arc(w*.15,h*.8,140,0,Math.PI*2); ctx.fill();

  // 标题
  ctx.fillStyle='#fff';
  ctx.font='bold 64px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign='center';
  ctx.fillText('🎨 HueHacker',w/2,130);

  // 分数
  ctx.fillStyle='#7c5cff';
  ctx.font='bold 180px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(String(state.todayScore),w/2,310);

  ctx.fillStyle='rgba(255,255,255,.8)';
  ctx.font='40px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(`ΔE ${state.todayDeltaE.toFixed(2)}`,w/2,380);

  // 评语
  ctx.fillStyle='#00d2ff';
  ctx.font='bold 48px -apple-system, BlinkMacSystemFont, sans-serif';
  const c=state.todayScore;
  const text=c>=95?"Legendary 🔥":c>=85?"Amazing 🎯":c>=70?"Not bad 🌟":c>=50?"Keep trying 🎭":"Practice more 💜";
  ctx.fillText(text,w/2,460);

  // 颜色对比
  const u=hsbToRgb(state.hue,state.sat,state.bri);
  const t=hsbToRgb(state.targetH,state.targetS,state.targetB);
  const r=50;
  ctx.fillStyle=`rgb(${t.r},${t.g},${t.bl})`;
  ctx.beginPath(); ctx.arc(w/2-90,560,r,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#fff'; ctx.font='28px sans-serif'; ctx.textAlign='center';
  ctx.fillText('Target',w/2-90,640);

  ctx.fillStyle=`rgb(${u.r},${u.g},${u.bl})`;
  ctx.beginPath(); ctx.arc(w/2+90,560,r,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#fff';
  ctx.fillText('Yours',w/2+90,640);

  return c;
}

els.shareBtn.addEventListener('click',()=>{
  const c=drawShareCard();
  c.toBlob(blob=>{
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url; a.download=`huehacker-${state.todayScore}.png`;
    a.click();
    URL.revokeObjectURL(url);
  });
});

// ===== 13. Boot =====
initDaily();
renderLB(JSON.parse(localStorage.getItem('cm_lb')||'[]'));
