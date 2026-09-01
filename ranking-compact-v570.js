/* WeddingRank ranking compact renderer v5.71
   Rated venues: max 30. Pending venues: 5 preview + explicit expand/collapse.
   Homepage TOP10 remains untouched. */
(function(){
  const RANKED_LIMIT=30;
  const PENDING_PREVIEW_LIMIT=5;

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
})();
