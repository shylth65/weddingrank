/* WeddingRank compare-state + auth hotfix v5.24 */
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

  // Public review login hotfix: always return to the custom domain and avoid rapid repeat sends.
  let loginBusy=false,lastLoginSend=0;
  document.addEventListener('click',async ev=>{
    const btn=ev.target.closest?.('#loginBtn');
    if(!btn)return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    const email=(document.querySelector('#loginEmail')?.value||'').trim();
    if(!email||!email.includes('@')){alert('이메일을 입력해주세요.');return}
    const remain=60-Math.floor((Date.now()-lastLoginSend)/1000);
    if(loginBusy||remain>0){alert(`로그인 메일은 잠시 후 다시 요청해주세요.${remain>0?` (${remain}초)`:''}`);return}
    const cfg=window.WEDDINGRANK_CONFIG||{},base=String(cfg.SUPABASE_URL||'').replace(/\/+$/,''),key=cfg.SUPABASE_ANON_KEY||cfg.SUPABASE_PUBLISHABLE_KEY||cfg.SUPABASE_KEY||'';
    if(!base||!key){alert('로그인 설정을 확인중입니다. 잠시 후 다시 시도해주세요.');return}
    loginBusy=true;btn.disabled=true;
    try{
      const redirect=location.origin+location.pathname;
      const r=await fetch(base+'/auth/v1/otp?redirect_to='+encodeURIComponent(redirect),{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({email,create_user:true})});
      const raw=await r.text();
      if(!r.ok){
        let code='';try{code=JSON.parse(raw).error_code||''}catch(_){}
        if(r.status===429||code==='over_email_send_rate_limit')throw new Error('RATE_LIMIT');
        throw new Error('SEND_FAILED');
      }
      lastLoginSend=Date.now();
      alert('로그인 링크를 이메일로 보냈습니다. 메일의 링크를 누르면 WeddingRank로 돌아옵니다.');
    }catch(e){
      if(e?.message==='RATE_LIMIT')alert('이메일 발송 횟수가 많습니다. 잠시 후 다시 시도해주세요.');
      else alert('로그인 메일 전송에 실패했습니다. 잠시 후 다시 시도해주세요.');
      console.warn('WeddingRank login hotfix',e);
    }finally{loginBusy=false;btn.disabled=false}
  },true);
})();