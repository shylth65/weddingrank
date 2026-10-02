const { createClient } = require('@supabase/supabase-js');

const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw new Error('Missing WeddingRank Supabase secrets');
if(!url.includes('mozmxkmaynhxqwzovzhi.supabase.co'))throw new Error('Wrong project');
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});

const norm=s=>String(s||'').toLowerCase()
 .replace(/서울특별시|서울시|서울/g,'')
 .replace(/웨딩홀|웨딩|컨벤션센터|컨벤션/g,'')
 .replace(/호텔/g,'')
 .replace(/[^0-9a-z가-힣]/g,'')
 .replace(/(점|서울점)$/,'');
const clean=s=>s.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
function parseCards(html){
 const chunks=html.split(/<div class="review-card[^"]*" id="review-(\d+)">/),out=[];
 for(let i=1;i<chunks.length;i+=2){
  const id=chunks[i],body=chunks[i+1]||'';
  const rating=Number((body.match(/class="rc-bignum">([0-9.]+)/)||[])[1]);
  const verify=clean((body.match(/class="rc-verify">([\s\S]*?)<\/div>/)||[])[1]||'');
  if(Number.isFinite(rating)&&rating>=1&&rating<=5&&/(견적서|예약내역|예약문자|현장사진|명함|카톡)/.test(verify)) out.push({id,rating,verify,url:'https://jinzzawedding.com/reviews/'+id});
 }
 return out;
}
async function main(){
 const {data:rows,error}=await db.from('wedding_halls')
  .select('hall_id,name,road_address,sido,sigungu,phone,website,is_public,operation_status')
  .eq('is_public',false).limit(2000);
 if(error)throw error;

 const rr=await fetch('https://jinzzawedding.com/halls',{headers:{'user-agent':'Mozilla/5.0 Chrome/140 Safari/537.36','accept-language':'ko-KR,ko;q=0.9'}});
 const html=await rr.text();
 const itemScript=(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i)||[])[1];
 if(!itemScript)throw new Error('No directory JSON-LD');
 const ld=JSON.parse(itemScript);
 const graph=ld['@graph']||[];
 const list=graph.find(x=>x['@type']==='ItemList');
 if(!list)throw new Error('No ItemList');
 const external=(list.itemListElement||[]).map(x=>{
  const m=String(x.url||'').match(/\/halls\/(\d+)/);
  return {jinzza_id:m?m[1]:null,name:x.name,norm:norm(x.name),url:x.url};
 }).filter(x=>x.jinzza_id);

 const byNorm=new Map();
 for(const e of external){const a=byNorm.get(e.norm)||[];a.push(e);byNorm.set(e.norm,a)}
 const matches=[];
 for(const h of rows){
   const hn=norm(h.name),exts=byNorm.get(hn)||[];
   if(exts.length===1)matches.push({hall:h,external:exts[0]});
 }
 const qualified=[];
 for(const m of matches.slice(0,80)){
   const r=await fetch(m.external.url,{headers:{'user-agent':'Mozilla/5.0 Chrome/140 Safari/537.36','accept-language':'ko-KR,ko;q=0.9'}});
   if(!r.ok)continue;
   const page=await r.text();
   const cards=parseCards(page);
   const addr=(clean(page).match(/서울[^·]{0,60}(?:로|길)\s*\d+[0-9-]*/)||[])[0]||null;
   if(cards.length>=3)qualified.push({hall:m.hall,jinzza:{...m.external,address_hint:addr,verified_numeric_reviews:cards.slice(0,5)},verified_numeric_count:cards.length});
 }
 console.log('NONPUBLIC_JINZZA_OVERLAP_BEGIN');
 console.log(JSON.stringify({
  weddingrank_nonpublic:rows.length,
  jinzza_directory:external.length,
  exact_normalized_matches:matches.length,
  candidates_with_3_verified_numeric_reviews:qualified.length,
  candidates:qualified.slice(0,30)
 },null,2));
 console.log('NONPUBLIC_JINZZA_OVERLAP_END');
}
main().catch(e=>{console.error(e);process.exit(1)});