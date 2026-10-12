'use strict';
// Read-only specialist directory and rating integrity audit.
// Never mutates WeddingRank or synchronizes to PICKRANK.
const { createClient } = require('@supabase/supabase-js');
const u=process.env.SUPABASE_URL, k=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!u||!k||new URL(u).hostname!=='mozmxkmaynhxqwzovzhi.supabase.co')
  throw new Error('WeddingRank-only project secrets required');
const db=createClient(u,k,{auth:{persistSession:false,autoRefreshToken:false}});
async function pages(table,columns){
  const all=[];
  for(let i=0;;i+=500){
    const {data,error}=await db.from(table).select(columns).range(i,i+499);
    if(error)throw new Error(table+': '+error.message);
    all.push(...data);
    if(data.length<500)return all;
  }
}
const tidy=s=>String(s||'').trim();
const nameKey=s=>tidy(s).toLowerCase().replace(/[^a-z0-9가-힣]/gi,'');
const addressKey=s=>tidy(s).toLowerCase().replace(/[^a-z0-9가-힣]/gi,'');
const urlKey=s=>tidy(s).replace(/\/+$/,'');
function duplicates(rows,keyFn){
  const m=new Map();
  for(const h of rows){
    const key=keyFn(h);if(key.length<5)continue;
    m.set(key,[...(m.get(key)||[]),{hall_id:h.hall_id,name:h.name}]);
  }
  return [...m].filter(([,v])=>v.length>1).map(([value,venues])=>({value,venues}));
}
function mainAudit(halls,rooms,prices,sources,analyses,ratings){
  const pub=halls.filter(h=>h.is_public===true), operating=pub.filter(h=>h.operation_status==='운영');
  const hallById=new Map(halls.map(h=>[String(h.hall_id),h]));
  const verifiedPhoneTargets=[
    {hall_id:'97c52cd9-1b30-48c2-8684-7b4cfd1405d3',expected_phone:'02-793-2900',name:'로얄파크컨벤션'},
    {hall_id:'73bc8e0f-a1c0-4bf3-abfc-47409872487e',expected_phone:'02-2662-8300',name:'보타닉파크웨딩'},
    {hall_id:'ea026116-dd93-4dd9-8eff-8a4f46a1c19d',expected_phone:'02-2171-7882',name:'코리아나호텔 웨딩'}
  ];
  const phoneReceipts=verifiedPhoneTargets.map(t=>{
    const h=hallById.get(t.hall_id);
    return {hall_id:t.hall_id,name:t.name,expected_phone:t.expected_phone,
      stored_phone:h?.phone||null,verified:h?.phone===t.expected_phone&&h?.name===t.name};
  });
  const analysisBySource=new Map(analyses.map(a=>[String(a.source_id),a]));
  const sByHall=new Map();
  for(const s of sources){let p=String(s.hall_id);if(!sByHall.has(p))sByHall.set(p,[]);sByHall.get(p).push(s);}
  const aByHall=new Map();
  for(const a of analyses){let p=String(a.hall_id);if(!aByHall.has(p))aByHall.set(p,[]);aByHall.get(p).push(a);}
  const rByHall=new Map();
  for(const r of ratings)rByHall.set(String(r.hall_id),r);
  const missingProfile=pub.filter(h=>h.operation_status!=='운영'||!tidy(h.name)||!tidy(h.road_address)||!tidy(h.phone)||!tidy(h.website)||/weddingrank\.kr|pickrank\.kr/.test(tidy(h.website))).map(h=>({
    id:h.hall_id,name:h.name,road_address:h.road_address,existing_phone:h.phone,existing_website:h.website,operation_status:h.operation_status,
    missing:[!tidy(h.road_address)?'address':null,!tidy(h.phone)?'phone':null,!tidy(h.website)?'website':null,
      /weddingrank\.kr|pickrank\.kr/.test(tidy(h.website))?'placeholder_website':null,
      h.operation_status!=='운영'?'not_operating':null].filter(Boolean)
  }));
  const nameDuplicates=duplicates(pub,h=>nameKey(h.name));
  const addressDuplicates=duplicates(pub,h=>addressKey(h.road_address));
  const published=ratings.filter(x=>x.is_public===true);
  const ratingProblems=[],ratingDateGap=[];
  for(const r of published){
    const h=hallById.get(String(r.hall_id));
    const candidate=(sByHall.get(String(r.hall_id))||[]).filter(s=>s.is_published===true&&s.source_type==='public_review'&&Number(s.quality_score)>=70);
    const qualified=new Map(),missingDates=[];
    for(const s of candidate){
      const u=urlKey(s.source_url);
      const a=analysisBySource.get(String(s.source_id));
      if(!/^https:\/\//.test(u)||!a||String(a.hall_id)!==String(r.hall_id)||Number(a.evidence_strength)<70)continue;
      if(/weddingrank\.kr|pickrank\.kr/.test(u))continue;
      qualified.set(u,s);
      if(!s.published_date)missingDates.push(u);
    }
    if(!h||h.is_public!==true||h.operation_status!=='운영'||qualified.size<3)
      ratingProblems.push({hall_id:r.hall_id,name:h?.name||null,verified_analysis_urls:qualified.size,profile_public:h?.is_public===true,operation_status:h?.operation_status||null});
    if(missingDates.length)ratingDateGap.push({hall_id:r.hall_id,name:h?.name||null,missing_exact_post_date_urls:missingDates.length});
  }
  const heldWithZeroAnalysis=halls.filter(h=>(sByHall.get(String(h.hall_id))||[]).length>=3&&
    (aByHall.get(String(h.hall_id))||[]).length===0&&rByHall.get(String(h.hall_id))?.is_public!==true)
    .map(h=>({hall_id:h.hall_id,name:h.name,source_rows:(sByHall.get(String(h.hall_id))||[]).length}));
  const missingRoom=pub.filter(h=>!rooms.some(r=>String(r.hall_id)===String(h.hall_id))).map(h=>({hall_id:h.hall_id,name:h.name}));
  const missingPrice=pub.filter(h=>!prices.some(r=>String(r.hall_id)===String(h.hall_id))).map(h=>({hall_id:h.hall_id,name:h.name}));
  const danglingSources=sources.filter(s=>!hallById.has(String(s.hall_id)));
  const danglingAnalyses=analyses.filter(a=>!hallById.has(String(a.hall_id))||!sources.some(s=>String(s.source_id)===String(a.source_id)));
  return {
    generated_at:new Date().toISOString(),scope:'WeddingRank-only',mode:'read_only',pickrank_sync:false,
    totals:{venue_rows:halls.length,public_venue_rows:pub.length,public_operating_venues:operating.length,
      hall_room_rows:rooms.length,price_rows:prices.length,source_rows:sources.length,
      review_analysis_rows:analyses.length,public_ratings:published.length},
    quality:{incomplete_public_profiles:missingProfile.length,duplicate_public_name_groups:nameDuplicates.length,
      same_address_public_groups:addressDuplicates.length,public_with_no_room_rows:missingRoom.length,
      public_with_no_price_rows:missingPrice.length,public_rating_analysis_eligibility_issues:ratingProblems.length,
      public_ratings_with_missing_exact_post_dates:ratingDateGap.length,
      held_three_plus_sources_zero_analysis:heldWithZeroAnalysis.length,
      orphan_source_rows:danglingSources.length,orphan_analysis_rows:danglingAnalyses.length,
      verified_official_phone_corrections:phoneReceipts.filter(x=>x.verified).length},
    samples:{verified_official_phone_corrections:phoneReceipts,incomplete_public_profiles:missingProfile.slice(0,40),duplicate_public_names:nameDuplicates.slice(0,15),
      same_address_public_venues:addressDuplicates.slice(0,15),public_without_rooms:missingRoom.slice(0,30),
      public_without_price_rows:missingPrice.slice(0,25),
      public_rating_analysis_problems:ratingProblems.slice(0,30),
      public_missing_exact_post_date:ratingDateGap.slice(0,15),
      held_three_plus_urls_zero_analysis:heldWithZeroAnalysis.slice(0,25)},
    note:'Potential same-address records may be valid shared-venue facilities; never auto-merge. Exact posting dates cannot be inferred from consultation months. No writes or rating-date changes.'
  };
}
(async()=>{
const [halls,rooms,prices,sources,analyses,ratings]=await Promise.all([
  pages('wedding_halls','hall_id,name,road_address,phone,website,is_public,operation_status'),
  pages('hall_rooms','hall_id'),
  pages('wedding_prices','hall_id'),
  pages('wedding_review_sources','source_id,hall_id,source_url,source_type,quality_score,is_published,published_date'),
  pages('wedding_review_analysis','analysis_id,source_id,hall_id,evidence_strength'),
  pages('external_wedding_ratings','hall_id,is_public,updated_at')
]);
console.log('WEDDINGRANK_DIRECTORY_AUDIT_JSON='+JSON.stringify(mainAudit(halls,rooms,prices,sources,analyses,ratings)));
})().catch(e=>{console.error(e);process.exitCode=1;});
