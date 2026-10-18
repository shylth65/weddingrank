'use strict';
// Explicit specialist approval of a previously staged existing source.
// Never updates the quantitative TOP30.
const {createClient}=require('@supabase/supabase-js');
const id=process.env.WEDDING_SOURCE_ID,ref=process.env.SPECIALIST_APPROVAL_REFERENCE;
if(!/^[0-9a-f-]{36}$/i.test(id||'')||!ref||ref.trim().length<8)throw Error('Source UUID and substantial specialist approval reference required');
const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key||new URL(url).hostname!=='mozmxkmaynhxqwzovzhi.supabase.co')throw Error('WeddingRank DB required');
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
async function one(t,cols,col,v){const {data,error}=await db.from(t).select(cols).eq(col,v).maybeSingle();if(error)throw error;return data;}
async function main(){
 const [pub,source,analysis]=await Promise.all([
  one('wedding_qualitative_review_publications','publication_id,source_id,hall_id,source_url,summary,content_sha256,approval_status','source_id',id),
  one('wedding_review_sources','source_id,hall_id,source_url,source_type,quality_score,is_published','source_id',id),
  one('wedding_review_analysis','source_id,hall_id,evidence_strength','source_id',id)
 ]);
 if(!pub||!source||!analysis||source.hall_id!==pub.hall_id||analysis.hall_id!==pub.hall_id||source.source_type!=='public_review'||!source.is_published||Number(source.quality_score)<70||Number(analysis.evidence_strength)<70||pub.approval_status==='held')throw Error('Source does not meet evidence review prerequisites');
 if(!/^https:\/\//i.test(pub.source_url)||pub.source_url!==source.source_url||!pub.summary?.trim())throw Error('Pending source evidence is incomplete');
 if(pub.approval_status==='approved'){console.log('WEDDINGRANK_APPROVAL_UNCHANGED');return;}
 if(pub.approval_status!=='pending')throw Error('Requires pending approval');
 const now=new Date().toISOString();
 const {error}=await db.from('wedding_qualitative_review_publications').update({approval_status:'approved',specialist_approved_at:now,specialist_approval_reference:ref.trim(),published_at:now}).eq('source_id',id).eq('approval_status','pending');
 if(error)throw error;
 console.log('WEDDINGRANK_QUALITATIVE_APPROVED='+JSON.stringify({source_id:id,approval_reference:ref.trim(),top30_unchanged:true}));
}
main().catch(e=>{console.error(e);process.exitCode=1});
