/* WeddingRank specialist TOP30 live ranking, version 2026.10.13 */
(()=>{
 'use strict';
 const cfg=window.WEDDINGRANK_CONFIG||{};
 const base=String(cfg.SUPABASE_URL||'').replace(/\/+$/,'');
 const key=cfg.SUPABASE_PUBLISHABLE_KEY||cfg.SUPABASE_ANON_KEY||cfg.SUPABASE_KEY||'';
 const headers={apikey:key,Authorization:'Bearer '+key};
 const esc=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
 const fmt=x=>x?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(x)):'확인 중';
 const MAX_RANK=30,REFRESH_MS=60000;
 let refreshing=false,loaded=false;
 async function get(path){if(!base||!key)throw Error('공개 데이터 연결 설정이 없습니다.');
 const r=await fetch(base+'/rest/v1/'+path,{headers,cache:'no-store'});
 if(!r.ok)throw Error('WeddingRank 공개 자료 응답 '+r.status);
 return r.json();}
 function style(){
  if(document.getElementById('wr-top30-live-style'))return;
  const e=document.createElement('style');e.id='wr-top30-live-style';
  e.textContent=`
   #rankingView .rankTabs{display:flex!important;flex:1}
   #rankingView .rankTab{min-width:170px!important}
   #rankingBody .rankRow{cursor:pointer}
   #rankingBody .rankRow .rankScore small{display:block;color:#827887;font-size:11px}
   .homeRankingTop > #top30CompetitionPreviewBody{max-width:1320px;margin-left:auto;margin-right:auto;min-width:0}\n   /* TOP30 card: keep supporting text full width, never compress into vertical glyphs. */
   #top30CompetitionPreviewBody .externalHomeTop10 .previewTopCard{
     display:flex!important;flex-direction:column!important;min-width:0!important;height:auto!important;
   }
   #top30CompetitionPreviewBody .externalHomeTop10 .previewTopHall{min-width:0!important}
   #top30CompetitionPreviewBody .externalHomeTop10 .previewTopScore{
     display:flex!important;flex-direction:column!important;align-items:flex-start!important;
     justify-content:flex-start!important;gap:5px!important;
     min-width:0!important;width:100%!important;padding-top:13px!important;
     margin-top:auto!important;text-align:left!important;
   }
   #top30CompetitionPreviewBody .externalHomeTop10 .previewTopScore strong{
     display:block!important;width:100%!important;line-height:1.2!important;font-size:27px!important;
   }
   #top30CompetitionPreviewBody .externalHomeTop10 .previewTopScore span,
   #top30CompetitionPreviewBody .externalHomeTop10 .previewTopScore small{
     display:block!important;min-width:0!important;width:100%!important;
     flex:none!important;line-height:1.55!important;
     white-space:normal!important;word-break:keep-all!important;overflow-wrap:break-word!important;
     writing-mode:horizontal-tb!important;letter-spacing:0!important;
   }
   #top30CompetitionPreviewBody .externalHomeTop10 .previewTopScore .wrTop30Badge,
   #top30CompetitionPreviewBody .externalHomeTop10 .previewTopScore .wrTop30Move{
     display:inline-flex!important;width:auto!important;align-self:flex-start!important;
     line-height:1.4!important;white-space:nowrap!important;margin-top:2px!important;
   }
   @media(max-width:800px){
     #top30CompetitionPreviewBody .externalHomeTop10 .previewTopCard{padding:17px!important}
     #top30CompetitionPreviewBody .externalHomeTop10 .previewTopScore strong{font-size:25px!important}
   }

   .wrTop30Summary{padding:14px 18px;margin:0 0 16px;border:1px solid #e8deeb;border-radius:15px;line-height:1.7;background:#fffafb;color:#56505b}
   .wrTop30Badges{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin:8px 0}
   .wrTop30Badge{font-size:11px;font-weight:800;border-radius:50px;background:#f2eef8;color:#685581;padding:4px 9px}
   .wrTop30Move{font-size:12px;font-weight:850;color:#2b8b70!important}
   .wrTop30Move.down{color:#a05e58!important}
   .wrTop30Empty{padding:32px;border:1px solid #eee2ea;border-radius:15px;color:#60545c;background:#fffafb}
   .wrTop30Status{font-size:13px;color:#6d6470;margin:7px 0}
   @media(max-width:700px){
    .wrTop30Summary{padding:12px;margin-bottom:13px;font-size:13px}
    #rankingBody .rankRow{gap:10px!important}
    #rankingBody .rankScore{min-width:0}
   }`;
  document.head.appendChild(e);
 }
 async function loadData(){
  const [ratings,halls]=await Promise.all([
   get('weddingrank_top30_competition?select=hall_id,overall_score,source_count,rank_position,previous_rank,last_rank_change_at,score_basis_at,last_verified_at,evidence_publication_dates_complete&order=rank_position.asc&limit=1000'),
   get('wedding_halls?select=hall_id,name,sido,sigungu,is_public,operation_status&is_public=eq.true&operation_status=eq.%EC%9A%B4%EC%98%81&limit=1000')
  ]);
  const hm=new Map(halls.map(h=>[String(h.hall_id),h]));
  return ratings.map(r=>({...r,...(hm.get(String(r.hall_id))||{})}))
   .filter(x=>x.name&&Number.isFinite(Number(x.overall_score))&&Number(x.source_count)>=3)
   .sort((a,b)=>Number(a.rank_position)-Number(b.rank_position));
 }
 function movement(x){
  const prev=Number(x.previous_rank),curr=Number(x.rank_position);
  if(!x.previous_rank)return '<span class="wrTop30Badge">첫 진입</span>';
  if(prev===curr)return '';
  const delta=prev-curr;
  return delta>0?'<span class="wrTop30Move">↑ '+delta+'계단</span>':
   '<span class="wrTop30Move down">↓ '+Math.abs(delta)+'계단</span>';
 }
 function bind(host){
  host.querySelectorAll('[data-id]').forEach(el=>{
   const go=()=>{if(el.dataset.id)location.hash='hall='+el.dataset.id;};
   el.addEventListener('click',go);
   el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}});
  });
 }
 async function renderHome(data){
  const host=document.getElementById('top30CompetitionPreviewBody');if(!host)return;
  const title=document.querySelector('.homeRankingPreview h2'),desc=document.querySelector('.homeRankingPreview .sectionDesc');
  if(title)title.textContent='WeddingRank TOP 30 순위경쟁';
  if(desc)desc.textContent='독립 원문 3건 이상의 원점수·척도·표본 및 분석근거를 대조한 후보만 최대 30위까지 비교합니다. 자료 승인 후 재산정되며, 게시일 일자 미확인 자료는 표시합니다.';
  const rows=data.slice(0,10);
  if(!rows.length){host.innerHTML='<div class="wrTop30Empty"><b>현재 순위 자격 검증 중</b><p>자격 미달 장소로 30위를 채우지 않습니다.</p></div>';return;}
  const latest=data.map(x=>x.score_basis_at).filter(Boolean).sort().reverse()[0];
  host.innerHTML='<p class="wrTop30Status">TOP 30 경쟁 오픈 · 검증 참가 '+data.length+'/30곳 · 남은 '+Math.max(0,30-data.length)+'자리 · 최종 점수 반영 '+esc(fmt(latest))+' · 운영화면 1분 간격 확인</p>'+
  '<div class="previewTopGrid externalHomeTop10">'+rows.map(x=>
   '<article class="previewTopCard" data-id="'+esc(x.hall_id)+'" tabindex="0" role="link">'+
   '<strong class="previewTopNo">'+x.rank_position+'</strong>'+
   '<div class="previewTopHall"><b>'+esc(x.name)+'</b><span>'+esc([x.sido,x.sigungu].filter(Boolean).join(' '))+'</span></div>'+
   '<div class="previewTopScore"><strong>'+Number(x.overall_score).toFixed(2)+'</strong>'+
   '<span>검증된 외부후기 '+Number(x.source_count)+'건</span><small>'+
   (x.evidence_publication_dates_complete?'게시일 확인 완료':'원문 게시일 검증 중')+
   '</small>'+movement(x)+'</div></article>').join('')+'</div>';
  bind(host);
 }
 async function renderFull(data){
  const body=document.getElementById('rankingBody');if(!body)return;
  const region=document.getElementById('rankingRegion')?.value||'';
  const filtered=data.filter(x=>!region||x.sido===region).slice(0,MAX_RANK);
  const latest=data.map(x=>x.score_basis_at).filter(Boolean).sort().reverse()[0];
  const note=document.querySelector('#rankingView .rankingNote');
  const hero=document.querySelector('#rankingView .rankingHero p:last-child');
  if(hero)hero.textContent='검증된 독립후기 평가가 새로 승인되면 점수를 다시 계산해 최대 30위까지 정렬합니다. 결과는 자동 확인되며 전국 모든 예식장의 절대 품질 순위는 아닙니다.';
  if(note)note.textContent='※ 독립 원문별 원점수·척도·실제 표본과 분석근거를 확인합니다. 광고·업체 소개·복제·자체 회원평가는 제외합니다. 원문 게시일이 불명확한 기존 자료는 계속 그 상태를 표시합니다.';
  const meta='<div class="wrTop30Summary"><b>TOP 30 경쟁 오픈 · 검증 참가 '+data.length+'/30곳</b>'+
    '<div class="wrTop30Badges"><span class="wrTop30Badge">최대 30위</span>'+
    '<span class="wrTop30Badge">승인 자료 기준 자동 재정렬</span>'+
    '<span class="wrTop30Badge">1분 간격 화면 갱신</span></div>'+
    '현재 최신 점수 반영: '+esc(fmt(latest))+
    ' · 데이터 변경이 없으면 순위와 평가 날짜도 그대로 유지합니다.</div>';
  if(!filtered.length){body.innerHTML=meta+'<div class="wrTop30Empty">현재 선택 지역에 순위 자격을 충족한 예식장이 없습니다.</div>';return;}
  body.innerHTML=meta+'<div class="rankSectionMeta"><div><span class="rankKicker">VERIFIED ORIGINAL-SCORE TOP 30</span><b>상위 '+filtered.length+'곳 실시간 순위경쟁</b></div><span>'+filtered.length+' / 30</span></div>'+
    filtered.map(x=>'<article class="rankRow'+(Number(x.rank_position)<=3?' rank'+Number(x.rank_position):'')+'" data-id="'+esc(x.hall_id)+'" tabindex="0" role="link">'+
     '<div class="rankNo">'+Number(x.rank_position)+'</div>'+
     '<div class="rankHall"><b>'+esc(x.name)+'</b><span>'+esc([x.sido,x.sigungu].filter(Boolean).join(' '))+'</span>'+
     movement(x)+'</div>'+
     '<div class="rankScore"><strong>'+Number(x.overall_score).toFixed(2)+'</strong>'+
     '<span>독립 원문 '+Number(x.source_count)+'건</span><small>'+
     (x.evidence_publication_dates_complete?'원문 게시일 확인':'원문 게시일 일자 재확인 중')+'</small></div></article>').join('')+
     '<p class="wrTop30Status">30위를 넘는 적격 후보는 DB에 남아 있으며, 점수 변화 시 진입·탈락이 자동 재산정됩니다.</p>';
  bind(body);
 }
 async function refresh(){
  if(refreshing||document.visibilityState==='hidden')return;
  refreshing=true;
  try{
   const data=await loadData();
   await renderHome(data);
   if(location.hash==='#rankings'&&document.getElementById('rankingView')?.hidden!==true)await renderFull(data);
   loaded=true;
   window.WeddingRankTop30Status={count:data.length,shown:Math.min(MAX_RANK,data.length),refreshed_at:new Date().toISOString()};
   window.dispatchEvent(new Event('weddingrank:top30-refreshed'));
  }catch(e){
   console.warn('[WeddingRank] TOP30 refresh failed',e);
   if(!loaded){
    const host=document.getElementById('top30CompetitionPreviewBody');
    if(host)host.innerHTML='<div class="wrTop30Empty">TOP 30 공개 데이터를 불러오지 못했습니다. 잠시 후 다시 확인해주세요.</div>';
    const body=document.getElementById('rankingBody');
    if(body&&!document.getElementById('rankingView')?.hidden)body.textContent='TOP 30 순위를 불러오지 못했습니다.';
   }
  }finally{refreshing=false;}
 }
 window.loadRankings=loadRankings=async function(){
  if(document.getElementById('listView'))document.getElementById('listView').hidden=true;
  if(document.getElementById('detailView'))document.getElementById('detailView').hidden=true;
  if(document.getElementById('rankingView'))document.getElementById('rankingView').hidden=false;
  const body=document.getElementById('rankingBody');if(body)body.textContent='TOP 30 순위를 확인하는 중…';
  await refresh();
 };
 function start(){
  style();refresh();
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh();});
  window.addEventListener('focus',refresh);
  window.setInterval(refresh,REFRESH_MS);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
