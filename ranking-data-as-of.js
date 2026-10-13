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
   const message='TOP 30 경쟁 '+visible.length+' / 30곳 · 승인된 원점수 변경 시 자동 재정렬 · 최종 점수 반영 '+fmt(last)+
    ' · 게시일 추가검증 '+pending+'곳';
   hosts.forEach(x=>{x.textContent=message;x.title='순위는 승인된 후기 원점수·척도·표본을 기준으로 재산정합니다. 화면은 1분 간격으로 최신 순위 DB를 확인합니다. 게시일 미확인 자료는 표기합니다.';});
  }catch(e){hosts.forEach(x=>x.textContent='TOP 30 순위 자료 확인 중');console.warn('[WeddingRank] TOP30 status error',e);}
 }
 function start(){render();document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')render();});
  window.addEventListener('weddingrank:top30-refreshed',render);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
