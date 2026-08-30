/* WeddingRank v5.21 - compare modal mobile QA hardening */
(()=>{
  let locked=false,scrollY=0;
  const modal=()=>document.querySelector('#compareModal');
  const tray=()=>document.querySelector('#compareTray');
  const lock=()=>{
    if(locked)return; scrollY=window.scrollY; locked=true;
    document.body.style.position='fixed';document.body.style.top=`-${scrollY}px`;document.body.style.left='0';document.body.style.right='0';document.body.style.width='100%';
  };
  const unlock=()=>{
    if(!locked)return; locked=false;
    document.body.style.position='';document.body.style.top='';document.body.style.left='';document.body.style.right='';document.body.style.width='';window.scrollTo(0,scrollY);
  };
  const close=()=>{const m=modal();if(m)m.hidden=true;unlock();const t=tray();if(t)t.style.visibility=''};
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal()&&!modal().hidden)close()});
  document.addEventListener('click',e=>{
    const m=modal();
    if(e.target.closest('#compareModal .compareClose')||(m&&e.target===m)){e.preventDefault();close();return}
    if(e.target.closest('#openCompare')) setTimeout(()=>{const mm=modal();if(mm&&!mm.hidden){lock();const t=tray();if(t)t.style.visibility='hidden'}},0);
  },true);
  const obs=new MutationObserver(()=>{const m=modal();if(!m)return;if(!m.hidden){lock();const t=tray();if(t)t.style.visibility='hidden'}else unlock()});
  obs.observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['hidden'],childList:true});
  const css=document.createElement('style');css.textContent='@media(max-width:800px){#compareModal{padding:14px!important;align-items:flex-start!important;overflow-y:auto!important;-webkit-overflow-scrolling:touch}#compareModal .compareBox{max-height:calc(100dvh - 28px)!important;overflow:auto!important;margin:auto!important;border-radius:20px!important}#compareModal .compareClose{min-width:44px!important;min-height:44px!important;display:flex!important;align-items:center!important;justify-content:center!important;touch-action:manipulation}}';document.head.appendChild(css);
})();