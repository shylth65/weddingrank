/* PICKRANK canonical ranking bridge v1 */
(()=>{
  'use strict';
  const URL='https://umreaxukykowauxkauyd.supabase.co';
  const KEY='sb_publishable_QdAdkaQJNLf-9yY53_i_AA_EEjLl0gW';
  const headers={apikey:KEY,Authorization:'Bearer '+KEY};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const rawScore=r=>Number(r?.metadata?.raw_score ?? r?.score/20);
  const sourceCount=r=>Number(r?.metadata?.external_source_count ?? r?.metadata?.source_count ?? r?.review_count ?? 0);
  const priorLoadRankings=window.loadRankings;
  let cache=null;

  async function rows(){
    if(cache)return cache;
    const q='select=rank_no,score,review_count,data_as_of,item_name,region,metadata,external_key&category_slug=eq.wedding&order=rank_no.asc&limit=100';
    const response=await fetch(URL+'/rest/v1/latest_published_rankings?'+q,{headers});
    if(!response.ok)throw new Error('PICKRANK '+response.status);
    const data=await response.json();
    if(!Array.isArray(data)||!data.length)throw new Error('PICKRANK 공개 순위가 없습니다.');
    cache=data;
    return data;
  }
  function localHallId(row){
    const target=String(row.item_name||'').replace(/\s+/g,'').toLowerCase();
    const found=Array.isArray(halls)&&halls.find(h=>String(h.name||'').replace(/\s+/g,'').toLowerCase()===target);
    return found?.hall_id||'';
  }
  function bind(host){
    host.querySelectorAll('[data-hall-id]').forEach(card=>{
      const go=()=>{
        if(card.dataset.hallId)location.hash='hall='+card.dataset.hallId;
        else location.href='https://pickrank.kr/rankings/wedding/'+encodeURIComponent(card.dataset.externalKey||'');
      };
      card.onclick=go;
      card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}};
    });
  }
  function card(row,i,home=false){
    const id=localHallId(row), area=row.region||row.metadata?.region||'', score=rawScore(row), count=sourceCount(row);
    if(home)return '<article class="previewTopCard" data-hall-id="'+esc(id)+'" data-external-key="'+esc(row.external_key)+'" tabindex="0" role="link"><strong class="previewTopNo">'+(row.rank_no||i+1)+'</strong><div class="previewTopHall"><b>'+esc(row.item_name)+'</b><span>'+esc(area)+'</span></div><div class="previewTopScore"><strong>'+score.toFixed(2)+'</strong><span>공개후기 · '+count+'개 출처</span><small>PICKRANK 확정 '+(row.rank_no||i+1)+'위</small></div></article>';
    return '<article class="rankRow'+(i<3?' rank'+(i+1):'')+'" data-hall-id="'+esc(id)+'" data-external-key="'+esc(row.external_key)+'"><div class="rankNo">'+(row.rank_no||i+1)+'</div><div class="rankHall"><b>'+esc(row.item_name)+'</b><span>'+esc(area)+'</span></div><div class="rankScore"><strong>'+score.toFixed(2)+'</strong><span>공개후기 · '+count+'개 출처</span><small>PICKRANK 중앙 확정 순위</small></div></article>';
  }
  function renderAsOf(data){
    const value=data[0]?.data_as_of;
    if(!value)return;
    const formatted=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(value));
    [document.getElementById('rankingDataAsOf'),document.getElementById('rankingDataAsOfFull')].filter(Boolean).forEach(el=>el.textContent='PICKRANK 중앙 순위 기준: '+formatted+' 확정');
  }
  async function renderHome(){
    const host=document.getElementById('homeRankPreviewBody');if(!host)return;
    try{
      const data=await rows();renderAsOf(data);
      host.innerHTML='<div class="previewTopGrid externalHomeTop10">'+data.slice(0,10).map((r,i)=>card(r,i,true)).join('')+'</div>';
      bind(host);
      const title=document.querySelector('.homeRankingPreview h2');
      const desc=document.querySelector('.homeRankingPreview .sectionDesc');
      if(title)title.textContent='PICKRANK 확정 웨딩홀 TOP 10';
      if(desc)desc.innerHTML='PICKRANK 중앙 DB에서 검증·확정한 공개후기 순위를 WeddingRank가 그대로 표시합니다.';
    }catch(e){console.warn('[WeddingRank] PICKRANK bridge fallback',e);if(typeof priorLoadRankings==='function')return;}
  }
  window.loadRankings=async function(){
    const mode=typeof rankingMode==='string'?rankingMode:'overall';
    if(mode!=='overall'&&typeof priorLoadRankings==='function')return priorLoadRankings();
    const list=document.getElementById('listView'),detail=document.getElementById('detailView'),view=document.getElementById('rankingView'),body=document.getElementById('rankingBody');
    if(list)list.hidden=true;if(detail)detail.hidden=true;if(view)view.hidden=false;if(!body)return;
    body.innerHTML='<div class="pending big">PICKRANK 확정 순위를 불러오는 중…</div>';
    try{
      const region=document.getElementById('rankingRegion')?.value||'';
      const data=(await rows()).filter(r=>!region||String(r.region||r.metadata?.region||'').includes(region));
      renderAsOf(data.length?data:await rows());
      body.innerHTML='<div class="rankSectionMeta"><div><span class="rankKicker">PICKRANK CANONICAL RANKING</span><b>중앙 확정 종합순위</b></div><span>'+data.length+'곳</span></div>'+data.map((r,i)=>card(r,i,false)).join('');
      bind(body);
    }catch(e){console.warn('[WeddingRank] PICKRANK ranking fallback',e);if(typeof priorLoadRankings==='function')return priorLoadRankings();body.innerHTML='<div class="pending big">순위를 불러오지 못했습니다.</div>';}
  };
  const start=()=>{setTimeout(renderHome,400);setTimeout(renderHome,1800)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();