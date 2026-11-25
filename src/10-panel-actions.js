// ---------- v3 panel actions ----------
const _chipx = ACT['nd-chip-x'];
Object.assign(ACT, {
  'nd-chip-x'(a){ if(a.dataset.k.startsWith('segment|')){ ui.nd.segTouched=true; ui.nd.segments=[]; render(); return; } _chipx(a); },
  'seg-toggle'(a){ const nd=ui.nd; const cur=ndSegments().slice(); const k=a.dataset.k; const i=cur.indexOf(k); if(i>=0) cur.splice(i,1); else cur.push(k); nd.segments=cur; nd.segTouched=true; renderSegChips(); updateNewSide(); },
  'seg-study'(a){ ndInit({source:'voqiva_panel',segments:[a.dataset.k],segTouched:true,step:2}); go('new'); },
  'panel-seg'(a){ ui.panelSeg=a.dataset.k; ui.showPeople=40; render(); },
  'apply-rate'(a){ upd('Study',a.dataset.id,{incentive_inr:Number(a.dataset.r)}); save(); render(); },
  boost(a){ upd('Study',a.dataset.id,{recruitment_boost:Number(a.dataset.n)}); save(); render(); }
});
Object.assign(SUBMIT, {
  'panel-grow'(){ const k=document.getElementById('pg-seg').value, src=document.getElementById('pg-src').value, n=Math.max(1,Math.min(200,parseInt(document.getElementById('pg-n').value)||25));
    for(let i=0;i<n;i++) makePanelist(k,{source:src,joinedNow:true,rng:Math.random});
    save(); ui.panelSeg=k; render(); toast(`${n} new ${segByKey(k).name} panelists joined via ${SOURCE_LABEL[src]} (simulated).`); }
});
