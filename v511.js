/* WeddingRank v5.11 - production QA: auth longevity, dynamic callback, current-price aggregation */
(()=>{
  const $=s=>document.querySelector(s);

  function cfgUrl(){return String(window.WEDDINGRANK_CONFIG?.SUPABASE_URL||'').replace(/\/+$/,'')}
  function cfgKey(){const c=window.WEDDINGRANK_CONFIG||{};return c.SUPABASE_ANON_KEY||c.SUPABASE_PUBLISHABLE_KEY||c.SUPABASE_KEY||''}
  function authHeaders(){return {'apikey':cfgKey(),'Content-Type':'application/json'}}

  async function refreshSessionIfNeeded(){
    const refresh=localStorage.getItem('wr_refresh_token');
    const expires=Number(localStorage.getItem('wr_expires_at')||0);
    const savedAccess=localStorage.getItem('wr_access_token');
    if(!refresh) return;
    if(savedAccess && expires && expires-Date.now()>5*60*1000) return;
    try{
      const r=await fetch(`${cfgUrl()}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:authHeaders(),body:JSON.stringify({refresh_token:refresh})});
      const data=await r.json();
      if(!r.ok||!data.access_token) throw new Error(data.message||'session refresh failed');
      localStorage.setItem('wr_access_token',data.access_token);
      if(data.refresh_token) localStorage.setItem('wr_refresh_token',data.refresh_token);
      if(data.expires_in) localStorage.setItem('wr_expires_at',String(Date.now()+Number(data.expires_in)*1000));
      try{accessToken=data.access_token}catch(_){}
      try{await restoreSession()}catch(_){}
    }catch(err){console.warn('WeddingRank session refresh skipped',err)}
  }

  async function sendDynamicMagicLink(email){
    const redirect=`${location.origin}${location.pathname}`;
    const r=await fetch(`${cfgUrl()}/auth/v1/otp?redirect_to=${encodeURIComponent(redirect)}`,{method:'POST',headers:authHeaders(),body:JSON.stringify({email,create_user:true})});
    const data=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(data.msg||data.message||`Auth ${r.status}`);
  }

  document.addEventListener('click',async ev=>{
    const btn=ev.target.closest?.('#loginBtn');
    if(!btn) return;
    ev.preventDefault();ev.stopImmediatePropagation();
    const input=$('#loginEmail');
    const email=(input?.value||'').trim();
    if(!email){alert('이메일을 입력해주세요.');return}
    btn.disabled=true;
    const old=btn.textContent;btn.textContent='로그인 링크 전송중…';
    try{await sendDynamicMagicLink(email);alert('로그인 링크를 이메일로 보냈습니다.')}catch(err){alert('로그인 요청 오류: '+err.message)}finally{btn.disabled=false;btn.textContent=old}
  },true);

  function safeDetailWebsite(){
    const a=$('#detailWebsite a');if(!a)return;
    try{const u=new URL(a.href,location.href);if(!['http:','https:'].includes(u.protocol))throw new Error('unsafe');a.rel='noopener noreferrer';}
    catch(_){$('#detailWebsite').textContent='홈페이지 확인중'}
  }

  async function aggregateLatestPrices(){
    if(typeof api!=='function') return;
    try{
      const rows=await api('wedding_prices?select=hall_id,effective_date,rental_fee,meal_price_per_person,minimum_guarantee&order=effective_date.desc&limit=1000');
      const grouped=new Map();
      for(const p of rows){
        if(!p.hall_id) continue;
        const g=grouped.get(p.hall_id);
        if(!g||String(p.effective_date||'')>String(g.date||'')) grouped.set(p.hall_id,{date:p.effective_date||'',rows:[p]});
        else if(String(p.effective_date||'')===String(g.date||'')) g.rows.push(p);
      }
      const min=(a,k)=>{const v=a.map(x=>x[k]).filter(x=>x!=null).map(Number).filter(Number.isFinite);return v.length?Math.min(...v):null};
      const next=new Map();
      for(const [id,g] of grouped){next.set(id,{hall_id:id,effective_date:g.date,rental_fee:min(g.rows,'rental_fee'),meal_price_per_person:min(g.rows,'meal_price_per_person'),minimum_guarantee:min(g.rows,'minimum_guarantee')})}
      try{priceByHall=next}catch(_){}
      const filter=$('#sortFilter')||$('#priceFilter');
      if(filter) filter.dispatchEvent(new Event('change',{bubbles:true}));
      if($('#status')&&typeof halls!=='undefined') $('#status').textContent=`공개 예식장 ${halls.length}곳 · 가격정보 ${next.size}곳`;
    }catch(err){console.warn('WeddingRank current price aggregation skipped',err)}
  }

  window.addEventListener('hashchange',()=>setTimeout(safeDetailWebsite,250));
  document.addEventListener('DOMContentLoaded',()=>{
    setTimeout(refreshSessionIfNeeded,80);
    setTimeout(aggregateLatestPrices,900);
    setTimeout(safeDetailWebsite,1000);
  });
})();
