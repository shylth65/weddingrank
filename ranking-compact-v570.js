/* WeddingRank colorful ranking renderer v5.73 */
(function(){
  const RANKED_LIMIT=30, PENDING_PREVIEW_LIMIT=5;

  function ensureRankingVisual(){
    const old=document.getElementById('wr-ranking-visual-inline-v572'); if(old) old.remove();
    if(document.getElementById('wr-ranking-visual-inline-v573')) return;
    const s=document.createElement('style'); s.id='wr-ranking-visual-inline-v573';
    s.textContent=`
#rankingView{background:linear-gradient(180deg,#fff 0%,#fffafd 55%,#f8fbff 100%)!important}
#rankingView .rankingHero{padding:48px 20px 38px!important;background:radial-gradient(circle at 12% 20%,rgba(255,102,153,.20),transparent 26%),radial-gradient(circle at 88% 15%,rgba(93,126,255,.18),transparent 27%),radial-gradient(circle at 67% 100%,rgba(93,210,174,.17),transparent 30%),linear-gradient(135deg,#fff5f9 0%,#f7f4ff 52%,#f2fbff 100%)!important;border-bottom:1px solid #eee4f2!important}
#rankingView .rankingHero>*{max-width:1320px;margin-left:auto!important;margin-right:auto!important}
#rankingView .rankingHero .eyebrow{color:#ef4d87!important;font-weight:950!important;letter-spacing:.16em!important}.rankingHero h1{color:#202126!important;font-weight:950!important}.rankingHero p:last-child{color:#6f6a75!important}
#rankingView>.section{max-width:1320px!important;margin:0 auto!important;padding-top:30px!important}
#rankingView .rankingControls{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:16px!important;margin-bottom:16px!important;padding:14px!important;border:1px solid #ece5ef!important;border-radius:22px!important;background:rgba(255,255,255,.94)!important;box-shadow:0 12px 34px rgba(75,62,104,.07)!important}
#rankingView .rankTabs{display:grid!important;grid-template-columns:repeat(4,minmax(115px,1fr))!important;gap:9px!important;flex:1!important}
#rankingView .rankTab{min-height:50px!important;border-radius:15px!important;font-size:14px!important;font-weight:950!important;background:#fff!important;box-shadow:none!important;transition:.16s ease!important}
#rankingView .rankTab[data-rank="overall"]{border:1px solid #ffc1d5!important;color:#df3974!important;background:#fff7fa!important}
#rankingView .rankTab[data-rank="food"]{border:1px solid #ffd1a8!important;color:#d96e16!important;background:#fff9f2!important}
#rankingView .rankTab[data-rank="parking"]{border:1px solid #bcd5ff!important;color:#316ec7!important;background:#f5f9ff!important}
#rankingView .rankTab[data-rank="value"]{border:1px solid #bce8d7!important;color:#238966!important;background:#f3fcf8!important}
#rankingView .rankTab[data-rank="overall"].active{background:linear-gradient(135deg,#ff5f91,#e83f7c)!important;border-color:#e83f7c!important;color:#fff!important;box-shadow:0 8px 20px rgba(232,63,124,.24)!important}
#rankingView .rankTab[data-rank="food"].active{background:linear-gradient(135deg,#ffad5b,#ed7b22)!important;border-color:#ed7b22!important;color:#fff!important;box-shadow:0 8px 20px rgba(237,123,34,.22)!important}
#rankingView .rankTab[data-rank="parking"].active{background:linear-gradient(135deg,#6ba8ff,#477ee7)!important;border-color:#477ee7!important;color:#fff!important;box-shadow:0 8px 20px rgba(71,126,231,.22)!important}
#rankingView .rankTab[data-rank="value"].active{background:linear-gradient(135deg,#57cf9f,#2ca77c)!important;border-color:#2ca77c!important;color:#fff!important;box-shadow:0 8px 20px rgba(44,167,124,.22)!important}
#rankingRegion{min-height:50px!important;padding:0 40px 0 16px!important;border:1px solid #ddd4e5!important;border-radius:15px!important;background:#fff!important;font-weight:850!important;color:#4f4956!important}
#rankingView .rankingNote{margin:0 0 26px!important;padding:15px 18px!important;border:1px solid #eadff1!important;border-radius:16px!important;background:linear-gradient(90deg,#fff8fb,#f8f6ff,#f4fbff)!important;color:#6f6875!important;font-size:13px!important;line-height:1.7!important}
#rankingBody{display:flex!important;flex-direction:column!important;gap:13px!important}
#rankingBody .rankSectionMeta,#rankingBody .rankPendingHeader{display:flex!important;justify-content:space-between!important;align-items:flex-end!important;padding:10px 3px 4px!important}.rankKicker{font-size:10px!important;font-weight:950!important;letter-spacing:.16em!important;color:#ef4d87!important}.rankPendingHeader .rankKicker{color:#8573d5!important}.rankSectionMeta b,.rankPendingHeader b{font-size:21px!important;color:#26242b!important}
#rankingBody .rankRow{position:relative!important;display:grid!important;grid-template-columns:68px minmax(0,1fr) 145px!important;align-items:center!important;gap:17px!important;padding:21px 23px!important;margin:0!important;border-radius:22px!important;border:1px solid #e9e4ef!important;background:#fff!important;box-shadow:0 10px 28px rgba(67,52,90,.06)!important;overflow:hidden!important}
#rankingBody .rankRow:not(.pendingRank)::before{content:"";position:absolute;left:0;top:0;bottom:0;width:6px;background:linear-gradient(180deg,#ff5f91,#7a86ff,#43c99a)}
#rankingBody .rankNo{display:flex!important;align-items:center!important;justify-content:center!important;width:48px!important;height:48px!important;border-radius:15px!important;background:linear-gradient(135deg,#ff6699,#745cff)!important;color:#fff!important;font-size:18px!important;font-weight:950!important;box-shadow:0 7px 18px rgba(116,92,255,.18)!important}
#rankingBody .rank1{border-color:#f3d27b!important;background:linear-gradient(100deg,#fff9e8 0%,#fff 38%)!important}.rank1 .rankNo{background:linear-gradient(135deg,#ffd95c,#e4a51c)!important;color:#6b4a00!important}.rank1 .rankScore strong{color:#c98b06!important}
#rankingBody .rank2{border-color:#ccd6e4!important;background:linear-gradient(100deg,#f4f7fb 0%,#fff 38%)!important}.rank2 .rankNo{background:linear-gradient(135deg,#e9eef5,#aeb9c9)!important;color:#465363!important}.rank2 .rankScore strong{color:#68798f!important}
#rankingBody .rank3{border-color:#e6b99f!important;background:linear-gradient(100deg,#fff4ed 0%,#fff 38%)!important}.rank3 .rankNo{background:linear-gradient(135deg,#e7b38d,#b97852)!important;color:#fff!important}.rank3 .rankScore strong{color:#a9623d!important}
#rankingBody .rankHall b{display:block!important;margin-bottom:6px!important;font-size:19px!important;font-weight:950!important;color:#27252c!important}.rankHall span{font-size:12px!important;color:#898391!important}.rankScore{text-align:right!important}.rankScore strong{display:block!important;font-size:24px!important;font-weight:950!important;color:#e24a7f!important}.rankScore span{display:block!important;margin-top:6px!important;font-size:11px!important;color:#8f8994!important}
#rankingBody .pendingRank{background:linear-gradient(100deg,#fbfaff,#fff 45%)!important;border-color:#e8e3f0!important;box-shadow:none!important}.pendingRank:nth-of-type(4n+1){background:linear-gradient(100deg,#fff7fb,#fff 45%)!important}.pendingRank:nth-of-type(4n+2){background:linear-gradient(100deg,#f5f9ff,#fff 45%)!important}.pendingRank:nth-of-type(4n+3){background:linear-gradient(100deg,#f4fcf8,#fff 45%)!important}.pendingRank:nth-of-type(4n){background:linear-gradient(100deg,#fff9f1,#fff 45%)!important}
#rankingBody .pendingRank .rankNo{background:#eeeafa!important;color:#7d70b4!important;box-shadow:none!important;font-size:12px!important}.pendingRank .rankHall b{color:#5c5863!important}.pendingRank .rankScore strong{font-size:15px!important;color:#8d8696!important}
#rankingBody .rankPendingExtra{display:none!important}.rankPendingExtra.rankExpanded{display:grid!important}.rankPendingToggleWrap{text-align:center!important;padding:10px 0 20px!important}.rankPendingToggle{min-height:46px!important;padding:0 22px!important;border:0!important;border-radius:999px!important;background:linear-gradient(135deg,#7c6ee6,#5f8ff0)!important;color:#fff!important;font-size:13px!important;font-weight:950!important;box-shadow:0 8px 20px rgba(95,143,240,.2)!important}.rankPendingToggle b{display:inline-flex!important;align-items:center!important;justify-content:center!important;min-width:24px!important;height:24px!important;margin-left:6px!important;padding:0 7px!important;border-radius:999px!important;background:rgba(255,255,255,.2)!important;color:#fff!important}
@media(max-width:700px){#rankingView>.section{padding:22px 18px 46px!important}.rankingControls{align-items:stretch!important;flex-direction:column!important}.rankTabs{grid-template-columns:repeat(2,minmax(0,1fr))!important}#rankingRegion{width:100%!important}.rankRow{grid-template-columns:50px minmax(0,1fr)!important;padding:17px 15px!important}.rankNo{width:40px!important;height:40px!important}.rankScore{grid-column:2!important;text-align:left!important;display:flex!important;gap:8px!important;align-items:center!important}.rankScore strong{font-size:17px!important}.rankScore span{margin-top:0!important}}
`;
    document.head.appendChild(s);
  }

  function rowHtml(h,ready,rankNo,key,isExtra){
    const area=[h.sido,h.sigungu].filter(Boolean).join(' ');
    const medal=ready&&rankNo<=3?` rank${rankNo}`:'';
    return `<article class="rankRow${ready?'':' pendingRank'}${isExtra?' rankPendingExtra':''}${medal}" data-id="${h.hall_id}"><div class="rankNo">${ready?rankNo:'대기'}</div><div class="rankHall"><b>${esc(h.name)}</b><span>${esc(area)}</span></div><div class="rankScore">${ready?`<strong>${Number(h[key]).toFixed(2)}</strong><span>${Number(h.review_count)||0}개 평가</span>`:'<strong>평가대기</strong><span>첫 평가 등록 후 순위 산정</span>'}</div></article>`;
  }

  loadRankings=async function(){
    ensureRankingVisual();
    if($('#listView'))$('#listView').hidden=true;if($('#detailView'))$('#detailView').hidden=true;if($('#rankingView'))$('#rankingView').hidden=false;
    const body=$('#rankingBody'); if(!body)return; body.innerHTML='<div class="pending big">랭킹을 불러오는 중…</div>';
    try{
      const rows=await api('wedding_hall_rankings?select=*&order=overall_score.desc.nullslast');
      const region=$('#rankingRegion')?.value||'', key={overall:'overall_score',food:'food_score',parking:'parking_score',value:'value_score'}[rankingMode]||'overall_score';
      const filtered=rows.filter(x=>!region||x.sido===region); if(!filtered.length){body.innerHTML='<div class="pending big"><b>해당 지역의 공개 예식장이 없습니다.</b></div>';return;}
      const rated=filtered.filter(h=>Number(h.review_count)>0&&h[key]!=null).sort((a,b)=>(Number(b[key])-Number(a[key]))||(Number(b.review_count)-Number(a.review_count))||String(a.name||'').localeCompare(String(b.name||''),'ko'));
      const pending=filtered.filter(h=>!(Number(h.review_count)>0&&h[key]!=null)).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ko'));
      const rankedVisible=rated.slice(0,RANKED_LIMIT), pendingPreview=pending.slice(0,PENDING_PREVIEW_LIMIT); let html='';
      if(rankedVisible.length){html+=`<div class="rankSectionMeta"><div><span class="rankKicker">RANKING</span><b>평가 완료 순위</b></div><span>${rated.length>RANKED_LIMIT?`상위 ${RANKED_LIMIT}곳`:rankedVisible.length+'곳'}</span></div>`;html+=rankedVisible.map((h,i)=>rowHtml(h,true,i+1,key,false)).join('');}else html+='<div class="rankEmpty"><b>아직 순위를 산정할 평가가 없습니다.</b><span>첫 평가가 등록되면 자동으로 순위에 반영됩니다.</span></div>';
      if(pending.length){html+=`<div class="rankPendingHeader"><div><span class="rankKicker">WAITING</span><b>평가대기 예식장</b></div><span>${pending.length}곳 중 ${Math.min(PENDING_PREVIEW_LIMIT,pending.length)}곳 표시</span></div>`;html+=pendingPreview.map(h=>rowHtml(h,false,null,key,false)).join('');}
      body.innerHTML=html; body.querySelectorAll('.rankRow[data-id]').forEach(x=>x.onclick=()=>location.hash=`hall=${x.dataset.id}`);
    }catch(e){body.innerHTML=`<div class="pending big">랭킹 조회 오류: ${esc(e.message)}</div>`;}
  };
  ensureRankingVisual();
})();

/* Main navigation: add direct price-range finder beside region finder */
(function(){
  function goPriceFinder(e){
    if(e)e.preventDefault();
    if(location.hash!=="#find")location.hash="find";
    const scroll=()=>{const target=document.querySelector('#wrPriceBand')||document.querySelector('#find');if(target)target.scrollIntoView({behavior:'smooth',block:'start'})};
    setTimeout(scroll,120);
    setTimeout(scroll,500);
  }
  function installPriceNav(){
    document.querySelector('.mainNav a[href="#wrPriceBand"]')?.addEventListener('click',goPriceFinder);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installPriceNav,{once:true});else installPriceNav();
})();
