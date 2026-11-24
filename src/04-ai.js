// ---------- AI (claude sample capability) with rule-based fallbacks ----------
let SAMPLE = null, AI_STATE = 'checking', DICT = null, DLS = null;
async function initCaps(){
  try{ SAMPLE = window.claude ? await window.claude.use('sample') : null; }catch(e){ SAMPLE=null; }
  AI_STATE = SAMPLE ? 'ready' : 'off';
  try{ DICT = window.claude ? await window.claude.use('dictation') : null; }catch(e){ DICT=null; }
  try{ DLS = window.claude ? await window.claude.use('downloads') : null; }catch(e){ DLS=null; }
  renderTop(); if(ui.route.view==='new') render();
}
function aiFail(e){
  const code = e && e.code;
  if(['not_granted','sampling_disabled','not_declared','capability_disabled','capability_removed'].includes(code)){ AI_STATE='off'; renderTop(); }
  return {cancelled:'Stopped.',not_granted:'Claude access was declined for this page, so Voqiva used its built-in rules.',rate_limited:'Claude is busy or you hit a usage limit. Try again in a minute.',invalid_json:'The AI reply could not be read. Try again.',refused:'Claude declined this request. Rephrase the objective and try again.',unavailable:'AI is offline here, so Voqiva used its built-in rules.'}[code] || 'The AI call failed. Try again.';
}
async function aiJSON(prompt, opts){
  if(!SAMPLE || AI_STATE==='off') throw {code:'unavailable'};
  return SAMPLE.json(prompt, Object.assign({cache:false}, opts||{}));
}

// ---------- quick local parse for the "Live parsing" panel (no AI, no cost) ----------
const CITY_ALIASES = {bengaluru:'Bengaluru',bangalore:'Bengaluru',blr:'Bengaluru',mumbai:'Mumbai',bombay:'Mumbai',pune:'Pune',delhi:'Delhi NCR',ncr:'Delhi NCR',gurgaon:'Delhi NCR',gurugram:'Delhi NCR',noida:'Delhi NCR',hyderabad:'Hyderabad',chennai:'Chennai',kolkata:'Kolkata',ahmedabad:'Ahmedabad',jaipur:'Jaipur',indore:'Indore'};
const DOMAINS = [[/shirt|officewear|apparel|kurta|tee|t-shirt|denim|menswear|fashion|khadi|linen/i,'D2C Apparel'],[/skin|serum|niacinamide|sunscreen|moisturi|beauty|hair/i,'D2C Beauty & Skincare'],[/snack|makhana|food|beverage|coffee|tea|protein|chocolate/i,'Food & Beverage'],[/checkout|cart|conversion|shopify|payment|app/i,'E-commerce Experience'],[/fintech|loan|credit|insurance|upi/i,'Fintech']];
function parseObjective(text){
  const t = text||''; const out={criteria:[]};
  out.domain = (DOMAINS.find(([r])=>r.test(t))||[0,'Consumer'])[1];
  if(/\b(men|male|guys|man)\b/i.test(t) && !/\bwomen\b/i.test(t)) out.criteria.push({attribute:'gender',operator:'eq',value:'male',label:'Men'});
  else if(/\b(women|female|girls|woman)\b/i.test(t) && !/\bmen\b/i.test(t)) out.criteria.push({attribute:'gender',operator:'eq',value:'female',label:'Women'});
  const age = t.match(/(?:aged?|ages?)\s*(\d{2})\s*(?:–|-|to)\s*(\d{2})/i) || t.match(/(\d{2})\s*(?:–|-|to)\s*(\d{2})\s*(?:yrs|years|year)/i);
  if(age) out.criteria.push({attribute:'age',operator:'between',value:[+age[1],+age[2]],label:'Ages '+age[1]+'–'+age[2]});
  const cities=[]; Object.keys(CITY_ALIASES).forEach(k=>{ if(new RegExp('\\b'+k+'\\b','i').test(t) && !cities.includes(CITY_ALIASES[k])) cities.push(CITY_ALIASES[k]); });
  if(cities.length){ const q = Math.floor(100/cities.length); cities.forEach((c,i)=>out.criteria.push({attribute:'city',operator:'eq',value:c,quota_pct:i===0?100-q*(cities.length-1):q,label:c})); }
  const pr = t.match(/₹\s?([\d,]+)\s*(?:–|-|to|and)\s*₹?\s?([\d,]+)/);
  if(pr) out.price=[+pr[1].replace(/,/g,''),+pr[2].replace(/,/g,'')];
  if(/fashion|apparel|shirt|officewear|menswear|wear/i.test(t)) out.criteria.push({attribute:'d2c_fashion_orders_60d',operator:'gte',value:2,label:'Buys D2C fashion online 2+ times in 60 days'});
  if(/blinkit|zepto|instamart|quick.?commerce/i.test(t)) out.criteria.push({attribute:'quick_commerce_orders_30d',operator:'gte',value:4,label:'4+ quick-commerce orders in 30 days'});
  const g = out.criteria.find(c=>c.attribute==='gender'), a=out.criteria.find(c=>c.attribute==='age');
  out.profile = [g?g.label:'All genders', a? a.label.replace('Ages ','')+' yrs':null].filter(Boolean).join(', ');
  out.cities = cities;
  out.segments = detectSegments(t);
  return out;
}

// ---------- plan ----------
function planPrompt(nd, parsed){
  const src = nd.source==='cohort_import' ? `the brand's imported customer cohort "${(byId('CohortImport',nd.cohort_import_id)||{}).name}" (${audienceBase({audience_source:'cohort_import',cohort_import_id:nd.cohort_import_id}).length} people)`
    : nd.source==='parent_study' ? `the respondents who completed the earlier study "${(byId('Study',nd.parent_study_id)||{}).title}"` : `Voqiva's verified consumer panel (Aadhaar / UPI / LinkedIn verified Indian consumers)`;
  return `You are Voqiva's research planner. Voqiva runs AI-moderated qualitative research for Indian D2C and consumer brands.
Turn this business objective into a study plan.

OBJECTIVE:
${nd.objective}

AUDIENCE SOURCE: ${src}
AUDIENCE RULES ALREADY CONFIRMED BY THE USER (keep them, you may add more): ${JSON.stringify(nd.criteria.map(c=>({attribute:c.attribute,operator:c.operator,value:c.value,quota_pct:c.quota_pct||null,label:c.label})))}

RULES
- 4 to 6 questions. The first has kind "screener"; the rest "interview". Write every question in clear, simple English only (no Hindi or Hinglish words), the way a warm Indian moderator would say them aloud.
- input_type is one of: voice, voice_with_card, slider, choice, text.
  * slider only for a price or number, with config {"min":int,"max":int,"step":int,"unit":"inr"} (unit can be another word for non-money).
  * choice with config {"options":[3-6 short strings],"multi":true|false}.
  * voice_with_card with config {"card":"what the WhatsApp card shows"}.
  * otherwise config null.
- If the objective mentions a price range, include one slider over that range.
- Each question has a 2-4 word "section" and a "probe_goal" (what the moderator should dig into).
- criteria may only use these attributes: gender (eq "male"|"female"), age (between [min,max]), city (eq one city; one row per city with quota_pct summing to 100), industry (in a list from Tech, Consulting, Agency, FinTech, FMCG, Healthcare, Education, Retail, Student), d2c_fashion_orders_60d (gte n), quick_commerce_orders_30d (gte n), skincare_buyer (eq true), upi_verified (eq true), segment (in a list of audience keys: gen_z, college_students, working_professionals, young_parents, homemakers, tier2_shoppers, fitness, smb_owners, senior_leaders). Each criterion has a short human "label". For an imported cohort, keep criteria minimal.
- sample_size 10-40. incentive_inr is a fair amount for the interview length (typically 100-400). reward_type: upi_cash | amazon_voucher | myntra_voucher | mobile_recharge. language: always "english". methodology: whatsapp_voice (default for the brand's own customers) | voice_interview | survey | voice_plus_whatsapp. max_duration_min 5-20.

Reply with only this JSON:
{"title":"short study name","domain":"e.g. D2C Menswear","target_profile":"e.g. Men, 22–30 yrs","methodology":"...","sample_size":25,"incentive_inr":300,"reward_type":"upi_cash","language":"english","max_duration_min":10,
 "criteria":[{"attribute":"gender","operator":"eq","value":"male","quota_pct":null,"label":"Men"}],
 "questions":[{"kind":"screener","section":"...","prompt":"...","input_type":"voice","probe_goal":"...","config":null}]}`;
}
function fallbackPlan(nd, parsed){
  const dom = parsed.domain.replace(/^D2C /,'').toLowerCase();
  const qs = [
    {kind:'screener',section:'Current habits',prompt:`Tell me about the last time you bought ${dom} online. What did you buy, and from where?`,input_type:'voice',probe_goal:'Recent purchase, channel and brand.',config:null},
    {kind:'interview',section:'Frustrations',prompt:'What frustrates you most about the options you have today?',input_type:'voice',probe_goal:'Unmet needs in their own words.',config:null},
    parsed.price ? {kind:'interview',section:'Price sensitivity',prompt:`Between ${inr(parsed.price[0])} and ${inr(parsed.price[1])}, what is the most you would pay?`,input_type:'slider',probe_goal:'Willingness to pay and what justifies it.',config:{min:parsed.price[0],max:parsed.price[1],step:Math.max(10,Math.round((parsed.price[1]-parsed.price[0])/14/10)*10),unit:'inr'}}
                 : {kind:'interview',section:'Switching',prompt:'What would make you switch from the brand you use now?',input_type:'voice',probe_goal:'Switching triggers.',config:null},
    {kind:'interview',section:'Trust',prompt:'What would make you hesitate to buy from a new Indian D2C brand?',input_type:'voice',probe_goal:'Trust barriers: returns, reviews, quality.',config:null},
    {kind:'interview',section:'Priorities',prompt:'Which of these matters most when you choose?',input_type:'choice',probe_goal:'Rank buying drivers.',config:{options:['Price','Quality','Reviews','Delivery speed','Brand story'],multi:true}}
  ];
  return {title:nd.objective.split(/[.?!]/)[0].slice(0,60),domain:parsed.domain,methodology:'voice_interview',sample_size:20,incentive_inr:250,reward_type:'upi_cash',language:'english',max_duration_min:10,criteria:[],questions:qs};
}
function sanitizePlan(p, nd){
  const Q = Array.isArray(p.questions)? p.questions.slice(0,8) : [];
  const okIT = ['voice','voice_with_card','slider','choice','text'];
  const crits = nd.criteria.slice();
  (Array.isArray(p.criteria)?p.criteria:[]).forEach(c=>{
    if(!c || !KNOWN_ATTRS.includes(c.attribute) || !['eq','in','between','gte'].includes(c.operator)) return;
    if(crits.some(x=>x.attribute===c.attribute && JSON.stringify(x.value)===JSON.stringify(c.value))) return;
    if(c.attribute!=='city' && crits.some(x=>x.attribute===c.attribute)) return;
    crits.push({attribute:c.attribute,operator:c.operator,value:c.value,quota_pct:c.quota_pct||null,label:String(c.label||c.attribute)});
  });
  const pick1=(v,list,d)=>list.includes(v)?v:d;
  return {
    title:String(p.title||'Untitled study').slice(0,90), domain:String(p.domain||''),
    methodology:pick1(p.methodology,['whatsapp_voice','voice_interview','survey','voice_plus_whatsapp'],nd.source==='voqiva_panel'?'voice_interview':'whatsapp_voice'),
    sample_size:Math.min(40,Math.max(5,parseInt(p.sample_size)||20)), incentive_inr:Math.min(2000,Math.max(50,parseInt(p.incentive_inr)||250)),
    reward_type:pick1(p.reward_type,['upi_cash','amazon_voucher','myntra_voucher','mobile_recharge'],'upi_cash'),
    language:'english', max_duration_min:Math.min(30,Math.max(3,parseInt(p.max_duration_min)||10)),
    criteria:crits,
    questions:Q.filter(q=>q&&q.prompt).map((q,i)=>({kind:i===0?'screener':'interview',section:String(q.section||'Question '+(i+1)).slice(0,40),prompt:String(q.prompt),input_type:pick1(q.input_type,okIT,'voice'),probe_goal:q.probe_goal?String(q.probe_goal):null,config:q.config&&typeof q.config==='object'?q.config:null}))
  };
}
async function generatePlan(nd, onProgress, signal){
  const parsed = parseObjective(nd.objective);
  let plan, note=null;
  try{
    const raw = await aiJSON(planPrompt(nd,parsed),{signal,onText:({text})=>onProgress&&onProgress(text.length)});
    plan = sanitizePlan(raw, nd);
    if(plan.questions.length<3) throw {code:'invalid_json'};
  }catch(e){
    if(e && e.code==='cancelled') throw e;
    note = aiFail(e);
    plan = sanitizePlan(fallbackPlan(nd,parsed), nd);
  }
  if(nd.source!=='voqiva_panel' && plan.methodology==='voice_interview') plan.methodology='whatsapp_voice';
  const segc = plan.criteria.find(c=>c.attribute==='segment'); if(segc && nd.source==='voqiva_panel') plan.incentive_inr = segmentRate(segc.value);
  const s = ins('Study',{workspace_id:ui.ws,created_by:ui.user,parent_study_id:nd.parent_study_id||null,cohort_import_id:nd.source==='cohort_import'?nd.cohort_import_id:null,
    audience_source:nd.source,objective:nd.objective,title:plan.title,domain:plan.domain||parsed.domain,methodology:plan.methodology,sample_size:plan.sample_size,incentive_inr:plan.incentive_inr,
    reward_type:plan.reward_type,language:plan.language,max_duration_min:plan.max_duration_min,launched_at:null,closed_at:null,synthesized_at:null,headline:null,summary:null,confidence_pct:null,share_token:null,
    created_at:iso(Date.now()),updated_at:iso(Date.now())});
  plan.criteria.forEach(c=>ins('AudienceCriterion',{study_id:s.id,attribute:c.attribute,operator:c.operator,value:{v:c.value,label:c.label},quota_pct:c.quota_pct||null}));
  plan.questions.forEach((q,i)=>ins('Question',Object.assign({study_id:s.id,position:i+1},q)));
  save();
  return {study:s, note};
}

// ---------- launch ----------
function launchStudy(s){
  const crits = critRows(s.id);
  const f = feasibility(s, crits);
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
  chargeLaunch(s);
  save();
  return q;
}

// ---------- fieldwork ----------
let FIELD = null; // {studyId, ctl, done, total, msg}
function fieldPrompt(s, qs, batch){
  return `You are generating SIMULATED interview responses for a product prototype of Voqiva, an AI customer-research platform in India. These are not real people; they let the team test the end-to-end flow.

STUDY OBJECTIVE: ${s.objective}
INTERVIEW LANGUAGE: English only. Write every answer, probe and summary in clear, natural English (no Hindi or Hinglish words), as an urban Indian customer would speak it.
QUESTIONS:
${JSON.stringify(qs.map(q=>({position:q.position,prompt:q.prompt,input_type:q.input_type,config:q.config})))}

PARTICIPANTS (answer the listed "todo" question positions for each):
${JSON.stringify(batch)}

Write realistic, specific answers grounded in Indian context (cities, commutes, prices in ₹, Indian and global brands). Vary opinions across participants: some enthusiastic, some sceptical, some indifferent; they should not all agree. 1-3 sentences per answer. For a slider question give "value" as an integer inside config min..max. For a choice question give "value" as an array of strings taken only from config.options (one item if multi is false). For voice questions you may add one follow-up: "probe" (the moderator's short follow-up) and "probe_answer".
Give each participant 2-4 "signals": short labels (2-4 words) for the key ideas they raised, each with polarity positive | neutral | negative | critical. Reuse the same label wording across participants when they raise the same idea, so the signals can be counted.

Reply with only a JSON array:
[{"session_id":"...","sentiment":"positive|neutral|negative","summary":"one sentence on where they stand","signals":[{"label":"...","polarity":"..."}],"answers":[{"position":1,"text":"...","value":null,"probe":null,"probe_answer":null}]}]`;
}
function applyAIInterview(s, qs, sess, r){
  let at = rows('TranscriptTurn',t=>t.session_id===sess.id).reduce((a,t)=>Math.max(a,t.start_ms+8000),2000);
  // drop a dangling moderator turn for the current question; we'll rewrite it
  const answered = new Set(rows('TranscriptTurn',t=>t.session_id===sess.id&&t.speaker==='participant').map(t=>t.question_id));
  delWhere('TranscriptTurn',t=>t.session_id===sess.id && t.speaker==='moderator' && !answered.has(t.question_id));
  (r.answers||[]).sort((a,b)=>a.position-b.position).forEach(a=>{
    const q = qs.find(x=>x.position===Number(a.position)); if(!q || answered.has(q.id) || !a.text) return;
    let v = a.value;
    if(q.input_type==='slider'){ v=Number(v); const c=q.config||{}; if(isNaN(v)) v=null; else v=Math.min(c.max??v,Math.max(c.min??v,v)); }
    if(q.input_type==='choice'){ const o=(q.config&&q.config.options)||[]; v=(Array.isArray(v)?v:[v]).filter(x=>o.includes(x)); if(!v.length) v=null; }
    at = writeTurns(sess, q, q.prompt, String(a.text), at, v);
    if(a.probe && a.probe_answer){
      ins('TranscriptTurn',{session_id:sess.id,question_id:q.id,speaker:'moderator',start_ms:at,text:String(a.probe)});
      const ps = at+3000+String(a.probe).length*60;
      ins('TranscriptTurn',{session_id:sess.id,question_id:q.id,speaker:'participant',start_ms:ps,text:String(a.probe_answer)});
      at = ps+12000+String(a.probe_answer).length*250;
    }
  });
  (r.signals||[]).slice(0,4).forEach(g=>{ if(g&&g.label) ins('Signal',{session_id:sess.id,label:String(g.label).slice(0,40),polarity:['positive','neutral','negative','critical'].includes(g.polarity)?g.polarity:'neutral'}); });
  finishSession(sess, s, T(sess.started_at)+at+15000, ['positive','neutral','negative'].includes(r.sentiment)?r.sentiment:'neutral', String(r.summary||'').slice(0,240) || autoSummary(sess));
}
async function runFieldwork(studyId){
  if(FIELD) return;
  const s = byId('Study',studyId); const qs = questionsOf(studyId);
  const todo = sessionsOf(studyId).filter(x=>x.screen_result==='qualified'&&!x.ended_at);
  if(!todo.length){ toast('All interviews are complete.'); return; }
  const scriptKey = DB._meta.scripts[studyId];
  FIELD = {studyId, ctl:new AbortController(), done:0, total:todo.length, msg:'Starting interviews…'};
  render();
  const B=5;
  try{
    for(let i=0;i<todo.length;i+=B){
      if(FIELD.ctl.signal.aborted) break;
      const batch = todo.slice(i,i+B);
      batch.forEach(x=>{ if(!x.started_at) x.started_at=iso(Date.now()); x.payout_status='pending'; });
      FIELD.msg = `Interviewing ${batch.map(x=>shortName(byId('Person',x.person_id).full_name)).join(', ')}`; render();
      let results = null;
      try{
        const payload = batch.map(x=>{ const p=byId('Person',x.person_id); const answered=new Set(rows('TranscriptTurn',t=>t.session_id===x.id&&t.speaker==='participant').map(t=>t.question_id));
          return {session_id:x.id,name:p.full_name,age:personAge(p),gender:p.gender,city:p.city,occupation:p.occupation,todo:qs.filter(q=>!answered.has(q.id)).map(q=>q.position)}; });
        const r = await aiJSON(fieldPrompt(s,qs,payload),{signal:FIELD.ctl.signal});
        if(Array.isArray(r)) results = r;
      }catch(e){ if(e&&e.code==='cancelled') break; FIELD.note = aiFail(e); }
      batch.forEach(x=>{
        const r = results && results.find(y=>y.session_id===x.id);
        if(r) applyAIInterview(s,qs,x,r);
        else { const g = genSessionFromPools(x,qs,scriptKey,{}); finishSession(x,s,T(x.started_at)+g.at+15000,g.score>0?'positive':g.score<0?'negative':'neutral',autoSummary(x)); }
        FIELD.done++;
      });
      save(); render();
    }
  } finally {
    const note = FIELD.note; FIELD=null; save(); render();
    toast(note ? 'Interviews done. '+note : 'Interviews done. Payouts released.');
  }
}

// ---------- synthesis ----------
let SYNTH = null;
function synthPrompt(s, done){
  const qs = questionsOf(s.id);
  const transcripts = done.map(x=>{
    const p = byId('Person',x.person_id);
    return {session_id:x.id, who:`${p.gender||''}, ${personAge(p)||'?'}, ${p.city||''}, ${p.occupation||''}`,
      turns: rows('TranscriptTurn',t=>t.session_id===x.id&&t.speaker==='participant').sort((a,b)=>a.start_ms-b.start_ms).map(t=>({ms:t.start_ms,q:(qs.find(q=>q.id===t.question_id)||{}).position,text:t.text}))};
  });
  const stats = qs.filter(q=>q.input_type==='slider'||q.input_type==='choice').map(q=>{
    const vals = rows('Answer',a=>a.question_id===q.id).map(a=>a.value_json.value);
    if(q.input_type==='slider'){ const v=vals.map(Number).sort((a,b)=>a-b); return {question:q.prompt,n:v.length,min:v[0],median:v[Math.floor((v.length-1)/2)],max:v[v.length-1]}; }
    const c={}; vals.flat().forEach(o=>c[o]=(c[o]||0)+1); return {question:q.prompt,n:vals.length,counts:c};
  });
  return `You are Voqiva's synthesis analyst. Synthesise these ${done.length} customer interviews into evidence-backed insights for a founder.

OBJECTIVE: ${s.objective}
QUESTIONS: ${JSON.stringify(qs.map(q=>({position:q.position,prompt:q.prompt})))}
STRUCTURED ANSWER STATS: ${JSON.stringify(stats)}
TRANSCRIPTS (participant turns only; ms = timestamp):
${JSON.stringify(transcripts)}

RULES
- 3 to 6 themes. category is one of unmet_need | buying_driver | friction | preference.
- For each theme list supporting_session_ids: every session that clearly expresses the idea. Be strict: only include a session if a turn supports it.
- For each theme give 1-4 evidence items: {"session_id","ms","quote"} where quote is copied VERBATIM from that session's turn with that ms (you may shorten it with "…" but do not change words).
- "metric_label": 3-7 words describing what the supporting participants share, e.g. "Cite creasing on the commute".
- Do not invent numbers. Counts are computed from your supporting_session_ids.
- headline: one sentence, the single most decision-relevant finding. summary: 2 sentences.
- recommendations: 3-5 items. workstream product | pricing | gtm | research. Include at least one "research" follow-up whose body_md is a ready-to-run study objective. body_md uses "- **Bold lead:** detail" bullets for non-research items. impact and effort are high | medium | low. theme_index points into your themes array (or null). Optional "projected": [{"label","value":number,"unit":"pct|inr|multiplier","description"}] for forward-looking estimates; these are shown as hypotheses, so only include them when useful.

Reply with only this JSON:
{"headline":"...","summary":"...","themes":[{"category":"...","name":"2-3 words","headline":"...","body":"2 sentences","metric_label":"...","supporting_session_ids":["..."],"evidence":[{"session_id":"...","ms":0,"quote":"..."}]}],
 "recommendations":[{"workstream":"...","title":"...","body_md":"...","impact":"...","effort":"...","theme_index":0,"track":"...","owner_team":"...","projected":[]}]}`;
}
function norm(t){ return String(t||'').toLowerCase().replace(/[^a-z0-9₹ ]/g,' ').replace(/\s+/g,' ').trim(); }
function ingestAISynthesis(s, r, done){
  const ids = new Set(done.map(x=>x.id));
  const themes = (Array.isArray(r.themes)?r.themes:[]).slice(0,6).map(t=>{
    const support = new Set((t.supporting_session_ids||[]).filter(id=>ids.has(id)));
    const evidence = [];
    (t.evidence||[]).forEach(e=>{
      if(!ids.has(e.session_id)) return;
      const turns = rows('TranscriptTurn',x=>x.session_id===e.session_id&&x.speaker==='participant');
      const q = norm(String(e.quote||'').replace(/…|\.\.\./g,' '));
      const words = q.split(' ').filter(w=>w.length>3).slice(0,6);
      // a quote only counts if it really appears in that participant's turns
      const turn = turns.find(x=>x.start_ms===Number(e.ms) && words.every(w=>norm(x.text).includes(w))) || turns.find(x=>words.length && words.every(w=>norm(x.text).includes(w)));
      if(turn){ support.add(e.session_id); if(!evidence.some(v=>v.turn.id===turn.id)) evidence.push({session_id:e.session_id,turn}); }
    });
    return {category:CAT_LABEL[t.category]?t.category:'preference',name:String(t.name||'Theme').slice(0,40),headline:String(t.headline||''),body:String(t.body||''),metric:String(t.metric_label||t.name||''),support,evidence};
  });
  const recs = (Array.isArray(r.recommendations)?r.recommendations:[]).slice(0,6).map(x=>({
    workstream:WS_LABEL[x.workstream]?x.workstream:'product',title:String(x.title||''),body_md:String(x.body_md||''),impact:['high','medium','low'].includes(x.impact)?x.impact:'medium',effort:['high','medium','low'].includes(x.effort)?x.effort:'medium',
    theme:Number.isInteger(x.theme_index)&&themes[x.theme_index]?x.theme_index:null,track:x.track||null,owner_team:x.owner_team||null,
    projected:(Array.isArray(x.projected)?x.projected:[]).filter(m=>m&&typeof m.value==='number'&&['pct','inr','multiplier'].includes(m.unit)).slice(0,2)}));
  const pricingRec = recs.find(x=>x.workstream==='pricing');
  const pq = questionsOf(s.id).find(q=>q.input_type==='slider'&&(q.config||{}).unit==='inr');
  if(pricingRec && pq){ const v=rows('Answer',a=>a.question_id===pq.id).map(a=>Number(a.value_json.value)).sort((a,b)=>a-b); if(v.length) pricingRec.willingnessAt = v[Math.floor((v.length-1)/2)]; }
  const sc = SCRIPTS[DB._meta.scripts[s.id]];
  writeSynthesis(s,{headline:String(r.headline||''),summary:String(r.summary||''),themes,recs,swatches:sc&&sc.swatches});
}
async function runSynthesis(studyId){
  if(SYNTH) return;
  const s = byId('Study',studyId);
  if(!s.closed_at && !isTriggerStudy(s)) closeAndRefund(s);
  const done = completedOf(studyId);
  SYNTH = {studyId, ctl:new AbortController(), chars:0};
  save(); render();
  let note = null;
  try{
    const r = await aiJSON(synthPrompt(s,done),{signal:SYNTH.ctl.signal,onText:({text})=>{ if(SYNTH){ SYNTH.chars=text.length; const el=document.getElementById('synth-progress'); if(el) el.textContent='Writing synthesis… '+Math.round(text.length/40)+' lines'; } }});
    ingestAISynthesis(s,r,done);
    if(!rows('Theme',t=>t.study_id===s.id).length) throw {code:'invalid_json'};
  }catch(e){
    if(e && e.code==='cancelled'){ SYNTH=null; save(); render(); return; }
    note = aiFail(e);
    const key = DB._meta.scripts[s.id];
    if(key) synthFromScript(s,key); else synthGeneric(s);
  }
  SYNTH = null; save();
  toast(note ? 'Synthesis ready. '+note : 'Synthesis ready.');
  go('report-'+studyId);
}
