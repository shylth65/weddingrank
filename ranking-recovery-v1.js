/* Independent WeddingRank TOP30 recovery: uses public featured data only. */
(function(){
'use strict';
const cfg=window.WEDDINGRANK_CONFIG||{};
const root=String(cfg.SUPABASE_URL||'').replace(/\/$/,'');
const key=cfg.SUPABASE_PUBLISHABLE_KEY||cfg.SUPABASE_ANON_KEY||'';
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let entries=[],specialists=[],mode='featured',ready=false;
async function read(table,query){
 const res=await fetch(root+'/rest/v1/'+table+'?'+query,{headers:{apikey:key,Authorization:'Bearer '+key},cache:'no-store'});
 if(!res.ok)throw Error(table+' HTTP '+res.status);
 return res.json();
}
function row(x,n,special){
 const name=esc(x.name||'예식장'),place=esc([x.sido,x.sigungu].filter(Boolean).join(' '));
 const score=special?Number(x.overall_score).toFixed(2):'추천';
 return '<article class="rankRow" data-id="'+esc(x.hall_id)+'" tabindex="0"><div class="rankNo">'+n+'</div><div class="rankHall"><b>'+name+'</b><span>'+place+'</span></div><div class="rankScore"><strong>'+score+'</strong><small>'+(special?'검증 후기평가':'정보 기반 편집 추천')+'</small></div></article>';
}
function draw(){
 const host=document.getElementById('top30CompetitionPreviewBody');
 if(host&&entries.length&&(!host.querySelector('.previewTopCard')||/불러오는 중/.test(host.textContent||''))){
 host.innerHTML='<div class="previewTopGrid externalHomeTop10">'+entries.slice(0,10).map((x,i)=>'<article class="previewTopCard" data-id="'+esc(x.hall_id)+'" tabindex="0"><strong class="previewTopNo">'+(i+1)+'</strong><div class="previewTopHall"><b>'+esc(x.name)+'</b><span>'+esc(x.sido||'')+'</span></div><div class="previewTopScore"><strong>추천 '+(i+1)+'위</strong><span>편집 추천</span></div></article>').join('')+'</div>';
 }
 if(location.hash==='#rankings'){
 const body=document.getElementById('rankingBody');
 if(body&&(ready||/불러오는 중|확인하는 중/.test(body.textContent||''))){
 const items=mode==='featured'?entries:specialists;
 const region=document.getElementById('rankingRegion')?.value||'';
 const shown=items.filter(x=>!region||x.sido===region);
 body.innerHTML='<div class="wrTop30Summary"><b>'+(mode==='featured'?'웨딩홀 추천 TOP30':'검증된 전문 후기평가')+' · '+shown.length+'곳</b><p>'+(mode==='featured'?'공개 운영정보 기반 편집 추천 순서입니다. 품질·만족도 점수가 아닙니다.':'검증된 독립 원문 근거가 있는 전문평가만 표시합니다.')+'</p></div>'+shown.map((x,i)=>row(x,mode==='featured'?i+1:Number(x.rank_position),mode!=='featured')).join('');
 }
 }
 document.querySelectorAll('#rankingBody [data-id],#top30CompetitionPreviewBody [data-id]').forEach(el=>{if(el.dataset.recoveryBound)return;el.dataset.recoveryBound='1';el.addEventListener('click',()=>location.hash='hall='+el.dataset.id)});
}
async function init(){
 const tabs=document.querySelector('#rankingView .rankTabs');
 if(tabs){tabs.innerHTML='<button type="button" class="rankTab active" data-recovery="featured">추천 TOP30</button><button type="button" class="rankTab" data-recovery="specialist">전문 후기평가</button>';tabs.addEventListener('click',e=>{const btn=e.target.closest('[data-recovery]');if(!btn)return;mode=btn.dataset.recovery;tabs.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===btn));draw()});}
 const style=document.createElement('style');style.textContent='#rankingView .rankTabs .rankTab{flex:1;min-width:0!important;color:#593b4c!important;-webkit-text-fill-color:#593b4c!important;font-weight:800!important;visibility:visible!important;opacity:1!important}';document.head.appendChild(style);
 try{
 const [featured,ranking,publicHalls]=await Promise.all([
 read('weddingrank_featured_top100','select=hall_id,name,sido,sigungu,selection_rank&order=selection_rank.asc&limit=100'),
 read('weddingrank_top30_competition','select=hall_id,overall_score,rank_position,source_count&order=rank_position.asc&limit=30'),
 read('wedding_halls','select=hall_id,name,sido,sigungu&is_public=eq.true&operation_status=eq.%EC%9A%B4%EC%98%81&limit=500')
 ]);
 const map=new Map(publicHalls.map(x=>[x.hall_id,x]));
 entries=featured.filter(x=>map.has(x.hall_id)).slice(0,30);
 specialists=ranking.filter(x=>map.has(x.hall_id)&&Number(x.source_count)>=3).map(x=>({...map.get(x.hall_id),...x}));
 ready=true;draw();
 }catch(err){console.warn('WeddingRank recovery:',err);const host=document.getElementById('top30CompetitionPreviewBody');if(host)host.textContent='추천 순위 연결 오류: '+err.message;}
 document.getElementById('rankingRegion')?.addEventListener('change',draw);
 window.addEventListener('hashchange',draw);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();