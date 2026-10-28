/* Public, read-only ranking explanation. */
(()=>{'use strict';
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const unknown='정보 미확인';
const safe=u=>/^https?:\/\//i.test(u||'')?u:'';
const link=(u,label='공식 근거 ↗')=>safe(u)?`<a href="${E(u)}" target="_blank" rel="noopener noreferrer">${E(label)}</a>`:unknown;
let featured=new Map(),detailId='',initialized=false,dialog;
function rank(id){const r=comparisonRankRows.find(x=>x.hall_id===id);return r&&Number(r.source_count)>=3?`${Number(r.rank_position)}위 · ${Number(r.overall_score).toFixed(2)}/5`:'독립 후기 순위 미산정';}
function proof(h){const r=comparisonRankRows.find(x=>x.hall_id===h.hall_id),f=featured.get(h.hall_id);let out=`<h3>랭킹 산정 근거</h3><p>${rank(h.hall_id)}</p>`;
 if(f)out+=`<p>편집 추천 ${Number(f.recommendation_rank)}위 · 정보 증빙 ${Number(f.info_index)}/100 (만족도 점수 아님)</p><p>실제 반영: ${Object.entries(f.info_components||{}).map(([k,v])=>E(k)+' '+Number(v)+'점').join(' · ')}</p>`;
 if(r){const ss=Array.isArray(r.evidence_sources)?r.evidence_sources:[];out+=`<p>반영 원문 ${Number(r.source_count)}건 · 원문에 기록된 표본 합계 ${ss.reduce((n,s)=>n+Number(s.sample_count||0),0)}명. 출처 간 동일 이용자 중복 여부는 미확인입니다.</p><p>점수 기준일 ${E(r.score_basis_at?.slice(0,10)||unknown)} · 최근 근거 검증 ${E(r.last_verified_at?.slice(0,10)||unknown)}</p><details><summary>실제 반영 원점수와 출처</summary>${ss.map(s=>`<p>${link(s.url,'후기 원문 ↗')} · ${E(s.raw_score)}/${E(s.raw_scale)} · 표본 ${E(s.sample_count)}명 · 게시일 ${E(s.published_date||unknown)}</p>`).join('')}</details>`;}
 else out+='<p>검증된 독립 원문·점수·척도 근거가 부족하여 점수와 순위를 표시하지 않습니다.</p>';
 return out+'<p>음식·주차 등 8개 항목은 회원 직접평가 항목입니다. 독립 후기 종합점수의 항목별 기여도는 확인되지 않아 표시하지 않습니다.</p><button type="button" data-plan="method">랭킹은 어떻게 결정되나요?</button>';}
function method(){return `<h2>랭킹은 어떻게 결정되나요?</h2><h3>1. 편집 추천 TOP30 · 정보 증빙 지수</h3><p>기존 편집 후보 목록 중 공개·운영 시설을 대상으로 주소 15, 연락처 10, 웹사이트 10, 출처 URL·검증일이 있는 가격 25, 홀 정보 25, 최근 1년 기본정보 15점을 합산합니다. 동점은 기존 편집 순서입니다. 전국 전체의 품질 순위나 공식 보증 점수가 아닙니다.</p><h3>2. 독립 후기 점수 순위</h3><p>승인 감사자료에 있는 독립 원문의 점수·척도·실제 표본을 대조하고, 공개 원문 유형·품질 70점 이상·분석 근거 70점 이상 및 공개 운영 상태를 통과한 원문이 3건 이상인 시설이 대상입니다.</p><p>원문마다 원점수 ÷ 원척도 × 5로 환산한 뒤 원문별 단순 평균을 소수 둘째 자리로 반올림합니다. 표본 수 가중평균은 사용하지 않습니다. 동점은 출처 수 내림차순 → 시설명 가나다순 → ID 순입니다. 최대 30위까지 표시합니다.</p><p>회원 직접평가, 광고·업체 소개·복제 자료는 독립 후기 점수에 합산하지 않습니다. 기본정보의 공식확인 상태도 후기 점수에 더하지 않습니다. 일부 원문의 정확한 게시일과 표본 중복 여부는 미확인입니다.</p><h3>3. 회원 직접평가</h3><p>음식·교통·주차·시설·신부대기실·연회장·서비스·가성비 및 종합점수의 회원 입력값을 별도 표시합니다. 독립 후기 순위의 항목별 가중치로 사용하지 않습니다.</p><p>이번 개선은 기존 점수·순서·계산 코드를 변경하지 않습니다. 출처 수가 많아도 전체 이용자의 만족도를 대표한다고 보장할 수 없습니다.</p>`;}

function decorate(){}
function detail(id){detailId=id;const h=halls.find(x=>x.hall_id===id);if(!h)return;let panel=document.getElementById('wrDetailPlanning');if(!panel){panel=document.createElement('section');panel.id='wrDetailPlanning';panel.className='detailBlock';document.querySelector('#detailView .detailMain')?.prepend(panel);}panel.innerHTML=proof(h);}
function refresh(){if(initialized&&detailId)detail(detailId);}
function init(){if(initialized)return;initialized=true;
 const nav=document.createElement('div');nav.className='wrPlanningNav section';nav.innerHTML='<button type="button" data-plan="method">랭킹 산정 기준</button>';document.getElementById('find')?.before(nav);
 dialog=document.createElement('dialog');dialog.id='wrPlanningDialog';dialog.setAttribute('aria-label','WeddingRank 랭킹 산정 기준');dialog.innerHTML='<button type="button" class="wrClose" data-plan="close" aria-label="랭킹 안내 닫기">닫기 ×</button><div id="wrPlanBody"></div>';document.body.append(dialog);
 document.addEventListener('click',e=>{const b=e.target.closest('[data-plan]');if(!b)return;if(b.dataset.plan==='close')dialog.close();else if(b.dataset.plan==='method'){document.getElementById('wrPlanBody').innerHTML=method();dialog.showModal();}});
 window.addEventListener('hashchange',()=>dialog.close());refresh();}
window.WeddingTools={refresh,decorate,detail,setFeatured(rows){featured=new Map(rows.map(x=>[x.hall_id,x]));if(detailId)detail(detailId);}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
