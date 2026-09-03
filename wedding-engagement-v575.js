/* WeddingRank lightweight participation UX v5.76 */
(()=>{
'use strict';
const CFG=window.WEDDINGRANK_CONFIG||{};
function styles(){if(document.getElementById('wrEngagementStyles'))return;const s=document.createElement('style');s.id='wrEngagementStyles';s.textContent=`
.wr-participate{margin:22px auto;padding:22px 24px;border-radius:24px;background:linear-gradient(135deg,#c83f73 0%,#8f55cf 52%,#5277df 100%);color:#fff;box-shadow:0 16px 36px rgba(110,71,159,.18)}.wr-actions{display:flex;gap:9px;flex-wrap:wrap}.wr-actions button,.wr-actions a{border-radius:999px;padding:11px 16px;font-weight:900;text-decoration:none;cursor:pointer}.wr-primary{border:0;background:#fff;color:#9c386b}.wr-secondary{border:1px solid rgba(255,255,255,.42);background:rgba(255,255,255,.11);color:#fff!important}.wr-eval-guide{margin:14px 0 12px;padding:14px 16px;border-radius:16px;background:#fff7fb;border:2px solid #d69ac0;color:#6c3556;box-shadow:0 10px 24px rgba(120,55,95,.10)}.wr-eval-guide b{display:block;font-size:16px;margin-bottom:4px}.wr-eval-guide span{font-size:13px;line-height:1.45}.wr-eval-guide button{margin-top:10px;border:0;border-radius:999px;padding:9px 14px;background:#9c4770;color:#fff;font-weight:800}@media(max-width:720px){.wr-participate{margin:16px 0;padding:18px}}
`;document.head.appendChild(s)}
function enterEvaluationMode(){
  const hero=document.querySelector('#listView .heroCopy'),search=document.getElementById('search');if(!hero||!search)return;
  let guide=document.getElementById('wrEvalGuide');if(!guide){guide=document.createElement('div');guide.id='wrEvalGuide';guide.className='wr-eval-guide';guide.innerHTML='<b>평가할 예식장을 먼저 찾아주세요</b><span>예식장명 또는 지역을 검색한 뒤 해당 예식장 상세화면에서 <strong>평가 작성</strong>을 선택하면 됩니다.</span><button type="button" id="wrEvalCancel">일반 검색으로 돌아가기</button>';hero.querySelector('.searchbar')?.insertAdjacentElement('beforebegin',guide);guide.querySelector('#wrEvalCancel')?.addEventListener('click',()=>guide.remove())}
  guide.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>search.focus(),450);
}
function addHomeCard(){const list=document.getElementById('listView');if(!list||document.getElementById('wrParticipate'))return;const hero=list.querySelector('.hero');if(!hero)return;const d=document.createElement('section');d.id='wrParticipate';d.className='section wr-participate';d.innerHTML='<div style="font-size:11px;font-weight:900;letter-spacing:.12em">MY WEDDING VENUE EXPERIENCE</div><h2 style="color:#fff;margin:7px 0">최근 방문·상담한 예식장이 있으신가요?</h2><p style="color:#fff">평가할 예식장을 먼저 찾은 뒤 상세화면에서 경험을 남길 수 있습니다.</p><div class="wr-actions"><button type="button" class="wr-primary" id="wrStartReview">평가할 예식장 찾기</button><a class="wr-secondary" href="#rankings">예식장 순위 먼저 보기</a></div>';hero.insertAdjacentElement('afterend',d);document.getElementById('wrStartReview')?.addEventListener('click',enterEvaluationMode)}
function wireEvaluationLinks(){document.querySelectorAll('a[href="#about"]').forEach(a=>{if(/예식장 평가$/.test((a.textContent||'').trim())){a.setAttribute('href','javascript:void(0)');a.addEventListener('click',e=>{e.preventDefault();enterEvaluationMode()})}})}
function boot(){styles();addHomeCard();wireEvaluationLinks()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
