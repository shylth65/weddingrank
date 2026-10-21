(()=>{
 'use strict';
 const cfg=window.WEDDINGRANK_CONFIG||{};
 const base=String(cfg.SUPABASE_URL||'').replace(/\/+$/,'');
 const key=cfg.SUPABASE_PUBLISHABLE_KEY||cfg.SUPABASE_ANON_KEY||cfg.SUPABASE_KEY||'';
 const fmt=value=>value?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value)):'확인 중';
 async function render(){
  const hosts=[document.getElementById('rankingDataAsOf'),document.getElementById('rankingDataAsOfFull')].filter(Boolean);
  if(!hosts.length||!base||!key)return;
  try{
   const r=await fetch(base+'/rest/v1/weddingrank_top30_competition?select=rank_position,source_count,score_basis_at,evidence_publication_dates_complete&order=rank_position.asc&limit=1000',{
    headers:{apikey:key,Authorization:'Bearer '+key},cache:'no-store'
   });
   if(!r.ok)throw Error('TOP30 response '+r.status);
   const data=await r.json(),visible=data.slice(0,30);
   const last=data.map(v=>v.score_basis_at).filter(Boolean).sort().reverse()[0];
   const pending=data.filter(v=>!v.evidence_publication_dates_complete).length;
   const message='추천 TOP30 · 공개 운영정보 기준 | 전문 후기평가 '+visible.length+'곳 별도 운영';
   hosts.forEach(x=>{x.textContent=message;x.title='추천 TOP30과 검증된 전문 후기평가를 구분해 운영합니다.';});
  }catch(e){hosts.forEach(x=>x.textContent='TOP 30 순위 자료 확인 중');console.warn('[WeddingRank] TOP30 status error',e);}
 }
 function start(){render();document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')render();});
  window.addEventListener('weddingrank:top30-refreshed',render);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
