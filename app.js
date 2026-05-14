/* ========== HueHacker — Daily Color Calibration + Quick Challenge ========== */

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

// ===== 5. 评级系统 =====
function getRating(de){
  if(de < 1.0) return {level:'pro', label:'🏆 Professional', labelZh:'🏆 专业级', color:'#22c55e'};
  if(de < 2.0) return {level:'excellent', label:'✅ Excellent', labelZh:'✅ 优秀', color:'#06b6d4'};
  if(de < 3.5) return {level:'competent', label:'⚠️ Competent', labelZh:'⚠️ 合格', color:'#eab308'};
  if(de < 5.0) return {level:'practice', label:'🔧 Needs Practice', labelZh:'🔧 需练习', color:'#f97316'};
  return {level:'alert', label:'❌ Color Vision Alert', labelZh:'❌ 色弱预警', color:'#ef4444'};
}

function getGrade(totalScore){
  if(totalScore >= 480) return 'S';
  if(totalScore >= 450) return 'A';
  if(totalScore >= 400) return 'B';
  if(totalScore >= 300) return 'C';
  return 'D';
}

function getRankFromAvgDe(avgDe){
  if(avgDe < 1.5) return {label:'Pro', labelZh:'专业级'};
  if(avgDe < 3.0) return {label:'Expert', labelZh:'高手'};
  if(avgDe < 5.0) return {label:'Competent', labelZh:'合格'};
  if(avgDe < 8.0) return {label:'Novice', labelZh:'新手'};
  return {label:'Colorblind', labelZh:'色弱'};
}

// ===== 6. ΔE 分解 =====
function computeDeltaEBreakdown(){
  const tgtRgb=hsbToRgb(state.targetH,state.targetS,state.targetB);
  const tgtLab=rgbToLab(tgtRgb.r,tgtRgb.g,tgtRgb.bl);

  const hueRgb=hsbToRgb(state.hue,state.targetS,state.targetB);
  const hueLab=rgbToLab(hueRgb.r,hueRgb.g,hueRgb.bl);
  const deHue=ciede2000(hueLab,tgtLab);

  const satRgb=hsbToRgb(state.targetH,state.sat,state.targetB);
  const satLab=rgbToLab(satRgb.r,satRgb.g,satRgb.bl);
  const deSat=ciede2000(satLab,tgtLab);

  const briRgb=hsbToRgb(state.targetH,state.targetS,state.bri);
  const briLab=rgbToLab(briRgb.r,briRgb.g,briRgb.bl);
  const deBri=ciede2000(briLab,tgtLab);

  return {hue:deHue, sat:deSat, bri:deBri};
}

// ===== 7. 每日 Seed PRNG =====
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

// ===== 8. 多语言 i18n =====
const i18n={
  en:{
    title:"◐ HueHacker",
    subtitle:"Daily Color Calibration",
    howtoTitle:"◐ How it works",
    howto1:"A <b>target tone</b> is generated daily. Study the target color on the left.",
    howto2:"Adjust <b>Hue · Saturation · Brightness</b> until your pick on the right matches as closely as possible.",
    howto3:"Hit <b>Calibrate</b> to see your score. Lower <code>ΔE</code> = closer match. Professional colorists aim for ΔE &lt; 2.",
    hueLabel:"Hue",
    satLabel:"Saturation",
    briLabel:"Brightness",
    yourPick:"Your Pick",
    submitBtn:"Calibrate",
    targetLabel:"Target",
    yoursLabel:"Yours",
    shareBtn:"Download Score Card",
    tryAgainBtn:"Close",
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
    ratingPro:"🏆 Professional",
    ratingExcellent:"✅ Excellent",
    ratingCompetent:"⚠️ Competent",
    ratingPractice:"🔧 Needs Practice",
    ratingAlert:"❌ Color Vision Alert",
    deBreakdownTitle:"ΔE Breakdown",
    deHue:"Hue Diff",
    deSat:"Saturation Diff",
    deBri:"Brightness Diff",
    modeDaily:"Daily",
    modeQuick:"Quick Challenge",
    qcRound:"Round",
    qcMemorize:"Memorize the target color",
    qcSelect:"Pick the closest color",
    qcNext:"Next →",
    qcTitle:"⚡ Quick Challenge",
    qcDesc:"5 rounds. Memorize the color, then pick it from 4 options. Speed + accuracy matter.",
    qcRule1:"You have 3 seconds to memorize each target color",
    qcRule2:"15 seconds total per round to select",
    qcRule3:"Score based on ΔE — lower is better",
    qcStart:"Start Challenge",
    qcYourPick:"Your Pick",
    qcAvgDeltaE:"Avg ΔE",
    qcBestRound:"Best Round",
    qcRank:"Rank",
    qcShare:"Copy Summary",
    qcPlayAgain:"Play Again",
    qcTimeout:"⏱ Time's up!",
  },
  zh:{
    title:"◐ HueHacker",
    subtitle:"每日色彩校准",
    howtoTitle:"◐ 使用说明",
    howto1:"每天生成一个<b>目标色调</b>——观察左侧的目标颜色。",
    howto2:"调整<b>色相 · 饱和度 · 亮度</b>滑块，让你的选择尽可能接近右侧目标色。",
    howto3:"点击<b>校准</b>查看得分。<code>ΔE</code> 越低 = 越接近。专业配色师追求 ΔE &lt; 2。",
    hueLabel:"色相",
    satLabel:"饱和度",
    briLabel:"亮度",
    yourPick:"你的选择",
    submitBtn:"校准",
    targetLabel:"目标",
    yoursLabel:"你的",
    shareBtn:"下载成绩单",
    tryAgainBtn:"关闭",
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
    ratingPro:"🏆 专业级",
    ratingExcellent:"✅ 优秀",
    ratingCompetent:"⚠️ 合格",
    ratingPractice:"🔧 需练习",
    ratingAlert:"❌ 色弱预警",
    deBreakdownTitle:"ΔE 分解",
    deHue:"色相差",
    deSat:"饱和度差",
    deBri:"亮度差",
    modeDaily:"每日挑战",
    modeQuick:"限时挑战",
    qcRound:"第",
    qcMemorize:"记住目标颜色",
    qcSelect:"选出最接近的颜色",
    qcNext:"下一题 →",
    qcTitle:"⚡ 限时挑战",
    qcDesc:"共 5 轮。先记忆颜色，再从 4 个选项中选出它。速度与准确度兼顾。",
    qcRule1:"每轮有 3 秒时间记忆目标色",
    qcRule2:"每轮限时 15 秒作答",
    qcRule3:"按 ΔE 计分，越低越好",
    qcStart:"开始挑战",
    qcYourPick:"你的选择",
    qcAvgDeltaE:"平均 ΔE",
    qcBestRound:"最佳回合",
    qcRank:"评级",
    qcShare:"复制成绩单",
    qcPlayAgain:"再来一次",
    qcTimeout:"⏱ 时间到！",
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
    const r=getRating(state.todayDeltaE);
    const label=currentLang==='zh'?r.labelZh:r.label;
    els.ratingBadge.textContent=label;
    els.ratingBadge.className='rating-badge level-'+r.level;
    if(els.modalRating){
      els.modalRating.textContent=label;
      els.modalRating.className='modal-rating level-'+r.level;
    }
    const bdTitles=['deBreakdownTitle','deHue','deSat','deBri'];
    bdTitles.forEach(key=>{
      const el=document.querySelector(`[data-i18n="${key}"]`);
      if(el && t[key]) el.textContent=t[key];
    });
  }
  renderLB(JSON.parse(localStorage.getItem('cm_lb')||'[]'));
  updateQuickUI();
}
function getBrowserLang(){
  const saved=localStorage.getItem('hh_lang');
  if(saved) return saved;
  const nav=navigator.language||navigator.userLanguage;
  return nav && nav.startsWith('zh')?'zh':'en';
}

// ===== 9. 状态 =====
const state={
  hue:180, sat:50, bri:50,
  targetH:0, targetS:0, targetB:0,
  submitted:false,
  todayScore:null,
  todayDeltaE:null,
  mode:'daily',
};

// ===== Quick Challenge State =====
const qcState={
  round:0,
  phase:'idle',
  scores:[],
  timer:null,
  memorizeTimer:null,
  timeLeft:15,
  memorizeTime:3,
  roundTimeLimit:15,
  target:{h:0,s:0,b:0},
  choices:[],
  correctIdx:0,
};

// ===== 10. DOM 引用 =====
const $=id=>document.getElementById(id);
const els={
  hue:$('hue'), sat:$('sat'), bri:$('bri'),
  hVal:$('h-val'), sVal:$('s-val'), bVal:$('b-val'),
  targetBlock:$('target-block'), userBlock:$('user-block'),
  targetHsb:$('target-hsb'), userHsb:$('user-hsb'),
  liveDe:$('live-de'), ratingBadge:$('rating-badge'),
  submit:$('submit-btn'), modal:$('result-modal'),
  scoreTitle:$('score-title'),
  modalTargetBlock:$('modal-target-block'), modalUserBlock:$('modal-user-block'),
  modalDeltaE:$('modal-delta-e'), modalRating:$('modal-rating'),
  comment:$('comment'),
  shareBtn:$('share-btn'), closeModal:$('close-modal'),
  lbList:$('lb-list'), dayLabel:$('day-label'), streak:$('streak'),
  satTrack:document.querySelector('.sat-track'),
  briTrack:document.querySelector('.bri-track'),
  barHue:$('bar-hue'), barSat:$('bar-sat'), barBri:$('bar-bri'),
  valHue:$('val-hue'), valSat:$('val-sat'), valBri:$('val-bri'),
  // Mode
  modeSwitch:$('mode-switch'),
  dailyPanel:$('daily-panel'),
  quickPanel:$('quick-panel'),
  leaderboardSection:$('leaderboard-section'),
  // Quick Challenge
  qcRoundLabel:$('qc-round-label'),
  qcTimer:$('qc-timer'),
  qcTimerBar:$('qc-timer-bar'),
  qcMemorizePhase:$('qc-memorize-phase'),
  qcSelectPhase:$('qc-select-phase'),
  qcFeedbackPhase:$('qc-feedback-phase'),
  qcStartScreen:$('qc-start-screen'),
  qcTargetBlock:$('qc-target-block'),
  qcCountdown:$('qc-countdown'),
  qcGrid:$('qc-grid'),
  qcFeedbackScore:$('qc-feedback-score'),
  qcFeedbackDe:$('qc-feedback-de'),
  qcFeedbackRating:$('qc-feedback-rating'),
  qcFeedbackBubble:$('qc-feedback-bubble'),
  qcFbTarget:$('qc-fb-target'),
  qcFbPick:$('qc-fb-pick'),
  qcNextBtn:$('qc-next-btn'),
  qcStartBtn:$('qc-start-btn'),
  qcResultModal:$('qc-result-modal'),
  qcFinalGrade:$('qc-final-grade'),
  qcFinalScore:$('qc-final-score'),
  qcFinalDe:$('qc-final-de'),
  qcFinalBest:$('qc-final-best'),
  qcFinalRank:$('qc-final-rank'),
  qcEmojiBar:$('qc-emoji-bar'),
  qcShareBtn:$('qc-share-btn'),
  qcCloseModal:$('qc-close-modal'),
};

// ===== 11. 初始化每日颜色 =====
function initDaily(){
  const rng=todayRandom();
  state.targetH=Math.floor(rng()*360);
  state.targetS=Math.floor(rng()*60+20);
  state.targetB=Math.floor(rng()*50+30);

  const tgtRgb=hsbToRgb(state.targetH,state.targetS,state.targetB);
  const tgtCss=`rgb(${tgtRgb.r},${tgtRgb.g},${tgtRgb.bl})`;
  els.targetBlock.style.background=tgtCss;
  els.targetHsb.textContent=`H ${state.targetH}° S ${state.targetS}% B ${state.targetB}%`;

  const t=i18n[currentLang];
  document.querySelector('h1').textContent=t.title;

  const d=new Date();
  const start=new Date(d.getFullYear(),0,0);
  const diff=d-start+((start.getTimezoneOffset()-d.getTimezoneOffset())*60*1000);
  const day=Math.floor(diff/(1000*60*60*24));
  els.dayLabel.textContent=`Day ${day}`;

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

  const todayKey='cm_day_'+day;
  const saved=localStorage.getItem(todayKey);
  if(saved){
    const data=JSON.parse(saved);
    state.todayScore=data.score;
    state.todayDeltaE=data.de;
    state.hue=data.h||180; state.sat=data.s||50; state.bri=data.b||50;
    state.submitted=true;
    disableControls();
    showResult(false);
  }

  applySliders();
  updatePreview();
}

function disableControls(){
  els.hue.disabled=true;
  els.sat.disabled=true;
  els.bri.disabled=true;
  els.submit.disabled=true;
  els.submit.style.opacity='0.5';
  els.submit.style.cursor='not-allowed';
}

// ===== 12. 滑块事件 =====
function applySliders(){
  els.hue.value=state.hue; els.sat.value=state.sat; els.bri.value=state.bri;
  els.hVal.textContent=state.hue;
  els.sVal.textContent=state.sat;
  els.bVal.textContent=state.bri;
}
function updatePreview(){
  const rgb=hsbToRgb(state.hue,state.sat,state.bri);
  const css=`rgb(${rgb.r},${rgb.g},${rgb.bl})`;
  els.userBlock.style.background=css;
  document.documentElement.style.setProperty('--sat-color',css);
  document.documentElement.style.setProperty('--bri-color',css);
  els.userHsb.textContent=`H ${state.hue}° S ${state.sat}% B ${state.bri}%`;

  if(state.todayScore===null){
    const tgtRgb=hsbToRgb(state.targetH,state.targetS,state.targetB);
    const lab1=rgbToLab(rgb.r,rgb.g,rgb.bl);
    const lab2=rgbToLab(tgtRgb.r,tgtRgb.g,tgtRgb.bl);
    const de=ciede2000(lab1,lab2);
    els.liveDe.textContent=`ΔE ${de.toFixed(2)}`;
    const r=getRating(de);
    const label=currentLang==='zh'?r.labelZh:r.label;
    els.ratingBadge.textContent=label;
    els.ratingBadge.className='rating-badge level-'+r.level;
  } else {
    els.liveDe.textContent=`ΔE ${state.todayDeltaE.toFixed(2)}`;
    const r=getRating(state.todayDeltaE);
    const label=currentLang==='zh'?r.labelZh:r.label;
    els.ratingBadge.textContent=label;
    els.ratingBadge.className='rating-badge level-'+r.level;
  }
}
['input','change'].forEach(evt=>{
  els.hue.addEventListener(evt,e=>{state.hue=+e.target.value; els.hVal.textContent=state.hue; updatePreview();});
  els.sat.addEventListener(evt,e=>{state.sat=+e.target.value; els.sVal.textContent=state.sat; updatePreview();});
  els.bri.addEventListener(evt,e=>{state.bri=+e.target.value; els.bVal.textContent=state.bri; updatePreview();});
});

// ===== 13. 提交 =====
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

  const d=new Date();
  const start=new Date(d.getFullYear(),0,0);
  const diff=d-start+((start.getTimezoneOffset()-d.getTimezoneOffset())*60*1000);
  const day=Math.floor(diff/(1000*60*60*24));
  localStorage.setItem('cm_day_'+day, JSON.stringify({score:score,de:de,h:state.hue,s:state.sat,b:state.bri}));

  saveLeaderboard(day,score);
  disableControls();
  updatePreview();
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

  els.modalTargetBlock.style.background=`rgb(${tgtRgb.r},${tgtRgb.g},${tgtRgb.bl})`;
  els.modalUserBlock.style.background=`rgb(${userRgb.r},${userRgb.g},${userRgb.bl})`;

  els.modalDeltaE.textContent=`ΔE ${state.todayDeltaE.toFixed(2)}`;

  const r=getRating(state.todayDeltaE);
  const label=currentLang==='zh'?r.labelZh:r.label;
  els.modalRating.textContent=label;
  els.modalRating.className='modal-rating level-'+r.level;

  const bd=computeDeltaEBreakdown();
  const maxBar=Math.max(bd.hue,bd.sat,bd.bri,1);
  els.barHue.style.width=(bd.hue/maxBar*100)+'%';
  els.barSat.style.width=(bd.sat/maxBar*100)+'%';
  els.barBri.style.width=(bd.bri/maxBar*100)+'%';
  els.valHue.textContent=bd.hue.toFixed(2);
  els.valSat.textContent=bd.sat.toFixed(2);
  els.valBri.textContent=bd.bri.toFixed(2);

  const sc=state.todayScore;
  const text=sc>=95?t.commentLegendary:sc>=85?t.commentAmazing:sc>=70?t.commentNotBad:sc>=50?t.commentKeepTrying:t.commentPractice;
  els.comment.textContent=text;

  els.modal.classList.remove('hidden');
}

els.closeModal.addEventListener('click',()=>{
  els.modal.classList.add('hidden');
});

// ===== 14. Canvas 分享卡片生成 =====
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
  ctx.fillText(i18n[currentLang].shareTitle,w/2,110);

  ctx.fillStyle='#7c5cff';
  ctx.font='bold 180px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(String(state.todayScore),w/2,290);

  ctx.fillStyle='rgba(255,255,255,.7)';
  ctx.font='36px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(`ΔE ${state.todayDeltaE.toFixed(2)}`,w/2,360);

  const r=getRating(state.todayDeltaE);
  const label=currentLang==='zh'?r.labelZh:r.label;
  ctx.fillStyle=r.color;
  ctx.font='bold 40px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(label,w/2,420);

  const u=hsbToRgb(state.hue,state.sat,state.bri);
  const tgt=hsbToRgb(state.targetH,state.targetS,state.targetB);
  const sq=140;

  ctx.fillStyle=`rgb(${tgt.r},${tgt.g},${tgt.bl})`;
  ctx.fillRect(w/2 - sq - 40, 480, sq, sq);
  ctx.strokeStyle='rgba(255,255,255,.15)';
  ctx.lineWidth=2;
  ctx.strokeRect(w/2 - sq - 40, 480, sq, sq);

  ctx.fillStyle=`rgb(${u.r},${u.g},${u.bl})`;
  ctx.fillRect(w/2 + 40, 480, sq, sq);
  ctx.strokeRect(w/2 + 40, 480, sq, sq);

  ctx.fillStyle='#fff';
  ctx.font='28px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign='center';
  ctx.fillText(i18n[currentLang].shareTarget,w/2 - sq/2 - 40, 480 + sq + 40);
  ctx.fillText(i18n[currentLang].shareYours,w/2 + sq/2 + 40, 480 + sq + 40);

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

// ============================================================
// ===== QUICK CHALLENGE LOGIC =====
// ============================================================

function switchMode(mode){
  state.mode=mode;
  document.querySelectorAll('.mode-switch button').forEach(btn=>{
    btn.classList.toggle('active', btn.dataset.mode===mode);
  });
  if(mode==='daily'){
    els.dailyPanel.classList.remove('hidden');
    els.quickPanel.classList.add('hidden');
    els.leaderboardSection.classList.remove('hidden');
  }else{
    els.dailyPanel.classList.add('hidden');
    els.quickPanel.classList.remove('hidden');
    els.leaderboardSection.classList.add('hidden');
    resetQuickChallenge();
  }
}

els.modeSwitch.querySelectorAll('button').forEach(btn=>{
  btn.addEventListener('click',()=>switchMode(btn.dataset.mode));
});

function resetQuickChallenge(){
  clearInterval(qcState.timer);
  clearInterval(qcState.memorizeTimer);
  qcState.round=0;
  qcState.phase='idle';
  qcState.scores=[];
  qcState.timeLeft=qcState.roundTimeLimit;

  els.qcStartScreen.classList.remove('hidden');
  els.qcMemorizePhase.classList.add('hidden');
  els.qcSelectPhase.classList.add('hidden');
  els.qcFeedbackPhase.classList.add('hidden');
  els.qcResultModal.classList.add('hidden');
  updateQuickUI();
}

function updateQuickUI(){
  const t=i18n[currentLang];
  const displayRound=Math.min(qcState.round+1,5);
  const roundText = currentLang==='zh' ? `${t.qcRound} ${displayRound} / 5` : `Round ${displayRound} / 5`;
  els.qcRoundLabel.textContent=roundText;
}

// Random generator independent of daily seed
function qcRandom(){
  return mulberry32(Date.now() + Math.random()*1000000);
}

function generateTargetColor(){
  const rng=qcRandom();
  return {
    h:Math.floor(rng()*360),
    s:Math.floor(rng()*55+25),
    b:Math.floor(rng()*45+30),
  };
}

function hsbToCss({h,s,b}){
  const rgb=hsbToRgb(h,s,b);
  return `rgb(${rgb.r},${rgb.g},${rgb.bl})`;
}

function labFromHsb({h,s,b}){
  const rgb=hsbToRgb(h,s,b);
  return rgbToLab(rgb.r,rgb.g,rgb.bl);
}

function generateDistractors(target){
  const rng=qcRandom();
  const distractors=[];
  const targetLab=labFromHsb(target);
  let attempts=0;

  while(distractors.length<3 && attempts<500){
    attempts++;
    // Vary H by 30-110°, S by 12-45%, B by 12-45%
    const hShift = (rng()>0.5?1:-1) * (30 + rng()*80);
    const sShift = (rng()>0.5?1:-1) * (12 + rng()*33);
    const bShift = (rng()>0.5?1:-1) * (12 + rng()*33);

    let h = (target.h + hShift + 360) % 360;
    let s = Math.max(10, Math.min(100, target.s + sShift));
    let b = Math.max(15, Math.min(95, target.b + bShift));

    const cand={h,s,b};
    const candLab=labFromHsb(cand);
    const de=ciede2000(candLab,targetLab);

    // Ensure distractor is not too close (de>4) and not too far (de<25)
    if(de>4 && de<25){
      // Also ensure it's distinct from existing distractors
      let tooClose=false;
      for(const d of distractors){
        const dLab=labFromHsb(d);
        if(ciede2000(candLab,dLab)<5) tooClose=true;
      }
      if(!tooClose) distractors.push(cand);
    }
  }

  // Fallback: if we couldn't generate enough, use hue wheel distribution
  while(distractors.length<3){
    const idx=distractors.length;
    const h = (target.h + 90*(idx+1)) % 360;
    const s = Math.max(15, Math.min(95, target.s + (rng()>0.5?20:-20)));
    const b = Math.max(20, Math.min(90, target.b + (rng()>0.5?20:-20)));
    distractors.push({h,s,b});
  }

  return distractors;
}

function shuffleArray(arr){
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

function startQuickRound(){
  qcState.phase='memorize';
  qcState.target=generateTargetColor();
  qcState.choices=[];
  qcState.correctIdx=0;

  // Generate distractors and build choices
  const distractors=generateDistractors(qcState.target);
  const all=[qcState.target,...distractors];
  const shuffled=shuffleArray(all);
  qcState.choices=shuffled;
  qcState.correctIdx=shuffled.findIndex(c=>c===qcState.target);

  // UI: show memorize phase
  els.qcStartScreen.classList.add('hidden');
  els.qcFeedbackPhase.classList.add('hidden');
  els.qcSelectPhase.classList.add('hidden');
  els.qcMemorizePhase.classList.remove('hidden');

  els.qcTargetBlock.style.background=hsbToCss(qcState.target);

  updateQuickUI();

  // Countdown 3..2..1
  let count=qcState.memorizeTime;
  els.qcCountdown.textContent=count;
  clearInterval(qcState.memorizeTimer);
  qcState.memorizeTimer=setInterval(()=>{
    count--;
    if(count>0){
      els.qcCountdown.textContent=count;
    }else{
      clearInterval(qcState.memorizeTimer);
      enterSelectPhase();
    }
  },1000);
}

function enterSelectPhase(){
  qcState.phase='select';
  qcState.timeLeft=qcState.roundTimeLimit;

  els.qcMemorizePhase.classList.add('hidden');
  els.qcSelectPhase.classList.remove('hidden');

  // Render grid cells
  const cells=els.qcGrid.querySelectorAll('.qc-cell');
  cells.forEach((cell,idx)=>{
    cell.style.background=hsbToCss(qcState.choices[idx]);
    cell.classList.remove('correct','wrong');
    cell.disabled=false;
    cell.onclick=()=>handleQcPick(idx);
  });

  updateTimerDisplay();
  clearInterval(qcState.timer);
  qcState.timer=setInterval(()=>{
    qcState.timeLeft-=0.1;
    if(qcState.timeLeft<=0){
      qcState.timeLeft=0;
      clearInterval(qcState.timer);
      handleQcTimeout();
    }
    updateTimerDisplay();
  },100);
}

function updateTimerDisplay(){
  const pct=(qcState.timeLeft/qcState.roundTimeLimit)*100;
  els.qcTimerBar.style.width=pct+'%';
  els.qcTimer.textContent=Math.max(0,qcState.timeLeft).toFixed(1)+'s';
  if(qcState.timeLeft<=5) els.qcTimer.classList.add('urgent');
  else els.qcTimer.classList.remove('urgent');
}

function handleQcTimeout(){
  // Time out = 0 score
  const t=i18n[currentLang];
  qcState.scores.push({score:0,de:30,timeSpent:qcState.roundTimeLimit});
  showQcFeedback(-1,30,0);
}

function handleQcPick(idx){
  clearInterval(qcState.timer);
  const chosen=qcState.choices[idx];
  const targetLab=labFromHsb(qcState.target);
  const chosenLab=labFromHsb(chosen);
  const de=ciede2000(chosenLab,targetLab);
  const score=scoreFromDeltaE(de);
  qcState.scores.push({score,de,timeSpent:qcState.roundTimeLimit-qcState.timeLeft});

  // Highlight grid
  const cells=els.qcGrid.querySelectorAll('.qc-cell');
  cells.forEach((c,i)=>{
    c.disabled=true;
    c.onclick=null;
    if(i===qcState.correctIdx) c.classList.add('correct');
    else if(i===idx && idx!==qcState.correctIdx) c.classList.add('wrong');
  });

  // Small delay to show correct/wrong before feedback overlay
  setTimeout(()=>showQcFeedback(idx,de,score),600);
}

function showQcFeedback(pickIdx,de,score){
  qcState.phase='feedback';
  els.qcSelectPhase.classList.add('hidden');
  els.qcFeedbackPhase.classList.remove('hidden');

  const t=i18n[currentLang];
  els.qcFeedbackScore.textContent=score;
  els.qcFeedbackDe.textContent=`ΔE ${de.toFixed(2)}`;
  const r=getRating(de);
  els.qcFeedbackRating.textContent=currentLang==='zh'?r.labelZh:r.label;

  // Color the bubble based on rating (Memphis high saturation)
  const bubbleColors={
    pro:'#4ade80',
    excellent:'#22d3ee',
    competent:'#facc15',
    practice:'#fb923c',
    alert:'#f87171',
  };
  els.qcFeedbackBubble.style.background=bubbleColors[r.level]||'#ffd500';

  els.qcFbTarget.style.background=hsbToCss(qcState.target);
  const pickColor = pickIdx>=0 ? hsbToCss(qcState.choices[pickIdx]) : '#333';
  els.qcFbPick.style.background=pickColor;

  els.qcNextBtn.onclick=()=>{
    qcState.round++;
    if(qcState.round>=5){
      showQcFinal();
    }else{
      startQuickRound();
    }
  };
}

function showQcFinal(){
  qcState.phase='finished';
  els.qcFeedbackPhase.classList.add('hidden');
  els.qcResultModal.classList.remove('hidden');

  const scores=qcState.scores.map(s=>s.score);
  const des=qcState.scores.map(s=>s.de);
  const total=scores.reduce((a,b)=>a+b,0);
  const avgDe=des.reduce((a,b)=>a+b,0)/des.length;
  const best=Math.max(...scores);
  const grade=getGrade(total);
  const rank=getRankFromAvgDe(avgDe);

  els.qcFinalGrade.textContent=grade;
  els.qcFinalScore.textContent=`${total} / 500`;
  els.qcFinalDe.textContent=avgDe.toFixed(2);
  els.qcFinalBest.textContent=best;
  els.qcFinalRank.textContent=currentLang==='zh'?rank.labelZh:rank.label;

  // Emoji bar
  const emojiForScore=s=>s>=95?'🟢':s>=80?'🟡':s>=60?'🟠':'🔴';
  els.qcEmojiBar.textContent=scores.map(emojiForScore).join('');
}

els.qcStartBtn.addEventListener('click',()=>{
  qcState.round=0;
  qcState.scores=[];
  startQuickRound();
});

els.qcCloseModal.addEventListener('click',()=>{
  els.qcResultModal.classList.add('hidden');
  resetQuickChallenge();
});

els.qcShareBtn.addEventListener('click',()=>{
  const scores=qcState.scores.map(s=>s.score);
  const total=scores.reduce((a,b)=>a+b,0);
  const best=Math.max(...scores);
  const grade=getGrade(total);
  const emojiForScore=s=>s>=95?'🟢':s>=80?'🟡':s>=60?'🟠':'🔴';
  const bar=scores.map(emojiForScore).join('');
  const t=i18n[currentLang];
  const title = currentLang==='zh'?'◐ HueHacker 限时挑战':'◐ HueHacker Quick Challenge';
  const lines=[
    title,
    `${t.score}: ${total}/500  |  Grade: ${grade}`,
    `${t.qcBestRound}: ${best}`,
    bar,
    'https://huehacker.fun'
  ];
  const text=lines.join('\n');
  navigator.clipboard.writeText(text).then(()=>{
    const orig=els.qcShareBtn.textContent;
    els.qcShareBtn.textContent='✅ Copied!';
    setTimeout(()=>els.qcShareBtn.textContent=orig,2000);
  }).catch(()=>{
    // Fallback
    prompt('Copy this summary:',text);
  });
});

// ===== 15. Boot =====
initDaily();
renderLB(JSON.parse(localStorage.getItem('cm_lb')||'[]'));
applyLanguage(getBrowserLang());

// Restore saved mode
const savedMode=localStorage.getItem('hh_mode')||'daily';
if(savedMode==='quick') switchMode('quick');

els.modeSwitch.querySelectorAll('button').forEach(btn=>{
  btn.addEventListener('click',()=>{
    switchMode(btn.dataset.mode);
    localStorage.setItem('hh_mode',btn.dataset.mode);
  });
});

document.querySelectorAll('.lang-switch button').forEach(btn=>{
  btn.addEventListener('click',()=>applyLanguage(btn.dataset.lang));
});
