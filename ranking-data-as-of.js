(() => {
  'use strict';
  const cfg=window.WEDDINGRANK_CONFIG||{};
  const base=String(cfg.SUPABASE_URL||'').replace(/\/+$/,'');
  const key=cfg.SUPABASE_ANON_KEY||cfg.SUPABASE_PUBLISHABLE_KEY||cfg.SUPABASE_KEY||'';
  const fmt=value=>value?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'2-digit',hour12:false}).format(new Date(value)):'';

  async function render(){
    const hosts=[document.getElementById('rankingDataAsOf'),document.getElementById('rankingDataAsOfFull')].filter(Boolean);
    if(!hosts.length)return;
    if(!base||!key){hosts.forEach(el=>el.textContent='평가 기준일 확인 중');return;}
    try{
      const headers={apikey:key,Authorization:'Bearer '+key};
      const r=await fetch(base+'/rest/v1/external_wedding_ratings?select=hall_id,source_count,methodology_version,overall_score,updated_at&is_public=eq.true&source_count=gte.3&limit=1000',{headers});
      if(!r.ok)throw Error('WeddingRank rating status fetch '+r.status);
      const rows=await r.json();
      const traced=rows.filter(x=>window.WeddingRankEvidence?.isScoreTraced?.(x));
      const unverified=rows.length-traced.length;
      const ordered=traced.map(x=>x.updated_at).filter(Boolean).sort().reverse();
      const basis=fmt(ordered[0]);
      const lines=[
        '외부평가 DB 원본 '+rows.length+'곳',
        '종합 원점수 대조 '+traced.length+'곳 (게시일 일자 추가확인 중)',
        '기존 근거 재검증 '+unverified+'곳',
        basis?'원점수 대조 자료의 최종 평가 변경일 '+basis:'평가 변경일 추가확인 중'
      ];
      hosts.forEach(el=>{
        el.textContent=lines.join(' · ');
        el.title='원점수 대조와 원문 게시일 검증은 별개입니다. 기존 점수는 감사용 보존, 숫자 순위는 근거 대조군만 참고 표시합니다.';
      });
    }catch(e){
      hosts.forEach(el=>el.textContent='외부평가 출처 검증상태 확인 중');
      console.warn('[WeddingRank] rating provenance status failed',e);
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render();
})();
