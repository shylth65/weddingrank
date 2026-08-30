/* WeddingRank v5.13 - final QA: logout persistence + current-price compare semantics */
(()=>{
  const $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const won=v=>v==null?'확인중':Number(v)===0?'무료':Number(v).toLocaleString('ko-KR')+'원';
  const cfg=()=>window.WEDDINGRANK_CONFIG||{};
  const baseUrl=()=>String(cfg().SUPABASE_URL||'').replace(/\/+$/,'');
  const anonKey=()=>cfg().SUPABASE_ANON_KEY||cfg().SUPABASE_PUBLISHABLE_KEY||cfg().SUPABASE_KEY||'';

  function clearStoredSession(){
    localStorage.removeItem('wr_access_token');
    localStorage.removeItem('wr_refresh_token');
    localStorage.removeItem('wr_expires_at');
    try{accessToken=null}catch(_){}
    try{currentUser=null}catch(_){}
  }

  async function logoutFully(){
    const token=localStorage.getItem('wr_access_token');
    if(token&&baseUrl()&&anonKey()){
      try{
        await fetch(`${baseUrl()}/auth/v1/logout`,{
          method:'POST',
          headers:{apikey:anonKey(),Authorization:`Bearer ${token}`}
        });
      }catch(_){}
    }
    clearStoredSession();
    try{renderAuth()}catch(_){}
  }

  document.addEventListener('click',ev=>{
    const btn=ev.target.closest?.('#logoutBtn');
    if(!btn)return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    logoutFully();
  },true);

  function currentRows(prices){
    const dates=prices.map(p=>String(p.effective_date||'')).filter(Boolean);
    if(!dates.length)return prices;
    const latest=dates.sort().reverse()[0];
    return prices.filter(p=>String(p.effective_date||'')===latest);
  }
  function min(rows,key){
    const vals=rows.map(x=>x[key]).filter(v=>v!=null).map(Number).filter(Number.isFinite);
    return vals.length?Math.min(...vals):null;
  }

  async function openCurrentCompare(){
    const raw=JSON.parse(localStorage.getItem('wr_compare_ids')||'[]');
    const ids=[...new Set(raw)].slice(0,3);
    if(ids.length<2)return alert('2곳 이상 선택하면 비교할 수 있습니다.');
    let modal=$('#compareModal');
    if(!modal){modal=document.createElement('div');modal.id='compareModal';modal.className='compareModal';document.body.appendChild(modal)}
    modal.hidden=false;
    modal.innerHTML='<div class="compareSheet"><button class="compareClose" type="button" aria-label="닫기">×</button><h2>예식장 비교</h2><div class="pending">최신 기준 가격을 불러오는 중…</div></div>';
    modal.querySelector('.compareClose').onclick=()=>modal.hidden=true;
    try{
      const data=await Promise.all(ids.map(async id=>{
        const h=(typeof halls!=='undefined'?halls:[]).find(x=>x.hall_id===id)||{};
        const [prices,rooms]=await Promise.all([
          api(`wedding_prices?select=effective_date,rental_fee,meal_price_per_person,minimum_guarantee&hall_id=eq.${encodeURIComponent(id)}&order=effective_date.desc&limit=100`),
          api(`hall_rooms?select=room_name&hall_id=eq.${encodeURIComponent(id)}&limit=100`)
        ]);
        const rows=currentRows(prices);
        const date=rows[0]?.effective_date||null;
        return {h,rooms,date,rental:min(rows,'rental_fee'),meal:min(rows,'meal_price_per_person'),guarantee:min(rows,'minimum_guarantee')};
      }));
      const rows=[
        ['지역',x=>[x.h.sido,x.h.sigungu].filter(Boolean).join(' ')||'확인중'],
        ['가격 기준일',x=>x.date||'확인중'],
        ['대관료 시작',x=>won(x.rental)],
        ['식대 시작',x=>won(x.meal)],
        ['최소보증',x=>x.guarantee!=null?Number(x.guarantee).toLocaleString('ko-KR')+'명':'확인중'],
        ['홀 수',x=>x.rooms.length?x.rooms.length+'개':'확인중'],
        ['주소',x=>x.h.road_address||'확인중']
      ];
      modal.querySelector('.compareSheet').innerHTML=`<button class="compareClose" type="button" aria-label="닫기">×</button><h2>예식장 비교</h2><p class="blockHint">각 예식장의 가장 최근 기준일 가격만 비교합니다.</p><div class="compareTableWrap"><table class="compareTable"><thead><tr><th>항목</th>${data.map(x=>`<th>${esc(x.h.name||'예식장')}</th>`).join('')}</tr></thead><tbody>${rows.map(([label,fn])=>`<tr><th>${label}</th>${data.map(x=>`<td>${esc(fn(x))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      modal.querySelector('.compareClose').onclick=()=>modal.hidden=true;
    }catch(err){
      const pending=modal.querySelector('.pending');
      if(pending)pending.textContent='비교 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.';
      console.warn('WeddingRank current compare failed',err);
    }
  }

  document.addEventListener('click',ev=>{
    const btn=ev.target.closest?.('#openCompare');
    if(!btn)return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    openCurrentCompare();
  },true);

  async function correctDetailSummary(){
    const id=(location.hash.match(/^#hall=(.+)$/)||[])[1];
    const box=$('#detailQuickSummary');
    if(!id||!box||typeof api!=='function')return;
    try{
      const prices=await api(`wedding_prices?select=effective_date,rental_fee,meal_price_per_person,minimum_guarantee&hall_id=eq.${encodeURIComponent(id)}&order=effective_date.desc&limit=100`);
      if(!prices.length)return;
      const rows=currentRows(prices);
      const cells=box.querySelectorAll('.summaryGrid>div b');
      if(cells[0])cells[0].textContent=won(min(rows,'meal_price_per_person'));
      if(cells[1])cells[1].textContent=won(min(rows,'rental_fee'));
      if(cells[2]){const v=min(rows,'minimum_guarantee');cells[2].textContent=v!=null?Number(v).toLocaleString('ko-KR')+'명':'확인중'}
      const small=box.querySelector('.summaryHead small');
      if(small&&rows[0]?.effective_date)small.textContent=`가격 기준 ${String(rows[0].effective_date).slice(0,10)}`;
    }catch(err){console.warn('WeddingRank detail current-price correction skipped',err)}
  }

  window.addEventListener('hashchange',()=>setTimeout(correctDetailSummary,900));
  document.addEventListener('DOMContentLoaded',()=>setTimeout(correctDetailSummary,1600));
})();
