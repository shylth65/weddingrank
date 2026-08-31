/* WeddingRank navigation + homepage list hotfix v5.48 */
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

  document.addEventListener('click',e=>{
    const el=e.target.closest?.('a,button,[role="button"]');
    if(!el) return;
    if(el.closest('#reviewForm') || el.closest('#consultForm')) return;

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

  setTimeout(()=>safeRender(true),0);
})();
