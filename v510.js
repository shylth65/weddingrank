/* WeddingRank v5.10 - navigation/pagination QA fixes */
(()=>{
  const $=s=>document.querySelector(s);
  const e=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  function filteredRows(){
    const q=($('#search')?.value||'').trim().toLowerCase();
    const sido=$('#sido')?.value||'';
    const sigungu=$('#sigunguFilter')?.value||'';
    const pf=$('#priceFilter')?.value||'';
    const sort=$('#sortFilter')?.value||'name';
    let rows=(typeof halls!=='undefined'?halls:[]).filter(h=>(!sido||h.sido===sido)&&(!sigungu||h.sigungu===sigungu)&&(!q||[h.name,h.sido,h.sigungu,h.road_address].join(' ').toLowerCase().includes(q)));
    rows=rows.filter(h=>{
      const p=priceByHall?.get(h.hall_id);
      if(pf==='priced')return !!p;
      if(pf==='unpriced')return !p;
      if(pf==='meal70000')return p?.meal_price_per_person!=null&&Number(p.meal_price_per_person)<=70000;
      if(pf==='meal100000')return p?.meal_price_per_person!=null&&Number(p.meal_price_per_person)<=100000;
      return true;
    });
    const val=(h,k)=>{const p=priceByHall?.get(h.hall_id);return p?.[k]==null?Infinity:Number(p[k])};
    rows.sort((a,b)=>sort==='mealAsc'?val(a,'meal_price_per_person')-val(b,'meal_price_per_person'):sort==='rentalAsc'?val(a,'rental_fee')-val(b,'rental_fee'):sort==='guaranteeAsc'?val(a,'minimum_guarantee')-val(b,'minimum_guarantee'):String(a.name||'').localeCompare(String(b.name||''),'ko'));
    return rows;
  }

  function renderFilteredPage(){
    const cards=$('#cards');if(!cards)return;
    const rows=filteredRows(), visible=rows.slice(0,visibleHallCount);
    cards.innerHTML=visible.map(h=>`<article class="card clickable" data-id="${h.hall_id}" tabindex="0" role="link"><div class="cardTop"><div class="area">${e(h.sido||'')} ${e(h.sigungu||'')}</div>${priceByHall.has(h.hall_id)?'<span class="dataReady">가격확인</span>':''}</div><h3>${e(h.name)}</h3><p>${e(h.road_address||'주소 확인중')}</p><div class="badges"><span class="badge">${e(h.venue_type||'예식장')}</span>${priceBadge(h.hall_id)}</div><div class="more">상세정보 보기 →</div></article>`).join('');
    if($('#empty'))$('#empty').hidden=rows.length!==0;
    if($('#listResultCount'))$('#listResultCount').textContent=`검색결과 ${rows.length}곳 · ${visible.length}곳 표시중`;
    const more=$('#loadMoreBtn');if(more){more.hidden=visible.length>=rows.length;more.textContent=`예식장 더보기 (${Math.min(PAGE_SIZE,Math.max(0,rows.length-visible.length))}곳)`}
    cards.querySelectorAll('.card[data-id]').forEach(c=>{const go=()=>location.hash=`hall=${c.dataset.id}`;c.onclick=go;c.onkeydown=ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();go()}}});
  }

  document.addEventListener('click',ev=>{
    const more=ev.target.closest?.('#loadMoreBtn');
    if(more){ev.preventDefault();ev.stopImmediatePropagation();visibleHallCount+=PAGE_SIZE;renderFilteredPage();return}
    const region=ev.target.closest?.('#regionButtons [data-region]');
    if(region){ev.preventDefault();ev.stopImmediatePropagation();const sido=$('#sido');if(sido){sido.value=region.dataset.region||'';visibleHallCount=PAGE_SIZE;sido.dispatchEvent(new Event('change',{bubbles:true}))}showList?.();setTimeout(()=>$('#find')?.scrollIntoView({behavior:'smooth',block:'start'}),40)}
  },true);

  window.addEventListener('hashchange',()=>{
    if(location.hash==='#find'){showList?.();setTimeout(()=>$('#find')?.scrollIntoView({behavior:'smooth',block:'start'}),40)}
  });

  function qa(){
    const required=['#cards','#search','#sido','#rankingBody','#detailView','#consultForm'];
    const missing=required.filter(x=>!$(x));
    if(missing.length)console.warn('WeddingRank QA missing elements',missing);
  }
  setTimeout(qa,1200);
})();