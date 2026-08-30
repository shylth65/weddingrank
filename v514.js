/* WeddingRank v5.15 - verified venue photo support with safe fallback */
(()=>{
  const iconFor=t=>{t=String(t||'');if(/교회|성당/.test(t))return '⛪';if(/호텔/.test(t))return '🏨';if(/야외|공공/.test(t))return '🌿';if(/컨벤션/.test(t))return '✨';return '💍'};
  const labelFor=t=>{t=String(t||'예식장');return t.length>12?t.slice(0,12):t};
  const imageByHall=new Map();
  const safeImage=u=>{try{const x=new URL(u);return /^https:$/.test(x.protocol)?x.href:null}catch(_){return null}};

  async function loadVerifiedImages(){
    const cfg=window.WEDDINGRANK_CONFIG||{};
    const base=String(cfg.SUPABASE_URL||'').replace(/\/+$/,'');
    const key=cfg.SUPABASE_ANON_KEY||cfg.SUPABASE_PUBLISHABLE_KEY||cfg.SUPABASE_KEY||'';
    if(!base||!key)return;
    try{
      const q='wedding_halls?select=hall_id,hero_image_url,hero_image_verified&is_public=eq.true&operation_status=eq.%EC%9A%B4%EC%98%81&hero_image_verified=eq.true&hero_image_url=not.is.null&limit=1000';
      const r=await fetch(`${base}/rest/v1/${q}`,{headers:{apikey:key,Authorization:`Bearer ${key}`}});
      if(!r.ok)return;
      const rows=await r.json();
      rows.forEach(x=>{const u=safeImage(x.hero_image_url);if(u)imageByHall.set(x.hall_id,u)});
      decorate(true);
    }catch(_){}
  }

  function decorate(refresh=false){
    document.querySelectorAll('.card[data-id]').forEach(card=>{
      let visual=card.querySelector('.venueVisual');
      const type=card.querySelector('.badges .badge')?.textContent?.trim()||'예식장';
      if(!visual){
        visual=document.createElement('div');
        visual.className='venueVisual';
        visual.setAttribute('aria-hidden','true');
        visual.innerHTML=`<span class="venueVisualText">${labelFor(type)}</span><span class="venueVisualIcon">${iconFor(type)}</span>`;
        card.insertAdjacentElement('afterbegin',visual);
      }
      if(refresh||!visual.dataset.photoChecked){
        visual.dataset.photoChecked='1';
        const u=imageByHall.get(card.dataset.id);
        if(u){
          visual.classList.add('hasPhoto');
          visual.style.backgroundImage=`linear-gradient(180deg,rgba(20,12,18,.05),rgba(20,12,18,.48)),url("${u.replace(/"/g,'%22')}")`;
          visual.style.backgroundSize='cover';
          visual.style.backgroundPosition='center';
          const icon=visual.querySelector('.venueVisualIcon');if(icon)icon.textContent='';
        }
      }
    });
  }
  const target=document.querySelector('#cards');
  if(target)new MutationObserver(()=>requestAnimationFrame(()=>decorate(false))).observe(target,{childList:true});
  document.addEventListener('DOMContentLoaded',()=>{setTimeout(()=>decorate(false),250);loadVerifiedImages()});
  setTimeout(()=>decorate(false),900);
})();
