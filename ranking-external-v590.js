/* WeddingRank external-review ranking integration v5.91 */
(()=>{
  'use strict';
  const cfg=window.WEDDINGRANK_CONFIG||{};
  const base=String(cfg.SUPABASE_URL||'').replace(/\/+$/,'');
  const key=cfg.SUPABASE_ANON_KEY||cfg.SUPABASE_PUBLISHABLE_KEY||cfg.SUPABASE_KEY||'';
  const headers={apikey:key,Authorization:`Bearer ${key}`};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const get=async path=>{const r=await fetch(`${base}/rest/v1/${path}`,{headers});if(!r.ok)throw new Error(`Supabase ${r.status}`);return r.json()};
  const metricKey=mode=>({overall:'overall_score',food:'food_score',parking:'parking_score',value:'value_score'}[mode]||'overall_score');
  const metricName=mode=>({overall:'종합',food:'음식',parking:'주차',value:'가성비'}[mode]||'종합');

  function installStyles(){
    if(document.getElementById('wr-external-ranking-v590'))return;
    const s=document.createElement('style');s.id='wr-external-ranking-v590';
    s.textContent=`
      .externalHomeTop10 .previewTopCard{grid-template-columns:56px minmax(0,1fr) auto!important}
      .externalHomeTop10 .previewTopScore{min-width:116px!important}
      .externalHomeTop10 .previewTopScore strong{font-size:25px!important}
      .externalHomeTop10 .previewTopScore span{font-weight:900!important;color:#7d6670!important}
      .externalHomeTop10 .previewTopScore small{display:block;margin-top:5px;color:#958c94;font-size:10px;white-space:nowrap}
      .rankScore small{display:block;margin-top:4px;color:#968d98;font-size:10px}
      .externalAuditPending{border:1px solid #e8e1ed;border-radius:16px;padding:16px;margin-top:14px}.externalAuditPending summary{cursor:pointer;font-weight:850}.externalAuditPending .rankRow{margin-top:10px!important}
      @media(max-width:700px){
        .externalHomeTop10 .previewTopCard{grid-template-columns:46px minmax(0,1fr)!important}
        .externalHomeTop10 .previewTopScore{grid-column:2;text-align:left!important;min-width:0!important}
        .externalHomeTop10 .previewTopScore strong{font-size:19px!important}
      }`;
    document.head.appendChild(s);
  }

  function bindRows(host){
    host.querySelectorAll('[data-id]').forEach(card=>{
      const go=()=>{if(card.dataset.id)location.hash=`hall=${card.dataset.id}`};
      card.addEventListener('click',go);
      card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}});
    });
  }


  const evidence=()=>window.WeddingRankEvidence;
  const hasTracedOverall=x=>Boolean(evidence()?.isScoreTraced?.(x));
  const orderOverall=(a,b)=>Number(b.overall_score)-Number(a.overall_score)||
    Number(b.source_count)-Number(a.source_count)||
    String(a.name||'').localeCompare(String(b.name||''),'ko');

  async function loadData(){
    if(!base||!key)throw new Error('연결 설정이 없습니다.');
    const [ratings,halls]=await Promise.all([
      get('external_wedding_ratings?select=hall_id,source_count,methodology_version,food_score,access_score,parking_score,facility_score,bride_waiting_score,banquet_score,service_score,value_score,overall_score,updated_at&is_public=eq.true&source_count=gte.3&limit=1000'),
      get('wedding_halls?select=hall_id,name,sido,sigungu&is_public=eq.true&operation_status=eq.%EC%9A%B4%EC%98%81&limit=1000')
    ]);
    const hallMap=new Map(halls.map(h=>[h.hall_id,h]));
    return ratings.map(r=>({...r,...(hallMap.get(r.hall_id)||{})})).filter(r=>r.name);
  }

  async function renderHome(){
    const host=document.getElementById('homeRankPreviewBody');if(!host)return;
    const title=document.querySelector('.homeRankingPreview h2');
    const desc=document.querySelector('.homeRankingPreview .sectionDesc');
    if(title)title.textContent='원점수 추적 가능한 예식장 참고 비교';
    if(desc)desc.textContent='개별 원문 3건의 원점수·5점 척도·표본을 대조한 자료만 참고 순서로 표시합니다. 정확한 원문 게시일은 추가 확인 중이므로 최종 전국 품질 순위가 아닙니다.';
    try{
      const all=await loadData();
      const rows=all.filter(x=>hasTracedOverall(x)&&x.overall_score!=null).sort(orderOverall).slice(0,10);
      const pending=all.length-rows.length;
      if(!rows.length){
        host.innerHTML='<div class="rankingPreviewEmpty"><b>원점수 근거를 재확인하는 중입니다.</b><p>검증 전 평가에 임의 순위를 부여하지 않습니다.</p></div>';
        return;
      }
      host.innerHTML='<p class="externalReviewNote">원점수 추적 '+rows.length+'곳 · 기존 점수 재검증 '+pending+'곳 · 원문 게시일 일자 확인중</p><div class="previewTopGrid externalHomeTop10">'+
        rows.map((x,i)=>'<article class="previewTopCard" data-id="'+esc(x.hall_id)+'" tabindex="0" role="link">'+
        '<strong class="previewTopNo">'+(i+1)+'</strong><div class="previewTopHall"><b>'+esc(x.name)+'</b><span>'+esc([x.sido,x.sigungu].filter(Boolean).join(' '))+'</span></div>'+
        '<div class="previewTopScore"><strong>'+Number(x.overall_score).toFixed(2)+'</strong><span>원점수 3건 대조</span><small>참고 비교 순서 · 정확한 게시일 확인중</small></div></article>').join('')+'</div>';
      bindRows(host);
    }catch(e){host.innerHTML='<div class="rankingPreviewEmpty"><b>외부후기 자료를 확인하지 못했습니다.</b></div>';console.warn('[WeddingRank] evidence home ranking failed',e);}
  }

  window.loadRankings=loadRankings=async function(){
    if(document.getElementById('listView'))document.getElementById('listView').hidden=true;
    if(document.getElementById('detailView'))document.getElementById('detailView').hidden=true;
    if(document.getElementById('rankingView'))document.getElementById('rankingView').hidden=false;
    const body=document.getElementById('rankingBody');if(!body)return;
    body.innerHTML='<div class="pending big">원점수 검증상태를 확인하는 중…</div>';
    const hero=document.querySelector('#rankingView .rankingHero p:last-child');
    const note=document.querySelector('#rankingView .rankingNote');
    if(hero)hero.textContent='원점수가 추적 가능한 참고 비교와 기존 평가 재검증 목록을 분리했습니다. 전국 웨딩홀의 확정 품질 순위가 아닙니다.';
    if(note)note.textContent='※ 공개후기 3건만으로 검증 완료가 아닙니다. 원점수·척도·표본·출처 적격성을 확인한 자료만 참고 비교하며, 정확한 게시일과 항목별 점수는 추가 검증 중입니다. 광고·업체 소개·자체 회원평가는 제외합니다.';
    const mode=typeof rankingMode==='string'?rankingMode:'overall';
    if(mode!=='overall'){
      body.innerHTML='<div class="pending big"><b>항목별 순위 재검증 중</b><p>음식·주차·가성비의 개별 원점수가 충분히 확인될 때까지 숫자 순위를 공개하지 않습니다. 종합 비교에서 원문 근거를 확인하실 수 있습니다.</p></div>';
      return;
    }
    try{
      const region=document.getElementById('rankingRegion')?.value||'';
      const all=(await loadData()).filter(x=>!region||x.sido===region);
      const audited=all.filter(x=>hasTracedOverall(x)&&x.overall_score!=null).sort(orderOverall);
      const hold=all.filter(x=>!hasTracedOverall(x)).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ko'));
      let html='<div class="rankSectionMeta"><div><span class="rankKicker">SOURCE-TRACED REFERENCE</span><b>원점수 추적 참고 비교</b></div><span>'+audited.length+'곳</span></div>'+
      '<p class="externalReviewNote">독립 원문 3건의 원점수·척도·표본이 감사자료와 연결된 예식장만 표시합니다. 원문 게시일의 정확한 일자는 아직 추가 확인 중이며, 번호는 이 그룹 안에서만 비교한 순서입니다.</p>';
      if(!audited.length)html+='<div class="pending big">현재 조건에서 원점수 추적 자료가 없습니다.</div>';
      else html+=audited.map((x,i)=>'<article class="rankRow" data-id="'+esc(x.hall_id)+'">'+
          '<div class="rankNo">'+(i+1)+'</div><div class="rankHall"><b>'+esc(x.name)+'</b><span>'+esc([x.sido,x.sigungu].filter(Boolean).join(' '))+' · 참고 비교 순서</span></div>'+
          '<div class="rankScore"><strong>'+Number(x.overall_score).toFixed(2)+'</strong><span>원점수 3건 근거 확인</span><small>게시일 일자 확인중</small></div></article>').join('');
      html+='<div class="rankSectionMeta"><div><span class="rankKicker">EVIDENCE REVIEW PENDING</span><b>기존 평가 근거 재검증 대상</b></div><span>'+hold.length+'곳</span></div>'+
        '<p class="externalReviewNote">기존 수치와 자료는 감사용으로 보존하되, 원점수·출처 증빙이 완료되기 전에는 점수와 순위를 이 목록에서 표시하지 않습니다.</p>';
      if(hold.length){
        html+='<details class="externalAuditPending"><summary>재검증 대상 '+hold.length+'곳 목록 펼치기</summary><div>'+
          hold.map(x=>'<article class="rankRow pendingRank" data-id="'+esc(x.hall_id)+'">'+
            '<div class="rankNo">보류</div><div class="rankHall"><b>'+esc(x.name)+'</b><span>'+esc([x.sido,x.sigungu].filter(Boolean).join(' '))+'</span></div>'+
            '<div class="rankScore"><strong>근거 확인중</strong><small>점수·순위 미표시</small></div></article>').join('')+
          '</div></details>';
      }
      body.innerHTML=html;
      bindRows(body);
    }catch(e){body.innerHTML='<div class="pending big">자료 검증 화면을 불러오지 못했습니다: '+esc(e.message)+'</div>';}
  };

  function keepHomeRankingInSync(){
    const host=document.getElementById('homeRankPreviewBody');if(!host)return;
    let running=false,attempts=0;
    const ensure=()=>{
      if(running||host.querySelector('.externalHomeTop10')||attempts>=6)return;
      running=true;attempts+=1;
      Promise.resolve(renderHome()).finally(()=>{running=false});
    };
    const observer=new MutationObserver(()=>ensure());
    observer.observe(host,{childList:true});
    ensure();
    [250,700,1500,3000,6000].forEach(ms=>setTimeout(ensure,ms));
    setTimeout(()=>observer.disconnect(),12000);
  }

  installStyles();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',keepHomeRankingInSync,{once:true});else keepHomeRankingInSync();
})();