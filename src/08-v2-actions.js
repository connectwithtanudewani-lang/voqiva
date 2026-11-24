// ---------- v2 actions ----------
Object.assign(ACT, {
  'copy-snippet'(){ const b=byId('Workspace',ui.ws).name; copyText(`Join the ${b} customer circle\nNow and then we'll ask for a 5-minute WhatsApp voice chat about your order and pay you ₹100–₹300 by UPI for your time. Leave any time by replying STOP.\n[ ] Yes, I'm in`); },
  'optin-invite'(a){
    const ppl = rows('Person',p=>p.cohort_import_id===a.dataset.id && !consentOf(p.id));
    let n=0; ppl.forEach(p=>{ if(Math.random()<0.38){ ins('Consent',{workspace_id:ui.ws,person_id:p.id,channel:'whatsapp',purpose:'research',source:'whatsapp_invite',granted_at:iso(Date.now()),withdrawn_at:null}); n++; } });
    save(); render(); toast(`Invite sent to ${ppl.length}. ${n} opted in so far (simulated).`);
  },
  'consent-withdraw'(a){ upd('Consent',a.dataset.id,{withdrawn_at:iso(Date.now())}); save(); render(); toast('Consent withdrawn. They won\'t be contacted again.'); },
  'trigger-run'(a){ runTriggerBatch(byId('Trigger',a.dataset.id)); },
  'trigger-toggle'(a){ const t=byId('Trigger',a.dataset.id); upd('Trigger',t.id,{active:!t.active}); save(); render(); },
  'outcome-measure'(a){
    const o = byId('Outcome',a.dataset.id); const M = OUTCOME_METRICS[o.metric];
    const d = -0.06 + Math.random()*0.30; // simulated 30-day pull
    let v = M.better==='up' ? o.baseline_value*(1+d) : o.baseline_value*(1-d);
    v = M.unit==='inr' ? Math.round(v) : Math.round(v*10)/10;
    upd('Outcome',o.id,{current_value:v,measured_at:iso(Date.now())}); save(); render();
    const vd = outcomeVerdict(o); toast(`${M.label}: ${fmtOutcome(o.metric,o.baseline_value)} → ${fmtOutcome(o.metric,v)}. ${vd.t}.`);
  },
  'sample-import'(){
    const ci = ins('CohortImport',{workspace_id:ui.ws,name:'Shopify · Cart-to-order buyers, last 60 days (sample)',source:'shopify',created_at:iso(Date.now())});
    const out=[]; for(let i=0;i<40;i++){ const g=Math.random()<.5?'male':'female'; out.push({full_name:pick(PANEL_NAMES[g])+' '+String.fromCharCode(65+Math.floor(Math.random()*26)),phone:'+91 9'+String(Math.floor(Math.random()*1e9)).padStart(9,'0'),gender:g,city:pick(CITIES)[0],birth_date:(1988+Math.floor(Math.random()*15))+'-0'+(1+Math.floor(Math.random()*9))+'-15',order_count:String(1+Math.floor(Math.random()*3)),last_order_value:String(799+Math.round(Math.random()*15)*100)}); }
    importPeople(ci,out); ui.partTab=ci.id; save(); render(); toast('Imported 40 sample customers with orders. Send an opt-in invite to add them to your circle.');
  }
});
Object.assign(SUBMIT, {
  'trigger-create'(){ const ev=document.getElementById('tr-event').value; const cap=Math.max(3,Math.min(50,parseInt(document.getElementById('tr-cap').value)||10));
    createTrigger(ui.ws,ui.user,ev,cap); save(); render(); toast('Trigger added. Run its first batch when you\'re ready.'); },
  'outcome-start'(e,f){ const id=f.dataset.id; const metric=document.getElementById('om-'+id).value; const change=document.getElementById('oc-'+id).value.trim();
    let base = storeMetric(ui.ws,metric); if(base==null) base = metric==='conversion_rate'?2.4:0;
    ins('Outcome',{recommendation_id:id,metric,change_ref:change,baseline_value:base,baseline_at:iso(Date.now()),current_value:null,measured_at:null,source:'simulated'}); save(); render(); toast('Baseline recorded. Voqiva will check again in 30 days.'); }
});
function importPeople(ci, list){
  const STD=['full_name','name','phone','mobile','gender','birth_date','dob','city','occupation','upi_vpa','order_count','orders','last_order_value'];
  let n=0;
  list.forEach(r=>{ const name=r.full_name||r.name, phone=r.phone||r.mobile; if(!name||!phone) return;
    const g=String(r.gender||'').toLowerCase(); const attrs={}; Object.keys(r).forEach(k=>{ if(!STD.includes(k)&&r[k]!=='') attrs[k]=isNaN(+r[k])?r[k]:+r[k]; });
    const bd=r.birth_date||r.dob; const d=bd&&!isNaN(new Date(bd))?new Date(bd).toISOString().slice(0,10):null;
    const p = ins('Person',{cohort_import_id:ci.id,full_name:name,phone:String(phone),gender:/^f/.test(g)?'female':/^m/.test(g)?'male':g?'other':null,birth_date:d,city:r.city?(CITY_ALIASES[r.city.toLowerCase()]||r.city):null,occupation:r.occupation||null,attributes:attrs,upi_vpa:r.upi_vpa||null,aadhaar_verified_at:null,linkedin_verified_at:null,upi_verified_at:null});
    const oc = parseInt(r.order_count||r.orders)||0, val = parseInt(r.last_order_value)||0;
    for(let i=0;i<oc;i++) ins('Order',{workspace_id:ci.workspace_id,person_id:p.id,placed_at:iso(Date.now()-(oc-i)*(20+Math.random()*40)*86400000),value_inr:val||999,status:'delivered',source_ref:'import'});
    n++; });
  return n;
}
