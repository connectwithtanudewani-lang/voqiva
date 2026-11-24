// ---------- utilities ----------
function mkRng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
let RNG = Math.random;
function uid(){
  if (RNG===Math.random && window.crypto && crypto.randomUUID) return crypto.randomUUID();
  const h=()=>Math.floor(RNG()*16).toString(16);
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>c==='x'?h():(8+Math.floor(RNG()*4)).toString(16));
}
const pick = (arr,r=RNG)=>arr[Math.floor(r()*arr.length)];
const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const inr = n => '₹'+Math.round(Number(n)||0).toLocaleString('en-IN');
const pct = n => (Math.round(n*10)/10).toString().replace(/\.0$/,'')+'%';
const iso = ms => new Date(ms).toISOString();
const T = s => s ? new Date(s).getTime() : null;
function ago(ts){ if(!ts) return ''; const d=(Date.now()-T(ts))/1000; if(d<60) return 'just now'; if(d<3600) return Math.round(d/60)+'m ago'; if(d<86400) return Math.round(d/3600)+'h ago'; const dd=Math.round(d/86400); return dd===1?'yesterday':dd+'d ago'; }
function mmss(ms){ ms=Math.max(0,Math.round(ms/1000)); return Math.floor(ms/60)+':'+String(ms%60).padStart(2,'0'); }
function durTxt(ms){ const m=Math.round(ms/60000); if(m<60) return m+'m'; const h=Math.floor(m/60); return h+'h '+String(m%60).padStart(2,'0')+'m'; }
function initials(n){ return String(n||'?').split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase(); }
function shortName(n){ const p=String(n||'').split(' '); return p.length>1? p[0]+' '+p[p.length-1][0]+'.' : n; }

// ---------- store (mirrors the data model; + Study.methodology and Answer) ----------
const TABLES = ['PromptTemplate','FeeSchedule','Person','Workspace','User','Membership','WalletTransaction','CohortImport','Study','AudienceCriterion','Question','Session','Answer','TranscriptTurn','Signal','Theme','Evidence','Recommendation','Metric'];
let DB = null;
const STORE_KEY = 'voqiva-proto-v3';
function emptyDB(){ const d={_meta:{scripts:{}}}; TABLES.forEach(t=>d[t]=[]); return d; }
function rows(t, f){ return f? DB[t].filter(f) : DB[t]; }
function one(t, f){ return DB[t].find(f); }
function byId(t, id){ return id? DB[t].find(r=>r.id===id) : null; }
function ins(t, row){ if(!row.id) row.id=uid(); DB[t].push(row); return row; }
function upd(t, id, patch){ const r=byId(t,id); if(r) Object.assign(r,patch); if(t==='Study'&&r) r.updated_at=iso(Date.now()); return r; }
function delWhere(t, f){ DB[t]=DB[t].filter(r=>!f(r)); }
let saveTimer=null;
function save(){ clearTimeout(saveTimer); saveTimer=setTimeout(()=>{ try{ localStorage.setItem(STORE_KEY, JSON.stringify(DB)); }catch(e){} },250); }
function load(){ try{ const s=localStorage.getItem(STORE_KEY); if(s){ const d=JSON.parse(s); if(d && d.Study) { TABLES.forEach(t=>{ if(!d[t]) d[t]=[]; }); return d; } } }catch(e){} return null; }

// ---------- derived values ----------
function feeOf(kind){ const f=one('FeeSchedule',r=>r.kind===kind); return f? f.amount_inr : 0; }
function walletBalance(wsId){ return rows('WalletTransaction',t=>t.workspace_id===wsId).reduce((a,t)=>a+t.amount_inr,0); }
function studyStatus(s){ if(!s.launched_at) return 'draft'; if(!s.closed_at) return 'live'; if(!s.synthesized_at) return 'synthesizing'; return 'ready'; }
const STATUS_LABEL = {draft:'Draft',live:'Live',synthesizing:'Synthesizing',ready:'Insights Ready'};
function personAge(p){ if(!p.birth_date) return null; const b=new Date(p.birth_date), n=new Date(); let a=n.getFullYear()-b.getFullYear(); if(n<new Date(n.getFullYear(),b.getMonth(),b.getDate())) a--; return a; }
function sessionsOf(studyId){ return rows('Session',s=>s.study_id===studyId); }
function completedOf(studyId){ return sessionsOf(studyId).filter(s=>s.screen_result==='qualified'&&s.ended_at); }
function questionsOf(studyId){ return rows('Question',q=>q.study_id===studyId).sort((a,b)=>a.position-b.position); }
function criteriaOf(studyId){ return rows('AudienceCriterion',c=>c.study_id===studyId); }
function studyBudget(s){
  const n=s.sample_size||0, inc=s.incentive_inr||0;
  const incent=n*inc, syn=feeOf('synthesis_fee'), dis=feeOf('disbursement_fee');
  return {n,inc,incent,syn,dis,total:incent+syn+dis};
}
const REWARD_LABEL = {upi_cash:'UPI cash',amazon_voucher:'Amazon voucher',myntra_voucher:'Myntra voucher',mobile_recharge:'Mobile recharge'};
const METHOD_LABEL = {whatsapp_voice:'WhatsApp voice notes',voice_interview:'AI voice interview',survey:'Micro-survey + voice',voice_plus_whatsapp:'AI voice + WhatsApp chat'};
const LANG_LABEL = {english:'English',hindi:'Hindi',hinglish:'English + Hinglish'};
const INPUT_LABEL = {voice:'Voice answer',voice_with_card:'Voice + WhatsApp visual card',slider:'Slider + justification',choice:'Multiple choice',text:'Typed answer'};
const CAT_LABEL = {unmet_need:'Unmet need',buying_driver:'Buying driver',friction:'Friction',preference:'Preference'};
const WS_LABEL = {product:'Product',pricing:'Pricing',gtm:'GTM',research:'Research'};

// ---------- audience matching ----------
const KNOWN_ATTRS = ['gender','age','city','industry','d2c_fashion_orders_60d','quick_commerce_orders_30d','skincare_buyer','upi_verified','aadhaar_verified','linkedin_verified'];
function personValue(p, attr){
  switch(attr){
    case 'gender': return p.gender;
    case 'age': return personAge(p);
    case 'city': return p.city;
    case 'upi_verified': return p.upi_verified_at? true : false;
    case 'aadhaar_verified': return p.aadhaar_verified_at? true : false;
    case 'linkedin_verified': return p.linkedin_verified_at? true : false;
    default: return p.attributes? p.attributes[attr] : undefined;
  }
}
function critPass(p, c){
  if(!KNOWN_ATTRS.includes(c.attribute)) return true;      // free-text rules are checked by the screener question
  const v = personValue(p, c.attribute);
  if(v===undefined || v===null) return true;                // imported customers may lack a field
  const x = c.value;
  switch(c.operator){
    case 'eq': return String(v).toLowerCase()===String(x).toLowerCase();
    case 'in': return (Array.isArray(x)?x:[x]).map(s=>String(s).toLowerCase()).includes(String(v).toLowerCase());
    case 'between': return Array.isArray(x) && v>=x[0] && v<=x[1];
    case 'gte': return Number(v)>=Number(x);
  }
  return true;
}
function matchesAll(p, crits){
  // city rules with quotas are alternatives (OR) — every other rule must hold (AND)
  const cityRules = crits.filter(c=>c.attribute==='city'&&c.operator==='eq');
  const others = crits.filter(c=>!(c.attribute==='city'&&c.operator==='eq'));
  if(cityRules.length && !cityRules.some(c=>critPass(p,c))) return false;
  return others.every(c=>critPass(p,c));
}
function audienceBase(src){
  if(src.audience_source==='cohort_import') return rows('Person',p=>p.cohort_import_id===src.cohort_import_id);
  if(src.audience_source==='parent_study'){ const ids=new Set(completedOf(src.parent_study_id).map(s=>s.person_id)); return rows('Person',p=>ids.has(p.id)); }
  return rows('Person',p=>!p.cohort_import_id);
}
function feasibility(src, crits){
  const base = audienceBase(src);
  const m = base.filter(p=>matchesAll(p,crits));
  return {base:base.length, match:m.length, people:m};
}
function estTurnaround(n, mins){ // recruitment + interviews in parallel waves of 8 + synthesis
  const waves = Math.ceil((n||1)/8);
  return 35*60000 + waves*((mins||10)+6)*60000 + 20*60000;
}

// ---------- seed ----------
function seed(){
  DB = emptyDB(); RNG = mkRng(20261122);
  const now = Date.now(), H=3600000, D=86400000;
  ins('FeeSchedule',{kind:'synthesis_fee',amount_inr:1500});
  ins('FeeSchedule',{kind:'disbursement_fee',amount_inr:500});
  [['Apparel Sizing & Fit','Why do first-time buyers return our relaxed-fit kurtas for size issues, and what would help them pick the right size?'],
   ['Skincare Ingredient Trust','What makes first-time skincare buyers in India trust (or distrust) an ingredient list from a new D2C brand?'],
   ['Quick Checkout Friction','Why are mobile shoppers abandoning checkout at the payment step on our Shopify store, and what would get them to complete the order?'],
   ['Price Elasticity (₹999 vs ₹1,499)','Would our core customers pay ₹1,499 instead of ₹999 for a premium version of our cotton tee, and what would justify the difference?']
  ].forEach(([l,t])=>ins('PromptTemplate',{label:l,prompt_text:t,placement:'home_suggestion'}));
  [['Validate New Product Concept','Validate demand for a new product concept among [target customers] in [cities]. We want to understand the unmet need, which features matter most, and willingness to pay between ₹[low]–₹[high].'],
   ['Diagnose Repeat Purchase Churn','Find out why first-time buyers of [product] are not reordering within 60 days, what went wrong in their first weeks, and what would bring them back.'],
   ['Price Sensitivity & WTP Testing','Test willingness to pay for [product] between ₹[low] and ₹[high] among [target customers], and which competitors they compare us against.'],
   ['Competitor Switching','Understand why customers switch from [competitor] to other brands in [category], and what would make them switch to us.'],
   ['Unboxing UX Audit','Audit the unboxing experience of our recent orders: first impressions, packaging, instructions and anything that confused or delighted customers.']
  ].forEach(([l,t])=>ins('PromptTemplate',{label:l,prompt_text:t,placement:'scenario_starter'}));

  const ws = ins('Workspace',{name:'UrbanKhaadi D2C',auto_reload_mandate_ref:'UPI-MANDATE-7Q2K19'});
  const ws2 = ins('Workspace',{name:'Kaapi Kulture Co.',auto_reload_mandate_ref:null});
  const u = ins('User',{full_name:'Aditya Rao',email:'aditya@urbankhaadi.in'});
  ins('Membership',{workspace_id:ws.id,user_id:u.id,title:'Founder'});
  ins('Membership',{workspace_id:ws2.id,user_id:u.id,title:'Advisor'});
  const u2 = ins('User',{full_name:'Meera Iyer',email:'meera@urbankhaadi.in'});
  ins('Membership',{workspace_id:ws.id,user_id:u2.id,title:'Head of Growth'});
  ins('WalletTransaction',{workspace_id:ws2.id,kind:'topup',amount_inr:10000,created_at:iso(now-3*D)});

  // panel
  const cityPick = ()=>{ const tot=CITIES.reduce((a,c)=>a+c[1],0); let r=RNG()*tot; for(const [c,w] of CITIES){ if((r-=w)<0) return c; } return 'Bengaluru'; };
  const mkPerson = (o)=>{
    const g = o.gender || (RNG()<0.56?'male':'female');
    const first = o.first || pick(PANEL_NAMES[g]);
    const ind = o.industry || pick(Object.keys(INDUSTRY_JOBS));
    const age = o.age || (21+Math.floor(RNG()*15));
    const by = new Date(now).getFullYear()-age-1, bm=1+Math.floor(RNG()*12);
    const verifiedNone = o.verifiedNone;
    const p = {
      cohort_import_id:o.cohort||null,
      full_name: o.full_name || first+' '+String.fromCharCode(65+Math.floor(RNG()*26)),
      phone: '+91 9'+String(Math.floor(RNG()*1e9)).padStart(9,'0'),
      gender:g, birth_date: `${by}-${String(bm).padStart(2,'0')}-${String(1+Math.floor(RNG()*27)).padStart(2,'0')}`,
      city: o.city || cityPick(), occupation: o.occupation || pick(INDUSTRY_JOBS[ind]),
      attributes: Object.assign({industry:ind, d2c_fashion_orders_60d:Math.floor(RNG()*5), quick_commerce_orders_30d:Math.floor(RNG()*12), skincare_buyer:RNG()<0.45}, o.attrs||{}),
      upi_vpa:null,
      aadhaar_verified_at: verifiedNone? null : (o.cohort? null : (RNG()<0.93? iso(now-(20+RNG()*300)*D):null)),
      linkedin_verified_at: verifiedNone? null : (o.cohort? null : (RNG()<0.62? iso(now-(20+RNG()*300)*D):null)),
      upi_verified_at: verifiedNone? null : (RNG()<0.95? iso(now-(10+RNG()*300)*D):null)
    };
    if(p.upi_verified_at) p.upi_vpa = p.full_name.split(' ')[0].toLowerCase()+Math.floor(RNG()*900+100)+'@'+pick(['okaxis','ybl','paytm','okhdfcbank','oksbi']);
    if(o.verify) Object.assign(p,o.verify);
    return ins('Person',p);
  };
  const T0 = iso(now-200*D);
  const named = {
    rohan: mkPerson({full_name:'Rohan Mehta',gender:'male',age:26,city:'Bengaluru',occupation:'Senior Product Designer at FinTech',industry:'FinTech',attrs:{d2c_fashion_orders_60d:3},verify:{aadhaar_verified_at:T0,linkedin_verified_at:T0,upi_verified_at:T0}}),
    arjun: mkPerson({full_name:'Arjun Kapoor',gender:'male',age:24,city:'Mumbai',occupation:'Growth Marketer at D2C Beauty',industry:'Agency',attrs:{d2c_fashion_orders_60d:4},verify:{aadhaar_verified_at:null,linkedin_verified_at:null,upi_verified_at:T0}}),
    sid: mkPerson({full_name:'Siddharth Verma',gender:'male',age:28,city:'Pune',occupation:'Backend Engineer at SaaS',industry:'Tech',attrs:{d2c_fashion_orders_60d:2},verify:{aadhaar_verified_at:null,linkedin_verified_at:T0,upi_verified_at:T0}}),
    karan: mkPerson({full_name:'Karan Pillai',gender:'male',age:25,city:'Bengaluru',occupation:'Account Executive at AdTech',industry:'Agency',attrs:{d2c_fashion_orders_60d:2},verify:{aadhaar_verified_at:T0,linkedin_verified_at:null,upi_verified_at:T0}})
  };
  for(let i=0;i<236;i++) mkPerson({verifiedNone: i%45===7});

  // ledger: opening top-up
  ins('WalletTransaction',{workspace_id:ws.id,kind:'topup',amount_inr:40000,created_at:iso(now-21*D)});

  // ---- Study A: snacks (panel, survey, ready) ----
  const sA = mkStudy(ws,u,{title:'Quick-Commerce Snack Pricing Elasticity (₹199 vs ₹249)',domain:'Food & Quick-commerce',methodology:'survey',
    objective:'Test willingness to pay for a 100 g pack of artisanal roasted makhana between ₹149 and ₹299 among Gen-Z and young working adults who order snacks on Blinkit, Zepto or Instamart, and what makes them try a new snack brand.',
    sample_size:30,incentive_inr:100,reward_type:'mobile_recharge',language:'english',max_duration_min:6,created_at:iso(now-3*D),launched_at:iso(now-2*D-5*H)});
  addCrit(sA,[['age','between',[19,30],null,'Ages 19–30'],['quick_commerce_orders_30d','gte',4,null,'4+ quick-commerce orders in 30 days'],['upi_verified','eq',true,null,'UPI verified']]);
  const qA = addQs(sA,[
    ['screener','Ordering habit','How often do you order snacks on Blinkit, Zepto or Instamart?','choice','Frequency of quick-commerce snack orders.',{options:['Daily','2–3 times a week','Weekly','Rarely'],multi:false}],
    ['interview','Price sensitivity','What\'s the most you\'d pay for a 100 g pack of artisanal roasted makhana?','slider','Find the impulse ceiling and what justifies paying more.',{min:149,max:299,step:10,unit:'inr'}],
    ['interview','Choice drivers','What decides whether you add a new snack brand to your cart?','choice','Rank flavour, protein, price, ratings and brand.',{options:['Flavour','Protein content','Price','Ratings & reviews','Brand'],multi:true}],
    ['interview','Trial triggers','What would make you try a new makhana brand?','voice','Flavour fatigue, trust signals, pack-size clarity.',null]]);
  const candA = rows('Person',p=>!p.cohort_import_id && !Object.values(named).includes(p) && personAge(p)>=19 && personAge(p)<=30 && (p.upi_verified_at||p.aadhaar_verified_at)).slice(0,32);
  candA.forEach(p=>{ p.attributes.quick_commerce_orders_30d = Math.max(4,p.attributes.quick_commerce_orders_30d); });
  candA[3].upi_verified_at=null; candA[3].aadhaar_verified_at=null; candA[3].upi_vpa=null;
  candA[17].upi_verified_at=null; candA[17].aadhaar_verified_at=null; candA[17].upi_vpa=null;
  fieldSeed(sA,'snacks',qA,candA,{t0:T(sA.launched_at)});
  chargeLaunch(sA);
  closeAndRefund(sA, T(sA.launched_at)+3*H);
  synthFromScript(sA,'snacks', T(sA.launched_at)+3.4*H);

  // ---- Study B: skincare (Shopify cohort, ready) ----
  const ciB = ins('CohortImport',{workspace_id:ws.id,name:'Shopify · First-time buyers, no reorder in 60 days',source:'shopify',created_at:iso(now-9*H)});
  const skinPeople=[]; for(let i=0;i<64;i++) skinPeople.push(mkPerson({cohort:ciB.id,gender:'female',age:24+Math.floor(RNG()*12),city:pick(['Delhi NCR','Mumbai','Delhi NCR','Mumbai','Bengaluru']),attrs:{skincare_buyer:true,shopify_orders:1}}));
  const sB = mkStudy(ws,u,{title:'First-Time Skincare Churn & Routine Audit',domain:'D2C Skincare',methodology:'whatsapp_voice',audience_source:'cohort_import',cohort_import_id:ciB.id,
    objective:'Find out why first-time buyers of our vitamin C and niacinamide serums are not reordering within 60 days, what went wrong in their first weeks, and what would bring them back.',
    sample_size:25,incentive_inr:200,reward_type:'amazon_voucher',language:'english',max_duration_min:10,created_at:iso(now-8*H),launched_at:iso(now-7*H)});
  addCrit(sB,[['gender','eq','female',null,'Women'],['age','between',[24,35],null,'Ages 24–35']]);
  const qB = addQs(sB,[
    ['screener','First purchase','What made you buy from us the first time?','voice','Discovery channel and the promise that convinced them.',null],
    ['interview','First week','Walk me through how you used the products in your first week.','voice','Order of use, instructions, routine.',null],
    ['interview','Drop-off moment','What happened that made you stop or slow down?','voice','The exact moment and feeling when they stopped.',null],
    ['interview','Win-back','What would make you order again?','voice','Concrete fixes in their own words.',null],
    ['interview','Win-back options','Which of these would most likely bring you back?','choice','Rank the four win-back levers.',{options:['Routine card in the box','Day-3 WhatsApp check-in','Mini trial pack','Discount on reorder'],multi:true}]]);
  fieldSeed(sB,'skincare',qB,skinPeople.slice(0,25),{t0:T(sB.launched_at)});
  chargeLaunch(sB);
  closeAndRefund(sB, T(sB.launched_at)+2.6*H);
  synthFromScript(sB,'skincare', T(sB.launched_at)+3*H);

  // ---- Study C: officewear (panel, live) ----
  const sC = mkStudy(ws,u,{title:'Oversized Officewear Validation',domain:'D2C Menswear',methodology:'voice_interview',
    objective:'Validate demand for oversized officewear among working men aged 22–30 in Bengaluru, Mumbai, and Pune. We want to understand whether they prefer structured collar shirts over baggy tees for casual Fridays, willingness to pay between ₹1,499–₹2,199, and key concerns regarding fabric breathability during humid commutes.',
    sample_size:25,incentive_inr:300,reward_type:'upi_cash',language:'english',max_duration_min:10,created_at:iso(now-2*H),launched_at:iso(now-102*60000)});
  addCrit(sC,[['gender','eq','male',null,'Men'],['age','between',[22,30],null,'Ages 22–30'],
    ['city','eq','Bengaluru',40,'Bengaluru'],['city','eq','Mumbai',35,'Mumbai'],['city','eq','Pune',25,'Pune'],
    ['industry','in',['Tech','Consulting','Agency','FinTech'],null,'Tech, consulting, agency & fintech'],
    ['d2c_fashion_orders_60d','gte',2,null,'Buys D2C fashion online 2+ times in 60 days'],['upi_verified','eq',true,null,'UPI verified']]);
  const qC = addQs(sC,[
    ['screener','Brand & dress code','How often do you dress down for work, and what brand was your last casual shirt from?','voice','Brand affinity (Uniqlo, Snitch, Massimo Dutti) and in-office formality norms.',null],
    ['interview','Fit & aesthetic perception','When you hear "oversized workwear", do you imagine relaxed drop-shoulder linen or baggy streetwear?','voice_with_card','Separate streetwear slouch from relaxed executive minimalism.',{card:'Lookbook card: 3 silhouettes'}],
    ['interview','Price sensitivity','Between ₹1,499 and ₹2,199, what\'s the most you\'d pay for this shirt, compared with Zara, Bombay Shirt Company or Snitch?','slider','Premium boundary and willingness to trade up from mass-market.',{min:1499,max:2199,step:50,unit:'inr'}],
    ['interview','Commute & fabric friction','What is your biggest fear with relaxed fits during your daily commute (metro or auto)?','voice','Sweat patches, snagging, creasing and collar rigidity.',null],
    ['interview','Colour preference','Which colours would you wear to the office on repeat?','choice','Palette for the first drop.',{options:['Mineral Sage','Slate Gray','Off-White Raw','Deep Navy','Bold prints','Neon accents'],multi:true}]]);
  const crC = criteriaOf(sC.id);
  const poolC = rows('Person',p=>!p.cohort_import_id && !Object.values(named).includes(p) && p.gender==='male' && ['Bengaluru','Mumbai','Pune'].includes(p.city) && personAge(p)>=22 && personAge(p)<=30 && p.upi_verified_at);
  poolC.forEach(p=>{ if(!['Tech','Consulting','Agency','FinTech'].includes(p.attributes.industry)){ p.attributes.industry=pick(['Tech','Consulting','Agency','FinTech']); p.occupation=pick(INDUSTRY_JOBS[p.attributes.industry]); } p.attributes.d2c_fashion_orders_60d=Math.max(2,p.attributes.d2c_fashion_orders_60d); });
  while(poolC.length<23){ const p=mkPerson({gender:'male',age:22+Math.floor(RNG()*9),city:pick(['Bengaluru','Mumbai','Pune']),industry:pick(['Tech','Consulting','Agency','FinTech']),attrs:{d2c_fashion_orders_60d:3}}); p.upi_verified_at=p.upi_verified_at||iso(now-40*D); poolC.push(p); }
  const peopleC = [named.rohan,named.arjun].concat(poolC.slice(0,17)).concat([named.sid,named.karan]).concat(poolC.slice(17,21));
  fieldSeed(sC,'officewear',qC,peopleC,{t0:T(sC.launched_at),live:[19,20,21,22],queued:[23,24],
    overrides:{[named.rohan.id]:{2:1,3:0,4:1,5:0,summary:'Strongly in favour of structured drop-shoulder silhouettes. Noted severe discomfort with rigid slim collars on humid office commutes.'},
               [named.arjun.id]:{2:0,3:5,4:2,summary:'Ready to buy at ₹1,899 if the breathable linen blend prevents underarm staining in coastal humidity.'},
               [named.sid.id]:{1:0,2:4,4:0},[named.karan.id]:{1:1}}});
  chargeLaunch(sC);

  // ---- Study D: khadi (Shopify cohort, draft) ----
  const ciD = ins('CohortImport',{workspace_id:ws.id,name:'Shopify · High-LTV customers (3+ orders)',source:'shopify',created_at:iso(now-2*D-2*H)});
  for(let i=0;i<120;i++) mkPerson({cohort:ciD.id,age:25+Math.floor(RNG()*20),attrs:{shopify_orders:3+Math.floor(RNG()*6)}});
  const sD = mkStudy(ws,u,{title:'Summer Khadi Fabric Feel & Longevity Expectations',domain:'D2C Apparel',methodology:'whatsapp_voice',audience_source:'cohort_import',cohort_import_id:ciD.id,
    objective:'Understand how our high-LTV customers judge khadi fabric feel in summer, how long they expect a khadi shirt to last, and what would make them buy our new summer khadi line.',
    sample_size:20,incentive_inr:150,reward_type:'upi_cash',language:'english',max_duration_min:8,created_at:iso(now-2*D)});
  addQs(sD,[
    ['screener','Summer wardrobe','What do you usually wear on hot summer workdays, and where do you buy it?','voice','Current summer staples and stores.',null],
    ['interview','Fabric feel','When you touch a khadi shirt, what tells you it\'s good quality?','voice','Texture, weight and drape cues.',null],
    ['interview','Longevity','How many washes should a ₹2,000 khadi shirt survive before it looks old?','slider','Expected lifespan.',{min:10,max:100,step:5,unit:'washes'}],
    ['interview','Purchase triggers','What would make you buy from our new summer khadi line?','voice','Concrete triggers and objections.',null]]);

  // second top-up so the opening wallet matches the brand's real history
  seedV2(ws,u,{ciB,ciD,sA,sB});
  ins('WalletTransaction',{workspace_id:ws.id,kind:'topup',amount_inr:7500,created_at:iso(now-4*H)});

  RNG = Math.random;
  return {ws, u};

  function mkStudy(ws,u,o){
    return ins('Study',Object.assign({workspace_id:ws.id,created_by:u.id,parent_study_id:null,cohort_import_id:null,audience_source:'voqiva_panel',
      launched_at:null,closed_at:null,synthesized_at:null,headline:null,summary:null,confidence_pct:null,share_token:null,updated_at:o.created_at},o));
  }
}
function addCrit(s, list){ list.forEach(([attribute,operator,value,quota_pct,label])=>ins('AudienceCriterion',{study_id:s.id,attribute,operator,value:{v:value,label},quota_pct})); }
// AudienceCriterion.value is json: {v, label}
function cv(c){ return c.value && typeof c.value==='object' && 'v' in c.value ? c.value.v : c.value; }
function clabel(c){ return (c.value && c.value.label) || (c.attribute+' '+c.operator+' '+JSON.stringify(cv(c))); }
function critRows(studyId){ return criteriaOf(studyId).map(c=>({attribute:c.attribute,operator:c.operator,value:cv(c),quota_pct:c.quota_pct})); }
function addQs(s, list){ return list.map(([kind,section,prompt,input_type,probe_goal,config],i)=>ins('Question',{study_id:s.id,position:i+1,kind,section,prompt,input_type,probe_goal,config})); }

// ---------- payouts / ledger ----------
function payoutRef(type){ const n=String(Math.floor(Math.random()*1e10)).padStart(10,'0'); return {upi_cash:'UPI/'+n, amazon_voucher:'AMZ-GC-'+n.slice(0,6), myntra_voucher:'MYN-GC-'+n.slice(0,6), mobile_recharge:'RCH-'+n.slice(0,8)}[type]||('PAY-'+n); }
function chargeLaunch(s){
  const b = studyBudget(s), t=s.launched_at;
  ins('WalletTransaction',{workspace_id:s.workspace_id,study_id:s.id,kind:'incentive_reserve',amount_inr:-b.incent,created_at:t});
  ins('WalletTransaction',{workspace_id:s.workspace_id,study_id:s.id,kind:'synthesis_fee',amount_inr:-b.syn,created_at:t});
  ins('WalletTransaction',{workspace_id:s.workspace_id,study_id:s.id,kind:'disbursement_fee',amount_inr:-b.dis,created_at:t});
}
function closeAndRefund(s, at){
  at = at || Date.now();
  upd('Study',s.id,{closed_at:iso(at)});
  const paid = sessionsOf(s.id).filter(x=>x.payout_status==='paid').length;
  const unused = Math.max(0,(s.sample_size||0)-paid);
  if(unused>0) ins('WalletTransaction',{workspace_id:s.workspace_id,study_id:s.id,kind:'refund',amount_inr:unused*(s.incentive_inr||0),created_at:iso(at)});
}

// ---------- fieldwork (rule-based generator, used for seeds and as AI fallback) ----------
function poolFor(scriptKey, q){
  const sc = SCRIPTS[scriptKey];
  if(sc && sc.pools[q.position]) return sc.pools[q.position];
  if(q.input_type==='slider'){ const c=q.config||{}; const lo=c.min||0, hi=c.max||100, st=c.step||1; return [0.3,0.5,0.6,0.75,0.9].map(f=>({v:Math.round((lo+(hi-lo)*f)/st)*st,t:'Somewhere around there feels right to me for a first purchase.',tags:[],s:0})); }
  if(q.input_type==='choice'){ const o=(q.config&&q.config.options)||['Yes','No']; return o.map(x=>({v:[x],t:x+', mainly.',tags:[],s:0})); }
  return GENERIC.voice;
}
function signalMapFor(scriptKey){ return (SCRIPTS[scriptKey]&&SCRIPTS[scriptKey].signalMap) || GENERIC.signalMap; }
function writeTurns(session, q, modText, parText, atMs, value){
  const m = ins('TranscriptTurn',{session_id:session.id,question_id:q.id,speaker:'moderator',start_ms:atMs,text:modText});
  const pStart = atMs + 3000 + modText.length*60;
  ins('TranscriptTurn',{session_id:session.id,question_id:q.id,speaker:'participant',start_ms:pStart,text:parText});
  if(value!==undefined && value!==null && (q.input_type==='slider'||q.input_type==='choice')) ins('Answer',{session_id:session.id,question_id:q.id,value_json:{value}});
  return pStart + 15000 + parText.length*250 + Math.floor(RNG()*40000);
}
function genSessionFromPools(session, questions, scriptKey, opts){
  opts = opts||{};
  const ov = opts.override||{};
  const existing = new Set(rows('TranscriptTurn',t=>t.session_id===session.id&&t.speaker==='participant').map(t=>t.question_id));
  let at = opts.startMs!=null? opts.startMs : (rows('TranscriptTurn',t=>t.session_id===session.id).reduce((a,t)=>Math.max(a,t.start_ms+8000),2000));
  let score=0; const tags=new Set();
  const upTo = opts.upTo || questions.length;
  for(const q of questions){
    if(q.position>upTo) break;
    if(existing.has(q.id)) continue;
    const pool = poolFor(scriptKey,q);
    const e = ov[q.position]!=null ? pool[ov[q.position]] : pool[Math.floor(RNG()*pool.length)];
    at = writeTurns(session, q, q.prompt, e.t, at, e.v);
    score += e.s||0; (e.tags||[]).forEach(t=>tags.add(t));
  }
  if(opts.currentQ){ ins('TranscriptTurn',{session_id:session.id,question_id:opts.currentQ.id,speaker:'moderator',start_ms:at,text:opts.currentQ.prompt}); }
  const sm = signalMapFor(scriptKey);
  [...tags].slice(0,4).forEach(t=>{ if(sm[t]) ins('Signal',{session_id:session.id,label:sm[t][0],polarity:sm[t][1]}); });
  return {score, at, tags};
}
function fieldSeed(s, scriptKey, questions, people, o){
  DB._meta.scripts[s.id] = scriptKey;
  const live = new Set(o.live||[]), queued = new Set(o.queued||[]);
  let qualified = 0;
  people.forEach((p,i)=>{
    const fraud = s.audience_source==='voqiva_panel' && !p.upi_verified_at && !p.aadhaar_verified_at;
    const sess = ins('Session',{study_id:s.id,person_id:p.id,screen_result:fraud?'fraud':'qualified',started_at:null,ended_at:null,recording_url:null,sentiment:null,summary:null,payout_status:null,payout_ref:null});
    if(fraud) return;
    qualified++;
    if(queued.has(i)) return;
    const start = o.t0 + (12 + i*3.6 + RNG()*4)*60000;
    sess.started_at = iso(start);
    const ov = (o.overrides||{})[p.id]||{};
    if(live.has(i)){
      const upTo = i%2? 1 : 2;
      genSessionFromPools(sess, questions, scriptKey, {override:ov, upTo, startMs:2000, currentQ:questions[upTo]});
      sess.payout_status='pending';
      return;
    }
    const r = genSessionFromPools(sess, questions, scriptKey, {override:ov, startMs:2000});
    finishSession(sess, s, start + r.at + 15000, r.score>0?'positive':r.score<0?'negative':'neutral', ov.summary || autoSummary(sess));
  });
}
function autoSummary(sess){
  const t = rows('TranscriptTurn',x=>x.session_id===sess.id&&x.speaker==='participant').sort((a,b)=>b.text.length-a.text.length)[0];
  return t? t.text.slice(0,170) : '';
}
function finishSession(sess, study, endMs, sentiment, summary){
  sess.ended_at = iso(endMs); sess.sentiment = sentiment; sess.summary = summary;
  sess.payout_status = 'paid'; sess.payout_ref = payoutRef(study.reward_type);
}

// ---------- synthesis writer (shared by AI and rule-based paths) ----------
function writeSynthesis(study, R){
  // clear previous
  const oldThemes = rows('Theme',t=>t.study_id===study.id).map(t=>t.id);
  delWhere('Evidence',e=>oldThemes.includes(e.theme_id));
  delWhere('Theme',t=>t.study_id===study.id); delWhere('Recommendation',r=>r.study_id===study.id); delWhere('Metric',m=>m.study_id===study.id);
  const done = completedOf(study.id); const N = done.length || 1;
  let tpos=0;
  const made = R.themes.map(t=>{
    if(!t.support || t.support.size===0) return null;
    const i = tpos++;
    const verified = t.support.size>=3 && t.support.size/N>=0.4;
    const th = ins('Theme',{study_id:study.id,position:i+1,category:t.category,name:t.name,headline:t.headline,body:t.body,evidence_level:verified?'verified':'emerging',supporting_session_ids:[...t.support]});
    t.evidence.slice(0,6).forEach((e,j)=>{
      ins('Evidence',{theme_id:th.id,session_id:e.session_id,start_ms:e.turn.start_ms,end_ms:e.turn.start_ms+15000+e.turn.text.length*250,quote:e.turn.text,is_featured:j===0});
    });
    ins('Metric',{study_id:study.id,theme_id:th.id,recommendation_id:null,position:1,label:t.metric||t.name,description:null,participant_count:t.support.size,value:Math.round(t.support.size/N*1000)/10,unit:'pct',swatch_hex:null});
    th._support = t.support;
    return th;
  });
  const themes = made.filter(Boolean);
  // headline metrics
  let pos=1;
  const byCat = c=>themes.find(t=>t.category===c);
  const firstT = themes[0], fr = byCat('friction');
  [firstT, fr && fr!==firstT ? fr : themes[1]].filter(Boolean).forEach(t=>{
    const m = one('Metric',x=>x.theme_id===t.id);
    ins('Metric',{study_id:study.id,theme_id:null,recommendation_id:null,position:pos++,label:m.label,description:t.name,participant_count:m.participant_count,value:m.value,unit:'pct',swatch_hex:null});
  });
  const pq = questionsOf(study.id).find(q=>q.input_type==='slider' && (q.config||{}).unit==='inr');
  if(pq){
    const vals = rows('Answer',a=>a.question_id===pq.id && done.some(s=>s.id===a.session_id)).map(a=>Number(a.value_json.value)).filter(v=>!isNaN(v)).sort((a,b)=>a-b);
    if(vals.length){ const med = vals[Math.floor((vals.length-1)/2)];
      ins('Metric',{study_id:study.id,theme_id:null,recommendation_id:null,position:pos++,label:'Median willingness to pay',description:'From '+vals.length+' slider answers to “'+pq.section+'”',participant_count:vals.length,value:med,unit:'inr',swatch_hex:null}); }
  } else if(themes[2]) {
    const m = one('Metric',x=>x.theme_id===themes[2].id);
    ins('Metric',{study_id:study.id,theme_id:null,recommendation_id:null,position:pos++,label:m.label,description:themes[2].name,participant_count:m.participant_count,value:m.value,unit:'pct',swatch_hex:null});
  }
  // colour swatches from a choice question
  if(R.swatches){
    const cq = questionsOf(study.id).find(q=>q.input_type==='choice' && (q.config&&q.config.options||[]).some(o=>R.swatches[o]));
    const pref = themes.find(t=>t.category==='preference');
    if(cq && pref){
      const ans = rows('Answer',a=>a.question_id===cq.id); const n=ans.length||1;
      cq.config.options.filter(o=>R.swatches[o]).map(o=>({o,c:ans.filter(a=>(a.value_json.value||[]).includes(o)).length})).sort((a,b)=>b.c-a.c).slice(0,4)
        .forEach((x,i)=>ins('Metric',{study_id:study.id,theme_id:pref.id,recommendation_id:null,position:2+i,label:x.o,description:'chose it',participant_count:x.c,value:Math.round(x.c/n*100),unit:'pct',swatch_hex:R.swatches[x.o]}));
    }
  }
  // recommendations
  R.recs.forEach((r,i)=>{
    const th = r.theme!=null ? made[r.theme] : null;
    const rec = ins('Recommendation',{study_id:study.id,theme_id:th?th.id:null,position:i+1,workstream:r.workstream,title:r.title,body_md:r.body_md,impact:r.impact||'medium',effort:r.effort||'medium',status:'proposed',track:r.track||null,owner_team:r.owner_team||null,external_ref:null,asset_url:null});
    let mp=1;
    if(r.willingnessAt && pq){
      const vals = rows('Answer',a=>a.question_id===pq.id).map(a=>Number(a.value_json.value));
      const ok = vals.filter(v=>v>=r.willingnessAt).length;
      if(vals.length) ins('Metric',{study_id:study.id,theme_id:null,recommendation_id:rec.id,position:mp++,label:'Participant willingness at '+inr(r.willingnessAt),description:ok+' of '+vals.length+' would pay this or more',participant_count:ok,value:Math.round(ok/vals.length*100),unit:'pct',swatch_hex:null});
    }
    (r.projected||[]).forEach(m=>{ if(m.value!=null) ins('Metric',{study_id:study.id,theme_id:null,recommendation_id:rec.id,position:mp++,label:m.label,description:m.description||'Projection, not measured in interviews',participant_count:null,value:m.value,unit:m.unit,swatch_hex:null}); });
  });
  // evidence coverage = share of completed interviews that support at least one verified theme
  const covered = new Set(); themes.filter(t=>t.evidence_level==='verified').forEach(t=>t._support.forEach(id=>covered.add(id)));
  themes.forEach(t=>delete t._support);
  upd('Study',study.id,{headline:R.headline,summary:R.summary,confidence_pct:Math.round(covered.size/N*1000)/10,synthesized_at:iso(R.at||Date.now())});
}

function synthFromScript(study, key, at){
  const sc = SCRIPTS[key]; const done = completedOf(study.id);
  const qs = questionsOf(study.id);
  const themes = sc.themes.map(th=>{
    const labels = new Set(th.tags.map(t=>sc.signalMap[t][0]));
    const texts = new Set(); Object.values(sc.pools).flat().forEach(e=>{ if((e.tags||[]).some(t=>th.tags.includes(t))) texts.add(e.t); });
    const support = new Set(); const evidence=[];
    done.forEach(s=>{
      const sig = rows('Signal',g=>g.session_id===s.id&&labels.has(g.label));
      const turns = rows('TranscriptTurn',t=>t.session_id===s.id&&t.speaker==='participant'&&texts.has(t.text));
      if(sig.length||turns.length) support.add(s.id);
      if(turns.length) evidence.push({session_id:s.id,turn:turns.sort((a,b)=>b.text.length-a.text.length)[0]});
    });
    // put the longest, most specific quote first
    const seen=new Set(); const ev = evidence.sort((a,b)=>b.turn.text.length-a.turn.text.length).filter(e=>{ if(seen.has(e.turn.text)) return false; seen.add(e.turn.text); return true; });
    return {category:th.category,name:th.name,headline:th.headline,body:th.body,metric:th.metric,support,evidence:ev};
  });
  // keep script theme indices stable for recs
  const idx = sc.themes.map(t=>themes.findIndex(x=>x.name===t.name));
  writeSynthesis(study,{headline:sc.headline,summary:sc.summary,themes,swatches:sc.swatches,at,
    recs:sc.recs.map(r=>Object.assign({},r,{theme:r.theme==null?null:idx[r.theme]}))});
}
function synthGeneric(study){
  const done = completedOf(study.id); const groups={};
  done.forEach(s=>rows('Signal',g=>g.session_id===s.id).forEach(g=>{ (groups[g.label]=groups[g.label]||{polarity:g.polarity,ids:new Set()}).ids.add(s.id); }));
  const catOf = p=> p==='critical'||p==='negative' ? 'friction' : p==='positive' ? 'buying_driver' : 'preference';
  const themes = Object.entries(groups).sort((a,b)=>b[1].ids.size-a[1].ids.size).slice(0,5).map(([label,g])=>{
    const evidence = [...g.ids].map(id=>({session_id:id,turn:rows('TranscriptTurn',t=>t.session_id===id&&t.speaker==='participant').sort((a,b)=>b.text.length-a.text.length)[0]})).filter(e=>e.turn);
    return {category:catOf(g.polarity),name:label,headline:label+' came up in '+g.ids.size+' of '+done.length+' interviews',body:'Rule-based grouping of the signals tagged during interviews. Run AI synthesis for a written interpretation.',metric:'Mention '+label.toLowerCase(),support:g.ids,evidence};
  });
  writeSynthesis(study,{headline:'Top signal: '+(themes[0]?themes[0].name:'no recurring signal')+'.',summary:'Quick synthesis from interview signals. AI synthesis was unavailable, so the themes below are grouped by tag rather than written up.',themes,recs:[]});
}
