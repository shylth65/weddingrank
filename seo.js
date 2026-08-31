/* WeddingRank homepage TOP10 bridge + price transparency v5.39 */
(()=>{
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>v==null?'확인중':Number(v).toLocaleString('ko-KR')+'원';
  const cfg=window.WEDDINGRANK_CONFIG||{};

  function applyTop10Copy(){
    const section=document.querySelector('.homeRankingPreview');
    if(!section)return;
    const title=section.querySelector('h2');
    const desc=section.querySelector('.sectionDesc');
    if(title)title.textContent='전국 대표 웨딩홀 TOP 10';
    if(desc)desc.innerHTML='WeddingRank가 선정한 <b>전국 대표 웨딩홀 100선</b> 중 상위 10곳입니다. 지역 대표성·시설 유형·공개정보·인지도 신호를 종합해 선정합니다.';
  }
  function loadEditorialTop10(){
    applyTop10Copy();
    if(document.querySelector('script[data-wr-editorial-top10]'))return;
    const s=document.createElement('script');
    s.src='home-top10-v535.js?v=5.39';
    s.defer=true;
    s.dataset.wrEditorialTop10='1';
    document.body.appendChild(s);
  }

  function sourceTier(name){
    const n=String(name||'').toLowerCase();
    if(!n)return {label:'출처 확인중',cls:'wrSourcePending'};
    if(/공식|official|예식장 직접|호텔 직접|컨벤션 직접/.test(n))return {label:'공식확인',cls:'wrSourceOfficial'};
    return {label:'공개정보',cls:'wrSourcePublic'};
  }
  function safeUrl(url){
    try{const u=new URL(String(url||''));return /^https?:$/.test(u.protocol)?u.href:''}catch(_){return''}
  }
  async function rest(path){
    const base=String(cfg.SUPABASE_URL||'').replace(/\/+$/,'');
    const key=cfg.SUPABASE_ANON_KEY||cfg.SUPABASE_PUBLISHABLE_KEY||cfg.SUPABASE_KEY||'';
    if(!base||!key)throw new Error('Supabase config missing');
    const r=await fetch(base+'/rest/v1/'+path,{headers:{apikey:key,Authorization:`Bearer ${key}`}});
    if(!r.ok)throw new Error('price source '+r.status);
    return r.json();
  }
  function installPriceStyles(){
    if(document.querySelector('#wrPriceSafetyStyles'))return;
    const st=document.createElement('style');
    st.id='wrPriceSafetyStyles';
    st.textContent=`
      .wrPriceMeta{display:flex;flex-wrap:wrap;gap:7px;align-items:center;margin:10px 0 4px}.wrPriceSource{display:inline-flex;align-items:center;padding:5px 9px;border-radius:999px;font-size:12px;font-weight:800;border:1px solid #e6dedb;background:#fff}.wrSourceOfficial{border-color:#cddfd2;background:#f4fbf6}.wrSourcePublic{border-color:#e7ddd2;background:#fffaf4}.wrSourcePending{color:#766f6c;background:#f7f5f4}.wrPriceMeta a{font-size:12px;font-weight:700;text-decoration:underline;text-underline-offset:2px}.wrVerified{font-size:12px;color:#766f6c}.wrPriceNotice{margin:16px 0 0;padding:15px 17px;border-radius:14px;background:#faf7f5;border:1px solid #ece3df;font-size:13px;line-height:1.65;color:#645c59}.wrPriceNotice b{color:#403936}.wrCorrectionBtn{margin-top:9px;border:0;background:transparent;padding:0;font:inherit;font-weight:800;text-decoration:underline;text-underline-offset:3px;cursor:pointer;color:#765456}.wrCorrectionMsg{display:none;margin-top:8px}.wrCorrectionMsg.isOpen{display:block}.pricebox>p{line-height:1.55}
    `;
    document.head.appendChild(st);
  }
  async function enhancePriceDetail(){
    const m=location.hash.match(/^#hall=(.+)$/);
    const host=document.querySelector('#prices');
    if(!m||!host)return;
    const id=decodeURIComponent(m[1]);
    try{
      const rows=await rest(`wedding_prices?select=effective_date,rental_fee,meal_price_per_person,minimum_guarantee,source_name,source_url,verified_at,notes&hall_id=eq.${encodeURIComponent(id)}&order=effective_date.desc`);
      if(!rows.length){
        host.innerHTML='<div class="pending big">가격정보 확인중<br><small>확인되지 않은 가격은 임의로 추정해 표시하지 않습니다.</small></div>'+priceNotice();
        bindCorrection();
        return;
      }
      host.innerHTML=rows.map(p=>{
        const tier=sourceTier(p.source_name),url=safeUrl(p.source_url);
        const sourceLink=url?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">출처 보기 ↗</a>`:'';
        const verified=p.verified_at||p.effective_date||'';
        return `<div class="pricebox">
          <div><small>가격 기준일</small><b>${esc(p.effective_date||'확인중')}</b></div>
          <div><small>대관료 · 공개 확인가</small><b>${money(p.rental_fee)}</b></div>
          <div><small>1인 식대 · 공개 확인가</small><b>${money(p.meal_price_per_person)}</b></div>
          <div><small>최소보증인원</small><b>${p.minimum_guarantee?Number(p.minimum_guarantee).toLocaleString('ko-KR')+'명':'확인중'}</b></div>
          <div class="wrPriceMeta"><span class="wrPriceSource ${tier.cls}">${tier.label}</span>${p.source_name?`<span class="wrVerified">출처: ${esc(p.source_name)}</span>`:''}${sourceLink}${verified?`<span class="wrVerified">확인일 ${esc(verified)}</span>`:''}</div>
          <p>${esc(p.notes||'공개된 자료를 기준으로 정리한 가격정보입니다.')}</p>
        </div>`;
      }).join('')+priceNotice();
      bindCorrection();
    }catch(e){console.warn('[WeddingRank] price transparency failed',e)}
  }
  function priceNotice(){
    return `<div class="wrPriceNotice"><b>가격정보 안내</b><br>WeddingRank의 가격은 공개 자료 또는 확인 가능한 출처를 기준으로 제공하는 참고정보입니다. 실제 계약금액은 예식일·요일·시간·보증인원·프로모션·선택 옵션에 따라 달라질 수 있으므로 계약 전 해당 예식장에 최종 확인해 주세요. 확인되지 않은 가격은 임의로 추정하지 않습니다.<br><button type="button" class="wrCorrectionBtn">가격정보 수정 요청</button><div class="wrCorrectionMsg">예식장 관계자 또는 이용자의 정정 요청 접수 기능을 준비하고 있습니다. 긴급한 오류는 해당 가격의 출처와 최신 자료를 함께 확인해 주세요.</div></div>`;
  }
  function bindCorrection(){
    document.querySelectorAll('.wrCorrectionBtn').forEach(btn=>{
      if(btn.dataset.bound)return;btn.dataset.bound='1';
      btn.addEventListener('click',()=>btn.parentElement?.querySelector('.wrCorrectionMsg')?.classList.toggle('isOpen'));
    });
  }
  let priceTimer;
  function schedulePriceEnhance(){clearTimeout(priceTimer);priceTimer=setTimeout(enhancePriceDetail,650)}

  installPriceStyles();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{loadEditorialTop10();schedulePriceEnhance()},{once:true});
  else{loadEditorialTop10();schedulePriceEnhance()}
  window.addEventListener('hashchange',schedulePriceEnhance);
})();
