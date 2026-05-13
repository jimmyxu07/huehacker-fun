/* ========== HueHacker — Daily Color Calibration ========== */

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

// ===== 2. RGB → XYZ → Lab (D65) =====
function rgbToLab(r,g,b){
  const invGamma=c=>{
    c/=255;
    return c>0.04045?Math.pow((c+0.055)/1.055,2.4):c/12.92;
  };
  let R=invGamma(r), G=invGamma(g), B=invGamma(b);
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

// ===== 3. CIEDE2000 简化版 =====
function ciede2000(lab1,lab2){
  const dL=lab2.L-lab1.L;
  const C1=Math.sqrt(lab1.a*lab1.a+lab1.b*lab1.b);
  const C2=Math.sqrt(lab2.a*lab2.a+lab2.b*lab2.b);
  const dC=C2-C1;
  let da=lab2.a-lab1.a, db=lab2.b-lab1.b;
  const dH=Math.sqrt(Math.max(0,da*da+db*db-dC*dC));
  const SL=1, SC=1+0.045*C1, SH=1+0.015*C1;
  return Math.sqrt( (dL/SL)**2 + (dC/SC)**2 + (dH/SH)**2 );
}

// ===== 4. 得分映射: ΔE → 0~100 =====
function scoreFromDeltaE(de){
  const s=Math.max(0,100-de*3.33);
  return Math.round(s);
}

// ===== 5. 每日 Seed PRNG =====
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
  for(let i=0;i<10;i++) rng();
  return rng;
}

// ===== 6. 多语言 i18n =====
const i18n={
  en:{
    title:"◐ HueHacker",
    subtitle:"Daily Color Calibration",
    howtoTitle:"◐ How it works",
    howto1:"A <b>target tone</b> is generated daily. It is displayed in grayscale — your job is to recall its original color.",
    howto2:"Adjust <b>Hue · Saturation · Brightness</b> until your pick matches the hidden target as closely as possible.",
    howto3:"Hit <b>Calibrate</b> to see your score. Lower <code>ΔE</code> = closer match. Professional colorists aim for ΔE &lt; 2.",
    hueLabel:"Hue",
    satLabel:"Saturation",
    briLabel:"Brightness",
    yourPick:"Your Pick",
    submitBtn:"Calibrate",
    targetLabel:"Target",
    yoursLabel:"Yours",
    shareBtn:"Download Score Card",
    tryAgainBtn:"Try Again",
    leaderboardTitle:"◐ Leaderboard",
    builtWith:"Built with AI",
    disclaimer:"HueHacker is an independent micro-tool for designers. ΔE calculated with CIEDE2000.",
    todayBest:"Today's Best",
    noRecords:"No records yet",
    score:"Score",
    commentLegendary:"🔥 Legendary eye!",
    commentAmazing:"🎯 Amazing!",
    commentNotBad:"🌟 Not bad",
    commentKeepTrying:"🎭 Keep trying",
    commentPractice:"💜 Practice more",
    shareTitle:"◐ HueHacker",
    shareTarget:"Target",
    shareYours:"Yours",
  },
  zh:{
    title:"◐ HueHacker",
    subtitle:"每日色彩校准",
    howtoTitle:"◐ 使用说明",
    howto1:"每天生成一个<b>目标色调</b>——以灰度显示，你需要凭记忆还原它的原始颜色。",
    howto2:"调整<b>色相 · 饱和度 · 亮度</b>滑块，让你的选择尽可能接近隐藏的目标色。",
    howto3:"点击<b>校准</b>查看得分。<code>ΔE</code> 越低 = 越接近。专业配色师追求 ΔE &lt; 2。",
    hueLabel:"色相",
    satLabel:"饱和度",
    briLabel:"亮度",
    yourPick:"你的选择",
    submitBtn:"校准",
    targetLabel:"目标",
    yoursLabel:"你的",
    shareBtn:"下载成绩单",
    tryAgainBtn:"再试一次",
    leaderboardTitle:"◐ 排行榜",
    builtWith:"用AI构建",
    disclaimer:"HueHacker 是面向设计师的独立微工具。ΔE 采用 CIEDE2000 计算。",
    todayBest:"今日最佳",
    noRecords:"暂无记录",
    score:"得分",
    commentLegendary:"🔥 神之眼！",
    commentAmazing:"🎯 太棒了！",
    commentNotBad:"🌟 不错",
    commentKeepTrying:"🎭 继续加油",
    commentPractice:"💜 多多练习",
    shareTitle:"◐ HueHacker",
    shareTarget:"目标",
    shareYours:"你的",
  }
};
let currentLang='en';
function applyLanguage(lang){
  currentLang=lang;
  localStorage.setItem('hh_lang',lang);
  const t=i18n[lang];
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const key=el.dataset.i18n;
    if(t[key]){
      const text=t[key];
      if(text.includes('<')) el.innerHTML=text;
      else el.textContent=text;
    }
  });
  document.querySelectorAll('.lang-switch button').forEach(btn=>{
    btn.classList.toggle('active', btn.dataset.lang===lang);
  });
  const h1=document.querySelector('h1');
  if(h1 && t.title) h1.textContent=t.title;
  if(state.todayScore!==null){
    const sc=state.todayScore;
    let text;
    if(sc>=95) text=t.commentLegendary;
    else if(sc>=85) text=t.commentAmazing;
    else if(sc>=70) text=t.commentNotBad;
    else if(sc>=50) text=t.commentKeepTrying;
    else text=t.commentPractice;
    els.comment.textContent=text;
  }
  renderLB(JSON.parse(localStorage.getItem('cm_lb')||'[]'));
}
function getBrowserLang(){
  const saved=localStorage.getItem('hh_lang');
  if(saved) return saved;
  const nav=navigator.language||navigator.userLanguage;
  return nav && nav.startsWith('zh')?'zh':'en';
}

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
  toneDisplay:$('tone-display'), toneWrap:document.querySelector('.tone-wrap'),
  submit:$('submit-btn'), modal:$('result-modal'),
  scoreTitle:$('score-title'), targetDot:$('target-dot'), userDot:$('user-dot'),
  deltaE:$('delta-e'), comment:$('comment'),
  shareBtn:$('share-btn'), closeModal:$('close-modal'),
  lbList:$('lb-list'), dayLabel:$('day-label'), streak:$('streak'),
  satTrack:document.querySelector('.sat-track'),
  briTrack:document.querySelector('.bri-track'),
};

// ===== 9. 初始化每日颜色 =====
function initDaily(){
  const rng=todayRandom();
  state.targetH=Math.floor(rng()*360);
  state.targetS=Math.floor(rng()*60+20);
  state.targetB=Math.floor(rng()*50+30);

  // 设置抽象色块的目标颜色
  const tgtRgb=hsbToRgb(state.targetH,state.targetS,state.targetB);
  const tgtCss=`rgb(${tgtRgb.r},${tgtRgb.g},${tgtRgb.bl})`;
  els.toneDisplay.style.setProperty('--tone-color', tgtCss);
  els.toneWrap.classList.add('desaturated');

  // 标题
  const t=i18n[currentLang];
  document.querySelector('h1').textContent=t.title;

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

  // 检查今天是否已提交
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

  // 移除灰度化，显示原色
  els.toneWrap.classList.remove('desaturated');

  const d=new Date();
  const start=new Date(d.getFullYear(),0,0);
  const diff=d-start+((start.getTimezoneOffset()-d.getTimezoneOffset())*60*1000);
  const day=Math.floor(diff/(1000*60*60*24));
  localStorage.setItem('cm_day_'+day, JSON.stringify({score:score,de:de,h:state.hue,s:state.sat,b:state.bri}));

  saveLeaderboard(day,score);
  showResult(true);
});

function saveLeaderboard(day,score){
  let lb=JSON.parse(localStorage.getItem('cm_lb')||'[]');
  lb.push({day,score,time:Date.now()});
  const map=new Map();
  lb.forEach(r=>{ const prev=map.get(r.day)||0; if(r.score>prev) map.set(r.day,r.score); });
  lb=Array.from(map,( [day,score] )=>({day,score})).sort((a,b)=>b.score-a.score).slice(0,30);
  localStorage.setItem('cm_lb',JSON.stringify(lb));
  renderLB(lb);
}
function renderLB(lb){
  const t=i18n[currentLang];
  const today=new Date();
  const start=new Date(today.getFullYear(),0,0);
  const diff=today-start+((start.getTimezoneOffset()-today.getTimezoneOffset())*60*1000);
  const day=Math.floor(diff/(1000*60*60*24));
  const todayBest=lb.find(x=>x.day===day);
  let html='';
  if(todayBest) html+=`<li><span class="rank">👑</span><span class="name">${t.todayBest}</span><span class="score">${todayBest.score}</span></li>`;
  lb.slice(0,7).forEach((r,i)=>{
    html+=`<li><span class="rank">#${i+1}</span><span class="name">Day ${r.day}</span><span class="score">${r.score}</span></li>`;
  });
  els.lbList.innerHTML=html||`<li style="color:var(--muted)">${t.noRecords}</li>`;
}

function showResult(animate){
  const t=i18n[currentLang];
  els.scoreTitle.textContent=`${t.score} ${state.todayScore}`;
  const tgtRgb=hsbToRgb(state.targetH,state.targetS,state.targetB);
  const userRgb=hsbToRgb(state.hue,state.sat,state.bri);
  els.targetDot.style.background=`rgb(${tgtRgb.r},${tgtRgb.g},${tgtRgb.bl})`;
  els.userDot.style.background=`rgb(${userRgb.r},${userRgb.g},${userRgb.bl})`;
  els.deltaE.textContent=`ΔE ${state.todayDeltaE.toFixed(2)}`;
  const sc=state.todayScore;
  const text=sc>=95?t.commentLegendary:sc>=85?t.commentAmazing:sc>=70?t.commentNotBad:sc>=50?t.commentKeepTrying:t.commentPractice;
  els.comment.textContent=text;
  els.modal.classList.remove('hidden');
}

els.closeModal.addEventListener('click',()=>{
  els.modal.classList.add('hidden');
});

// ===== 12. Canvas 分享卡片生成 =====
function drawShareCard(){
  const canvas=document.getElementById('share-canvas');
  const ctx=canvas.getContext('2d');
  const w=canvas.width, h=canvas.height;
  const grd=ctx.createLinearGradient(0,0,w,h);
  grd.addColorStop(0,'#0a0a0c');
  grd.addColorStop(1,'#141418');
  ctx.fillStyle=grd; ctx.fillRect(0,0,w,h);

  ctx.fillStyle='rgba(124,92,255,.1)';
  ctx.beginPath(); ctx.arc(w*.85,h*.2,200,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='rgba(0,210,255,.08)';
  ctx.beginPath(); ctx.arc(w*.15,h*.8,160,0,Math.PI*2); ctx.fill();

  ctx.fillStyle='#fff';
  ctx.font='bold 60px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign='center';
  ctx.fillText(i18n[currentLang].shareTitle,w/2,130);

  ctx.fillStyle='#7c5cff';
  ctx.font='bold 180px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(String(state.todayScore),w/2,310);

  ctx.fillStyle='rgba(255,255,255,.7)';
  ctx.font='36px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(`ΔE ${state.todayDeltaE.toFixed(2)}`,w/2,380);

  ctx.fillStyle='#00d2ff';
  ctx.font='bold 44px -apple-system, BlinkMacSystemFont, sans-serif';
  const sc=state.todayScore;
  const comment=sc>=95?i18n[currentLang].commentLegendary:sc>=85?i18n[currentLang].commentAmazing:sc>=70?i18n[currentLang].commentNotBad:sc>=50?i18n[currentLang].commentKeepTrying:i18n[currentLang].commentPractice;
  ctx.fillText(comment,w/2,460);

  const u=hsbToRgb(state.hue,state.sat,state.bri);
  const tgt=hsbToRgb(state.targetH,state.targetS,state.targetB);
  const r=50;
  ctx.fillStyle=`rgb(${tgt.r},${tgt.g},${tgt.bl})`;
  ctx.beginPath(); ctx.arc(w/2-90,560,r,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#fff'; ctx.font='26px sans-serif'; ctx.textAlign='center';
  ctx.fillText(i18n[currentLang].shareTarget,w/2-90,640);

  ctx.fillStyle=`rgb(${u.r},${u.g},${u.bl})`;
  ctx.beginPath(); ctx.arc(w/2+90,560,r,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#fff';
  ctx.fillText(i18n[currentLang].shareYours,w/2+90,640);

  return canvas;
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
applyLanguage(getBrowserLang());

document.querySelectorAll('.lang-switch button').forEach(btn=>{
  btn.addEventListener('click',()=>applyLanguage(btn.dataset.lang));
});
