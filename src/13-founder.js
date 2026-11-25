// =====================================================================
I.chat = '<path d="M4 20l1.3-3.9A8 8 0 1 1 8 19.3z"/>';
// v6 — Founder mode: two ways in, audience targeting, per-interview pricing,
// honest-answer rewards, visible verification & quality.
// Person.attributes.{age_band, city_tier, occ_type, income, buys[], apps[], level_base}
// Study.rewards {bonus_pct, bonus_top, perk, close_loop}; Recommendation.loop_closed_at
// WalletTransaction kind "insight_bonus"
// =====================================================================
const hash01 = (id, salt) => { let h = 2166136261; const s = String(id)+'|'+salt; for (let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h>>>0)%10000)/10000; };
const METROS = ['Mumbai','Delhi','New Delhi','Bengaluru','Hyderabad','Chennai','Kolkata','Pune','Ahmedabad','Gurugram','Noida'];

const TARGET_GROUPS = [
  {k:'age_band', name:'Age', opts:[['18_24','18–24'],['25_34','25–34'],['35_44','35–44'],['45_plus','45+']]},
  {k:'city_tier', name:'Where they live', opts:[['metro','Metro cities'],['tier2','Tier 2–3 cities']]},
  {k:'occ_type', name:'What they do', opts:[['student','Students'],['salaried','Salaried'],['business','Run a business'],['homemaker','Homemakers']]},
  {k:'income', name:'Monthly income', opts:[['u25','Under ₹25k'],['25_50','₹25–50k'],['50_1l','₹50k–1L'],['1l_plus','₹1L+']]},
  {k:'buys', name:'Buys online', opts:[['fashion','Fashion'],['beauty','Beauty & skincare'],['food','Food & grocery'],['electronics','Electronics'],['fitness','Fitness'],['kids','Kids'],['home','Home']]},
  {k:'apps', name:'Apps they use weekly', opts:[['instagram','Instagram'],['linkedin','LinkedIn'],['quick_commerce','Blinkit / Zepto'],['food_delivery','Swiggy / Zomato'],['myntra','Myntra'],['nykaa','Nykaa'],['youtube','YouTube']]}
];
const tgroup = k => TARGET_GROUPS.find(g=>g.k===k);
const LIST_ATTRS = ['buys','apps'];
TARGET_GROUPS.forEach(g=>KNOWN_ATTRS.push(g.k));

function enrichPerson(p){
  const a = p.attributes = p.attributes || {};
  if (a.income) return p;
  const age = personAge(p) || 28, occ = (p.occupation||'').toLowerCase(), r = s => hash01(p.id, s);
  a.age_band = age<25?'18_24':age<35?'25_34':age<45?'35_44':'45_plus';
  a.city_tier = METROS.includes(p.city) ? 'metro' : 'tier2';
  a.occ_type = occ.includes('student') ? 'student' : occ==='homemaker' ? 'homemaker' : (a.business_owner||/owner|founder|own practice|freelance/.test(occ)) ? 'business' : 'salaried';
  const seg = a.segments || [];
  a.income = a.occ_type==='student' ? (r('i')<0.85?'u25':'25_50')
    : seg.includes('senior_leaders') ? '1l_plus'
    : a.occ_type==='business' ? (r('i')<0.5?'25_50':r('i')<0.85?'50_1l':'1l_plus')
    : a.occ_type==='homemaker' ? (r('i')<0.6?'25_50':'50_1l')
    : a.city_tier==='tier2' ? (r('i')<0.55?'u25':'25_50')
    : (r('i')<0.25?'25_50':r('i')<0.75?'50_1l':'1l_plus');
  const buys = [];
  if ((a.d2c_fashion_orders_60d||0)>0 || r('f')<0.35) buys.push('fashion');
  if (a.skincare_buyer || r('b')<0.2) buys.push('beauty');
  if ((a.quick_commerce_orders_30d||0)>2 || r('g')<0.4) buys.push('food');
  if (r('e')<0.35) buys.push('electronics');
  if ((a.workouts_per_week||0)>=3) buys.push('fitness');
  if ((a.kids_under_10||0)>0) buys.push('kids');
  if (r('h')<0.3) buys.push('home');
  a.buys = buys;
  const apps = ['youtube'];
  if (age<36 || r('ig')<0.5) apps.push('instagram');
  if (p.linkedin_verified_at || (a.occ_type==='salaried' && r('li')<0.6)) apps.push('linkedin');
  if ((a.quick_commerce_orders_30d||0)>2) apps.push('quick_commerce');
  if (age<40 && r('fd')<0.7) apps.push('food_delivery');
  if (buys.includes('fashion') && r('my')<0.7) apps.push('myntra');
  if (buys.includes('beauty') && r('ny')<0.75) apps.push('nykaa');
  a.apps = apps;
  a.level_base = Math.floor(r('lv')*14);
  return p;
}
function enrichAll(){ rows('Person',()=>true).forEach(enrichPerson); }
const _mkp = makePanelist;
makePanelist = function(k,o){ return enrichPerson(_mkp(k,o)); };

const _pv6 = personValue;
personValue = function(p, attr){ if (tgroup(attr)) { enrichPerson(p); return p.attributes[attr]; } return _pv6(p, attr); };
const _cp6 = critPass;
critPass = function(p, c){
  if (tgroup(c.attribute)) {
    enrichPerson(p); const v = p.attributes[c.attribute]; const want = [].concat(cv2(c));
    return LIST_ATTRS.includes(c.attribute) ? want.some(w => (v||[]).includes(w)) : want.includes(v);
  }
  return _cp6(p, c);
};

// ---------- respondent levels & quality ----------
const LEVELS = {gold:{name:'Gold',c:'var(--gold-ink)',bg:'var(--gold-soft)'},silver:{name:'Silver',c:'var(--muted)',bg:'var(--surface-2)'},bronze:{name:'New',c:'var(--accent)',bg:'var(--accent-soft)'}};
function personLevel(p){
  enrichPerson(p); const a = p.attributes;
  const done = rows('Session',x=>x.person_id===p.id&&x.ended_at).length + (p.cohort_import_id?0:a.level_base);
  const q = a.quality_score ?? 75;
  return done>=10 && q>=80 ? 'gold' : done>=3 ? 'silver' : 'bronze';
}
function levelPill(p){ const L = LEVELS[personLevel(p)]; return `<span class="pill" style="background:${L.bg};color:${L.c};border-color:transparent;font-size:11px">${L.name==='New'?'New respondent':L.name+' respondent'}</span>`; }
function qualityOf(x){
  if (!x.ended_at) return null;
  const p = byId('Person', x.person_id) || {attributes:{}};
  const chars = rows('TranscriptTurn',t=>t.session_id===x.id&&t.speaker==='participant').reduce((a,t)=>a+t.text.length,0);
  const depth = Math.min(1, chars/900);
  const pq = (p.attributes&&p.attributes.quality_score) ?? 75;
  let score = Math.round(pq*0.55 + depth*35 + hash01(x.id,'q')*12);
  score = Math.max(30, Math.min(98, score));
  const verified = p.cohort_import_id ? !!buyerStats(p.id) : !!(p.aadhaar_verified_at||p.linkedin_verified_at);
  const checks = [
    ['Phone', true],
    ['UPI name match', !!(p.upi_verified_at||p.upi_vpa)],
    [p.cohort_import_id?'Real order':(p.linkedin_verified_at?'LinkedIn':'Aadhaar'), verified],
    ['Not rushed', score>=50],
    ['Original answers', hash01(x.id,'cp')>0.04]
  ];
  const rejected = score<50 || !checks[4][1];
  return {score, checks, rejected};
}

// ---------- rewards ----------
function rewardsOf(s){ return s.rewards || {bonus_pct:0, bonus_top:20, perk:'', close_loop:false}; }
function bonusPool(s){ const r = rewardsOf(s); return Math.round((s.sample_size||0)*(s.incentive_inr||0)*(r.bonus_pct||0)/100); }
function bonusWinners(s){
  const r = rewardsOf(s); if (!r.bonus_pct) return {ids:new Set(), each:0};
  const scored = sessionsOf(s.id).filter(x=>x.ended_at).map(x=>({x,q:qualityOf(x)})).filter(o=>!o.q.rejected).sort((a,b)=>b.q.score-a.q.score);
  const k = Math.max(1, Math.ceil(scored.length*(r.bonus_top||20)/100));
  const winners = scored.slice(0, k);
  const pool = rows('WalletTransaction',t=>t.study_id===s.id&&t.kind==='insight_bonus').reduce((a,t)=>a-t.amount_inr,0) || bonusPool(s);
  return {ids:new Set(winners.map(o=>o.x.id)), each: winners.length? Math.round(pool/winners.length) : 0, k};
}
const _sb6 = studyBudget;
studyBudget = function(s){
  const b = _sb6(s);
  b.bonus = s.launched_at ? 0 : bonusPool(s);
  b.total += b.bonus;
  b.allIn = s.launched_at ? 0 : b.total;
  b.perInterview = b.n ? Math.round(b.total/b.n) : 0;
  return b;
};
const _ls6 = launchStudy;
launchStudy = function(s){
  const pool = bonusPool(s);
  const out = _ls6(s);
  if (pool>0) ins('WalletTransaction',{workspace_id:s.workspace_id,study_id:s.id,kind:'insight_bonus',amount_inr:-pool,created_at:iso(Date.now())});
  return out;
};
function inviteCopy(s){
  const r = rewardsOf(s), ws = byId('Workspace', s.workspace_id) || {name:'the brand'};
  const each = r.bonus_pct ? Math.round(bonusPool(s)/Math.max(1,Math.ceil((s.sample_size||1)*(r.bonus_top||20)/100))) : 0;
  return [
    `Hi! ${esc(ws.name)} is using Voqiva to hear from people like you. It's ${s.max_duration_min||10} minutes of voice notes on WhatsApp, whenever it suits you.`,
    `You get <b>${inr(s.incentive_inr||0)}</b> on UPI the moment you finish, <b>whether you love the product or hate it</b>. Honest beats polite here.`,
    each ? `The <b>${r.bonus_top||20}% most detailed answers</b> get <b>${inr(each)} extra</b>. Real examples and stories count; praise doesn't.` : '',
    r.perk ? `Plus: ${esc(r.perk)}.` : '',
    r.close_loop ? `We'll message you when something changes because of what you said.` : ''
  ].filter(Boolean);
}

// ---------- founder templates ----------
const FOUNDER_TEMPLATES = [
  {k:'validate', mode:'audience', label:'Validate my idea', text:'Validate whether working professionals aged 25–34 in metro cities have the problem my product solves, how they handle it today, and what would make them switch.', target:{age_band:['25_34'],city_tier:['metro'],occ_type:['salaried']}},
  {k:'pricing', mode:'audience', label:'Will they pay? (pricing test)', text:'Test willingness to pay between ₹499 and ₹1,499 for my product among people aged 25–34 earning ₹50k+ a month, and what would make it feel worth it.', target:{age_band:['25_34'],income:['50_1l','1l_plus']}},
  {k:'concept', mode:'audience', label:'Concept test', text:'Show my new product concept to Gen Z shoppers aged 18–24 who buy fashion online, and learn what excites them, what confuses them and what would stop them buying.', target:{age_band:['18_24'],buys:['fashion']}},
  {k:'switch', mode:'audience', label:'Why people use a competitor', text:'Understand why people who order groceries on Blinkit or Zepto every week chose their current option, what annoys them and what would make them switch.', target:{apps:['quick_commerce'],buys:['food']}},
  {k:'no', mode:'audience', label:'Talk to people who said no', text:'Talk to people aged 25–44 who considered buying a product like mine but decided not to. Find the real reasons they walked away.', target:{age_band:['25_34','35_44']}},
  {k:'reorder', mode:'customers', label:'Why first-timers don’t reorder', text:'Why are first-time buyers not reordering within 60 days, and what would bring them back?'},
  {k:'returns', mode:'customers', label:'Why people return', text:'Why are customers returning or refusing delivery of their orders, and what would have prevented it?'},
  {k:'bought', mode:'customers', label:'What made you buy', text:'What made our best customers buy the first time, what almost stopped them, and how they describe us to friends?'},
  {k:'price', mode:'customers', label:'Price check with buyers', text:'Would our repeat buyers still buy if prices went up by ₹200, and which products feel overpriced or great value?'}
];

// ---------- targeting maths ----------
function ndTarget(){ const nd = ui.nd; nd.target = nd.target || {}; return nd.target; }
function targetCriteria(){
  const t = ndTarget(); const out = [];
  TARGET_GROUPS.forEach(g=>{ const v = t[g.k]; if (v && v.length) out.push({attribute:g.k, operator:'in', value:v.slice(), label:g.name+': '+v.map(x=>g.opts.find(o=>o[0]===x)[1]).join(', ')}); });
  if (ui.nd.screener && ui.nd.screener.trim()) out.push({attribute:'screener_note', operator:'eq', value:ui.nd.screener.trim(), label:'Screener: '+ui.nd.screener.trim()});
  return out;
}
const _ndc6 = ndCriteria;
ndCriteria = function(){ let base = _ndc6(); if (ui.nd.source!=='voqiva_panel') return base; const tc = targetCriteria(); if (tc.some(c=>c.attribute==='age_band')) base = base.filter(c=>c.attribute!=='age'); return base.concat(tc); };
function targetRate(){
  const nd = ui.nd, t = ndTarget(); const sg = ndSegments();
  let r = sg.length ? segmentRate(sg) : 150;
  if ((t.occ_type||[]).includes('business')) r = Math.max(r, 500);
  if ((t.income||[]).includes('1l_plus')) r = Math.max(r, 400);
  else if ((t.income||[]).includes('50_1l')) r = Math.max(r, 250);
  if ((t.occ_type||[]).length===1 && t.occ_type[0]==='student') r = Math.min(r, 120);
  return r;
}
function targetQuote(){
  const nd = ui.nd; const n = nd.n || 20; const rate = targetRate();
  const fees = feeOf('synthesis_fee') + feeOf('disbursement_fee');
  const bonus = Math.round(n*rate*0.2);
  const total = n*rate + fees + bonus;
  const f = feasibility({audience_source:'voqiva_panel'}, ndCriteria());
  return {n, rate, fees, bonus, total, per: Math.round(total/n), match: f.match, base: f.base};
}
function targetCard(){
  const nd = ui.nd, t = ndTarget();
  return `<section class="card stack" id="nd-target" style="gap:16px">
    <div class="row between"><div><h3>Build your audience</h3><p class="small muted">Tap who you want to hear from. Everyone in the Voqiva panel is ID- and UPI-verified.</p></div><span class="pill acc">${rows('Person',p=>!p.cohort_import_id).length.toLocaleString('en-IN')} verified Indians</span></div>
    ${TARGET_GROUPS.map(g=>`<div class="stack" style="gap:8px"><span class="eyebrow">${g.name}</span><div class="row" style="gap:6px">${g.opts.map(([v,l])=>{ const on=(t[g.k]||[]).includes(v); return `<button type="button" class="chip ${on?'':'plain'}" aria-pressed="${on}" data-act="tg" data-g="${g.k}" data-v="${v}">${on?ic('check').replace('<svg','<svg style="width:13px;vertical-align:-2px"')+' ':''}${l}</button>`; }).join('')}</div></div>`).join('')}
    <div><label class="lbl" for="nd-screener">Screening question (optional)</label><input class="field" id="nd-screener" data-input="nd-screener" value="${esc(nd.screener||'')}" placeholder="e.g. Have you bought skincare online in the last 3 months?"><span class="small muted">Asked before the interview. People who don't qualify aren't charged.</span></div>
    <div class="well stack" style="gap:10px">
      <div class="row between"><b>Genuine responses you need</b><b class="num" id="tq-n" style="font-family:var(--display);font-size:24px">${nd.n||20}</b></div>
      <input type="range" min="5" max="100" step="5" value="${nd.n||20}" data-input="nd-n" aria-label="Number of genuine responses" style="width:100%;accent-color:var(--accent)">
      <div id="tq-out"></div>
    </div>
  </section>`;
}
function updateTargetQuote(){
  const el = document.getElementById('tq-out'); if (!el || !ui.nd) return;
  const q = targetQuote();
  const short = q.match < q.n;
  document.getElementById('tq-n').textContent = q.n;
  el.innerHTML = `<div class="grid g3" style="gap:8px">
      <div><div class="eyebrow">Per completed interview</div><b class="num" style="font-family:var(--display);font-size:22px">${inr(q.per)}</b></div>
      <div><div class="eyebrow">Total, all-in</div><b class="num" style="font-family:var(--display);font-size:22px">${inr(q.total)}</b></div>
      <div><div class="eyebrow">Match right now</div><b class="num" style="font-family:var(--display);font-size:22px;color:${short?'var(--warn)':'var(--ok)'}">${q.match}</b></div></div>
    <span class="small muted">${inr(q.rate)} reward each · ${inr(q.bonus)} insight bonus pool · ${inr(q.fees)} AI + payouts. You only pay for interviews that pass the quality check.</span>
    ${short?`<span class="small" style="color:var(--warn)">${q.match} verified people match today. Voqiva recruits the other ${q.n-q.match} through targeted ads (about ${inr(BOOST_CPA)} each, ~24 hours), or loosen a filter.</span>`:''}`;
}

// ---------- one-time data migration ----------
function migrateV6(){
  if (!DB) return; const m = DB._meta = DB._meta || {scripts:{}};
  if (m.v6) return; m.v6 = true;
  enrichAll();
  const sC = rows('Study',s=>s.title==='Oversized Officewear Validation')[0];
  if (sC && !sC.rewards){
    sC.rewards = {bonus_pct:20, bonus_top:20, perk:'', close_loop:true};
    if (!rows('WalletTransaction',t=>t.study_id===sC.id&&t.kind==='insight_bonus').length)
      ins('WalletTransaction',{workspace_id:sC.workspace_id,study_id:sC.id,kind:'insight_bonus',amount_inr:-bonusPool(sC),created_at:sC.launched_at||iso(Date.now())});
  }
  save();
}
const _render6 = render;
render = function(){ migrateV6(); _render6(); };

// ---------- pricing copy ----------
(function(){ const p = PLANS.find(x=>x.k==='payg'); if (p){ p.name='Pay per interview'; p.price='From ₹180'; p.line='Per completed interview, all-in: the respondent’s reward, AI synthesis and UPI payout. Interviews that fail the quality check are replaced free.'; } })();

// ---------- Home: two ways in ----------
const PANEL_TOTAL = () => rows('Person',p=>!p.cohort_import_id).length;
function modeChooser(){
  const tpl = m => FOUNDER_TEMPLATES.filter(t=>t.mode===m).map(t=>`<button class="chip plain" data-act="ftpl" data-k="${t.k}">${esc(t.label)}</button>`).join('');
  const card = (m, eyebrow, title, body, ph, foot, pill) => `<section class="card stack mode-card" style="gap:14px;padding:24px">
      <div class="row between"><span class="eyebrow" style="color:var(--accent)">${eyebrow}</span>${pill}</div>
      <h2 style="font-size:clamp(20px,2.2vw,26px)">${title}</h2>
      <p class="muted small" style="margin-top:-6px">${body}</p>
      <form class="prompt-box" data-submit="mode-ask" data-mode="${m}">${ic('spark')}
        <input id="mq-${m}" placeholder="${ph}" aria-label="${eyebrow}: your question">
        <button class="btn primary" type="submit">${m==='customers'?'Start':'Build audience'} ${ic('right')}</button></form>
      <div class="row" style="gap:6px">${tpl(m)}</div>
      <span class="small muted">${foot}</span></section>`;
  return `<div class="grid g2" style="align-items:stretch">
    ${card('customers','Talk to your customers','Ask people who already bought from you','Purchase-verified buyers who opted in. Every answer sits next to their real order.','e.g. Why don’t first-time buyers reorder?',`${freeLeft(ui.ws)} of ${FREE_QUOTA} free customer interviews left this month.`,`<span class="pill buy">${ic('check')}Real orders</span>`)}
    ${card('audience','Find your audience','No customers yet? Reach exactly the right people','Pick age, city, job, income, what they buy and the apps they use. Everyone is ID- and UPI-verified.','e.g. Would young parents pay for a meal-kit subscription?',`${PANEL_TOTAL().toLocaleString('en-IN')} verified people across ${SEGMENTS.length} audiences · from ₹180 per completed interview.`,`<span class="pill gold">${ic('shield')}Verified panel</span>`)}
  </div>`;
}
const _vHome6 = vHome;
vHome = function(){ return _vHome6().replace(/<section class="card hero stack"[\s\S]*?<\/section>/, modeChooser()); };

// ---------- New study: modes, founder templates, targeting ----------
function modeTabs(){
  const aud = ui.nd.source==='voqiva_panel';
  return `<div class="tabs" role="tablist" style="align-self:flex-start">
    <button class="${aud?'':'on'}" data-act="nd-mode" data-k="customers">${ic('users').replace('<svg','<svg style="width:15px;vertical-align:-3px"')} Talk to your customers</button>
    <button class="${aud?'on':''}" data-act="nd-mode" data-k="audience">${ic('search').replace('<svg','<svg style="width:15px;vertical-align:-3px"')} Find your audience</button></div>`;
}
const _vNew6 = vNew;
vNew = function(){
  if (!ui.nd) ndInit();
  const nd = ui.nd; const mode = nd.source==='voqiva_panel' ? 'audience' : 'customers';
  let h = _vNew6();
  h = h.replace(/(<h1>New research study<\/h1>[\s\S]*?<\/section>)/, '$1'+modeTabs());
  h = h.replace(/<span class="eyebrow">Scenario templates<\/span>\s*<div class="row" style="gap:8px">[\s\S]*?<\/div>/,
    `<span class="eyebrow">${mode==='audience'?'Founder templates':'Customer templates'}</span><div class="row" style="gap:8px">${FOUNDER_TEMPLATES.filter(t=>t.mode===mode).map(t=>`<button class="chip plain" data-act="ftpl" data-k="${t.k}">${esc(t.label)}</button>`).join('')}</div>`);
  if (nd.step>=2 && mode==='audience') h = h.replace(/(<section class="card stack" id="nd-aud"[\s\S]*?<\/section>)/, '$1'+targetCard());
  return h;
};
const _uns6 = updateNewSide;
updateNewSide = function(){ _uns6(); updateTargetQuote();
  if (ui.nd && ui.nd.source==='voqiva_panel'){ document.querySelectorAll('#nd-side .well').forEach(w=>{ const e=w.querySelector('.eyebrow'); if(e&&e.textContent==='Suggested sample'){ const b=w.querySelector('b'); if(b) b.textContent=(ui.nd.n||20)+' genuine responses'; } }); } };

const _gp6 = generatePlan;
generatePlan = async function(nd, onProgress, signal){
  const out = await _gp6(nd, onProgress, signal);
  const s = out.study;
  const patch = {rewards:{bonus_pct:20, bonus_top:20, perk:'', close_loop:true}};
  if (nd.source==='voqiva_panel'){ patch.sample_size = nd.n || 20; patch.incentive_inr = targetRate(); }
  upd('Study', s.id, patch);
  if (nd.screener && nd.screener.trim()){
    questionsOf(s.id).forEach(q=>q.position+=1);
    ins('Question',{study_id:s.id,position:1,kind:'screener',section:'Screener',prompt:nd.screener.trim(),input_type:'choice',probe_goal:'Only people who answer yes continue to the interview.',config:{options:['Yes','No']}});
  }
  save();
  return out;
};

// ---------- Plan: rewards card, all-in price ----------
function rewardCard(s){
  const r = rewardsOf(s); const f = feasibility(s, critRows(s.id));
  const lv = {gold:0, silver:0, bronze:0}; f.people.forEach(p=>lv[personLevel(p)]++);
  const w = Math.max(1, Math.ceil((s.sample_size||1)*(r.bonus_top||20)/100));
  const each = r.bonus_pct ? Math.round(bonusPool(s)/w) : 0;
  return `<section class="card stack" style="gap:14px;border-top:3px solid var(--gold)">
    <div class="row between"><div><h3>Rewards that get honest answers</h3><p class="small muted">Pay for detail, never for praise. People earn the same whether they love your idea or hate it.</p></div><span class="pill gold">You control the cost</span></div>
    <div class="grid g3" style="gap:10px">
      <div class="well stack" style="gap:6px"><span class="eyebrow">1 · Reward for finishing</span><b class="num" style="font-family:var(--display);font-size:22px">${inr(s.incentive_inr||0)}</b><span class="small muted">${REWARD_LABEL[s.reward_type]||'UPI cash'}, paid the minute they finish. Change it under Customise plan.</span></div>
      <div class="well stack" style="gap:6px"><span class="eyebrow">2 · Insight bonus</span>
        <div class="row" style="gap:4px">${[0,10,20,30].map(v=>`<button class="chip ${r.bonus_pct===v?'':'plain'}" data-act="rw-bonus" data-id="${s.id}" data-v="${v}">${v?v+'%':'Off'}</button>`).join('')}</div>
        <span class="small muted">${r.bonus_pct?`${inr(bonusPool(s))} pool split across the ${w} most detailed answers (about ${inr(each)} each). Scored on specifics and examples, not on sentiment.`:'No bonus. Turn it on to reward the most useful answers.'}</span></div>
      <div class="well stack" style="gap:6px"><span class="eyebrow">3 · Who gets invited first</span>
        <div class="row" style="gap:6px"><span class="pill" style="background:var(--gold-soft);color:var(--gold-ink);border-color:transparent">${lv.gold} Gold</span><span class="pill">${lv.silver} Silver</span><span class="pill acc">${lv.bronze} New</span></div>
        <span class="small muted">Gold respondents have 10+ high-quality interviews behind them, so they're invited first. Respondents level up by giving useful answers, which keeps them honest.</span></div>
    </div>
    <div class="grid g2" style="gap:10px;align-items:end">
      <div><label class="lbl" for="rw-perk">Add a perk on top (optional, costs you nothing here)</label><input class="field" id="rw-perk" data-change="rw-perk" data-id="${s.id}" value="${esc(r.perk||'')}" placeholder="e.g. 15% off code, or early access to the app"></div>
      <label class="row" style="gap:10px;flex-wrap:nowrap;cursor:pointer"><input type="checkbox" data-change="rw-loop" data-id="${s.id}" ${r.close_loop?'checked':''} style="width:18px;height:18px;accent-color:var(--accent);flex:none"><span class="small"><b>Tell people what you changed.</b> When you ship a fix, everyone who raised it gets a WhatsApp update. Free, and people answer more openly next time.</span></label>
    </div>
    <div class="stack" style="gap:6px"><span class="eyebrow">What respondents see on WhatsApp</span>
      <div class="transcript" style="padding:12px"><div class="bubble mod" style="max-width:520px">${inviteCopy(s).map(l=>`<p style="margin:0 0 6px">${l}</p>`).join('')}</div></div></div>
  </section>`;
}
const _vPlan6 = vPlan;
vPlan = function(s){
  let h = _vPlan6(s);
  if (studyStatus(s)!=='draft') return h;
  const b = studyBudget(s);
  h = h.replace(/<section class="card stack">\s*<div class="row between"><div><h3>Methodology/, m => rewardCard(s)+m);
  const lines = `${b.bonus?`<div class="row between"><div><b>Insight bonus pool</b><div class="small muted">${rewardsOf(s).bonus_pct}% extra, only for the most detailed answers</div></div><b class="num">${inr(b.bonus)}</b></div>`:''}
    <div class="well row between" style="background:var(--gold-soft)"><div><b>All-in per completed interview</b><div class="small muted">Failed quality checks are replaced free</div></div><b class="num" style="font-family:var(--display);font-size:22px">${inr(b.perInterview)}</b></div>`;
  h = h.replace('<hr style="border:0;border-top:1px solid var(--line);width:100%;margin:0">', lines+'$&');
  return h;
};

// ---------- Live: verification & quality on every respondent ----------
const _sess6 = sessCard;
sessCard = function(s, x, qs){
  const h = _sess6(s, x, qs); const p = byId('Person', x.person_id); if (!p) return h;
  const q = qualityOf(x);
  let row = `<div class="row" style="gap:6px">${levelPill(p)}`;
  if (q){
    const bw = bonusWinners(s);
    row += q.checks.map(([l,ok])=>`<span class="pill ${ok?'ok':'bad'}" style="font-size:11px">${l}</span>`).join('');
    row += `<span class="pill ${q.rejected?'bad':'acc'}" style="font-size:11px">Quality ${q.score}/100</span>`;
    if (q.rejected) row += `<span class="pill bad" style="font-size:11px">Below the bar · replaced, not charged</span>`;
    else if (bw.ids.has(x.id)) row += `<span class="pill gold" style="font-size:11px">★ Insight bonus +${inr(bw.each)}</span>`;
  }
  row += `</div>`;
  return h.replace(/<\/article>\s*$/, row+'</article>');
};
function qcCard(s){
  const done = sessionsOf(s.id).filter(x=>x.ended_at); if (!done.length) return '';
  const qs = done.map(qualityOf); const rej = qs.filter(q=>q.rejected).length; const acc = done.length-rej;
  const avg = Math.round(qs.reduce((a,q)=>a+q.score,0)/qs.length);
  const bw = bonusWinners(s);
  return `<section class="grid g4" style="gap:10px">
    <div class="card stack" style="gap:4px"><span class="eyebrow">Accepted</span><b class="num" style="font-family:var(--display);font-size:26px">${acc}</b><span class="small muted">passed every check</span></div>
    <div class="card stack" style="gap:4px"><span class="eyebrow">Replaced free</span><b class="num" style="font-family:var(--display);font-size:26px">${rej}</b><span class="small muted">rushed or copy-pasted</span></div>
    <div class="card stack" style="gap:4px"><span class="eyebrow">Average quality</span><b class="num" style="font-family:var(--display);font-size:26px">${avg}<small class="muted" style="font-size:14px">/100</small></b><span class="small muted">depth, specifics, originality</span></div>
    <div class="card stack" style="gap:4px;border-top:3px solid var(--gold)"><span class="eyebrow">Insight bonus</span><b class="num" style="font-family:var(--display);font-size:26px">${bw.ids.size?bw.ids.size+' × '+inr(bw.each):'Off'}</b><span class="small muted">${bw.ids.size?'to the most detailed answers so far':'turn on when planning a study'}</span></div>
  </section>`;
}
const _vLive6 = vLive;
vLive = function(s){ const h = _vLive6(s); const i = h.indexOf('<div class="row between"><div class="tabs">'); return i<0 ? h : h.slice(0,i)+qcCard(s)+h.slice(i); };

// ---------- Actions: close the loop with respondents ----------
const _rec6 = recCard;
recCard = function(s, r, N){
  const h = _rec6(s, r, N);
  if (r.status!=='done' || !rewardsOf(s).close_loop && !r.loop_closed_at) return h;
  const th = r.theme_id ? byId('Theme', r.theme_id) : null;
  const n = th && th.supporting_session_ids ? th.supporting_session_ids.length : sessionsOf(s.id).filter(x=>x.ended_at).length;
  const box = r.loop_closed_at
    ? `<div class="well small row" style="gap:8px;background:var(--ok-soft)">${ic('check').replace('<svg','<svg style="width:15px;color:var(--ok)"')}<span><b>${n} respondents told what changed</b> on ${new Date(r.loop_closed_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}. They're more likely to answer your next study.</span></div>`
    : `<div class="well row between" style="background:var(--gold-soft)"><span class="small"><b>Close the loop.</b> Tell the ${n} people who raised this that you shipped it.</span><button class="btn sm" data-act="close-loop" data-id="${r.id}" data-n="${n}">${ic('chat')}Send WhatsApp update</button></div>`;
  return h.replace(/<\/article>\s*$/, box+'</article>');
};

// ---------- Wallet label ----------
const _vWallet6 = vWallet;
vWallet = function(){ return _vWallet6().replace(/>insight_bonus</g, '>Insight bonus pool<'); };
