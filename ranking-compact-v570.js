/* WeddingRank ranking compact renderer v5.70
   - Rated venues: max 30
   - Pending venues: show 5 initially
   - Remaining pending venues: collapsed behind a toggle
   - Applies to overall / food / parking / value and region filters
   - Homepage TOP 10 is intentionally untouched.
*/
(function(){
  const RANKED_LIMIT = 30;
  const PENDING_PREVIEW_LIMIT = 5;

  function rowHtml(h, ready, rankNo, key, hidden){
    const area = [h.sido,h.sigungu].filter(Boolean).join(" ");
    return `<article class="rankRow${ready?"":" pendingRank"}${hidden?" rankPendingExtra":""}" data-id="${h.hall_id}"${hidden?' hidden':''}>
      <div class="rankNo">${ready?rankNo:"대기"}</div>
      <div class="rankHall"><b>${esc(h.name)}</b><span>${esc(area)}</span></div>
      <div class="rankScore">${ready
        ? `<strong>${Number(h[key]).toFixed(2)}</strong><span>${Number(h.review_count)||0}개 평가</span>`
        : '<strong>평가대기</strong><span>첫 평가 등록 후 순위 산정</span>'}
      </div>
    </article>`;
  }

  loadRankings = async function(){
    if($("#listView")) $("#listView").hidden=true;
    if($("#detailView")) $("#detailView").hidden=true;
    if($("#rankingView")) $("#rankingView").hidden=false;

    const body=$("#rankingBody");
    if(!body) return;
    body.innerHTML='<div class="pending big">랭킹을 불러오는 중…</div>';

    try{
      const rows=await api("wedding_hall_rankings?select=*&order=overall_score.desc.nullslast");
      const region=$("#rankingRegion")?.value||"";
      const key={overall:"overall_score",food:"food_score",parking:"parking_score",value:"value_score"}[rankingMode]||"overall_score";
      const filtered=rows.filter(x=>!region||x.sido===region);

      if(!filtered.length){
        body.innerHTML='<div class="pending big"><b>해당 지역의 공개 예식장이 없습니다.</b></div>';
        return;
      }

      const rated=filtered
        .filter(h=>Number(h.review_count)>0&&h[key]!=null)
        .sort((a,b)=>(Number(b[key])-Number(a[key]))||(Number(b.review_count)-Number(a.review_count))||String(a.name||"").localeCompare(String(b.name||""),"ko"));

      const pending=filtered
        .filter(h=>!(Number(h.review_count)>0&&h[key]!=null))
        .sort((a,b)=>String(a.name||"").localeCompare(String(b.name||""),"ko"));

      const rankedVisible=rated.slice(0,RANKED_LIMIT);
      const pendingPreview=pending.slice(0,PENDING_PREVIEW_LIMIT);
      const pendingExtra=pending.slice(PENDING_PREVIEW_LIMIT);

      let html='';

      if(rankedVisible.length){
        html+=`<div class="rankSectionMeta"><b>평가 완료 순위</b><span>${rankedVisible.length}곳${rated.length>RANKED_LIMIT?` · 상위 ${RANKED_LIMIT}곳 표시`:''}</span></div>`;
        html+=rankedVisible.map((h,i)=>rowHtml(h,true,i+1,key,false)).join("");
      }else{
        html+='<div class="pending big"><b>아직 순위를 산정할 평가가 없습니다.</b><br><small>첫 평가가 등록되면 자동으로 순위에 반영됩니다.</small></div>';
      }

      if(pending.length){
        html+=`<div class="rankPendingHeader"><b>평가대기 예식장</b><span>${pending.length}곳</span></div>`;
        html+=pendingPreview.map(h=>rowHtml(h,false,null,key,false)).join("");
        html+=pendingExtra.map(h=>rowHtml(h,false,null,key,true)).join("");
        if(pendingExtra.length){
          html+=`<div class="rankPendingToggleWrap"><button id="rankPendingToggle" class="rankPendingToggle" type="button" aria-expanded="false">평가대기 예식장 더보기 (${pendingExtra.length}곳)</button></div>`;
        }
      }

      body.innerHTML=html;

      body.querySelectorAll(".rankRow[data-id]").forEach(x=>x.onclick=()=>location.hash=`hall=${x.dataset.id}`);

      const toggle=body.querySelector("#rankPendingToggle");
      if(toggle){
        toggle.addEventListener("click",()=>{
          const expanded=toggle.getAttribute("aria-expanded")==="true";
          body.querySelectorAll(".rankPendingExtra").forEach(x=>x.hidden=expanded);
          toggle.setAttribute("aria-expanded",String(!expanded));
          toggle.textContent=expanded
            ? `평가대기 예식장 더보기 (${pendingExtra.length}곳)`
            : '평가대기 예식장 접기';
        });
      }
    }catch(e){
      body.innerHTML=`<div class="pending big">랭킹 조회 오류: ${esc(e.message)}</div>`;
    }
  };
})();
