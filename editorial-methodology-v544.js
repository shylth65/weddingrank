/* WeddingRank editorial methodology disclosure v5.44 */
(()=>{
  const cfg=window.WEDDINGRANK_CONFIG||{};
  const base=String(cfg.SUPABASE_URL||'').replace(/\/+$/,'');
  const key=cfg.SUPABASE_ANON_KEY||cfg.SUPABASE_PUBLISHABLE_KEY||cfg.SUPABASE_KEY||'';
  if(!base||!key)return;
  const headers={apikey:key,Authorization:`Bearer ${key}`};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function get(path){const r=await fetch(`${base}/rest/v1/${path}`,{headers});if(!r.ok)throw new Error(`${r.status}`);return r.json()}
  function styles(){if(document.querySelector('#wrEditorialMethodStyles'))return;const s=document.createElement('style');s.id='wrEditorialMethodStyles';s.textContent=`
    .wrEditorialMethod{margin:-10px auto 30px;max-width:1180px;padding:0 18px}.wrEditorialMethodInner{border:1px solid #eadfdb;border-radius:16px;background:#fffaf8;padding:16px 18px}.wrEditorialMethodTop{display:flex;gap:12px;justify-content:space-between;align-items:center;flex-wrap:wrap}.wrEditorialMethodTop b{font-size:15px}.wrEditorialMethodTop span{font-size:12px;color:#756b67}.wrEditorialMethodText{margin:8px 0 0;font-size:13px;line-height:1.65;color:#625955}.wrEditorialMethodGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:12px}.wrEditorialMethodGrid div{padding:10px;border:1px solid #eee3df;border-radius:11px;background:#fff}.wrEditorialMethodGrid b{display:block;font-size:12px}.wrEditorialMethodGrid span{display:block;margin-top:3px;font-size:11px;color:#766d69;line-height:1.45}.wrEditorialRegionToggle{margin-top:10px;border:0;background:transparent;padding:0;color:#765456;font-weight:800;text-decoration:underline;text-underline-offset:3px;cursor:pointer}.wrEditorialRegions{display:none;margin-top:10px;gap:6px;flex-wrap:wrap}.wrEditorialRegions.open{display:flex}.wrEditorialRegions span{padding:5px 8px;border-radius:999px;border:1px solid #e5dad6;background:#fff;font-size:11px}.wrEditorialPending{font-size:11px;color:#897d78;margin-top:8px}@media(max-width:800px){.wrEditorialMethodGrid{grid-template-columns:1fr 1fr}}`;
    document.head.appendChild(s)}
  async function render(){
    const section=document.querySelector('.homeRankingPreview');if(!section||document.querySelector('.wrEditorialMethod'))return;
    styles();
    try{
      const methods=await get('editorial_methodologies?select=methodology_version,title,effective_date,scoring_weights,allocation_rule,disclosure_text&is_active=eq.true&limit=1');
      const m=methods[0];if(!m)return;
      const targets=await get(`editorial_region_targets?select=sido,target_count,eligible_count&methodology_version=eq.${encodeURIComponent(m.methodology_version)}&order=target_count.desc,sido.asc`);
      const box=document.createElement('div');box.className='wrEditorialMethod';
      const w=m.scoring_weights||{};
      box.innerHTML=`<div class="wrEditorialMethodInner"><div class="wrEditorialMethodTop"><b>100선 선정기준 · ${esc(m.title)}</b><span>기준일 ${esc(m.effective_date||'')}</span></div><p class="wrEditorialMethodText">${esc(m.disclosure_text||'')}</p><div class="wrEditorialMethodGrid"><div><b>운영·출처 검증</b><span>${Number(w.operation_and_source_verification||0)}점</span></div><div><b>기본·홀 정보</b><span>${Number(w.basic_information_completeness||0)+Number(w.hall_room_information||0)}점</span></div><div><b>가격 근거</b><span>${Number(w.price_evidence||0)}점</span></div><div><b>이미지·유형·최신성</b><span>${Number(w.verified_image||0)+Number(w.venue_type_classification||0)+Number(w.data_freshness||0)}점</span></div></div><button class="wrEditorialRegionToggle" type="button">지역별 목표 배분 보기</button><div class="wrEditorialRegions">${targets.map(t=>`<span>${esc(t.sido)} ${Number(t.target_count)}곳</span>`).join('')}</div><div class="wrEditorialPending">현재 100선은 v2 기준에 따라 출처 재검증과 지역균형 보정을 순차 진행 중이며, 실제 이용자 평점 랭킹과는 별도입니다.</div></div>`;
      section.insertAdjacentElement('afterend',box);
      box.querySelector('.wrEditorialRegionToggle')?.addEventListener('click',()=>box.querySelector('.wrEditorialRegions')?.classList.toggle('open'));
    }catch(e){console.warn('[WeddingRank] editorial methodology disclosure failed',e)}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render();
})();
