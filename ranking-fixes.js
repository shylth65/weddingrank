/* WeddingRank ranking list fixes v5.27 */
(()=>{
  const MAX_PENDING=10;
  let busy=false;
  function trimPending(){
    if(busy||location.hash!=='#rankings')return;
    const body=document.querySelector('#rankingBody');
    if(!body)return;
    const rows=[...body.querySelectorAll('.rankRow')];
    if(!rows.length)return;
    busy=true;
    try{
      const pending=rows.filter(r=>r.classList.contains('pendingRank'));
      pending.forEach((row,i)=>{row.hidden=i>=MAX_PENDING});
      let note=body.querySelector('.rankingPendingNote');
      if(pending.length>MAX_PENDING){
        if(!note){note=document.createElement('div');note.className='rankingPendingNote';body.appendChild(note)}
        note.textContent=`평가대기 예식장은 종합랭킹 화면의 가독성을 위해 ${MAX_PENDING}곳까지만 표시합니다. 실제 평가가 등록되면 자동으로 순위에 반영됩니다.`;
      }else if(note){note.remove()}
    }finally{busy=false}
  }
  const observer=new MutationObserver(()=>setTimeout(trimPending,0));
  observer.observe(document.documentElement,{subtree:true,childList:true});
  window.addEventListener('hashchange',()=>setTimeout(trimPending,50));
  document.addEventListener('DOMContentLoaded',()=>setTimeout(trimPending,150));
  setTimeout(trimPending,250);
})();
