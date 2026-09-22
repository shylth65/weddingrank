/* PICKRANK read-only canonical common data; WeddingRank member/review data stays local */
(()=>{'use strict';
const FEED='https://umreaxukykowauxkauyd.supabase.co/functions/v1/canonical-feed?category=wedding&limit=500';
const norm=v=>String(v||'').replace(/\s+/g,'').toLowerCase();
async function apply(){
 try{
  const r=await fetch(FEED,{cache:'no-store'}); if(!r.ok)throw new Error('canonical feed '+r.status);
  const j=await r.json(), records=Array.isArray(j.records)?j.records:[]; if(!records.length)return;
  let changed=0;
  for(const rec of records){
   const p=rec.payload||{}, hall=Array.isArray(halls)&&halls.find(h=>norm(h.name)===norm(rec.name)||norm(h.name)===norm(p.name));
   if(!hall)continue;
   hall.name=rec.name||hall.name;
   hall.road_address=p.address||hall.road_address;
   hall.phone=p.phone||hall.phone;
   hall.website=rec.source_url||p.source_url||hall.website;
   hall.venue_type=p.venue_type||hall.venue_type;
   hall.pickrank_canonical_key=rec.canonical_key;
   hall.pickrank_version=rec.version;
   hall.pickrank_updated_at=rec.updated_at;
   const meal=Number(p.meal_price_from_krw);
   if(Number.isFinite(meal)&&meal>0&&!priceByHall.has(hall.hall_id))priceByHall.set(hall.hall_id,{hall_id:hall.hall_id,meal_price_per_person:meal,effective_date:(p.as_of_date||p.verified_on||'')});
   changed++;
  }
  if(changed){setupRegions();render();route();document.documentElement.dataset.pickrankCommon='active';}
 }catch(e){console.warn('[WeddingRank] canonical common-data fallback',e);}
}
const start=()=>setTimeout(apply,1300);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();