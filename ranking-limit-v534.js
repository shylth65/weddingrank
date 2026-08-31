/* WeddingRank user ranking pending limit v5.47 */
(()=>{
  const LIMIT=10;
  let trimming=false;

  function trim(){
    if(trimming)return;
    const body=document.querySelector('#rankingBody');
    if(!body)return;
    trimming=true;
    try{
      const pending=[...body.querySelectorAll('.rankRow.pendingRank')];
      pending.slice(LIMIT).forEach(row=>row.remove());
    }finally{
      trimming=false;
    }
  }

  const observe=()=>{
    const body=document.querySelector('#rankingBody');
    if(!body||body.dataset.pendingLimitObserved==='1')return;
    body.dataset.pendingLimitObserved='1';
    new MutationObserver(()=>queueMicrotask(trim)).observe(body,{childList:true,subtree:true});
    trim();
  };

  document.addEventListener('click',e=>{
    if(e.target.closest?.('.rankTab'))setTimeout(()=>{observe();trim()},50);
  });
  document.querySelector('#rankingRegion')?.addEventListener('change',()=>setTimeout(()=>{observe();trim()},50));
  window.addEventListener('hashchange',()=>{
    if(location.hash==='#rankings')setTimeout(()=>{observe();trim()},50);
  });
  document.addEventListener('DOMContentLoaded',()=>{observe();if(location.hash==='#rankings')trim()});
  setTimeout(observe,100);
})();
