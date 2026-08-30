/* WeddingRank v5.6 progressive enhancements */
(()=>{
  const ENH_PAGE=500;
  const compareIds=new Set(JSON.parse(localStorage.getItem('wr_compare_ids')||'[]').slice(0,3));
  const qs=s=>document.querySelector(s);
  const e=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const won=v=>v==null?'확인중':Number(v)===0?'무료':Number(v).toLocaleString('ko-KR')+'원';

  async function apiAll(resource,params){
    let offset=0, rows=[];
    while(true){
      const sep=params.includes('?')?'&':'?';
      const part=await api(`${resource}?${params}${sep}limit=${ENH_PAGE}&offset=${offset}`);
      rows=rows.concat(part);
      if(part.length<ENH_PAGE) break;
      offset+=ENH_PAGE;
      if(offset>10000) break;
    }
    return rows;
  }

  async function refreshAllData(){
    try{
      const [hallRows,priceRows]=await Promise.all([
        apiAll('wedding_halls','select=hall_id,name,sido,sigungu,road_address,phone,website,venue_type&is_public=eq.true&operation_status=eq.%EC%9A%B4%EC%98%81&order=name.asc'),
        apiAll('wedding_prices','select=hall_id,effective_date,rental_fee,meal_price_per_person&order=effective_date.desc')
      ]);
      halls=hallRows;
      buildPriceMap(priceRows);
      if(qs('#publicCount')) qs('#publicCount').textContent=halls.length+'곳';
      if(qs('#status')) qs('#status').textContent=`공개 예식장 ${halls.length}곳 · 가격정보 ${priceByHall.size}곳`;
      setupRegions(); render(true); decorateCards(); renderCompareTray();
    }catch(err){console.warn('v5.6 full data refresh skipped',err)}
  }

  try{
    priceBadge=function(hallId){
      const p=priceByHall.get(hallId);
      if(!p) return '<span class="badge price pendingPrice">가격정보 확인중</span>';
      if(p.meal_price_per_person!=null) return `<span class="badge price verifiedPrice">식대 ${Number(p.meal_price_per_person).toLocaleString('ko-KR')}원</span>`;
      if(p.rental_fee!=null) return `<span class="badge price verifiedPrice">대관 ${Number(p.rental_fee)===0?'무료':Number(p.rental_fee).toLocaleString('ko-KR')+'원'}</span>`;
      return '<span class="badge price verifiedPrice">가격정보 있음</span>';
    };
  }catch(_){ }

  function saveCompare(){localStorage.setItem('wr_compare_ids',JSON.stringify([...compareIds]));}
  function decorateCards(){
    document.querySelectorAll('.card[data-id]').forEach(card=>{
      if(card.querySelector('.compareToggle')) return;
      const id=card.dataset.id;
      const btn=document.createElement('button');
      btn.type='button'; btn.className='compareToggle';
      btn.textContent=compareIds.has(id)?'✓ 비교함':'＋ 비교';
      btn.setAttribute('aria-label','비교 목록에 추가');
      btn.addEventListener('click',ev=>{
        ev.preventDefault(); ev.stopPropagation();
        if(compareIds.has(id)) compareIds.delete(id);
        else if(compareIds.size<3) compareIds.add(id);
        else return alert('예식장은 최대 3곳까지 비교할 수 있습니다.');
        saveCompare(); decorateCards(true); renderCompareTray();
        document.querySelectorAll(`.card[data-id="${CSS.escape(id)}"] .compareToggle`).forEach(x=>x.textContent=compareIds.has(id)?'✓ 비교함':'＋ 비교');
      });
      const more=card.querySelector('.more');
      (more||card).insertAdjacentElement(more?'beforebegin':'beforeend',btn);
    });
  }

  function renderCompareTray(){
    let tray=qs('#compareTray');
    if(!tray){tray=document.createElement('div');tray.id='compareTray';tray.className='compareTray';document.body.appendChild(tray)}
    const ids=[...compareIds];
    if(!ids.length){tray.hidden=true;return}
    tray.hidden=false;
    const names=ids.map(id=>halls.find(h=>h.hall_id===id)?.name||'예식장');
    tray.innerHTML=`<div><b>비교 ${ids.length}/3</b><span>${names.map(e).join(' · ')}</span></div><div class="compareTrayBtns"><button id="clearCompare">비우기</button><button id="openCompare">비교하기</button></div>`;
    qs('#clearCompare').onclick=()=>{compareIds.clear();saveCompare();renderCompareTray();document.querySelectorAll('.compareToggle').forEach(b=>b.textContent='＋ 비교')};
    qs('#openCompare').onclick=openCompare;
  }

  async function openCompare(){
    const ids=[...compareIds]; if(ids.length<2) return alert('2곳 이상 선택하면 비교할 수 있습니다.');
    let modal=qs('#compareModal');
    if(!modal){modal=document.createElement('div');modal.id='compareModal';modal.className='compareModal';document.body.appendChild(modal)}
    modal.innerHTML='<div class="compareSheet"><button class="compareClose">×</button><h2>예식장 비교</h2><div class="pending">비교 정보를 불러오는 중…</div></div>';
    modal.hidden=false; modal.querySelector('.compareClose').onclick=()=>modal.hidden=true;
    const data=await Promise.all(ids.map(async id=>{
      const h=halls.find(x=>x.hall_id===id)||{};
      const [prices,rooms]=await Promise.all([
        api(`wedding_prices?select=rental_fee,meal_price_per_person,minimum_guarantee,effective_date&hall_id=eq.${encodeURIComponent(id)}&order=effective_date.desc&limit=20`),
        api(`hall_rooms?select=room_name,capacity_min,capacity_max&hall_id=eq.${encodeURIComponent(id)}&limit=30`)
      ]);
      const rentals=prices.map(x=>x.rental_fee).filter(x=>x!=null).map(Number);
      const meals=prices.map(x=>x.meal_price_per_person).filter(x=>x!=null).map(Number);
      const mins=prices.map(x=>x.minimum_guarantee).filter(x=>x!=null).map(Number);
      return {h,rooms,prices,rental:rentals.length?Math.min(...rentals):null,meal:meals.length?Math.min(...meals):null,min:mins.length?Math.min(...mins):null};
    }));
    const rows=[['지역',x=>[x.h.sido,x.h.sigungu].filter(Boolean).join(' ')],['대관료 시작',x=>won(x.rental)],['식대 시작',x=>won(x.meal)],['최소보증',x=>x.min?x.min.toLocaleString('ko-KR')+'명':'확인중'],['홀 수',x=>x.rooms.length?x.rooms.length+'개':'확인중'],['주소',x=>x.h.road_address||'확인중']];
    modal.querySelector('.compareSheet').innerHTML=`<button class="compareClose">×</button><h2>예식장 비교</h2><div class="compareTableWrap"><table class="compareTable"><thead><tr><th>항목</th>${data.map(x=>`<th>${e(x.h.name)}</th>`).join('')}</tr></thead><tbody>${rows.map(([label,fn])=>`<tr><th>${label}</th>${data.map(x=>`<td>${e(fn(x))}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="compareDisclaimer">가격은 공개 확인된 자료 중 시작값 기준이며 실제 계약조건은 날짜·시간·프로모션에 따라 달라질 수 있습니다.</p></div>`;
    modal.querySelector('.compareClose').onclick=()=>modal.hidden=true;
    modal.onclick=ev=>{if(ev.target===modal)modal.hidden=true};
  }

  async function enhanceDetailPrices(){
    const id=(location.hash.match(/^#hall=(.+)$/)||[])[1]; if(!id||!qs('#prices')) return;
    try{
      const [prices,rooms]=await Promise.all([
        api(`wedding_prices?select=room_id,effective_date,season_type,rental_fee,decor_fee,meal_price_per_person,minimum_guarantee,source_name,verified_at,notes&hall_id=eq.${encodeURIComponent(id)}&order=effective_date.desc&limit=100`),
        api(`hall_rooms?select=room_id,room_name,floor&hall_id=eq.${encodeURIComponent(id)}&limit=100`)
      ]);
      if(!prices.length) return;
      const roomMap=new Map(rooms.map(r=>[r.room_id,r]));
      qs('#prices').innerHTML=prices.map(p=>{
        const r=roomMap.get(p.room_id);
        return `<article class="pricebox richPrice"><div class="priceMeta"><span>${e(r?.room_name||'예식장 공통')}</span>${p.season_type?`<span>${e(p.season_type)}</span>`:''}</div><div><small>대관료</small><b>${won(p.rental_fee)}</b></div><div><small>꽃장식</small><b>${won(p.decor_fee)}</b></div><div><small>1인 식대</small><b>${won(p.meal_price_per_person)}</b></div><div><small>최소보증</small><b>${p.minimum_guarantee?Number(p.minimum_guarantee).toLocaleString('ko-KR')+'명':'확인중'}</b></div><p>${e(p.notes||'가격은 계약 전 재확인이 필요합니다.')}</p><footer>${p.source_name?`출처 ${e(p.source_name)}`:''}${p.verified_at?` · 확인 ${e(p.verified_at)}`:''}</footer></article>`;
      }).join('');
    }catch(err){console.warn('detail pricing enhancement skipped',err)}
  }

  async function loadHomeRankingPreview(){
    const box=qs('#homeRankPreviewBody'); if(!box) return;
    try{
      const rows=await api('wedding_hall_rankings?select=hall_id,name,sido,sigungu,review_count,overall_score&order=overall_score.desc.nullslast,review_count.desc&limit=5');
      const rated=rows.filter(x=>Number(x.review_count)>0&&x.overall_score!=null);
      if(!rated.length){box.innerHTML='<div class="rankingPreviewEmpty"><b>첫 평가를 기다리고 있습니다.</b><span>평가가 등록되는 순간 전국·지역 랭킹에 자동 반영됩니다.</span><a href="#rankings">전체 랭킹 화면 보기 →</a></div>';return}
      box.innerHTML=rated.map((x,i)=>`<a class="previewRankRow" href="#hall=${e(x.hall_id)}"><strong>${i+1}</strong><div><b>${e(x.name)}</b><span>${e([x.sido,x.sigungu].filter(Boolean).join(' '))} · 리뷰 ${x.review_count}개</span></div><em>${Number(x.overall_score).toFixed(1)}</em></a>`).join('');
    }catch(err){box.innerHTML='<div class="rankingPreviewEmpty"><span>랭킹 정보를 불러오는 중입니다.</span></div>'}
  }

  const observer=new MutationObserver(()=>decorateCards());
  if(qs('#cards')) observer.observe(qs('#cards'),{childList:true});
  window.addEventListener('hashchange',()=>setTimeout(enhanceDetailPrices,450));
  document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&qs('#compareModal'))qs('#compareModal').hidden=true});

  setTimeout(()=>{refreshAllData();loadHomeRankingPreview();decorateCards();renderCompareTray();enhanceDetailPrices()},250);
})();
