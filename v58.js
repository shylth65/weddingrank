/* WeddingRank v5.8 - district rankings + auth session refresh */
(()=>{
  const $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const cfg=window.WEDDINGRANK_CONFIG||{};
  const key=cfg.SUPABASE_ANON_KEY||cfg.SUPABASE_PUBLISHABLE_KEY||cfg.SUPABASE_KEY||'';
  const base=String(cfg.SUPABASE_URL||'').replace(/\/+$/,'');

  async function refreshAuth(force=false){
    const refresh=localStorage.getItem('wr_refresh_token');
    if(!refresh||!base||!key)return false;
    const exp=Number(localStorage.getItem('wr_expires_at')||0);
    if(!force&&accessToken&&currentUser&&exp>Date.now()+5*60*1000)return true;
    try{
      const r=await fetch(`${base}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:refresh})});
      const d=await r.json();
      if(!r.ok||!d.access_token)throw new Error(d.message||'refresh failed');
      accessToken=d.access_token;
      currentUser=d.user||null;
      localStorage.setItem('wr_access_token',d.access_token);
      if(d.refresh_token)localStorage.setItem('wr_refresh_token',d.refresh_token);
      if(d.expires_in)localStorage.setItem('wr_expires_at',String(Date.now()+Number(d.expires_in)*1000));
      renderAuth?.();
      return true;
    }catch(err){
      console.warn('WeddingRank session refresh skipped',err);
      return false;
    }
  }

  document.addEventListener('click',ev=>{
    if(ev.target?.id==='logoutBtn'){
      localStorage.removeItem('wr_refresh_token');
      localStorage.removeItem('wr_expires_at');
    }
  },true);

  function ensureRankDistrict(){
    const region=$('#rankingRegion');
    if(!region||$('#rankingSigungu'))return;
    const sel=document.createElement('select');
    sel.id='rankingSigungu';
    sel.innerHTML='<option value="">시·군·구 전체</option>';
    region.insertAdjacentElement('afterend',sel);
    region.addEventListener('change',()=>{populateRankDistrict();renderDistrictRanking()});
    sel.addEventListener('change',renderDistrictRanking);
    document.querySelectorAll('.rankTab').forEach(b=>b.addEventListener('click',()=>setTimeout(renderDistrictRanking,20)));
    populateRankDistrict();
  }

  function populateRankDistrict(){
    const region=$('#rankingRegion'),sel=$('#rankingSigungu');
    if(!region||!sel)return;
    const sido=region.value,current=sel.value;
    const districts=[...new Set((window.halls||halls||[]).filter(h=>!sido||h.sido===sido).map(h=>h.sigungu).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ko'));
    sel.innerHTML='<option value="">시·군·구 전체</option>'+districts.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
    if(districts.includes(current))sel.value=current;
  }

  async function renderDistrictRanking(){
    if(location.hash!=='#rankings')return;
    const body=$('#rankingBody'),region=$('#rankingRegion'),district=$('#rankingSigungu');
    if(!body||!region)return;
    const active=document.querySelector('.rankTab.active')?.dataset.rank||rankingMode||'overall';
    const field={overall:'overall_score',food:'food_score',parking:'parking_score',value:'value_score'}[active]||'overall_score';
    try{
      const rows=await api(`wedding_hall_rankings?select=hall_id,name,sido,sigungu,review_count,overall_score,food_score,parking_score,value_score&order=${field}.desc.nullslast,review_count.desc&limit=1000`);
      const sido=region.value,sigungu=district?.value||'';
      const filtered=rows.filter(x=>(!sido||x.sido===sido)&&(!sigungu||x.sigungu===sigungu));
      const rated=filtered.filter(x=>Number(x.review_count)>0&&x[field]!=null);
      const pending=filtered.filter(x=>!(Number(x.review_count)>0&&x[field]!=null));
      const label=active==='food'?'음식':active==='parking'?'주차':active==='value'?'가성비':'종합';
      body.innerHTML=`<div class="rankScopeSummary"><b>${esc([sido,sigungu].filter(Boolean).join(' ')||'전국')} ${label}랭킹</b><span>평가완료 ${rated.length}곳 · 평가대기 ${pending.length}곳</span></div>`+
        (rated.length?rated.map((x,i)=>`<div class="rankRow" data-hall="${x.hall_id}"><div class="rankNo">${i+1}</div><div class="rankHall"><b>${esc(x.name)}</b><span>${esc([x.sido,x.sigungu].filter(Boolean).join(' '))}</span><small>리뷰 ${x.review_count}개</small></div><div class="rankScore"><strong>${Number(x[field]).toFixed(2)}</strong><span>${label}점수</span></div></div>`).join(''):`<div class="rankingEmpty"><b>아직 순위를 매길 평가가 없습니다.</b><span>첫 실제 이용자 평가가 등록되면 자동으로 랭킹이 시작됩니다.</span></div>`)+
        pending.slice(0,80).map(x=>`<div class="rankRow pendingRank" data-hall="${x.hall_id}"><div class="rankNo">대기</div><div class="rankHall"><b>${esc(x.name)}</b><span>${esc([x.sido,x.sigungu].filter(Boolean).join(' '))}</span></div><div class="rankScore"><strong>평가대기</strong><span>리뷰 등록 전</span></div></div>`).join('');
      body.querySelectorAll('[data-hall]').forEach(r=>r.addEventListener('click',()=>location.hash=`hall=${r.dataset.hall}`));
    }catch(err){console.warn('district ranking enhancement skipped',err)}
  }

  const style=document.createElement('style');
  style.textContent='.rankScopeSummary{display:flex;justify-content:space-between;gap:14px;align-items:center;padding:14px 16px;margin:0 0 8px;background:#faf7f6;border:1px solid var(--line);border-radius:12px}.rankScopeSummary span{font-size:12px;color:var(--muted)}#rankingSigungu{padding:10px 36px 10px 12px;border:1px solid var(--line);border-radius:9px;background:#fff}@media(max-width:800px){#rankingSigungu{width:100%}.rankScopeSummary{align-items:flex-start;flex-direction:column}}';
  document.head.appendChild(style);

  window.addEventListener('hashchange',()=>{if(location.hash==='#rankings')setTimeout(()=>{ensureRankDistrict();renderDistrictRanking()},120)});
  setTimeout(()=>{refreshAuth();ensureRankDistrict();if(location.hash==='#rankings')renderDistrictRanking()},650);
  setInterval(()=>refreshAuth(),5*60*1000);
})();