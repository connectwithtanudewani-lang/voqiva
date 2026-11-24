// =====================================================================
// v2 — purchase-verified customer truth
// New entities: Order, Consent, Trigger, Outcome. Theme gains supporting_session_ids.
// Study.methodology gains "whatsapp_voice".
// =====================================================================
TABLES.push('Order','Consent','Trigger','Outcome');
VIEWS.push('always');

const daysSince = ts => (Date.now()-T(ts))/86400000;
function ordersOf(pid){ return rows('Order',o=>o.person_id===pid).sort((a,b)=>T(a.placed_at)-T(b.placed_at)); }
function buyerStats(pid){
  const os = ordersOf(pid); if(!os.length) return null;
  const total = os.reduce((a,o)=>a+o.value_inr,0);
  return {n:os.length,last:os[os.length-1],first:os[0],aov:Math.round(total/os.length),
    ltv:os.filter(o=>o.status==='delivered').reduce((a,o)=>a+o.value_inr,0),returns:os.filter(o=>o.status!=='delivered').length};
}
const ordinal = n => n+(n%10===1&&n%100!==11?'st':n%10===2&&n%100!==12?'nd':n%10===3&&n%100!==13?'rd':'th');
function purchaseBadge(pid){
  const b = buyerStats(pid);
  if(!b){ const p=byId('Person',pid); return p&&p.cohort_import_id? `<span class="pill">Your customer</span>` : `<span class="pill" title="Voqiva panelist, not a buyer">Panelist</span>`; }
  const d = new Date(b.last.placed_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'});
  const st = b.last.status==='delivered' ? '' : b.last.status==='returned' ? ' · returned' : ' · RTO';
  return `<span class="pill buy" title="Matched to a real order">${ic('check')}Bought ${d} · ${inr(b.last.value_inr)} · ${ordinal(b.n)} order${st}</span>`;
}
function circle(wsId){ return rows('Consent',c=>c.workspace_id===wsId&&!c.withdrawn_at); }
function consentOf(pid){ return rows('Consent',c=>c.person_id===pid).sort((a,b)=>T(b.granted_at)-T(a.granted_at))[0]; }

// audience: own customers count only if they opted in (DPDP consent on record)
function audienceBase(src){
  if(src.audience_source==='cohort_import'){
    const ids = new Set(circle(src.workspace_id||ui.ws).map(c=>c.person_id));
    return rows('Person',p=>(src.cohort_import_id? p.cohort_import_id===src.cohort_import_id : !!p.cohort_import_id) && ids.has(p.id));
  }
  if(src.audience_source==='parent_study'){ const ids=new Set(completedOf(src.parent_study_id).map(s=>s.person_id)); return rows('Person',p=>ids.has(p.id)); }
  return rows('Person',p=>!p.cohort_import_id);
}

// ---------- free tier & pricing ----------
const FREE_QUOTA = 10;
const PLANS = [
  {k:'free',name:'Starter',price:'Free',line:'10 interviews a month with your own customers. Synthesis and payout fees waived. You only fund the incentives.'},
  {k:'payg',name:'Pay as you go',price:'₹2,000 per study',line:'Any size, own customers or the Voqiva panel. AI synthesis ₹1,500 + payouts ₹500, plus incentives.'},
  {k:'always',name:'Always-on',price:'₹14,999 / month',line:'Unlimited triggers, weekly conversations with churned, returning and new buyers, outcome tracking. Incentives extra.'}
];
function monthStart(){ const d=new Date(); return new Date(d.getFullYear(),d.getMonth(),1).getTime(); }
function freeUsed(wsId){
  return rows('Study',s=>s.workspace_id===wsId && s.launched_at && T(s.launched_at)>=monthStart() && s.audience_source!=='voqiva_panel' && !isTriggerStudy(s)
    && !rows('WalletTransaction',t=>t.study_id===s.id&&t.kind==='synthesis_fee').length).reduce((a,s)=>a+(s.sample_size||0),0);
}
function freeLeft(wsId){ return Math.max(0,FREE_QUOTA-freeUsed(wsId)); }
function studyBudget(s){
  const n=s.sample_size||0, inc=s.incentive_inr||0, incent=n*inc;
  const free = !s.launched_at && s.audience_source!=='voqiva_panel' && n<=freeLeft(s.workspace_id);
  const syn = free?0:feeOf('synthesis_fee'), dis = free?0:feeOf('disbursement_fee');
  return {n,inc,incent,syn,dis,total:incent+syn+dis,free};
}
function feeCell(v, kind, free){ return free? `<span class="num"><s class="faint">${inr(feeOf(kind))}</s> <b style="color:var(--ok)">Free</b></span>` : `<b class="num">${inr(v)}</b>`; }
function launchStudyCore(s){
  const b = studyBudget(s);
  const f = feasibility(s, critRows(s.id));
  const cands = f.people.slice().sort(()=>Math.random()-.5);
  const already = new Set(sessionsOf(s.id).map(x=>x.person_id));
  let q=0;
  for(const p of cands){
    if(q>=s.sample_size) break;
    if(already.has(p.id)) continue;
    const fraud = s.audience_source==='voqiva_panel' && !p.upi_verified_at && !p.aadhaar_verified_at;
    ins('Session',{study_id:s.id,person_id:p.id,screen_result:fraud?'fraud':'qualified',started_at:null,ended_at:null,recording_url:null,sentiment:null,summary:null,payout_status:null,payout_ref:null});
    if(!fraud) q++;
  }
  upd('Study',s.id,{launched_at:iso(Date.now())});
  const t = s.launched_at;
  ins('WalletTransaction',{workspace_id:s.workspace_id,study_id:s.id,kind:'incentive_reserve',amount_inr:-b.incent,created_at:t});
  if(b.syn) ins('WalletTransaction',{workspace_id:s.workspace_id,study_id:s.id,kind:'synthesis_fee',amount_inr:-b.syn,created_at:t});
  if(b.dis) ins('WalletTransaction',{workspace_id:s.workspace_id,study_id:s.id,kind:'disbursement_fee',amount_inr:-b.dis,created_at:t});
  save();
  return q;
}

// ---------- always-on triggers ----------
const TRIGGER_EVENTS = {
  no_reorder_45d:{label:'No reorder in 45 days',desc:'One-time buyers whose order was delivered 45+ days ago and who haven\'t come back.',
    rule:b=>b&&b.n===1&&b.last.status==='delivered'&&daysSince(b.last.placed_at)>=45,
    objective:'Find out why one-time buyers have not reordered within 45 days, what their experience was after delivery, and what would bring them back.',
    qs:[['screener','Recent order','You ordered from us a while back. How has the product been working for you?','voice','Usage and satisfaction since delivery.',null],
        ['interview','Why no reorder','What stopped you from ordering again?','voice','The real reason: price, results, forgot, switched brand.',null],
        ['interview','Win-back','What would make you order again in the next month?','choice','Rank win-back levers.',{options:['A reminder when I run out','A smaller refill pack','Proof it works','A better price','Nothing, I\'ve moved on'],multi:true}]]},
  return_or_rto:{label:'Returned or refused delivery (RTO)',desc:'Buyers whose latest order came back to you as a return or RTO.',
    rule:b=>b&&b.returns>0&&b.last.status!=='delivered',
    objective:'Understand why customers return orders or refuse delivery (RTO): what they expected, what was different, and what would have made them keep it.',
    qs:[['screener','What happened','You returned (or didn\'t accept) your recent order. What happened?','voice','The trigger moment for the return or RTO.',null],
        ['interview','Expectation gap','What did you expect when you ordered, and what was different when it arrived?','voice','Size, colour, fabric, delivery time.',null],
        ['interview','Keep it','What would have made you keep it?','choice','Rank fixes.',{options:['Better size guidance','Clearer fabric photos','Exchange instead of return','Faster delivery','Nothing, it wasn\'t for me'],multi:true}],
        ['interview','Second chance','Would you order from us again? Why or why not?','voice','Recoverability of the customer.',null]]},
  first_purchase:{label:'First purchase in the last 14 days',desc:'New buyers, interviewed while the experience is fresh.',
    rule:b=>b&&b.n===1&&daysSince(b.last.placed_at)<=14,
    objective:'Understand why new customers chose us for their first order, what nearly stopped them, and how the first days with the product have gone.',
    qs:[['screener','Discovery','How did you first hear about us, and what made you place the order?','voice','Channel and the convincing moment.',null],
        ['interview','Hesitation','What almost stopped you from buying?','voice','Checkout, trust, price, delivery doubts.',null],
        ['interview','First impression','How did it feel when the parcel arrived and you first used it?','voice','Unboxing and first-use delight or doubt.',null]]},
  loyal_3plus:{label:'Loyal buyers (3+ orders)',desc:'Your best customers. Learn what to protect and what to build next.',
    rule:b=>b&&b.n>=3,
    objective:'Learn why our most loyal customers keep buying, what they would miss if we disappeared, and what they want us to make next.',
    qs:[['screener','Why us','What keeps you coming back to us instead of other brands?','voice','The real loyalty driver.',null],
        ['interview','What to build','If we launched one new product next month, what should it be?','voice','Unmet needs from heavy users.',null],
        ['interview','Advocacy','Have you recommended us to anyone? What did you say?','voice','Word-of-mouth language.',null]]}
};
function isTriggerStudy(s){ return !!(s && one('Trigger',t=>t.study_id===s.id)); }
function eligibleFor(tr){
  const ids = new Set(circle(tr.workspace_id).map(c=>c.person_id));
  const done = new Set(sessionsOf(tr.study_id).map(x=>x.person_id));
  return rows('Person',p=>p.cohort_import_id && ids.has(p.id) && !done.has(p.id) && TRIGGER_EVENTS[tr.event].rule(buyerStats(p.id)));
}
function createTrigger(wsId, userId, event, cap){
  const E = TRIGGER_EVENTS[event]; const now=iso(Date.now());
  const s = ins('Study',{workspace_id:wsId,created_by:userId,parent_study_id:null,cohort_import_id:null,audience_source:'cohort_import',objective:E.objective,title:'Always-on: '+E.label,
    domain:'Customer lifecycle',methodology:'whatsapp_voice',sample_size:0,incentive_inr:150,reward_type:'upi_cash',language:'english',max_duration_min:6,
    launched_at:null,closed_at:null,synthesized_at:null,headline:null,summary:null,confidence_pct:null,share_token:null,created_at:now,updated_at:now});
  addQs(s,E.qs);
  return ins('Trigger',{workspace_id:wsId,study_id:s.id,event,weekly_cap:cap,active:true,created_at:now,last_run_at:null});
}
function runTriggerBatch(tr){
  const s = byId('Study',tr.study_id);
  const el = eligibleFor(tr).sort(()=>Math.random()-.5).slice(0,tr.weekly_cap);
  if(!el.length){ toast('No new eligible customers right now. The trigger will pick up the next ones.'); return; }
  const cost = el.length*(s.incentive_inr||0);
  if(walletBalance(tr.workspace_id)<cost){ toast('Top up '+inr(cost)+' to fund this week\'s incentives.'); return; }
  el.forEach(p=>ins('Session',{study_id:s.id,person_id:p.id,screen_result:'qualified',started_at:null,ended_at:null,recording_url:null,sentiment:null,summary:null,payout_status:null,payout_ref:null}));
  const now = iso(Date.now());
  upd('Study',s.id,{sample_size:(s.sample_size||0)+el.length,launched_at:s.launched_at||now});
  ins('WalletTransaction',{workspace_id:tr.workspace_id,study_id:s.id,kind:'incentive_reserve',amount_inr:-cost,created_at:now});
  upd('Trigger',tr.id,{last_run_at:now});
  save(); go('live-'+s.id);
  toast(`${el.length} customers invited on WhatsApp. Interviews are starting.`);
  runFieldwork(s.id);
}

// ---------- outcomes ----------
const OUTCOME_METRICS = {
  repeat_rate:{label:'Repeat purchase rate',unit:'pct',better:'up'},
  return_rate:{label:'Return + RTO rate',unit:'pct',better:'down'},
  aov:{label:'Average order value',unit:'inr',better:'up'},
  conversion_rate:{label:'Store conversion rate',unit:'pct',better:'up'}
};
function storeMetric(wsId, metric){
  const os = rows('Order',o=>o.workspace_id===wsId); if(!os.length) return null;
  if(metric==='aov') return Math.round(os.reduce((a,o)=>a+o.value_inr,0)/os.length);
  if(metric==='return_rate') return Math.round(os.filter(o=>o.status!=='delivered').length/os.length*1000)/10;
  if(metric==='repeat_rate'){ const by={}; os.forEach(o=>by[o.person_id]=(by[o.person_id]||0)+1); const n=Object.keys(by).length; return Math.round(Object.values(by).filter(x=>x>=2).length/n*1000)/10; }
  return null;
}
function fmtOutcome(metric,v){ return v==null?'—':OUTCOME_METRICS[metric].unit==='inr'?inr(v):pct(v); }
function outcomeVerdict(o){
  if(o.current_value==null) return null;
  const rel = (o.current_value-o.baseline_value)/Math.max(0.0001,Math.abs(o.baseline_value));
  const good = OUTCOME_METRICS[o.metric].better==='up'? rel : -rel;
  return good>=0.05?{k:'ok',t:'Worked'}:good<=-0.05?{k:'bad',t:'Got worse'}:{k:'',t:'No clear change'};
}

// ---------- said vs did ----------
function saidVsDid(s){
  const done = completedOf(s.id);
  const buyers = done.filter(x=>buyerStats(x.person_id));
  if(buyers.length<3 || buyers.length<done.length*0.5) return null;
  const stats = list=>{ const bs=list.map(x=>buyerStats(x.person_id)).filter(Boolean); if(!bs.length) return null;
    const ord=bs.reduce((a,b)=>a+b.n,0);
    return {n:bs.length,repeat:bs.filter(b=>b.n>=2).length/bs.length*100,aov:bs.reduce((a,b)=>a+b.aov,0)/bs.length,ret:bs.reduce((a,b)=>a+b.returns,0)/ord*100}; };
  return rows('Theme',t=>t.study_id===s.id).sort((a,b)=>a.position-b.position).map(t=>{
    const sup = new Set(t.supporting_session_ids||[]);
    return {t, yes:stats(buyers.filter(x=>sup.has(x.id))), no:stats(buyers.filter(x=>!sup.has(x.id)))};
  }).filter(r=>r.yes&&r.no);
}
function saidVsDidCard(s){
  const rowsSD = saidVsDid(s);
  const done = completedOf(s.id);
  if(!rowsSD){
    if(!done.length) return '';
    return `<section class="card tint banner"><div class="avatar" style="width:44px;height:44px;background:var(--surface)">${ic('link')}</div><div><b>No purchase data on these respondents</b><p class="small muted">This study used the Voqiva panel, which suits new-concept and category research. Run it with your own customers to see what people said next to what they actually bought.</p></div></section>`;
  }
  const best = rowsSD.map(r=>({r,gap:Math.abs(r.yes.ret-r.no.ret)})).sort((a,b)=>b.gap-a.gap)[0];
  const cell=(a,b,fmt,lowerBetter)=>{ const d=a-b; const bad = lowerBetter? d>2 : d<-2; const good = lowerBetter? d<-2 : d>2; return `<td class="num" style="text-align:right;${bad?'color:var(--bad);font-weight:600':good?'color:var(--ok);font-weight:600':''}">${fmt(a)}</td><td class="num muted" style="text-align:right">${fmt(b)}</td>`; };
  return `<section class="card stack">
    <div class="row between"><div><h3>What they said vs what they did</h3><p class="small muted">Each theme's supporters compared with the other respondents, using their real order history.</p></div><span class="pill buy">${ic('check')}${done.filter(x=>buyerStats(x.person_id)).length}/${done.length} purchase-verified</span></div>
    ${best && best.gap>=3?`<div class="well small"><b>Biggest gap:</b> people in “${esc(best.r.t.name)}” return or refuse ${pct(best.r.yes.ret)} of orders vs ${pct(best.r.no.ret)} for everyone else.</div>`:''}
    <div class="table-wrap"><table><thead><tr><th>Theme</th><th style="text-align:right">People</th><th style="text-align:right">Return / RTO</th><th style="text-align:right">Others</th><th style="text-align:right">Avg order</th><th style="text-align:right">Others</th><th style="text-align:right">Repeat</th><th style="text-align:right">Others</th></tr></thead><tbody>
    ${rowsSD.map(r=>`<tr><td><b>${esc(r.t.name)}</b><div class="small muted">${CAT_LABEL[r.t.category]}</div></td><td class="num" style="text-align:right">${r.yes.n}</td>${cell(r.yes.ret,r.no.ret,pct,true)}${cell(r.yes.aov,r.no.aov,inr,false)}${cell(r.yes.repeat,r.no.repeat,pct,false)}</tr>`).join('')}
    </tbody></table></div></section>`;
}

// ---------- extra script for the seeded always-on returns study ----------
SCRIPTS.returns = {
  signalMap:{size_mismatch:['Size chart mismatch','critical'],no_exchange:['Wants exchange, not refund','negative'],colour_mismatch:['Colour differs from photos','negative'],
    slow_delivery:['Slow delivery','negative'],rto_missed:['Missed delivery, no reschedule','negative'],fabric_feel:['Stiff fabric at first','negative'],fabric_love:['Likes the fabric','positive']},
  pools:{
    1:[{t:'The kurta was a size too small even though I followed the chart. I asked for an exchange but only a refund was available.',tags:['size_mismatch','no_exchange'],s:-1},
       {t:'I was travelling and couldn\'t take the delivery. Nobody called to reschedule, it just went back.',tags:['rto_missed'],s:-1},
       {t:'The colour looked much brighter on Instagram. In person it was dull.',tags:['colour_mismatch'],s:-1},
       {t:'It was a COD order and it took nine days. By then I had already bought something else.',tags:['slow_delivery'],s:-1},
       {t:'Fit was loose at the shoulders. The fabric was lovely though.',tags:['size_mismatch','fabric_love'],s:0}],
    2:[{t:'I expected handloom khadi to be soft like in the video. It was stiff until two washes.',tags:['fabric_feel'],s:-1},
       {t:'I expected a regular fit and got something boxy. The chart says M but it fits like an L.',tags:['size_mismatch'],s:-1},
       {t:'The photos are in studio light. The real shade is much more muted.',tags:['colour_mismatch'],s:-1},
       {t:'Honestly the product was fine, it just took too long to arrive.',tags:['slow_delivery'],s:0},
       {t:'Exactly what I expected, just the size was off. I loved the weave.',tags:['size_mismatch','fabric_love'],s:0}],
    3:[{v:['Better size guidance'],t:'Better size guidance.',tags:['size_mismatch'],s:0},
       {v:['Exchange instead of return'],t:'Just let me exchange it.',tags:['no_exchange'],s:0},
       {v:['Clearer fabric photos'],t:'Real photos of the colour.',tags:['colour_mismatch'],s:0},
       {v:['Faster delivery'],t:'Faster delivery.',tags:['slow_delivery'],s:0},
       {v:['Better size guidance','Exchange instead of return'],t:'Size help and an exchange option.',tags:['size_mismatch','no_exchange'],s:0}],
    4:[{t:'Yes, if I can exchange easily. I liked the fabric a lot.',tags:['fabric_love','no_exchange'],s:1},
       {t:'Maybe. I\'d read reviews about sizing first.',tags:['size_mismatch'],s:0},
       {t:'Probably not. Too much hassle for an ₹1,800 kurta.',tags:[],s:-1},
       {t:'Yes, I\'ll reorder in a darker colour.',tags:['fabric_love'],s:1},
       {t:'Only with prepaid and a delivery date I can trust.',tags:['slow_delivery'],s:0}]
  },
  themes:[
    {tags:['size_mismatch'],category:'friction',name:'Size Chart Gap',headline:'Most returns start with a size chart that doesn\'t match the fit',body:'Buyers follow the chart and still get the wrong size. The boxy cut runs a size large in some styles and small in others.',metric:'Got the wrong size'},
    {tags:['no_exchange'],category:'unmet_need',name:'Exchange, Not Refund',headline:'Returners wanted to swap sizes, not get their money back',body:'Refund-only returns turn a fixable size problem into a lost customer.',metric:'Wanted an exchange'},
    {tags:['colour_mismatch'],category:'friction',name:'Photo vs Reality',headline:'Studio photos oversell the colour',body:'Shades look brighter online than in hand, which reads as a quality problem.',metric:'Colour looked different'},
    {tags:['fabric_love'],category:'buying_driver',name:'Fabric Earns a Second Chance',headline:'They like the fabric enough to try again',body:'Even returners praise the weave. Fix size and exchange, and many would reorder.',metric:'Would try again for the fabric'}
  ],
  headline:'Returns are a sizing and exchange problem, not a product problem: buyers like the fabric but can\'t swap sizes.',
  summary:'Most returns trace back to a size chart that doesn\'t match the cut, and a refund-only policy that turns a swap into a lost customer.',
  recs:[
    {workstream:'product',theme:0,title:'Rebuild the size chart with garment measurements and a fit note per style',impact:'high',effort:'low',track:'This sprint',owner_team:'Product & Catalogue',body_md:'- **Garment measurements,** not body measurements, for every style.\n- **Fit note:** "runs a size large, size down" on boxy cuts.'},
    {workstream:'product',theme:1,title:'Offer one-tap size exchange before refund',impact:'high',effort:'medium',track:'Returns flow',owner_team:'CX & Ops',body_md:'- **Exchange first:** default the return flow to a size swap with free reverse pickup.\n- **Refund second:** keep refund available, one tap away.'},
    {workstream:'gtm',theme:2,title:'Shoot listings in daylight with a true-colour swatch',impact:'medium',effort:'low',track:'Catalogue refresh',owner_team:'Brand',body_md:'- **Daylight photos** for every colourway.\n- **Swatch card** in the first image.'},
    {workstream:'research',theme:0,title:'Test a fit-finder quiz with recent returners',impact:'medium',effort:'low',owner_team:'Research',body_md:'Test whether a 3-question fit-finder quiz would have prevented the wrong-size orders, with customers who returned for sizing in the last 30 days.'}
  ]
};

// ---------- seed additions ----------
function seedV2(ws, u, x){
  const now = Date.now(), D=86400000;
  const mkOrder = (p,daysAgo,value,status)=>ins('Order',{workspace_id:ws.id,person_id:p.id,placed_at:iso(now-daysAgo*D),value_inr:value,status,source_ref:'#UK'+(10000+Math.floor(RNG()*89999))});
  const consent = (p,src,daysAgo)=>ins('Consent',{workspace_id:ws.id,person_id:p.id,channel:'whatsapp',purpose:'research',source:src,granted_at:iso(now-daysAgo*D),withdrawn_at:null});
  // skincare cohort: one order each; tingling/breakout respondents returned more often
  const skin = rows('Person',p=>p.cohort_import_id===x.ciB.id);
  const scared = new Set(rows('Session',s=>s.study_id===x.sB.id).filter(s=>rows('Signal',g=>g.session_id===s.id&&['Tingling scare','Breakout'].includes(g.label)).length).map(s=>s.person_id));
  const askedSkin = new Set(rows('Session',s=>s.study_id===x.sB.id).map(s=>s.person_id));
  skin.forEach(p=>{
    const r = RNG(); const st = scared.has(p.id) ? (r<0.45?'returned':'delivered') : (r<0.08?'returned':r<0.12?'rto':'delivered');
    mkOrder(p, 50+Math.floor(RNG()*60), 699+Math.round(RNG()*9)*100, st);
    if(askedSkin.has(p.id) || RNG()<0.7) consent(p,'checkout_optin',50+Math.floor(RNG()*10));
  });
  // khadi high-LTV: 3-7 orders over a year
  const khadi = rows('Person',p=>p.cohort_import_id===x.ciD.id);
  khadi.forEach(p=>{
    const n = 3+Math.floor(RNG()*5); let d = 380;
    for(let i=0;i<n;i++){ d = Math.max(5, d-Math.floor(30+RNG()*90)); mkOrder(p,d,1100+Math.round(RNG()*17)*100, RNG()<0.06?'returned':'delivered'); }
    if(RNG()<0.75) consent(p,'checkout_optin',200+Math.floor(RNG()*100));
  });
  // new customers (last 30 days)
  const ciN = ins('CohortImport',{workspace_id:ws.id,name:'Shopify · New customers, last 30 days',source:'shopify',created_at:iso(now-1*D)});
  for(let i=0;i<34;i++){
    const g = RNG()<0.5?'male':'female';
    const p = ins('Person',{cohort_import_id:ciN.id,full_name:pick(PANEL_NAMES[g])+' '+String.fromCharCode(65+Math.floor(RNG()*26)),phone:'+91 9'+String(Math.floor(RNG()*1e9)).padStart(9,'0'),gender:g,
      birth_date:(1988+Math.floor(RNG()*14))+'-0'+(1+Math.floor(RNG()*9))+'-1'+Math.floor(RNG()*9),city:pick(CITIES)[0],occupation:null,attributes:{},upi_vpa:null,aadhaar_verified_at:null,linkedin_verified_at:null,upi_verified_at:null});
    mkOrder(p, 2+Math.floor(RNG()*24), 999+Math.round(RNG()*12)*100, RNG()<0.1?'rto':'delivered');
    if(RNG()<0.62) consent(p,'checkout_optin',2+Math.floor(RNG()*20));
  }
  // one customer who opted out (shows the one-tap withdrawal)
  const optOut = rows('Consent',c=>c.workspace_id===ws.id)[3]; if(optOut) optOut.withdrawn_at = iso(now-3*D);

  // always-on returns study (khadi customers whose latest order came back)
  const tr = createTrigger(ws.id, u.id, 'return_or_rto', 10);
  const sR = byId('Study', tr.study_id);
  const rPeople = khadi.filter(p=>consentOf(p.id)&&!consentOf(p.id).withdrawn_at).slice(0,8);
  rPeople.forEach(p=>{ const last = ordersOf(p.id).pop(); last.status = RNG()<0.75?'returned':'rto'; });
  const launched = now-6*D;
  upd('Study',sR.id,{launched_at:iso(launched),sample_size:rPeople.length,created_at:iso(launched-D)});
  fieldSeed(sR,'returns',questionsOf(sR.id),rPeople,{t0:launched});
  ins('WalletTransaction',{workspace_id:ws.id,study_id:sR.id,kind:'incentive_reserve',amount_inr:-rPeople.length*sR.incentive_inr,created_at:iso(launched)});
  tr.last_run_at = iso(launched);
  synthFromScript(sR,'returns',launched+5*3600000);
  // a few more returners waiting for next week's batch
  khadi.filter(p=>!rPeople.includes(p)&&consentOf(p.id)&&!consentOf(p.id).withdrawn_at).slice(0,6).forEach(p=>{ const last=ordersOf(p.id).pop(); last.status='returned'; });

  // outcomes
  const snackPricing = one('Recommendation',r=>r.study_id===x.sA.id&&r.workstream==='pricing');
  if(snackPricing){ snackPricing.status='done'; ins('Outcome',{recommendation_id:snackPricing.id,metric:'conversion_rate',change_ref:'Hero SKU repriced to ₹199 for 90 g on Blinkit and Zepto (3 Nov)',baseline_value:2.1,baseline_at:iso(now-33*D),current_value:2.9,measured_at:iso(now-2*D),source:'simulated'}); }
  const skinCard = one('Recommendation',r=>r.study_id===x.sB.id&&r.workstream==='product');
  seedPanel();
  if(skinCard){ skinCard.status='in_progress'; ins('Outcome',{recommendation_id:skinCard.id,metric:'repeat_rate',change_ref:'3-step routine card added to every first order',baseline_value:storeMetric(ws.id,'repeat_rate'),baseline_at:iso(now-5*D),current_value:null,measured_at:null,source:'simulated'}); }
}

// =====================================================================
// Views (v2 overrides)
// =====================================================================
function renderRail(){
  const v = ui.route.view; const live = wsStudies().filter(s=>studyStatus(s)==='live').length;
  const on = list => list.includes(v)?'on':'';
  const act = rows('Trigger',t=>t.workspace_id===ui.ws&&t.active).length;
  document.getElementById('rail').innerHTML = `
    <div class="brand"><div class="logo">V</div><b>Voqiva</b><span class="tag-pro">PRO</span></div>
    <a class="nav ${on(['home'])}" href="#home">${ic('home')}Home</a>
    <a class="nav ${on(['studies','new','plan','live','report','actions'])}" href="#studies">${ic('folder')}Studies ${live?`<span class="pill ok">${live} live</span>`:''}</a>
    <a class="nav ${on(['always'])}" href="#always">${ic('bolt')}Always-on ${act?`<span class="pill acc">${act}</span>`:''}</a>
    <a class="nav ${on(['participants'])}" href="#participants">${ic('users')}Customers <span class="pill num">${circle(ui.ws).length}</span></a>
    <a class="nav ${on(['panel'])}" href="#panel">${ic('shield')}Voqiva panel <span class="pill num">${rows('Person',p=>!p.cohort_import_id).length}</span></a>
    <a class="nav ${on(['wallet'])}" href="#wallet">${ic('wallet')}Wallet &amp; plans <span class="pill acc num">${inr(walletBalance(ui.ws))}</span></a>
    <div class="spacer"></div>
    <a class="nav ${on(['account'])}" href="#account">${ic('gear')}Settings</a>
    <a class="nav ${on(['help'])}" href="#help">${ic('help')}Help &amp; how it works</a>`;
}

function ndInit(o){
  const best = rows('CohortImport',c=>c.workspace_id===ui.ws).map(c=>({c,n:audienceBase({audience_source:'cohort_import',cohort_import_id:c.id}).length})).sort((a,b)=>b.n-a.n)[0];
  ui.nd = Object.assign({objective:'',source:best&&best.n?'cohort_import':'voqiva_panel',cohort_import_id:best?best.c.id:null,parent_study_id:null,removed:[],custom:[],segments:[],segTouched:false},o||{});
}
function sourceBlock(){
  const nd = ui.nd;
  const cohorts = rows('CohortImport',c=>c.workspace_id===ui.ws);
  const readyS = wsStudies().filter(s=>s.synthesized_at);
  const panelN = rows('Person',p=>!p.cohort_import_id).length;
  const circleN = circle(ui.ws).length;
  return srcOption('cohort_import','Your customers (purchase-verified)',`People who bought from you and opted in to your customer circle. Every quote is tied to a real order. Interviews run as WhatsApp voice notes.`,`<span class="pill buy">${ic('check')}${circleN} opted in</span>`,
      nd.source==='cohort_import'? `<div class="row" style="margin-top:10px"><select class="field" id="nd-cohort" data-change="nd-cohort" style="max-width:440px">${cohorts.map(c=>`<option value="${c.id}" ${c.id===nd.cohort_import_id?'selected':''}>${esc(c.name)} (${audienceBase({audience_source:'cohort_import',cohort_import_id:c.id}).length} opted in)</option>`).join('')}</select><a class="link small" href="#participants">Grow your circle</a></div>`:'')
    + (readyS.length? srcOption('parent_study','Re-contact respondents of a finished study','Follow up with people who already completed an interview for you.','',
        nd.source==='parent_study'? `<select class="field" id="nd-parent" data-change="nd-parent" style="max-width:440px;margin-top:10px">${readyS.map(s=>`<option value="${s.id}" ${s.id===nd.parent_study_id?'selected':''}>${esc(s.title)} (${completedOf(s.id).length})</option>`).join('')}</select>`:''):'')
    + srcOption('voqiva_panel','Voqiva verified panel (non-buyers)','For new-concept and category research with people who haven\'t bought from you yet. Aadhaar, UPI and LinkedIn verified.',`<span class="pill">${panelN} panelists</span>`, nd.source==='voqiva_panel'?'<div id="nd-seg" class="stack" style="gap:8px;margin-top:12px"></div>':'');
}

function vHome(){
  const all = wsStudies(); const live = all.filter(s=>studyStatus(s)==='live'); const ready = all.filter(s=>s.synthesized_at);
  const liveParticipants = live.reduce((a,s)=>a+sessionsOf(s.id).filter(x=>x.screen_result==='qualified').length,0);
  const imported = rows('Person',p=>p.cohort_import_id && rows('CohortImport',c=>c.id===p.cohort_import_id&&c.workspace_id===ui.ws).length);
  const circ = circle(ui.ws).length;
  const tat = all.filter(s=>s.synthesized_at&&s.launched_at&&!isTriggerStudy(s)).map(s=>T(s.synthesized_at)-T(s.launched_at)).filter(x=>x>0);
  const avgTat = tat.length? tat.reduce((a,b)=>a+b,0)/tat.length/3600000 : null;
  const ws = byId('Workspace',ui.ws);
  const done = rows('Session',x=>x.ended_at&&all.some(s=>s.id===x.study_id));
  const verified = done.filter(x=>buyerStats(x.person_id)).length;
  const trig = rows('Trigger',t=>t.workspace_id===ui.ws&&t.active);
  const outs = rows('Outcome',o=>rows('Recommendation',r=>r.id===o.recommendation_id&&all.some(s=>s.id===r.study_id)).length);
  const worked = outs.filter(o=>(outcomeVerdict(o)||{}).k==='ok').length;
  return `
  <section class="row between" style="align-items:flex-end">
    <div class="stack" style="gap:4px"><h1>Namaste ${esc(me().full_name.split(' ')[0])}</h1>
      <p class="muted">${live.length} live ${live.length===1?'study':'studies'} · ${liveParticipants} people in conversation · ${trig.length} always-on ${trig.length===1?'trigger':'triggers'} listening.</p></div>
    <div class="row"><a class="btn" href="#participants">${ic('users')}Grow customer circle</a><button class="btn primary" data-act="new-study">${ic('plus')}New study</button></div>
  </section>
  <section class="card hero stack" style="gap:16px;padding:28px">
    <div class="row" style="gap:8px"><span class="pill buy">${ic('check')}Purchase-verified research</span><span class="small muted">Your buyers, on WhatsApp, in their language</span></div>
    <h2 style="font-size:clamp(22px,2.6vw,30px)">What do you want to learn from your buyers?</h2>
    <p class="muted" style="max-width:70ch">Voqiva interviews people who actually bought from you, by WhatsApp voice note, then sets what they said next to their real orders. When you ship a fix, it tracks whether the numbers moved.</p>
    <form class="prompt-box" data-submit="home-ask">${ic('spark')}
      <input id="home-q" placeholder="e.g. Why are first-time buyers of our linen shirts not reordering within 60 days?" aria-label="Your research question">
      <button class="btn primary" type="submit">${ic('bolt')}Start study</button></form>
    <div class="row" style="gap:8px"><span class="small muted" style="font-weight:600">Try asking:</span>
      ${rows('PromptTemplate',t=>t.placement==='home_suggestion').map(t=>`<button class="chip plain" data-act="try" data-id="${t.id}">${esc(t.label)}</button>`).join('')}</div>
  </section>
  <section class="grid g4">
    <div class="card kpi stack"><span class="eyebrow">Customer circle</span><div class="big num">${circ}</div><span class="small muted">${imported.length?pct(circ/imported.length*100):'0%'} of ${imported.length} imported buyers opted in to research</span></div>
    <div class="card kpi stack"><span class="eyebrow">Purchase-verified voices</span><div class="big num">${verified}</div><span class="small muted">of ${done.length} completed interviews matched to a real order</span></div>
    <div class="card kpi stack"><span class="eyebrow">Proven fixes</span><div class="big num">${worked}<small>of ${outs.length} tracked</small></div><span class="small muted">Recommendations that moved a store metric</span></div>
    <div class="card kpi stack"><span class="eyebrow">Research wallet</span><div class="big num">${inr(walletBalance(ui.ws))}</div><span class="small ${ws.auto_reload_mandate_ref?'':'muted'}" style="${ws.auto_reload_mandate_ref?'color:var(--ok)':''}">${freeLeft(ui.ws)} free customer interviews left this month</span></div>
  </section>
  ${trig.length?`<section class="card tint row between"><div class="row">${ic('bolt').replace('<svg','<svg style="width:22px;height:22px;color:var(--accent)"')}<div><b>Always-on is listening</b><div class="small muted">${trig.map(t=>`${esc(TRIGGER_EVENTS[t.event].label)}: ${eligibleFor(t).length} new customers waiting`).join(' · ')}</div></div></div><a class="btn" href="#always">Open always-on ${ic('right')}</a></section>`:''}
  ${studiesSection(true)}
  <section class="card tint banner">
    <div class="avatar" style="width:48px;height:48px;background:var(--surface)">${ic('shield')}</div>
    <div><h3>Real buyers, real consent</h3><p class="muted small">Your customers are only contacted after they opt in to your customer circle, with a timestamped consent record (DPDP Act). They can leave with one tap. Incentives are paid on completion, whatever their opinion.</p></div>
    <span class="pill ok">${circ} active consents</span>
  </section>`;
}

// ---- session card & transcript as WhatsApp voice notes ----
function voiceNote(text, dark){
  const secs = Math.max(4, Math.round(text.length/14));
  let h=''; let seed=text.length; for(let i=0;i<28;i++){ seed=(seed*9301+49297)%233280; h+=`<i style="height:${4+Math.round(seed/233280*14)}px"></i>`; }
  return `<div class="vn ${dark?'dark':''}">${ic('play')}<span class="bars">${h}</span><span class="small num">${mmss(secs*1000)}</span></div>`;
}
function sessCard(s, x, qs){
  const p = byId('Person',x.person_id); const sel = ui.sel[s.id]===x.id;
  const sig = rows('Signal',g=>g.session_id===x.id);
  const isLive = x.started_at && !x.ended_at;
  let right;
  if(x.ended_at) right = `<span class="pill ok">Completed (${mmss(T(x.ended_at)-T(x.started_at))})</span><div class="small muted num">${x.payout_status==='paid'?inr(s.incentive_inr)+' sent · '+esc(String(x.payout_ref).slice(-8)):'Payout pending'}</div>`;
  else if(isLive) right = `<span class="pill acc"><span class="dot pulse"></span>Replying on WhatsApp</span><div class="small muted">Payout held in escrow</div>`;
  else right = `<span class="pill">Invited</span><div class="small muted">WhatsApp invite sent</div>`;
  const lastMod = isLive && rows('TranscriptTurn',t=>t.session_id===x.id&&t.speaker==='moderator').sort((a,b)=>b.start_ms-a.start_ms)[0];
  const topic = lastMod && (qs.find(q=>q.id===lastMod.question_id)||{}).section;
  const panelBadges = [p.aadhaar_verified_at&&'Aadhaar',p.linkedin_verified_at&&'LinkedIn',p.upi_verified_at&&'UPI'].filter(Boolean);
  return `<article class="sess ${sel?'sel':''} ${isLive?'live':''}" data-act="sel-sess" data-sid="${s.id}" data-id="${x.id}" tabindex="0">
    <div class="row between" style="align-items:flex-start"><div class="row" style="flex-wrap:nowrap;min-width:0"><div class="avatar">${initials(p.full_name)}</div>
      <div style="min-width:0"><div class="row" style="gap:8px"><b style="font-family:var(--display);font-size:17px">${esc(shortName(p.full_name))}${personAge(p)?', '+personAge(p):''}</b>
        ${p.cohort_import_id? purchaseBadge(p.id) : (panelBadges.length?`<span class="pill ok" style="font-size:11px">${ic('check')}${panelBadges.join(' & ')}</span>`:'')}</div>
      <div class="small muted">${esc(p.city||'')}${p.occupation?' · '+esc(p.occupation):''}</div></div></div>
      <div style="text-align:right">${right}</div></div>
    ${x.summary?`<div class="well small"><b>Sentiment: ${esc(x.sentiment||'')}</b> · ${esc(x.summary)}</div>`:''}
    ${topic?`<div class="well small row between"><span>Now answering: ${esc(topic)}</span><span style="color:var(--accent);font-weight:600">Recording a voice note…</span></div>`:''}
    ${sig.length?`<div class="row" style="gap:6px">${sig.map(g=>`<span class="pill ${g.polarity==='positive'?'ok':g.polarity==='critical'?'bad':g.polarity==='negative'?'warn':''}" style="font-size:11.5px">${esc(g.label)}</span>`).join('')}</div>`:''}
  </article>`;
}
function transcriptPanel(s, x){
  if(!x) return `<div class="card empty">No conversations have started yet. Run the interviews to see the WhatsApp thread here.</div>`;
  const p = byId('Person',x.person_id); const qs = questionsOf(s.id);
  const turns = rows('TranscriptTurn',t=>t.session_id===x.id).sort((a,b)=>a.start_ms-b.start_ms);
  const ans = rows('Answer',a=>a.session_id===x.id);
  const sig = rows('Signal',g=>g.session_id===x.id);
  const b = buyerStats(p.id);
  const wa = s.methodology==='whatsapp_voice';
  return `<section class="card stack" style="gap:14px">
    <div class="row between"><b style="font-family:var(--display);font-size:18px"><span class="dot" style="color:${x.ended_at?'var(--ok)':'var(--accent)'}"></span> ${esc(shortName(p.full_name))}</b><span class="small muted">${wa?'WhatsApp voice notes':esc(METHOD_LABEL[s.methodology])}</span></div>
    ${b?`<div class="well small stack" style="gap:4px"><div class="row between"><b>Order history</b>${purchaseBadge(p.id)}</div><div class="row between muted"><span>${b.n} order${b.n>1?'s':''} · lifetime ${inr(b.ltv)}</span><span>${b.returns} returned / RTO</span></div></div>`:''}
    <div class="transcript wa">${turns.map(t=>{ const q=qs.find(z=>z.id===t.question_id);
      return t.speaker==='moderator'
        ? `<div class="stack" style="gap:4px"><span class="small" style="color:var(--accent);font-weight:600">${esc(byId('Workspace',s.workspace_id).name)} · Voqiva AI · ${mmss(t.start_ms)}${q?' · Q'+q.position:''}</span><div class="bubble mod">${wa?voiceNote(t.text,false):''}<div class="${wa?'small':''}">${esc(t.text)}</div></div></div>`
        : `<div class="stack" style="gap:4px;align-items:flex-end"><span class="small muted">${mmss(t.start_ms)} · ${esc(shortName(p.full_name))}</span><div class="bubble par">${wa?voiceNote(t.text,true):''}<div>${esc(t.text)}</div>${wa?'<div class="small" style="opacity:.75;margin-top:4px">Auto-transcribed</div>':''}</div></div>`; }).join('') || '<span class="muted small">Invite sent. Waiting for the first reply…</span>'}
      ${x.started_at&&!x.ended_at?'<div class="row small muted"><div class="wave" style="height:18px">'+[8,14,6,16,10].map(h=>`<i style="height:${h}px"></i>`).join('')+'</div>Recording a voice note…</div>':''}</div>
    ${ans.length?`<div class="stack" style="gap:6px"><span class="eyebrow">Structured answers</span>${ans.map(a=>{ const q=qs.find(z=>z.id===a.question_id); const v=a.value_json.value; return `<div class="row between small"><span class="muted">Q${q?q.position:''} ${esc(q?q.section:'')}</span><b class="num">${Array.isArray(v)?esc(v.join(', ')):(q&&q.config&&q.config.unit==='inr'?inr(v):esc(v))}</b></div>`; }).join('')}</div>`:''}
    ${sig.length?`<div class="stack" style="gap:6px"><span class="eyebrow">Signals extracted in real time</span><div class="row" style="gap:6px">${sig.map(g=>`<span class="pill ${g.polarity==='positive'?'ok':g.polarity==='critical'?'bad':g.polarity==='negative'?'warn':''}">${esc(g.label)}</span>`).join('')}</div></div>`:''}
  </section>`;
}

// ---- recommendation card with outcome tracking ----
function outcomePanel(r){
  if(r.status==='proposed') return '';
  const o = one('Outcome',x=>x.recommendation_id===r.id);
  if(!o){
    return `<form class="well stack" data-submit="outcome-start" data-id="${r.id}" style="gap:8px">
      <b class="small">Track the outcome</b><span class="small muted">Tell Voqiva what shipped and which store metric should move. It records today's baseline and checks again after 30 days.</span>
      <div class="grid g2" style="gap:8px"><div><label class="lbl" for="om-${r.id}">Metric</label><select class="field" id="om-${r.id}">${Object.entries(OUTCOME_METRICS).map(([k,m])=>`<option value="${k}">${m.label}</option>`).join('')}</select></div>
        <div><label class="lbl" for="oc-${r.id}">What shipped</label><input class="field" id="oc-${r.id}" placeholder="e.g. Size chart rebuilt on 24 Nov" required></div></div>
      <button class="btn sm primary" type="submit" style="align-self:flex-start">Start tracking</button></form>`;
  }
  const v = outcomeVerdict(o); const M = OUTCOME_METRICS[o.metric];
  return `<div class="well stack" style="gap:8px;border:1px solid ${v?(v.k==='ok'?'var(--ok)':v.k==='bad'?'var(--bad)':'var(--line)'):'var(--line)'}">
    <div class="row between"><b class="small">Outcome · ${esc(M.label)}</b>${v?`<span class="pill ${v.k}">${v.t}</span>`:'<span class="pill">Measuring</span>'}</div>
    <div class="small muted">${esc(o.change_ref||'')}</div>
    <div class="grid g3" style="gap:8px">
      <div><div class="eyebrow">Before</div><b class="num" style="font-size:20px">${fmtOutcome(o.metric,o.baseline_value)}</b><div class="small muted">${new Date(o.baseline_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</div></div>
      <div><div class="eyebrow">After</div><b class="num" style="font-size:20px">${fmtOutcome(o.metric,o.current_value)}</b><div class="small muted">${o.measured_at?new Date(o.measured_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'}):'not measured yet'}</div></div>
      <div style="align-self:end">${o.current_value==null?`<button class="btn sm" data-act="outcome-measure" data-id="${o.id}">Pull 30-day result</button>`:`<button class="btn sm ghost" data-act="outcome-measure" data-id="${o.id}">Re-measure</button>`}</div>
    </div>
    <span class="small faint">${o.source==='simulated'?'Simulated store pull in this prototype. With Shopify connected, Voqiva reads the real number.':'From Shopify'}</span></div>`;
}
function recCard(s,r,N){
  const th = r.theme_id? byId('Theme',r.theme_id):null; const tm = th? themeStats(th):null;
  const ms = rows('Metric',m=>m.recommendation_id===r.id).sort((a,b)=>a.position-b.position);
  const next = {proposed:['adopted','Adopt recommendation'],adopted:['in_progress','Mark in progress'],in_progress:['done','Mark done'],done:null}[r.status];
  return `<article class="card stack">
    <div class="row between"><div class="row" style="gap:6px"><span class="pill ${r.impact==='high'?'ok':''}"><span class="dot"></span>${r.impact[0].toUpperCase()+r.impact.slice(1)} impact</span><span class="pill">Effort: ${r.effort}</span>${tm?`<span class="pill acc">Backed by ${tm.participant_count} interviews</span>`:''}</div>
      ${r.track?`<span class="small muted">Track: <b style="color:var(--accent)">${esc(r.track)}</b></span>`:''}</div>
    <h3 style="font-size:20px">${esc(r.title)}</h3>
    ${mdLite(r.body_md)}
    ${ms.length?`<div class="grid g2" style="gap:8px">${ms.map(m=>`<div class="well ${m.participant_count==null?'hyp':''}" style="padding:10px 12px"><div class="small" style="font-weight:600">${esc(m.label)}</div><div class="row between"><b class="num" style="font-size:18px">${fmtMetric(m)}</b><span class="small">${m.participant_count==null?'Hypothesis':'Measured, n='+m.participant_count}</span></div>${m.description?`<div class="small ${m.participant_count==null?'':'muted'}">${esc(m.description)}</div>`:''}</div>`).join('')}</div>`:''}
    ${outcomePanel(r)}
    ${th?`<button class="link small" style="align-self:flex-start" data-act="goto-theme" data-sid="${s.id}" data-id="${th.id}">View the evidence: ${esc(th.name)} →</button>`:''}
    <div class="row between well" style="padding:10px 12px"><span class="small"><span class="dot" style="color:var(--ok)"></span> ${r.owner_team?'Owner: <b>'+esc(r.owner_team)+'</b>':'No owner yet'} · <span class="pill">${r.status.replace('_',' ')}</span></span>
      <div class="row" style="gap:6px"><button class="btn sm" data-act="copy-ticket" data-id="${r.id}">${ic('copy')}Copy as ticket</button>${next?`<button class="btn sm primary" data-act="rec-status" data-id="${r.id}" data-to="${next[0]}">${next[1]}</button>`:'<span class="pill ok">Done</span>'}</div></div>
  </article>`;
}
function impactKpi(s){
  const outs = rows('Outcome',o=>rows('Recommendation',r=>r.id===o.recommendation_id&&r.study_id===s.id).length);
  const measured = outs.filter(o=>o.current_value!=null);
  if(measured.length){ const o=measured[0]; const v=outcomeVerdict(o);
    return `<div class="card kpi stack"><div class="row between"><span class="eyebrow">Proven impact</span><span class="pill ${v.k}">${v.t}</span></div><div class="big num" style="font-size:30px">${fmtOutcome(o.metric,o.baseline_value)} → ${fmtOutcome(o.metric,o.current_value)}</div><span class="small muted">${esc(OUTCOME_METRICS[o.metric].label)} after: ${esc(o.change_ref)}</span></div>`; }
  if(outs.length) return `<div class="card kpi stack"><div class="row between"><span class="eyebrow">Outcome tracking</span><span class="pill">Measuring</span></div><div class="big">${outs.length}<small>fix${outs.length>1?'es':''} being tracked</small></div><span class="small muted">Results appear 30 days after each change ships</span></div>`;
  const proj = rows('Metric',m=>m.study_id===s.id&&m.recommendation_id&&m.participant_count==null)[0];
  return `<div class="card kpi stack"><div class="row between"><span class="eyebrow">Projected impact</span><span class="pill hyp">Hypothesis</span></div>
    ${proj?`<div class="big num">${fmtMetric(proj)}</div><span class="small muted">${esc(proj.label)}. Adopt a fix and track its outcome to prove it.</span>`:'<div class="big">—</div><span class="small muted">Adopt a fix and track its outcome</span>'}</div>`;
}

// ---- Customers (circle) ----
function vParticipants(){
  const cohorts = rows('CohortImport',c=>c.workspace_id===ui.ws);
  const imported = rows('Person',p=>p.cohort_import_id && cohorts.some(c=>c.id===p.cohort_import_id));
  const active = circle(ui.ws); const withdrawn = rows('Consent',c=>c.workspace_id===ui.ws&&c.withdrawn_at);
  const tab = ui.partTab==='panel' || cohorts.some(c=>c.id===ui.partTab) ? ui.partTab : (cohorts[0]?cohorts[0].id:'panel');
  const list = tab==='panel' ? rows('Person',p=>!p.cohort_import_id) : rows('Person',p=>p.cohort_import_id===tab);
  const sc = {}; rows('Session').forEach(x=>{ if(x.screen_result==='qualified'&&x.ended_at) sc[x.person_id]=(sc[x.person_id]||0)+1; });
  const shown = list.slice(0,ui.showPeople);
  const brand = byId('Workspace',ui.ws).name;
  return `<section class="stack" style="gap:4px"><h1>Customer circle</h1><p class="muted">Your buyers who opted in to research, with a consent record for each one. Imported customers are only ever contacted after they opt in.</p></section>
  <section class="grid g4">
    <div class="card kpi stack"><span class="eyebrow">In your circle</span><div class="big num">${active.length}</div><span class="small muted">active WhatsApp research consents</span></div>
    <div class="card kpi stack"><span class="eyebrow">Opt-in rate</span><div class="big num">${imported.length?pct(active.length/imported.length*100):'—'}</div><span class="small muted">of ${imported.length} imported buyers</span></div>
    <div class="card kpi stack"><span class="eyebrow">Opted out</span><div class="big num">${withdrawn.length}</div><span class="small muted">one-tap withdrawal, honoured instantly</span></div>
    <div class="card kpi stack"><span class="eyebrow">Orders linked</span><div class="big num">${rows('Order',o=>o.workspace_id===ui.ws).length}</div><span class="small muted">from Shopify, so every voice is tied to real purchases</span></div>
  </section>
  <section class="grid g2" style="align-items:start">
    <div class="card stack"><h3>Grow the circle at checkout</h3><p class="small muted">Add this opt-in to your Shopify thank-you page and order-confirmation WhatsApp. Each tap stores a timestamped consent record.</p>
      <div class="well stack" style="gap:10px;background:var(--surface);border:1px dashed var(--line)">
        <b>Join the ${esc(brand)} customer circle</b>
        <span class="small">Now and then we'll ask for a 5-minute WhatsApp voice chat about your order and pay you ₹100–₹300 by UPI for your time. Leave any time by replying STOP.</span>
        <label class="row small" style="gap:8px"><input type="checkbox" checked disabled style="accent-color:var(--accent)"> Yes, I'm in</label></div>
      <button class="btn sm" style="align-self:flex-start" data-act="copy-snippet">${ic('copy')}Copy opt-in text</button></div>
    <div class="card stack"><div class="row between"><h3>Imports</h3><div class="row"><label class="btn sm" for="csv-file">${ic('upload')}CSV</label><input type="file" id="csv-file" accept=".csv,text/csv" data-change="csv" hidden><button class="btn sm" data-act="sample-import" data-src="shopify">Shopify (sample)</button></div></div>
      ${cohorts.map(c=>{ const ppl=rows('Person',p=>p.cohort_import_id===c.id); const on=ppl.filter(p=>{const k=consentOf(p.id); return k&&!k.withdrawn_at;}).length; const pending=ppl.length-on;
        return `<div class="well stack" style="gap:6px"><div class="row between"><b class="small">${esc(c.name)}</b><span class="pill buy">${on}/${ppl.length} opted in</span></div>
          <div class="bar ok"><i style="width:${ppl.length?on/ppl.length*100:0}%"></i></div>
          ${pending?`<button class="btn sm" style="align-self:flex-start" data-act="optin-invite" data-id="${c.id}">Send WhatsApp opt-in invite to ${pending}</button>`:''}</div>`; }).join('') || '<div class="empty">No imports yet.</div>'}
      <p class="small faint">CSV columns: full_name, phone, plus optional gender, birth_date, city, occupation, order_count, last_order_value. Store connections and invites are simulated in this prototype.</p></div>
  </section>
  <div class="tabs">${cohorts.map(c=>`<button class="${tab===c.id?'on':''}" data-act="part-tab" data-k="${c.id}">${esc(c.name.replace(/^\w+ · /,''))}</button>`).join('')}<a class="btn sm ghost" href="#panel">Voqiva panel →</a></div>
  <section class="card"><div class="table-wrap"><table><thead><tr><th>Name</th><th>City</th>${tab==='panel'?'<th>Occupation</th><th>Verification</th>':'<th>Orders</th><th>Last order</th><th>Research consent</th>'}<th style="text-align:right">Interviews</th></tr></thead><tbody>
    ${shown.map(p=>{ const b=buyerStats(p.id); const k=consentOf(p.id);
      return `<tr><td><b>${esc(p.full_name)}</b><div class="small muted">${esc(String(p.phone).slice(0,6))}•••• ${esc(String(p.phone).slice(-3))}</div></td><td>${esc(p.city||'—')}</td>
      ${tab==='panel'
        ? `<td>${esc(p.occupation||'—')}</td><td><div class="row" style="gap:4px">${p.aadhaar_verified_at?'<span class="pill ok">Aadhaar</span>':''}${p.upi_verified_at?'<span class="pill ok">UPI</span>':''}${p.linkedin_verified_at?'<span class="pill ok">LinkedIn</span>':''}${!p.aadhaar_verified_at&&!p.upi_verified_at&&!p.linkedin_verified_at?'<span class="pill bad">Unverified</span>':''}</div></td>`
        : `<td class="num">${b?b.n+' · '+inr(b.ltv):'—'}</td><td class="small">${b?new Date(b.last.placed_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})+' · '+inr(b.last.value_inr)+(b.last.status!=='delivered'?' · <span style="color:var(--bad)">'+b.last.status+'</span>':''):'—'}</td>
           <td>${k&&!k.withdrawn_at?`<span class="pill ok" title="${esc(k.source)}">Opted in ${new Date(k.granted_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</span> <button class="link small" data-act="consent-withdraw" data-id="${k.id}">Withdraw</button>`:k?'<span class="pill bad">Opted out</span>':'<span class="pill">Not opted in</span>'}</td>`}
      <td class="num" style="text-align:right">${sc[p.id]||0}</td></tr>`; }).join('')}</tbody></table></div>
    ${list.length>shown.length?`<button class="btn" style="margin-top:12px" data-act="more-people">Show more (${list.length-shown.length} left)</button>`:''}</section>`;
}

// ---- Always-on ----
function vAlways(){
  const trs = rows('Trigger',t=>t.workspace_id===ui.ws);
  const used = new Set(trs.map(t=>t.event));
  return `<section class="row between" style="align-items:flex-end"><div class="stack" style="gap:4px"><h1>Always-on</h1><p class="muted" style="max-width:70ch">Triggers interview customers automatically when something happens in your store: a return, a missed reorder, a first purchase. A few conversations a week, and a running answer to "why".</p></div></section>
  <div class="stack">${trs.map(t=>{ const E=TRIGGER_EVENTS[t.event]; const s=byId('Study',t.study_id); const el=eligibleFor(t).length; const done=completedOf(s.id).length;
    return `<article class="card stack">
      <div class="row between"><div class="row"><span class="pill ${t.active?'ok':''}"><span class="dot ${t.active?'pulse':''}"></span>${t.active?'Listening':'Paused'}</span><h3>${esc(E.label)}</h3></div>
        <div class="row"><button class="btn sm" data-act="trigger-toggle" data-id="${t.id}">${t.active?'Pause':'Resume'}</button><button class="btn sm primary" data-act="trigger-run" data-id="${t.id}" ${!t.active||!el?'disabled':''}>${ic('play')}Run this week's batch (${Math.min(el,t.weekly_cap)})</button></div></div>
      <p class="small muted">${esc(E.desc)}</p>
      <div class="grid g4" style="gap:10px">
        <div class="well"><div class="eyebrow">Waiting now</div><b class="num" style="font-size:22px">${el}</b><div class="small muted">opted-in customers who match</div></div>
        <div class="well"><div class="eyebrow">Weekly cap</div><b class="num" style="font-size:22px">${t.weekly_cap}</b><div class="small muted">${inr(t.weekly_cap*(s.incentive_inr||0))} max incentives</div></div>
        <div class="well"><div class="eyebrow">Conversations so far</div><b class="num" style="font-size:22px">${done}</b><div class="small muted">${t.last_run_at?'last batch '+ago(t.last_run_at):'no batch yet'}</div></div>
        <div class="well"><div class="eyebrow">Latest insight</div><div class="small">${s.headline?esc(s.headline.slice(0,110))+(s.headline.length>110?'…':''):'<span class="muted">Appears after the first synthesis</span>'}</div></div>
      </div>
      <div class="row"><a class="btn sm" href="#live-${s.id}">Open conversations</a>${s.synthesized_at?`<a class="btn sm" href="#report-${s.id}">Insights</a><a class="btn sm" href="#actions-${s.id}">Actions</a>`:''}</div>
    </article>`; }).join('') || '<div class="empty">No triggers yet. Add your first one below.</div>'}</div>
  <form class="card stack" data-submit="trigger-create"><h3>Add a trigger</h3>
    <div class="grid g3" style="gap:10px;align-items:end">
      <div><label class="lbl" for="tr-event">When this happens</label><select class="field" id="tr-event">${Object.entries(TRIGGER_EVENTS).filter(([k])=>!used.has(k)).map(([k,e])=>`<option value="${k}">${esc(e.label)}</option>`).join('')}</select></div>
      <div><label class="lbl" for="tr-cap">Interview up to (per week)</label><input class="field num" id="tr-cap" type="number" min="3" max="50" value="10"></div>
      <button class="btn primary" type="submit" ${used.size>=Object.keys(TRIGGER_EVENTS).length?'disabled':''}>${ic('plus')}Add trigger</button></div>
    <p class="small muted">Included in the Always-on plan. You fund the incentives (₹150 per conversation by default).</p></form>`;
}

// ---- Wallet with plans ----
function vWallet(){
  const ws = byId('Workspace',ui.ws);
  const tx = rows('WalletTransaction',t=>t.workspace_id===ui.ws).sort((a,b)=>T(b.created_at)-T(a.created_at));
  const KIND = {topup:'Top-up',incentive_reserve:'Incentive reserve',synthesis_fee:'AI synthesis fee',disbursement_fee:'Payout & escrow fee',refund:'Unused incentive refund',recruitment_boost:'Recruitment boost (ads)'};
  return `<section class="stack" style="gap:4px"><h1>Wallet &amp; plans</h1><p class="muted">Public pricing in rupees. The balance is the sum of the ledger below.</p></section>
  <section class="grid g3">${PLANS.map(p=>`<div class="card stack" style="${p.k==='free'?'border-color:var(--accent)':''}"><div class="row between"><b style="font-family:var(--display);font-size:19px">${p.name}</b>${p.k==='free'?`<span class="pill acc">${freeLeft(ui.ws)} of ${FREE_QUOTA} left this month</span>`:''}</div><div class="num" style="font-family:var(--display);font-size:26px;font-weight:600">${p.price}</div><p class="small muted">${p.line}</p></div>`).join('')}</section>
  <section class="grid g2">
    <div class="card kpi stack"><span class="eyebrow">Available balance</span><div class="big num">${inr(walletBalance(ui.ws))}</div>
      <div class="row">${[5000,10000,25000].map(a=>`<button class="btn sm" data-act="topup" data-amt="${a}">+ ${inr(a)}</button>`).join('')}</div><span class="small muted">Top-ups are simulated UPI payments.</span></div>
    <div class="card kpi stack"><span class="eyebrow">Auto-reload</span><div class="big" style="font-size:26px">${ws.auto_reload_mandate_ref?'On':'Off'}</div>
      <span class="small muted">${ws.auto_reload_mandate_ref?'UPI AutoPay mandate '+esc(ws.auto_reload_mandate_ref)+' keeps always-on triggers funded.':'Set up a UPI AutoPay mandate so triggers never stall.'}</span>
      <button class="btn sm" style="align-self:flex-start" data-act="autoreload">${ws.auto_reload_mandate_ref?'Turn off':'Turn on'}</button></div>
  </section>
  <section class="card"><div class="table-wrap"><table><thead><tr><th>Date</th><th>Type</th><th>Study</th><th style="text-align:right">Amount</th></tr></thead><tbody>
    ${tx.slice(0,ui.showLedger).map(t=>{ const s=byId('Study',t.study_id); return `<tr><td class="small">${new Date(t.created_at).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</td><td>${KIND[t.kind]}</td><td>${s?`<a href="#${routeFor(s)}">${esc(s.title)}</a>`:'<span class="muted">—</span>'}</td><td class="num" style="text-align:right;font-weight:600;color:${t.amount_inr>0?'var(--ok)':'var(--fg)'}">${t.amount_inr>0?'+':'−'}${inr(Math.abs(t.amount_inr))}</td></tr>`; }).join('')}
  </tbody></table></div></section>`;
}
