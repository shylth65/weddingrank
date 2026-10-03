const urls=[
'https://jinzzawedding.com/reviews/2202','https://jinzzawedding.com/reviews/1553','https://jinzzawedding.com/reviews/476',
'https://jinzzawedding.com/reviews/2265','https://jinzzawedding.com/reviews/2266','https://jinzzawedding.com/reviews/1590'];
const clean=s=>s.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
async function main(){
 const out=[];
 for(const url of urls){
  const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0','accept-language':'ko-KR,ko;q=0.9'}});
  const html=await r.text(),text=clean(html);
  const lds=[...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>JSON.parse(m[1]));
  const nodes=lds.flatMap(x=>x['@graph']||[x]);
  const review=nodes.find(x=>x['@type']==='Review');
  out.push({url,status:r.status,title:clean((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||''),
   rating:review?.reviewRating||null,itemReviewed:review?.itemReviewed?.name||null,
   periods:[...new Set(text.match(/20\d{2}[.-]\d{1,2}(?:[.-]\d{1,2})?/g)||[])],
   verification:[...new Set(text.match(/(?:견적서|예약내역|현장사진|명함·카톡|예약문자) 인증/g)||[])],
   hallLinks:[...new Set([...html.matchAll(/href="(\/halls\/\d+)"/g)].map(m=>m[1]))],
   authorPresent:Boolean(review?.author?.name),reviewCount:1});
 }
 console.log('JINZZA_DETAIL_PROBE_JSON_BEGIN');
 console.log(JSON.stringify(out,null,2));
 console.log('JINZZA_DETAIL_PROBE_JSON_END');
}
main().catch(e=>{console.error(e);process.exit(1)});
