/* WeddingRank v5.20 - robust compare clear/close behavior on mobile */
(()=>{
  const clearSelection=()=>{
    try{localStorage.setItem('wr_compare_ids','[]')}catch(_){}
    document.querySelectorAll('.compareToggle').forEach(b=>b.textContent='＋ 비교');
    const tray=document.querySelector('#compareTray');
    if(tray) tray.hidden=true;
    const modal=document.querySelector('#compareModal');
    if(modal) modal.hidden=true;
  };
  document.addEventListener('click',ev=>{
    const clear=ev.target.closest('#clearCompare');
    if(clear){
      ev.preventDefault();ev.stopPropagation();
      clearSelection();
      return;
    }
    const close=ev.target.closest('#compareModal .compareClose');
    if(close){
      const modal=document.querySelector('#compareModal');
      if(modal) modal.hidden=true;
      return;
    }
    if(ev.target.id==='compareModal') ev.target.hidden=true;
  },true);
  const observer=new MutationObserver(()=>{
    const modal=document.querySelector('#compareModal');
    const tray=document.querySelector('#compareTray');
    if(modal&&tray&&!modal.hidden) tray.style.visibility='hidden';
    else if(tray) tray.style.visibility='';
  });
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});
})();