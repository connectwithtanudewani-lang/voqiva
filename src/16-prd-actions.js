// ---------- v7 PRD actions ----------
Object.assign(ACT, {
  'dec-open'(a){ ui.decideOpen = {id:a.dataset.id, to:a.dataset.to}; render(); const f=document.getElementById('dec-reason'); if(f) f.focus(); },
  'dec-cancel'(){ ui.decideOpen = null; render(); },
  'dec-undo'(a){ upd('Recommendation',a.dataset.id,{status:'proposed',decided_at:null,decided_by:null,decision_reason:null}); save(); render(); },
  'brief-copy'(a){ copyText(briefMarkdown(byId('Study',a.dataset.id))); },
  async 'brief-md'(a){
    const s = byId('Study',a.dataset.id); const md = briefMarkdown(s); const name = (s.title||'launch-brief').replace(/[^\w]+/g,'-').toLowerCase()+'-launch-brief.md';
    if (DLS){ try{ await DLS.save({filename:name,data:md}); }catch(e){ if(e&&e.code!=='cancelled'&&e.code!=='declined') toast('Download did not complete.'); } return; }
    try{ const u=URL.createObjectURL(new Blob([md],{type:'text/markdown'})); const l=document.createElement('a'); l.href=u; l.download=name; document.body.appendChild(l); l.click(); l.remove(); setTimeout(()=>URL.revokeObjectURL(u),2000); }catch(e){ copyText(md); }
  },
  'brief-print'(){ window.print(); },
  'ops-accept'(a){ upd('Session',a.dataset.id,{quality_override:'accepted'}); save(); render(); toast('Interview accepted after review. It now counts and gets paid.'); },
  'p-seg'(a){ ui.pSeg = a.dataset.k; ui.pId = null; render(); },
  'p-redeem'(a){
    const k = a.dataset.k; const p = byId('Person', ui.pId);
    if (k==='trial'){ toast('3 trials match this profile: kids’ snacks, a skincare starter kit and a protein bar box.'); return; }
    p.attributes.coins_redeemed = (p.attributes.coins_redeemed||0) + 100; save(); render();
    toast({upi:'100 coins sent as ₹100 to '+(p.upi_vpa||'UPI'), gold:'100 coins turned into ₹100 of 24K digital gold', recharge:'₹100 recharge done', voucher:'₹100 voucher sent on WhatsApp', cause:'₹110 donated (your 100 + Voqiva’s 10)'}[k]);
  },
  'p-refer'(){ copyText('https://voqiva.in/join?ref='+(ui.pId||'').slice(0,6)); }
});
Object.assign(SUBMIT, {
  'dec-save'(e){
    const id = e.target.dataset.id, to = e.target.dataset.to; const reason = (document.getElementById('dec-reason')||{}).value||'';
    upd('Recommendation',id,{status:to,decided_at:iso(Date.now()),decided_by:me().full_name,decision_reason:reason.trim()||null});
    if (to==='adopted') meta().acted = true;
    ui.decideOpen = null; save(); render();
  }
});
Object.assign(INPUT, { 'nd-comp'(e){ ui.nd.competitors = e.target.value; updateNewSide(); } });
Object.assign(CHANGE, { 'nd-proof'(e){ ui.nd.proof = e.target.checked; updateNewSide(); } });
