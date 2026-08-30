/* WeddingRank v5.16 - clearer compare tray state */
(()=>{
  function syncCompareTray(){
    const tray=document.querySelector('#compareTray');
    const btn=document.querySelector('#openCompare');
    if(!tray||!btn||tray.hidden)return;
    let ids=[];
    try{ids=JSON.parse(localStorage.getItem('wr_compare_ids')||'[]')}catch(_){}
    const count=Array.isArray(ids)?ids.length:0;
    if(count<2){
      btn.disabled=true;
      btn.setAttribute('aria-disabled','true');
      btn.textContent='1곳 더 선택';
      btn.title='예식장 2곳 이상을 선택하면 비교할 수 있습니다.';
    }else{
      btn.disabled=false;
      btn.removeAttribute('aria-disabled');
      btn.textContent='비교하기';
      btn.title='선택한 예식장을 비교합니다.';
    }
  }
  const observer=new MutationObserver(syncCompareTray);
  observer.observe(document.documentElement,{subtree:true,childList:true});
  document.addEventListener('DOMContentLoaded',()=>setTimeout(syncCompareTray,500));
  window.addEventListener('storage',syncCompareTray);
  document.addEventListener('click',()=>setTimeout(syncCompareTray,0),true);
})();
