(() => {
  'use strict';
  const cfg=window.WEDDINGRANK_CONFIG||{};
  const base=String(cfg.SUPABASE_URL||'').replace(/\\/+$/,'');
  const key=cfg.SUPABASE_ANON_KEY||cfg.SUPABASE_PUBLISHABLE_KEY||cfg.SUPABASE_KEY||'';
  const fmt=value=>value?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'2-digit',hour12:false}).format(new Date(value)):'';
  const latestAudit={"run_id":38089595436,"completed_at":"2026-10-10T21:57:46Z","conclusion":"success"};
  async function render(){
    const hosts=[document.getElementById('rankingDataAsOf'),document.getElementById('rankingDataAsOfFull')].filter(Boolean);
    if(!hosts.length)return;
    if(!base||!key){hosts.forEach(el=>el.textContent='평가 기준일 확인 중');return}
    try{
      const headers={apikey:key,Authorization:'Bearer '+key};
      const [ratingResponse,countResponse]=await Promise.all([
        fetch(base+'/rest/v1/external_wedding_ratings?select=updated_at&is_public=eq.true&source_count=gte.3&order=updated_at.desc&limit=1',{headers}),
        fetch(base+'/rest/v1/external_wedding_ratings?select=hall_id&is_public=eq.true&source_count=gte.3&limit=1000',{headers})
      ]);
      if(!ratingResponse.ok||!countResponse.ok)throw Error('Supabase response not OK');
      const [ratings,rows]=await Promise.all([ratingResponse.json(),countResponse.json()]);
      const date=fmt(ratings[0]?.updated_at),count=new Set(rows.map(x=>x.hall_id)).size;
      const lines=[
        date?'순위 평가 기준일: '+date:'순위 평가 기준일: 확인 중',
        '독립 후기 평가 공개: '+count+'곳',
        '마지막 확인된 승인 후기 자동점검: '+fmt(latestAudit.completed_at)+' (GitHub Actions 성공)'
      ];
      hosts.forEach(el=>{
        el.textContent=lines.join(' · ');
        el.title='평가 기준일은 실제 점수/순위 데이터가 변경된 날짜입니다. 자동점검 시각과 별개입니다.';
      });
    }catch(e){
      hosts.forEach(el=>el.textContent='순위 평가 기준일 확인 중 · 자동점검 정보 확인 중');
      console.warn('[WeddingRank] ranking dates failed',e);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render();
})();