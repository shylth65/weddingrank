(() => {
  'use strict';
  const cfg=window.WEDDINGRANK_CONFIG||{};
  const base=String(cfg.SUPABASE_URL||'').replace(/\/+$/,'');
  const key=cfg.SUPABASE_ANON_KEY||cfg.SUPABASE_PUBLISHABLE_KEY||cfg.SUPABASE_KEY||'';
  const fmt=value=>value?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(value)):'';
  async function render(){
    const hosts=[document.getElementById('rankingDataAsOf'),document.getElementById('rankingDataAsOfFull')].filter(Boolean);
    if(!hosts.length||!base||!key)return;
    try{
      const url=base+'/rest/v1/external_wedding_ratings?select=updated_at&is_public=eq.true&source_count=gte.3&order=updated_at.desc&limit=1';
      const r=await fetch(url,{headers:{apikey:key,Authorization:'Bearer '+key}});
      if(!r.ok)throw new Error('Supabase '+r.status);
      const rows=await r.json(), value=fmt(rows[0]?.updated_at);
      hosts.forEach(el=>{el.textContent=value?'순위 데이터 기준: '+value+' 검증 완료':'순위 데이터 기준 확인 중';});
    }catch(e){
      hosts.forEach(el=>{el.textContent='순위 데이터 기준 확인 중';});
      console.warn('[WeddingRank] data as-of failed',e);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render();
})();