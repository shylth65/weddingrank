/* WeddingRank detail ranking badges v5.27 */
(()=>{
  const cfg=window.WEDDINGRANK_CONFIG||{};
  const base=String(cfg.SUPABASE_URL||'').trim().replace(/\/+$/,'');
  const key=cfg.SUPABASE_ANON_KEY||cfg.SUPABASE_PUBLISHABLE_KEY||cfg.SUPABASE_KEY||'';
  const escLocal=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  function installStyles(){
    if(document.querySelector('#wrDetailRankStyles'))return;
    const s=document.createElement('style');
    s.id='wrDetailRankStyles';
    s.textContent=`
      .detailHero{position:relative;overflow:hidden}.detailHero:after{content:'WEDDINGRANK';position:absolute;right:5vw;bottom:-18px;font-size:76px;font-weight:900;letter-spacing:-5px;color:rgba(169,111,114,.055);pointer-events:none}
      .detailRankStrip{position:relative;z-index:1;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;max-width:720px;margin-top:24px}
      .detailRankBadge{min-width:0;padding:15px 16px;border:1px solid #ead8d4;border-radius:15px;background:rgba(255,255,255,.88);box-shadow:0 8px 24px rgba(72,47,44,.055);backdrop-filter:blur(8px)}
      .detailRankBadge small{display:block;margin-bottom:5px;color:#8a7976;font-size:11px;font-weight:800}.detailRankBadge strong{display:block;color:var(--ink);font-size:22px;line-height:1.1;letter-spacing:-.6px}.detailRankBadge strong em{font-style:normal;color:var(--rose-dark)}.detailRankBadge span{display:block;margin-top:5px;color:#8a7976;font-size:10px}
      .detailRankBadge.primary{border-color:#d8aaa5;background:linear-gradient(145deg,#fff,#fff7f5)}.detailRankBadge.primary strong{font-size:25px;color:var(--rose-dark)}
      .detailRankWait{grid-column:1/-1;padding:15px 17px;border:1px solid #eadfdc;border-radius:14px;background:rgba(255,255,255,.82);color:#756966;font-size:13px;line-height:1.6}
      @media(max-width:800px){.detailHero:after{font-size:48px;right:2vw}.detailRankStrip{grid-template-columns:1fr 1fr;max-width:none}.detailRankBadge.primary{grid-column:1/-1}.detailRankBadge{padding:13px 14px}.detailRankBadge strong{font-size:20px}.detailRankBadge.primary strong{font-size:23px}}
      @media(max-width:430px){.detailRankStrip{grid-template-columns:1fr}.detailRankBadge.primary{grid-column:auto}}
    `;
    document.head.appendChild(s);
  }

  async function getRows(){
    if(!base||!key)throw new Error('ranking config missing');
    const r=await fetch(base+'/rest/v1/wedding_hall_rankings?select=*',{headers:{apikey:key,Authorization:`Bearer ${key}`}});
    if(!r.ok)throw new Error('ranking fetch failed');
    return r.json();
  }

  function rankList(rows,region){
    return rows.filter(x=>Number(x.review_count)>0&&x.overall_score!=null&&(!region||x.sido===region))
      .sort((a,b)=>(Number(b.overall_score)-Number(a.overall_score))||(Number(b.review_count)-Number(a.review_count))||String(a.name||'').localeCompare(String(b.name||''),'ko'));
  }

  async function renderDetailRank(){
    installStyles();
    const match=location.hash.match(/^#hall=(.+)$/);if(!match)return;
    const hallId=decodeURIComponent(match[1]);
    const hero=document.querySelector('.detailHero');if(!hero)return;
    let strip=document.querySelector('#detailRankStrip');
    if(!strip){strip=document.createElement('div');strip.id='detailRankStrip';strip.className='detailRankStrip';hero.appendChild(strip)}
    strip.innerHTML='<div class="detailRankWait">현재 평점과 순위를 불러오는 중입니다…</div>';
    try{
      const rows=await getRows();
      const current=rows.find(x=>String(x.hall_id)===String(hallId));
      if(!current||Number(current.review_count)<=0||current.overall_score==null){
        strip.innerHTML='<div class="detailRankWait"><b>평가대기</b> · 아직 이용자 평가가 없어 순위를 부여하지 않습니다. 첫 평가가 등록되면 종합평점과 전국·지역 순위가 자동으로 표시됩니다.</div>';
        return;
      }
      const national=rankList(rows,'');
      const local=rankList(rows,current.sido||'');
      const nRank=national.findIndex(x=>String(x.hall_id)===String(hallId))+1;
      const lRank=local.findIndex(x=>String(x.hall_id)===String(hallId))+1;
      const regionLabel=current.sido?String(current.sido).replace(/특별시|광역시|특별자치시|특별자치도|도$/,''):'지역';
      strip.innerHTML=`
        <div class="detailRankBadge primary"><small>종합평점</small><strong><em>${Number(current.overall_score).toFixed(2)}</em> / 5.0</strong><span>${Number(current.review_count)}개 실제 이용자 평가</span></div>
        <div class="detailRankBadge"><small>전국 종합순위</small><strong>${nRank?`${nRank}위`:'평가대기'}</strong><span>평가 등록 예식장 기준</span></div>
        <div class="detailRankBadge"><small>${escLocal(regionLabel)} 지역순위</small><strong>${lRank?`${lRank}위`:'평가대기'}</strong><span>${escLocal(current.sido||'지역')} 평가 등록 예식장 기준</span></div>`;
    }catch(e){
      strip.innerHTML='<div class="detailRankWait">랭킹 정보를 잠시 불러오지 못했습니다. 예식장 기본정보와 평가는 정상적으로 이용할 수 있습니다.</div>';
      console.warn('WeddingRank detail ranking',e);
    }
  }

  window.addEventListener('hashchange',()=>setTimeout(renderDetailRank,0));
  window.addEventListener('DOMContentLoaded',()=>setTimeout(renderDetailRank,50));
  const observer=new MutationObserver(()=>{
    if(!document.querySelector('#detailView')?.hidden&&location.hash.startsWith('#hall='))renderDetailRank();
  });
  const dv=document.querySelector('#detailView');if(dv)observer.observe(dv,{attributes:true,attributeFilter:['hidden']});
})();