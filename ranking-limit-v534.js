/* WeddingRank safe ranking pending limit v5.34 */
(()=>{
  const LIMIT=10;
  function trim(){
    const body=document.querySelector('#rankingBody');
    if(!body)return;
    const pending=[...body.querySelectorAll('.rankRow.pendingRank')];
    pending.slice(LIMIT).forEach(row=>row.remove());
  }
  document.addEventListener('click',e=>{
    if(e.target.closest?.('.rankTab'))setTimeout(trim,250);
  });
  document.querySelector('#rankingRegion')?.addEventListener('change',()=>setTimeout(trim,250));
  window.addEventListener('hashchange',()=>{if(location.hash==='#rankings')setTimeout(trim,350)});
  if(location.hash==='#rankings')setTimeout(trim,350);
})();
