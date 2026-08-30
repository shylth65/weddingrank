/* WeddingRank compare-state hotfix v5.23 */
(()=>{
  const KEY='wr_compare_ids';
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]').filter(Boolean).slice(0,3)}catch(_){return[]}};
  const write=ids=>localStorage.setItem(KEY,JSON.stringify([...new Set(ids)].slice(0,3)));
  const syncButtons=()=>{const ids=new Set(read());document.querySelectorAll('.compareToggle').forEach(b=>{const id=b.closest('[data-id]')?.dataset.id;b.textContent=id&&ids.has(id)?'✓ 비교함':'＋ 비교'})};
  const closeModal=()=>{const m=document.querySelector('#compareModal');if(m)m.hidden=true;document.body.classList.remove('compareModalOpen');const t=document.querySelector('#compareTray');if(t&&read().length)t.style.visibility=''};
  const clearAll=()=>{write([]);syncButtons();const t=document.querySelector('#compareTray');if(t){t.hidden=true;t.style.visibility='hidden'};closeModal();window.dispatchEvent(new CustomEvent('weddingrank:compare-cleared'))};
  document.addEventListener('click',ev=>{const clear=ev.target.closest?.('#clearCompare');if(clear){ev.preventDefault();ev.stopImmediatePropagation();clearAll();return}const close=ev.target.closest?.('#compareModal .compareClose');if(close){ev.preventDefault();closeModal();return}if(ev.target?.id==='compareModal')closeModal()},true);
  document.addEventListener('keydown',ev=>{if(ev.key==='Escape')closeModal()},true);
  const mo=new MutationObserver(()=>{const m=document.querySelector('#compareModal'),t=document.querySelector('#compareTray');if(m&&!m.hidden){const ids=read();if(ids.length<2){closeModal();return}document.body.classList.add('compareModalOpen');if(t)t.style.visibility='hidden'}syncButtons()});
  mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});
  window.WeddingRankCompare={read,write,clear:clearAll,close:closeModal,sync:syncButtons};
})();