const { createClient }=require('@supabase/supabase-js');
const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key||!url.includes('mozmxkmaynhxqwzovzhi.supabase.co'))throw new Error('WeddingRank secrets/project guard');
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const targets=[
 {hall_id:'fedfc4e8-0ef1-42c2-b1ce-7ae541b92f78',name:'아모리스 역삼점'},
 {hall_id:'b4ff74c0-a956-4c65-83ae-5092354503ce',name:'케이터틀'}
];
async function main(){
 const {data:all,error}=await db.from('wedding_halls')
  .select('hall_id,name,road_address,sido,sigungu,phone,website,is_public,operation_status').limit(2000);
 if(error)throw error;
 const out=[];
 for(const t of targets){
   const row=all.find(x=>String(x.hall_id)===t.hall_id);
   const token=t.name.replace(/점$/,'').replace(/\s+/g,'');
   const possible=all.filter(x=>String(x.name||'').replace(/\s+/g,'').includes(token)||token.includes(String(x.name||'').replace(/\s+/g,'')));
   const {data:rooms,error:re}=await db.from('hall_rooms').select('*').eq('hall_id',t.hall_id);if(re)throw re;
   const {data:prices,error:pe}=await db.from('wedding_prices').select('*').eq('hall_id',t.hall_id);if(pe)throw pe;
   const {data:sources,error:se}=await db.from('wedding_review_sources').select('source_id,source_url,source_type,quality_score,is_published,summary').eq('hall_id',t.hall_id);if(se)throw se;
   const {data:rating,error:ee}=await db.from('external_wedding_ratings').select('*').eq('hall_id',t.hall_id).maybeSingle();if(ee)throw ee;
   out.push({target:t,row,possible_duplicates:possible,rooms,prices,review_sources:sources,rating});
 }
 console.log('PROMOTION_CANDIDATE_AUDIT_BEGIN');
 console.log(JSON.stringify(out,null,2));
 console.log('PROMOTION_CANDIDATE_AUDIT_END');
}
main().catch(e=>{console.error(e);process.exit(1)});