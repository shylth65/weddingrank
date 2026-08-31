/* WeddingRank navigation + homepage list hotfix v5.49 */
(()=>{
  const LIST_STEP=5;
  let pendingDetailTarget='';

  function patchLoadMoreLabel(){
    const btn=document.querySelector('#loadMoreBtn');
    if(!btn||btn.hidden)return;
    const count=document.querySelector('#listResultCount')?.textContent||'';
    const m=count.match(/검색결과\s*(\d+)곳\s*·\s*(\d+)곳\s*표시중/);
    if(m){
      const total=Number(m[1]),shown=Number(m[2]);
      const next=Math.max(0,Math.min(LIST_STEP,total-shown));
      btn.textContent=`예식장 더보기 (${next}곳)`;
    }else{
      btn.textContent='예식장 더보기 (5곳)';
    }
  }

  function safeRender(reset=false){
    try{
      if(reset) visibleHallCount=LIST_STEP;
      if(typeof render==='function') render(false);
      setTimeout(patchLoadMoreLabel,0);
    }catch(e){console.warn('[WeddingRank] list render hotfix',e)}
  }

  try{
    if(typeof render==='function' && !render.__wrFiveWrapped){
      const originalRender=render;
      const wrapped=function(reset=false){
        if(reset) visibleHallCount=LIST_STEP;
        const out=originalRender(false);
        setTimeout(patchLoadMoreLabel,0);
        return out;
      };
      wrapped.__wrFiveWrapped=true;
      render=wrapped;
    }
  }catch(e){console.warn('[WeddingRank] render wrapper failed',e)}

  function detailTargetEl(kind){
    if(kind==='review') return document.querySelector('#detailView .reviewWrite') || document.querySelector('#reviewFormWrap') || document.querySelector('#reviewSummary');
    if(kind==='consult') return document.querySelector('#consultForm') || [...document.querySelectorAll('#detailView .detailBlock')].find(b=>b.querySelector('h2')?.textContent.includes('예식 상담'));
    return null;
  }

  function scrollDetailTarget(kind,attempt=0){
    const target=detailTargetEl(kind);
    const detail=document.querySelector('#detailView');
    if(target && detail && !detail.hidden){
      pendingDetailTarget='';
      target.scrollIntoView({behavior:'smooth',block:'start'});
      return;
    }
    if(attempt<12) setTimeout(()=>scrollDetailTarget(kind,attempt+1),120);
  }

  function openHallSection(hallId,kind){
    if(!hallId){
      if(location.hash.startsWith('#hall=')) scrollDetailTarget(kind);
      return;
    }
    pendingDetailTarget=kind;
    const next=`#hall=${hallId}`;
    if(location.hash===next){
      try{if(typeof showDetail==='function') showDetail(hallId)}catch(_){}
      setTimeout(()=>scrollDetailTarget(kind),80);
    }else{
      location.hash=next;
    }
  }

  function actionKind(el){
    const explicit=String(el.dataset?.action||el.dataset?.target||'').toLowerCase();
    if(/review|후기|평가/.test(explicit)) return 'review';
    if(/consult|상담|문의/.test(explicit)) return 'consult';
    const text=String(el.textContent||'').replace(/\s+/g,'');
    if((text.includes('후기')||text.includes('평가')) && /(보기|작성|등록|하기)/.test(text)) return 'review';
    if(text.includes('상담') && /(신청|문의|받기|연결)/.test(text)) return 'consult';
    return '';
  }

  function injectEvaluationGuide(){
    if(document.querySelector('#evaluationStartGuide')) return;
    const find=document.querySelector('#find');
    if(!find) return;
    const guide=document.createElement('div');
    guide.id='evaluationStartGuide';
    guide.className='wrEvaluationStartGuide';
    guide.innerHTML=`<div class="wrEvalGuideText"><b>예식장을 평가하려면 먼저 평가할 예식장을 찾아주세요.</b><span>위 검색창에서 예식장명이나 지역을 검색한 뒤, 해당 예식장 상세화면에서 <strong>평가 작성</strong>을 선택하면 됩니다.</span></div><button type="button" id="evaluationSearchFocus">평가할 예식장 검색하기</button>`;
    const head=find.querySelector('.section-head');
    if(head) head.insertAdjacentElement('afterend',guide); else find.prepend(guide);

    const examples=document.createElement('div');
    examples.id='referenceReviewExamples';
    examples.className='wrReferenceReviews';
    examples.innerHTML=`<div class="wrReferenceHead"><div><p class="eyebrow">REVIEW EXAMPLES</p><h3>처음 평가한다면 이렇게 남겨보세요</h3></div><span>참고 예시 · 실제 랭킹에는 반영되지 않음</span></div><div class="wrReferenceGrid"><article><b>신랑·신부 예시</b><p>“음식은 전반적으로 만족스러웠고, 주차 안내도 원활했습니다. 다만 신부대기실은 하객이 몰리는 시간에 조금 혼잡했어요.”</p><small>음식 4 · 주차 4 · 시설 4 · 서비스 4</small></article><article><b>혼주 예시</b><p>“직원 응대가 빠르고 연회장 동선이 편했습니다. 지방 하객이 많아 교통 접근성은 미리 안내가 필요했습니다.”</p><small>교통 3 · 연회장 4 · 서비스 5 · 가성비 4</small></article><article><b>하객 예시</b><p>“홀 분위기와 식사는 좋았고, 엘리베이터 대기시간은 조금 길었습니다. 전체적으로 다시 방문해도 괜찮은 예식장이었습니다.”</p><small>시설 4 · 음식 4 · 접근성 4 · 가성비 4</small></article></div>`;
    guide.insertAdjacentElement('afterend',examples);

    const style=document.createElement('style');
    style.textContent=`.wrEvaluationStartGuide{margin:18px 0 16px;padding:18px 20px;border:1px solid rgba(16,24,40,.12);border-radius:16px;background:#fff;display:flex;gap:18px;align-items:center;justify-content:space-between}.wrEvalGuideText{display:flex;flex-direction:column;gap:6px}.wrEvalGuideText b{font-size:17px}.wrEvalGuideText span{font-size:14px;line-height:1.55;color:#667085}.wrEvaluationStartGuide button{border:0;border-radius:12px;padding:12px 16px;font-weight:700;cursor:pointer;white-space:nowrap}.wrReferenceReviews{margin:0 0 28px;padding:18px 20px;border-radius:16px;background:rgba(0,0,0,.025)}.wrReferenceHead{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:14px}.wrReferenceHead h3{margin:2px 0 0}.wrReferenceHead>span{font-size:12px;color:#667085}.wrReferenceGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.wrReferenceGrid article{padding:16px;border-radius:14px;background:#fff;border:1px solid rgba(16,24,40,.08)}.wrReferenceGrid article b{display:block;margin-bottom:8px}.wrReferenceGrid article p{margin:0 0 10px;font-size:14px;line-height:1.55;color:#475467}.wrReferenceGrid article small{color:#667085}@media(max-width:760px){.wrEvaluationStartGuide{align-items:stretch;flex-direction:column}.wrEvaluationStartGuide button{width:100%}.wrReferenceHead{align-items:flex-start;flex-direction:column}.wrReferenceGrid{grid-template-columns:1fr}}`;
    document.head.appendChild(style);

    document.querySelector('#evaluationSearchFocus')?.addEventListener('click',()=>{
      const search=document.querySelector('#search');
      document.querySelector('.hero')?.scrollIntoView({behavior:'smooth',block:'start'});
      setTimeout(()=>search?.focus(),450);
    });
  }

  function startEvaluationFlow(){
    try{if(typeof showList==='function') showList()}catch(_){}
    injectEvaluationGuide();
    history.replaceState(null,'',location.pathname+location.search+'#find');
    document.querySelector('#find')?.scrollIntoView({behavior:'smooth',block:'start'});
    setTimeout(()=>document.querySelector('#search')?.focus(),350);
  }

  document.addEventListener('click',e=>{
    const el=e.target.closest?.('a,button,[role="button"]');
    if(!el) return;
    if(el.closest('#reviewForm') || el.closest('#consultForm')) return;

    const topEvaluation=el.closest('.top nav a[href="#about"]');
    if(topEvaluation && String(topEvaluation.textContent||'').includes('예식장 평가')){
      e.preventDefault();
      e.stopImmediatePropagation();
      startEvaluationFlow();
      return;
    }

    const regionBtn=el.closest('#regionButtons [data-region]');
    if(regionBtn){
      e.preventDefault();
      e.stopImmediatePropagation();
      const sido=document.querySelector('#sido');
      if(sido) sido.value=regionBtn.dataset.region||'';
      try{visibleHallCount=LIST_STEP}catch(_){}
      try{if(typeof showList==='function') showList()}catch(_){}
      safeRender(false);
      history.replaceState(null,'',location.pathname+location.search+'#find');
      setTimeout(()=>document.querySelector('#find')?.scrollIntoView({behavior:'smooth',block:'start'}),20);
      return;
    }

    if(el.id==='loadMoreBtn'){
      e.preventDefault();
      e.stopImmediatePropagation();
      try{visibleHallCount+=LIST_STEP}catch(_){}
      safeRender(false);
      return;
    }

    const kind=actionKind(el);
    if(!kind) return;
    const holder=el.closest('[data-id]');
    const hallId=el.dataset?.hallId || el.dataset?.id || holder?.dataset?.id || '';
    if(hallId || location.hash.startsWith('#hall=')){
      e.preventDefault();
      e.stopImmediatePropagation();
      openHallSection(hallId,kind);
    }
  },true);

  const observer=new MutationObserver(()=>patchLoadMoreLabel());
  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});

  window.addEventListener('hashchange',()=>{
    if(pendingDetailTarget && location.hash.startsWith('#hall=')) setTimeout(()=>scrollDetailTarget(pendingDetailTarget),80);
    setTimeout(patchLoadMoreLabel,0);
  });

  window.addEventListener('DOMContentLoaded',injectEvaluationGuide,{once:true});
  setTimeout(()=>{injectEvaluationGuide();safeRender(true)},0);
})();
