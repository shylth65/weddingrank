/* WeddingRank ranking compact renderer v5.72
   Rated venues: max 30. Pending venues: 5 preview + explicit expand/collapse.
   Ranking visual CSS is injected from this script to avoid external CSS cache/load failures.
   Homepage TOP10 remains untouched. */
(function(){
  const RANKED_LIMIT=30;
  const PENDING_PREVIEW_LIMIT=5;

  function ensureRankingVisual(){
    if(document.getElementById('wr-ranking-visual-inline-v572')) return;
    const style=document.createElement('style');
    style.id='wr-ranking-visual-inline-v572';
    style.textContent=`
      #rankingView{background:#fff!important}
      #rankingView .rankingHero{padding:38px 20px 28px!important;background:linear-gradient(135deg,#fff7f8 0%,#f8f3ff 100%)!important;border-bottom:1px solid #f0e2e1!important}
      #rankingView .rankingHero>*{max-width:1320px;margin-left:auto!important;margin-right:auto!important}
      #rankingView .rankingHero .eyebrow{margin:0 0 10px!important;color:#a56669!important;font-size:12px!important;font-weight:950!important;letter-spacing:.14em!important}
      #rankingView .rankingHero h1{margin:0 0 10px!important;font-size:clamp(34px,5vw,54px)!important;line-height:1.08!important;font-weight:950!important;letter-spacing:-2px!important;color:#222126!important}
      #rankingView .rankingHero p:last-child{margin:0!important;color:#776c69!important;line-height:1.7!important}
      #rankingView>.section{max-width:1320px!important;margin:0 auto!important;padding-top:28px!important}
      #rankingView .rankingControls{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:14px!important;margin-bottom:14px!important}
      #rankingView .rankTabs{display:flex!important;flex-wrap:wrap!important;gap:8px!important}
      #rankingView .rankTab{min-height:42px!important;padding:0 16px!important;border:1px solid #dfcfcc!important;border-radius:999px!important;background:#fff!important;color:#554a48!important;font-size:14px!important;font-weight:900!important;box-shadow:none!important}
      #rankingView .rankTab.active{background:#95585c!important;border-color:#95585c!important;color:#fff!important;box-shadow:0 8px 18px rgba(126,72,76,.18)!important}
      #rankingView #rankingRegion{min-height:42px!important;padding:0 36px 0 14px!important;border:1px solid #dfcfcc!important;border-radius:14px!important;background:#fff!important;color:#4b4442!important;font-weight:800!important}
      #rankingView .rankingNote{margin:0 0 24px!important;padding:14px 16px!important;border:1px solid #efdfdc!important;border-radius:16px!important;background:#fbf6f4!important;color:#776a67!important;font-size:13px!important;line-height:1.7!important}
      #rankingBody{display:flex!important;flex-direction:column!important;gap:12px!important}
      #rankingBody .rankSectionMeta,#rankingBody .rankPendingHeader{display:flex!important;align-items:flex-end!important;justify-content:space-between!important;gap:12px!important;margin:4px 0 2px!important;padding:8px 2px 2px!important}
      #rankingBody .rankSectionMeta>div,#rankingBody .rankPendingHeader>div{display:flex!important;flex-direction:column!important;gap:4px!important}
      #rankingBody .rankKicker{font-size:10px!important;font-weight:950!important;letter-spacing:.15em!important;color:#b27477!important}
      #rankingBody .rankSectionMeta b,#rankingBody .rankPendingHeader b{font-size:20px!important;color:#2b2729!important}
      #rankingBody .rankSectionMeta>span,#rankingBody .rankPendingHeader>span{font-size:12px!important;font-weight:800!important;color:#9a8680!important}
      #rankingBody .rankRow{display:grid!important;grid-template-columns:64px minmax(0,1fr) 132px!important;align-items:center!important;gap:16px!important;margin:0!important;padding:20px 22px!important;border:1px solid #e8d9d6!important;border-radius:22px!important;background:linear-gradient(145deg,#fff 0%,#fffafa 100%)!important;box-shadow:0 10px 28px rgba(77,49,47,.055)!important;overflow:hidden!important}
      #rankingBody .rankNo{display:flex!important;align-items:center!important;justify-content:center!important;width:46px!important;height:46px!important;border-radius:14px!important;background:linear-gradient(135deg,#a96669,#875054)!important;color:#fff!important;font-size:18px!important;font-weight:950!important;line-height:1!important}
      #rankingBody .rankHall b{display:block!important;margin:0 0 6px!important;font-size:18px!important;line-height:1.3!important;font-weight:950!important;color:#292629!important;word-break:keep-all!important}
      #rankingBody .rankHall span{display:block!important;font-size:12px!important;color:#8b7e7a!important}
      #rankingBody .rankScore{text-align:right!important}
      #rankingBody .rankScore strong{display:block!important;font-size:22px!important;line-height:1!important;font-weight:950!important;color:#8e5558!important}
      #rankingBody .rankScore span{display:block!important;margin-top:7px!important;font-size:11px!important;color:#958984!important}
      #rankingBody .pendingRank{background:#fcfbfa!important;border-color:#eee5e2!important;box-shadow:none!important}
      #rankingBody .pendingRank .rankNo{background:#f1ebe8!important;color:#9d8e89!important;font-size:12px!important}
      #rankingBody .pendingRank .rankHall b{color:#5c5654!important}
      #rankingBody .pendingRank .rankScore strong{font-size:15px!important;color:#918782!important}
      #rankingBody .rankPendingExtra{display:none!important}
      #rankingBody .rankPendingExtra.rankExpanded{display:grid!important}
      #rankingBody .rankPendingToggleWrap{padding:8px 0 18px!important;text-align:center!important}
      #rankingBody .rankPendingToggle{min-height:46px!important;padding:0 20px!important;border:1px solid #d8b5b1!important;border-radius:999px!important;background:#fff!important;color:#895456!important;font-size:13px!important;font-weight:950!important;box-shadow:0 6px 18px rgba(126,72,76,.08)!important}
      #rankingBody .rankPendingToggle b{display:inline-flex!important;align-items:center!important;justify-content:center!important;min-width:24px!important;height:24px!important;margin-left:5px!important;padding:0 7px!important;border-radius:999px!important;background:#f5e5e3!important;color:#8a5558!important}
      #rankingBody .rankEmpty{display:flex!important;flex-direction:column!important;gap:8px!important;padding:24px!important;border:1px dashed #dfcbc7!important;border-radius:20px!important;background:#fff9f8!important;color:#766965!important}
      @media(max-width:700px){
        #rankingView .rankingHero{padding:30px 20px 24px!important}
        #rankingView>.section{padding:20px 18px 46px!important}
        #rankingView .rankingControls{align-items:stretch!important;flex-direction:column!important}
        #rankingView .rankTabs{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important}
        #rankingView .rankTab{width:100%!important;padding:0 10px!important}
        #rankingView #rankingRegion{width:100%!important}
        #rankingView .rankingNote{font-size:12px!important}
        #rankingBody .rankRow{grid-template-columns:50px minmax(0,1fr)!important;gap:12px!important;padding:17px 15px!important;border-radius:19px!important}
        #rankingBody .rankNo{width:40px!important;height:40px!important;border-radius:12px!important;font-size:15px!important}
        #rankingBody .rankHall b{font-size:17px!important}
        #rankingBody .rankScore{grid-column:2!important;text-align:left!important;display:flex!important;align-items:center!important;gap:8px!important;margin-top:-2px!important}
        #rankingBody .rankScore strong{font-size:16px!important}
        #rankingBody .rankScore span{margin-top:0!important}
        #rankingBody .rankSectionMeta,#rankingBody .rankPendingHeader{align-items:flex-start!important}
        #rankingBody .rankSectionMeta b,#rankingBody .rankPendingHeader b{font-size:18px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function rowHtml(h,ready,rankNo,key,isExtra){
    const area=[h.sido,h.sigungu].filter(Boolean).join(" ");
    return `<article class="rankRow${ready?'':' pendingRank'}${isExtra?' rankPendingExtra':''}" data-id="${h.hall_id}">
      <div class="rankNo">${ready?rankNo:'대기'}</div>
      <div class="rankHall"><b>${esc(h.name)}</b><span>${esc(area)}</span></div>
      <div class="rankScore">${ready
        ? `<strong>${Number(h[key]).toFixed(2)}</strong><span>${Number(h.review_count)||0}개 평가</span>`
        : '<strong>평가대기</strong><span>첫 평가 등록 후 순위 산정</span>'}
      </div>
    </article>`;
  }

  loadRankings=async function(){
    ensureRankingVisual();
    if($("#listView"))$("#listView").hidden=true;
    if($("#detailView"))$("#detailView").hidden=true;
    if($("#rankingView"))$("#rankingView").hidden=false;
    const body=$("#rankingBody");
    if(!body)return;
    body.innerHTML='<div class="pending big">랭킹을 불러오는 중…</div>';

    try{
      const rows=await api("wedding_hall_rankings?select=*&order=overall_score.desc.nullslast");
      const region=$("#rankingRegion")?.value||"";
      const key={overall:"overall_score",food:"food_score",parking:"parking_score",value:"value_score"}[rankingMode]||"overall_score";
      const filtered=rows.filter(x=>!region||x.sido===region);
      if(!filtered.length){body.innerHTML='<div class="pending big"><b>해당 지역의 공개 예식장이 없습니다.</b></div>';return;}

      const rated=filtered.filter(h=>Number(h.review_count)>0&&h[key]!=null)
        .sort((a,b)=>(Number(b[key])-Number(a[key]))||(Number(b.review_count)-Number(a.review_count))||String(a.name||"").localeCompare(String(b.name||""),"ko"));
      const pending=filtered.filter(h=>!(Number(h.review_count)>0&&h[key]!=null))
        .sort((a,b)=>String(a.name||"").localeCompare(String(b.name||""),"ko"));

      const rankedVisible=rated.slice(0,RANKED_LIMIT);
      const pendingPreview=pending.slice(0,PENDING_PREVIEW_LIMIT);
      const pendingExtra=pending.slice(PENDING_PREVIEW_LIMIT);
      let html='';

      if(rankedVisible.length){
        html+=`<div class="rankSectionMeta"><div><span class="rankKicker">RANKING</span><b>평가 완료 순위</b></div><span>${rated.length>RANKED_LIMIT?`상위 ${RANKED_LIMIT}곳`:rankedVisible.length+'곳'}</span></div>`;
        html+=rankedVisible.map((h,i)=>rowHtml(h,true,i+1,key,false)).join('');
      }else{
        html+='<div class="rankEmpty"><b>아직 순위를 산정할 평가가 없습니다.</b><span>첫 평가가 등록되면 자동으로 순위에 반영됩니다.</span></div>';
      }

      if(pending.length){
        html+=`<div class="rankPendingHeader"><div><span class="rankKicker">WAITING</span><b>평가대기 예식장</b></div><span>${pending.length}곳 중 ${Math.min(PENDING_PREVIEW_LIMIT,pending.length)}곳 표시</span></div>`;
        html+=pendingPreview.map(h=>rowHtml(h,false,null,key,false)).join('');
        html+=pendingExtra.map(h=>rowHtml(h,false,null,key,true)).join('');
        if(pendingExtra.length){
          html+=`<div class="rankPendingToggleWrap"><button id="rankPendingToggle" class="rankPendingToggle" type="button" aria-expanded="false">평가대기 예식장 더보기 <b>${pendingExtra.length}</b></button></div>`;
        }
      }

      body.innerHTML=html;
      body.querySelectorAll('.rankRow[data-id]').forEach(x=>x.onclick=()=>location.hash=`hall=${x.dataset.id}`);
      const toggle=body.querySelector('#rankPendingToggle');
      if(toggle){
        toggle.onclick=()=>{
          const expanding=toggle.getAttribute('aria-expanded')!=='true';
          body.querySelectorAll('.rankPendingExtra').forEach(x=>x.classList.toggle('rankExpanded',expanding));
          toggle.setAttribute('aria-expanded',String(expanding));
          toggle.innerHTML=expanding?'평가대기 예식장 접기':`평가대기 예식장 더보기 <b>${pendingExtra.length}</b>`;
        };
      }
    }catch(e){body.innerHTML=`<div class="pending big">랭킹 조회 오류: ${esc(e.message)}</div>`;}
  };

  ensureRankingVisual();
})();
