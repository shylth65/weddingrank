/* WeddingRank v5.14 - visual card decoration, no fabricated venue photos */
(()=>{
  const iconFor=t=>{t=String(t||'');if(/교회|성당/.test(t))return '⛪';if(/호텔/.test(t))return '🏨';if(/야외|공공/.test(t))return '🌿';if(/컨벤션/.test(t))return '✨';return '💍'};
  const labelFor=t=>{t=String(t||'예식장');return t.length>12?t.slice(0,12):t};
  function decorate(){
    document.querySelectorAll('.card[data-id]').forEach(card=>{
      if(card.querySelector('.venueVisual')) return;
      const type=card.querySelector('.badges .badge')?.textContent?.trim()||'예식장';
      const visual=document.createElement('div');
      visual.className='venueVisual';
      visual.setAttribute('aria-hidden','true');
      visual.innerHTML=`<span class="venueVisualText">${labelFor(type)}</span><span class="venueVisualIcon">${iconFor(type)}</span>`;
      card.insertAdjacentElement('afterbegin',visual);
    });
  }
  const target=document.querySelector('#cards');
  if(target)new MutationObserver(()=>requestAnimationFrame(decorate)).observe(target,{childList:true});
  document.addEventListener('DOMContentLoaded',()=>setTimeout(decorate,350));
  setTimeout(decorate,900);
})();
