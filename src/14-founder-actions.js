// ---------- v6 founder-mode actions ----------
function setMode(m){
  const nd = ui.nd;
  if (m==='audience'){ nd.source='voqiva_panel'; }
  else { nd.source='cohort_import'; if(!nd.cohort_import_id){ const c=rows('CohortImport',x=>x.workspace_id===ui.ws)[0]; nd.cohort_import_id=c?c.id:null; } }
}
Object.assign(ACT, {
  'nd-mode'(a){ setMode(a.dataset.k); render(); },
  ftpl(a){
    const t = FOUNDER_TEMPLATES.find(x=>x.k===a.dataset.k); if(!t) return;
    if (ui.route.view!=='new' || !ui.nd) ndInit();
    const nd = ui.nd; nd.objective = t.text; nd.removed=[]; setMode(t.mode);
    if (t.target){ nd.target = JSON.parse(JSON.stringify(t.target)); nd.step = 2; }
    if (ui.route.view==='new') render(); else go('new');
  },
  tg(a){
    const t = ndTarget(), g = a.dataset.g, v = a.dataset.v;
    const cur = t[g] = t[g] || []; const i = cur.indexOf(v); if (i>=0) cur.splice(i,1); else cur.push(v);
    a.classList.toggle('plain', i>=0); a.setAttribute('aria-pressed', String(i<0));
    a.innerHTML = (i<0? ic('check').replace('<svg','<svg style="width:13px;vertical-align:-2px"')+' ' : '') + tgroup(g).opts.find(o=>o[0]===v)[1];
    updateNewSide();
  },
  'rw-bonus'(a){ const s=byId('Study',a.dataset.id); upd('Study',s.id,{rewards:Object.assign({},rewardsOf(s),{bonus_pct:Number(a.dataset.v)})}); save(); render(); },
  'close-loop'(a){ upd('Recommendation',a.dataset.id,{loop_closed_at:iso(Date.now())}); save(); render(); toast(`WhatsApp update sent to ${a.dataset.n} respondents.`); },
  'n-step'(a){ const s=byId('Study',ui.route.id); upd('Study',s.id,{sample_size:Math.max(1,Math.min(100,(s.sample_size||0)+Number(a.dataset.d)))}); save(); render(); }
});
Object.assign(CHANGE, {
  'rw-perk'(e){ const s=byId('Study',e.target.dataset.id); upd('Study',s.id,{rewards:Object.assign({},rewardsOf(s),{perk:e.target.value.trim()})}); save(); render(); },
  'rw-loop'(e){ const s=byId('Study',e.target.dataset.id); upd('Study',s.id,{rewards:Object.assign({},rewardsOf(s),{close_loop:e.target.checked})}); save(); render(); }
});
Object.assign(INPUT, {
  'nd-n'(e){ ui.nd.n = Number(e.target.value); updateNewSide(); },
  'nd-screener'(e){ ui.nd.screener = e.target.value; updateNewSide(); }
});
Object.assign(SUBMIT, {
  'mode-ask'(e){
    const m = e.target.dataset.mode; const v = document.getElementById('mq-'+m).value.trim();
    ndInit({objective:v}); setMode(m); if (m==='audience' && v.length>=20) ui.nd.step = 2;
    go('new');
  }
});
