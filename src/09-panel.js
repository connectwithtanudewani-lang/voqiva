// =====================================================================
// v3 — Voqiva panel with audience segments
// AudienceSegment (seed), Person.attributes.{segments, source, joined_at, quality_score, studies_30d, ...},
// Study.recruitment_boost, WalletTransaction kind "recruitment_boost".
// =====================================================================
VIEWS.push('panel');
KNOWN_ATTRS.push('segment');
const SEGMENTS = [
  {key:'gen_z',name:'Gen Z',range:'18–26',desc:'Digital-first shoppers: students and first-jobbers who live on Instagram and quick-commerce.',rate:120,verify:'UPI + college email or LinkedIn',target:160},
  {key:'college_students',name:'College students',range:'18–24',desc:'Undergrad and postgrad students across engineering, commerce, design and medical colleges.',rate:100,verify:'College email (.ac.in / .edu) + UPI',target:140},
  {key:'working_professionals',name:'Working professionals',range:'24–40',desc:'Salaried people in tech, consulting, agencies, fintech, FMCG and healthcare.',rate:400,verify:'Sign in with LinkedIn + UPI',target:160},
  {key:'young_parents',name:'Young parents',range:'26–38',desc:'Parents with at least one child under 10. Heavy buyers of kids, food and home categories.',rate:250,verify:'Aadhaar (DigiLocker) + UPI',target:120},
  {key:'homemakers',name:'Homemakers',range:'25–50',desc:'Run the household budget: groceries, kitchen, personal care and home décor.',rate:200,verify:'Aadhaar (DigiLocker) + UPI',target:120},
  {key:'tier2_shoppers',name:'Tier 2–3 online shoppers',range:'20–45',desc:'Online shoppers in Indore, Jaipur, Lucknow, Nagpur, Coimbatore, Surat and other non-metros.',rate:150,verify:'UPI + phone',target:130},
  {key:'fitness',name:'Fitness & wellness enthusiasts',range:'20–40',desc:'Work out 3+ times a week. Buy protein, activewear, supplements and clean-label food.',rate:200,verify:'UPI + phone',target:120},
  {key:'smb_owners',name:'Small business owners',range:'28–55',desc:'Shop owners, D2C founders, cloud kitchens and independent professionals.',rate:600,verify:'GST / Udyam check + UPI',target:110},
  {key:'senior_leaders',name:'Senior leaders',range:'35–55',desc:'Director-level and above. Decision makers for B2B and premium purchases.',rate:1500,verify:'Sign in with LinkedIn (Director+)',target:110}
];
const SOURCE_LABEL = {seed:'Founding panel',instagram_ads:'Instagram ads',meta_ads:'Facebook & Instagram ads',linkedin_ads:'LinkedIn ads',campus_ambassador:'Campus ambassadors',referral:'Referrals',brand_circle:'Brand customer circles'};
const SOURCE_CPA = {instagram_ads:70,meta_ads:85,linkedin_ads:260,campus_ambassador:40,referral:50,brand_circle:0,seed:0};
const BOOST_CPA = 90;
const TIER2 = ['Indore','Jaipur','Lucknow','Nagpur','Coimbatore','Surat','Bhopal','Kochi','Chandigarh','Vizag'];
const CORP = ['Tech','Consulting','Agency','FinTech','FMCG','Healthcare','Retail'];
const segByKey = k => SEGMENTS.find(s=>s.key===k);
function segmentRate(keys){ keys=Array.isArray(keys)?keys:[keys]; const r=keys.map(k=>(segByKey(k)||{}).rate).filter(Boolean); return r.length?Math.max(...r):150; }
function segNames(keys){ return (Array.isArray(keys)?keys:[keys]).map(k=>(segByKey(k)||{name:k}).name).join(', '); }
function detectSegments(t){
  const m=[[/college|student|campus|undergrad/i,'college_students'],[/gen ?z|genz|zoomer/i,'gen_z'],[/working (men|women|professional|people)|professionals|office|corporate|salaried/i,'working_professionals'],
    [/parent|mom|mother|dad|father|kids/i,'young_parents'],[/homemaker|housewife|household/i,'homemakers'],[/tier.?2|tier.?3|non-metro|small town/i,'tier2_shoppers'],
    [/gym|fitness|workout|protein|athlet/i,'fitness'],[/small business|shop owner|kirana|msme|business owner|retailer/i,'smb_owners'],[/cxo|ceo|cto|cfo|director|vp |senior leader|decision maker/i,'senior_leaders']];
  return m.filter(([r])=>r.test(t||'')).map(x=>x[1]);
}
function assignSegments(p){
  const a = p.attributes = p.attributes||{}; const age = personAge(p)||0; const occ=(p.occupation||'').toLowerCase(); const s=[];
  if(age>=18&&age<=26) s.push('gen_z');
  if(occ.includes('student')&&age<=25) s.push('college_students');
  if(CORP.includes(a.industry)&&!occ.includes('student')&&age>=23&&age<=45&&a.seniority!=='director_plus'&&!a.business_owner) s.push('working_professionals');
  if((a.kids_under_10||0)>0&&age>=24&&age<=40) s.push('young_parents');
  if(occ==='homemaker') s.push('homemakers');
  if(TIER2.includes(p.city)) s.push('tier2_shoppers');
  if((a.workouts_per_week||0)>=3) s.push('fitness');
  if(a.business_owner) s.push('smb_owners');
  if(a.seniority==='director_plus') s.push('senior_leaders');
  a.segments = s; return s;
}
// person value for "segment" is the list of segments
const _pv = personValue;
personValue = function(p, attr){ return attr==='segment' ? (p.attributes? p.attributes.segments : undefined) : _pv(p, attr); };
const _cp = critPass;
critPass = function(p, c){
  if(c.attribute==='segment'){ const v=(p.attributes||{}).segments; if(!v) return true; const want=Array.isArray(cv2(c))?cv2(c):[cv2(c)]; return want.some(k=>v.includes(k)); }
  return _cp(p,c);
};
function cv2(c){ return c.value && typeof c.value==='object' && !Array.isArray(c.value) && 'v' in c.value ? c.value.v : c.value; }

const SEG_GEN = {
  college_students:R=>({age:18+Math.floor(R()*6),occ:pick(['B.Tech student, VIT Pune','B.Com student, Christ University','BBA student, Symbiosis Pune','Design student, NID Ahmedabad','MBBS student, KMC Manipal','B.Sc student, St. Xavier\'s Mumbai','Law student, NLSIU Bengaluru','MBA student, IIM Indore','B.A. student, Delhi University','Hotel management student, IHM Mumbai'],R),industry:'Student',attrs:{college_email_verified:true},src:['campus_ambassador','instagram_ads','referral']}),
  gen_z:R=>({age:21+Math.floor(R()*6),occ:pick(['Content creator','Associate at a fintech startup','Customer success executive at SaaS','Junior designer at an agency','Sales trainee at FMCG','Analyst at a Big 4 firm','Junior developer at IT services'],R),industry:pick(['Tech','Agency','FinTech','FMCG','Consulting'],R),src:['instagram_ads','referral','campus_ambassador']}),
  working_professionals:R=>{ const ind=pick(['Tech','Consulting','Agency','FinTech','FMCG','Healthcare'],R); return {age:24+Math.floor(R()*17),occ:pick(INDUSTRY_JOBS[ind],R),industry:ind,linkedin:true,src:['linkedin_ads','referral','brand_circle']}; },
  young_parents:R=>{ const ind=pick(['Tech','FMCG','Healthcare','Education','Retail'],R); return {age:27+Math.floor(R()*11),occ:pick(INDUSTRY_JOBS[ind].concat(['Homemaker']),R),industry:ind,attrs:{kids_under_10:1+Math.floor(R()*2)},aadhaar:true,src:['meta_ads','brand_circle','referral']}; },
  homemakers:R=>({age:25+Math.floor(R()*26),gender:R()<0.9?'female':'male',occ:'Homemaker',industry:null,attrs:{kids_under_10:R()<0.4?1:0},aadhaar:true,src:['meta_ads','brand_circle','referral']}),
  tier2_shoppers:R=>{ const ind=pick(['Retail','Education','FMCG','Tech','Healthcare'],R); return {age:20+Math.floor(R()*26),city:pick(TIER2,R),occ:pick(INDUSTRY_JOBS[ind],R),industry:ind,src:['meta_ads','referral','brand_circle']}; },
  fitness:R=>{ const ind=pick(['Tech','Consulting','FinTech','Healthcare'],R); return {age:20+Math.floor(R()*21),occ:pick(INDUSTRY_JOBS[ind].concat(['Fitness trainer','Physiotherapist']),R),industry:ind,attrs:{workouts_per_week:3+Math.floor(R()*4)},src:['instagram_ads','referral']}; },
  smb_owners:R=>({age:28+Math.floor(R()*28),occ:pick(['Owner, kirana store','Founder, D2C candle brand','Owner, garment shop','Chartered Accountant (own practice)','Owner, cloud kitchen','Owner, mobile accessories shop','Founder, home bakery','Owner, salon'],R),industry:'Retail',attrs:{business_owner:true,gst_verified:true},src:['meta_ads','referral','linkedin_ads']}),
  senior_leaders:R=>{ const ind=pick(['Tech','FMCG','FinTech','Consulting'],R); return {age:35+Math.floor(R()*21),occ:pick(['Director of Marketing at FMCG','VP Engineering at SaaS','CFO at an NBFC','Head of Growth at a D2C brand','Partner at a consulting firm','Director, Category at e-commerce','CTO at a fintech'],R),industry:ind,linkedin:true,attrs:{seniority:'director_plus'},src:['linkedin_ads','referral']}; }
};
function makePanelist(key, o){
  o = o||{}; const R = o.rng||RNG; const g = SEG_GEN[key](R); const now=Date.now(), D=86400000;
  const gender = o.gender || g.gender || (R()<0.52?'male':'female');
  const age = o.age!=null? o.age : g.age;
  const by = new Date(now).getFullYear()-age-1, bm=1+Math.floor(R()*12);
  const first = pick(PANEL_NAMES[gender==='other'?'female':gender],R);
  const src = o.source || pick(g.src,R);
  const attrs = Object.assign({industry:o.industry||g.industry,d2c_fashion_orders_60d:Math.floor(R()*5),quick_commerce_orders_30d:Math.floor(R()*12),skincare_buyer:R()<0.45,workouts_per_week:Math.floor(R()*3),
    source:src,joined_at:iso(o.joinedNow? now : now-(R()<0.18?R()*30:30+R()*330)*D),quality_score:60+Math.floor(R()*39),studies_30d:Math.floor(R()*3)}, g.attrs||{}, o.attrs||{});
  if(R()<0.05) attrs.quality_score = 40+Math.floor(R()*18);
  if(R()<0.05) attrs.studies_30d = 4;
  const T0 = iso(now-(5+R()*200)*D);
  const p = ins('Person',{cohort_import_id:null,full_name:first+' '+String.fromCharCode(65+Math.floor(R()*26)),phone:'+91 9'+String(Math.floor(R()*1e9)).padStart(9,'0'),gender,
    birth_date:`${by}-${String(bm).padStart(2,'0')}-${String(1+Math.floor(R()*27)).padStart(2,'0')}`,city:o.city||g.city||pick(CITIES.map(c=>c[0]),R),occupation:o.occupation||g.occ,attributes:attrs,
    upi_vpa:first.toLowerCase()+Math.floor(R()*900+100)+'@'+pick(['okaxis','ybl','paytm','okhdfcbank','oksbi'],R),
    aadhaar_verified_at:(g.aadhaar||R()<0.6)?T0:null, linkedin_verified_at:g.linkedin?T0:(R()<0.25?T0:null), upi_verified_at:T0});
  assignSegments(p);
  return p;
}
function seedPanel(){
  const now=Date.now(), D=86400000;
  rows('Person',p=>!p.cohort_import_id).forEach(p=>{
    const a=p.attributes; if(a.segments) return;
    a.workouts_per_week=Math.floor(RNG()*6); if(personAge(p)>27&&RNG()<0.35) a.kids_under_10=1+Math.floor(RNG()*2);
    a.source='seed'; a.joined_at=iso(now-(120+RNG()*400)*D); a.quality_score=62+Math.floor(RNG()*36); a.studies_30d=Math.floor(RNG()*3);
    assignSegments(p);
  });
  const count = k => rows('Person',p=>!p.cohort_import_id&&(p.attributes.segments||[]).includes(k)).length;
  SEGMENTS.forEach(sg=>{ let n=count(sg.key); while(n<sg.target){ makePanelist(sg.key); n++; } });
}
// panel quality gate: low-quality or over-used panelists are not invited
function panelEligible(p){ const a=p.attributes||{}; return (a.quality_score??80)>=60 && (a.studies_30d??0)<4; }
const _ab = audienceBase;
audienceBase = function(src){ return src.audience_source==='voqiva_panel'||!src.audience_source ? rows('Person',p=>!p.cohort_import_id&&panelEligible(p)) : _ab(src); };

// ---------- budget with recruitment boost ----------
const _sb = studyBudget;
studyBudget = function(s){ const b=_sb(s); b.boost = s.launched_at?0:(s.recruitment_boost||0)*BOOST_CPA; b.total += b.boost; return b; };
function genMatching(s){
  const crits = critRows(s.id);
  const seg = crits.find(c=>c.attribute==='segment'); const key = seg? (Array.isArray(seg.value)?seg.value[0]:seg.value) : 'gen_z';
  for(let i=0;i<8;i++){
    const o={source:segByKey(key)?pick(SEG_GEN[key](Math.random).src,Math.random):'meta_ads',joinedNow:true,rng:Math.random};
    crits.forEach(c=>{
      if(c.attribute==='gender'&&c.operator==='eq') o.gender=c.value;
      if(c.attribute==='age'&&c.operator==='between') o.age=c.value[0]+Math.floor(Math.random()*(c.value[1]-c.value[0]+1));
      if(c.attribute==='industry'&&c.operator==='in'){ o.industry=pick(c.value,Math.random); if(INDUSTRY_JOBS[o.industry]) o.occupation=pick(INDUSTRY_JOBS[o.industry],Math.random); }
      if(['d2c_fashion_orders_60d','quick_commerce_orders_30d'].includes(c.attribute)) (o.attrs=o.attrs||{})[c.attribute]=Number(c.value)+1;
    });
    const cities = crits.filter(c=>c.attribute==='city'); if(cities.length) o.city = pick(cities.map(c=>c.value),Math.random);
    const p = makePanelist(key,o); p.attributes.quality_score=Math.max(70,p.attributes.quality_score); p.attributes.studies_30d=0;
    if(matchesAll(p,crits)) return p;
    delWhere('Person',x=>x.id===p.id);
  }
  return null;
}
function launchStudy(s){
  const boost = s.recruitment_boost||0;
  if(boost>0){
    let made=0; for(let i=0;i<boost;i++){ if(genMatching(s)) made++; }
    ins('WalletTransaction',{workspace_id:s.workspace_id,study_id:s.id,kind:'recruitment_boost',amount_inr:-boost*BOOST_CPA,created_at:iso(Date.now())});
    upd('Study',s.id,{recruitment_boost:0});
  }
  return launchStudyCore(s);
}

// ---------- UI pieces ----------
function ndSegments(){ const nd=ui.nd; return nd.segTouched? (nd.segments||[]) : detectSegments(nd.objective); }
function renderSegChips(){
  const el = document.getElementById('nd-seg'); if(!el || !ui.nd) return;
  const on = ndSegments();
  const panel = rows('Person',p=>!p.cohort_import_id&&panelEligible(p));
  el.innerHTML = `<span class="eyebrow">Pick an audience${on.length&&!ui.nd.segTouched?' · detected from your question':''}</span>
    <div class="row" style="gap:6px">${SEGMENTS.map(sg=>{ const n=panel.filter(p=>(p.attributes.segments||[]).includes(sg.key)).length; const sel=on.includes(sg.key);
      return `<button class="chip ${sel?'':'plain'}" data-act="seg-toggle" data-k="${sg.key}" aria-pressed="${sel}">${sel?ic('check').replace('<svg','<svg style="width:13px"'):''}${esc(sg.name)} <span class="faint num">${n}</span></button>`; }).join('')}</div>
    ${on.length?`<span class="small muted">${esc(segNames(on))}: <b class="num" style="color:var(--fg)">${inr(segmentRate(on))}</b> per response. ${on.length>1?'People in any of these audiences qualify.':''}</span>`:'<span class="small muted">No audience picked: everyone in the panel who matches your rules qualifies.</span>'}`;
}
function audienceRateHint(s,b){
  const seg = criteriaOf(s.id).find(c=>c.attribute==='segment'); if(!seg || s.audience_source!=='voqiva_panel') return '';
  const keys = cv(seg); const rate = segmentRate(keys);
  return rate===s.incentive_inr ? `<div class="small muted">Audience rate for ${esc(segNames(keys))}: ${inr(rate)} per response</div>`
    : `<div class="well small row between" style="padding:8px 12px"><span>Suggested for ${esc(segNames(keys))}: <b>${inr(rate)}</b> per response</span><button class="btn sm" data-act="apply-rate" data-id="${s.id}" data-r="${rate}">Use ${inr(rate)}</button></div>`;
}
function boostLine(b,s){ return b.boost? `<div class="row between"><div><b>Recruitment boost</b><div class="small muted num">${s.recruitment_boost} new verified people via targeted ads × ${inr(BOOST_CPA)}</div></div><b class="num">${inr(b.boost)}</b></div>` : ''; }
function boostCard(s,f){
  if(s.audience_source!=='voqiva_panel') return '';
  const need = Math.max(0,(s.sample_size||0)-f.match);
  if(s.recruitment_boost) return `<div class="well row between" style="background:var(--ok-soft)"><div><b>Recruitment boost on</b><div class="small">Voqiva will run targeted ads to recruit ${s.recruitment_boost} new people who match, verify them, then invite them on WhatsApp.</div></div><button class="btn sm" data-act="boost" data-id="${s.id}" data-n="0">Remove</button></div>`;
  if(!need) return '';
  return `<div class="well row between" style="background:var(--warn-soft)"><div><b style="color:var(--warn)">Only ${f.match} of the ${s.sample_size} people you need match today</b><div class="small">Boost recruitment: targeted Instagram, Facebook or LinkedIn ads bring in ${need} more matching people (est. ${inr(BOOST_CPA)} per verified signup).</div></div><button class="btn sm primary" data-act="boost" data-id="${s.id}" data-n="${need}">Boost +${need} (${inr(need*BOOST_CPA)})</button></div>`;
}

function vPanel(){
  const all = rows('Person',p=>!p.cohort_import_id);
  const elig = all.filter(panelEligible);
  const recent = all.filter(p=>daysSince(p.attributes.joined_at)<=30).length;
  const avgQ = Math.round(all.reduce((a,p)=>a+(p.attributes.quality_score||80),0)/all.length);
  const seg = ui.panelSeg || 'all';
  const list = seg==='all'? all : all.filter(p=>(p.attributes.segments||[]).includes(seg));
  const shown = list.slice(0, ui.showPeople);
  const bySrc = {}; all.forEach(p=>{ const k=p.attributes.source||'seed'; (bySrc[k]=bySrc[k]||{n:0,li:0,aad:0,last30:0}); bySrc[k].n++; if(p.linkedin_verified_at) bySrc[k].li++; if(p.aadhaar_verified_at) bySrc[k].aad++; if(daysSince(p.attributes.joined_at)<=30) bySrc[k].last30++; });
  const maxSrc = Math.max(...Object.values(bySrc).map(x=>x.n));
  return `<section class="row between" style="align-items:flex-end"><div class="stack" style="gap:4px"><h1>Voqiva panel</h1><p class="muted" style="max-width:72ch">Verified people who signed up to take part in research, grouped into ready-made audiences. Use them for new concepts and category research with people who haven't bought from you yet.</p></div><span class="pill acc">Voqiva team view</span></section>
  <section class="grid g4">
    <div class="card kpi stack"><span class="eyebrow">Verified panelists</span><div class="big num">${all.length.toLocaleString('en-IN')}</div><span class="small muted">${elig.length.toLocaleString('en-IN')} available for new studies</span></div>
    <div class="card kpi stack"><span class="eyebrow">Joined in 30 days</span><div class="big num">${recent}</div><span class="small muted">from ads, campus and referrals</span></div>
    <div class="card kpi stack"><span class="eyebrow">Avg. quality score</span><div class="big num">${avgQ}<small>/ 100</small></div><span class="small muted">completion rate and answer depth</span></div>
    <div class="card kpi stack"><span class="eyebrow">Rested or removed</span><div class="big num">${all.length-elig.length}</div><span class="small muted">quality below 60, or 4 studies this month</span></div>
  </section>
  <section class="stack"><h2>Audiences</h2>
    <div class="grid g3">${SEGMENTS.map(sg=>{ const m=all.filter(p=>(p.attributes.segments||[]).includes(sg.key)); const av=m.filter(panelEligible).length; const sc={}; m.forEach(p=>sc[p.attributes.source]=(sc[p.attributes.source]||0)+1); const top=Object.entries(sc).sort((a,b)=>b[1]-a[1]).slice(0,2);
      return `<article class="card stack" style="gap:10px"><div class="row between"><b style="font-family:var(--display);font-size:19px">${esc(sg.name)}</b><span class="pill">${sg.range}</span></div>
        <p class="small muted">${esc(sg.desc)}</p>
        <div class="row" style="gap:16px;align-items:baseline"><span class="num" style="font-family:var(--display);font-size:32px;font-weight:600">${m.length}</span><span class="small muted">${av} available · ${inr(sg.rate)} per response</span></div>
        <div class="small"><span class="pill ok">${ic('shield').replace('<svg','<svg style="width:12px"')}${esc(sg.verify)}</span></div>
        <div class="small muted">Mostly from ${top.map(([k,n])=>esc(SOURCE_LABEL[k]||k)+' ('+n+')').join(', ')}</div>
        <div class="row"><button class="btn sm accent" data-act="seg-study" data-k="${sg.key}">Start a study</button><button class="btn sm" data-act="panel-seg" data-k="${sg.key}">See people</button></div></article>`; }).join('')}</div></section>
  <section class="grid g2" style="align-items:start">
    <div class="card stack"><h3>Where panelists come from</h3><p class="small muted">Every signup is opt-in. No scraped emails or LinkedIn messages.</p>
      ${Object.entries(bySrc).sort((a,b)=>b[1].n-a[1].n).map(([k,v])=>`<div class="stack" style="gap:4px"><div class="row between small"><b>${esc(SOURCE_LABEL[k]||k)}</b><span class="num">${v.n} · +${v.last30} this month${SOURCE_CPA[k]?' · ~'+inr(SOURCE_CPA[k])+' per signup':''}</span></div><div class="bar"><i style="width:${v.n/maxSrc*100}%"></i></div></div>`).join('')}
      <p class="small faint">Cost per signup figures are planning estimates, not measured.</p></div>
    <form class="card stack" data-submit="panel-grow"><h3>Grow an audience</h3><p class="small muted">Launch a recruitment campaign. New people verify, fill their profile, then join the audience. Simulated in this prototype.</p>
      <div><label class="lbl" for="pg-seg">Audience</label><select class="field" id="pg-seg">${SEGMENTS.map(s=>`<option value="${s.key}">${esc(s.name)} (${s.range})</option>`).join('')}</select></div>
      <div class="grid g2" style="gap:10px"><div><label class="lbl" for="pg-src">Channel</label><select class="field" id="pg-src">${['instagram_ads','meta_ads','linkedin_ads','campus_ambassador','referral'].map(k=>`<option value="${k}">${SOURCE_LABEL[k]}</option>`).join('')}</select></div>
        <div><label class="lbl" for="pg-n">New signups</label><input class="field num" id="pg-n" type="number" min="5" max="200" value="25"></div></div>
      <button class="btn primary" type="submit" style="align-self:flex-start">${ic('plus')}Run campaign</button></form>
  </section>
  <div class="row between"><div class="tabs"><button class="${seg==='all'?'on':''}" data-act="panel-seg" data-k="all">Everyone (${all.length})</button>${SEGMENTS.map(s=>`<button class="${seg===s.key?'on':''}" data-act="panel-seg" data-k="${s.key}">${esc(s.name)}</button>`).join('')}</div></div>
  <section class="card"><div class="table-wrap"><table><thead><tr><th>Name</th><th>Age</th><th>City</th><th>Occupation</th><th>Audiences</th><th>Verification</th><th style="text-align:right">Quality</th><th>Joined via</th></tr></thead><tbody>
    ${shown.map(p=>{ const a=p.attributes; return `<tr><td><b>${esc(p.full_name)}</b></td><td class="num">${personAge(p)??'—'}</td><td>${esc(p.city||'—')}</td><td class="small">${esc(p.occupation||'—')}</td>
      <td><div class="row" style="gap:4px">${(a.segments||[]).map(k=>`<span class="pill acc" style="font-size:11px">${esc((segByKey(k)||{name:k}).name)}</span>`).join('')||'<span class="faint small">—</span>'}</div></td>
      <td><div class="row" style="gap:4px">${p.upi_verified_at?'<span class="pill ok">UPI</span>':''}${p.aadhaar_verified_at?'<span class="pill ok">Aadhaar</span>':''}${p.linkedin_verified_at?'<span class="pill ok">LinkedIn</span>':''}${a.college_email_verified?'<span class="pill ok">College email</span>':''}${a.gst_verified?'<span class="pill ok">GST</span>':''}</div></td>
      <td class="num" style="text-align:right;${(a.quality_score||80)<60?'color:var(--bad)':''}">${a.quality_score??'—'}${(a.studies_30d||0)>=4?' <span class="pill warn" style="font-size:11px">resting</span>':''}</td><td class="small">${esc(SOURCE_LABEL[a.source]||'—')}</td></tr>`; }).join('')}</tbody></table></div>
    ${list.length>shown.length?`<button class="btn" style="margin-top:12px" data-act="more-people">Show more (${list.length-shown.length} left)</button>`:''}</section>`;
}
