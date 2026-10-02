const urls = [
'https://jinzzawedding.com/reviews/578','https://jinzzawedding.com/reviews/576','https://jinzzawedding.com/reviews/575',
'https://jinzzawedding.com/reviews/1102','https://jinzzawedding.com/reviews/1101','https://jinzzawedding.com/reviews/1100',
'https://jinzzawedding.com/reviews/777','https://jinzzawedding.com/reviews/1198','https://jinzzawedding.com/reviews/1268',
'https://jinzzawedding.com/reviews/1505','https://jinzzawedding.com/reviews/1088','https://jinzzawedding.com/reviews/1086'
];
const clean=s=>s.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
async function main(){
 const out=[];
 for(const url of urls){
  try{
   const r=await fetch(url,{redirect:'follow',headers:{'user-agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36','accept-language':'ko-KR,ko;q=0.9,en;q=0.8'}});
   const html=await r.text();
   const text=clean(html);
   const tokens=[];
   for(const re of [/(?:평점|별점|rating|score)[^<>{}\n]{0,80}/ig,/\b(?:10|[0-9](?:\.[0-9])?)\s*\/\s*(?:5|10)\b/g,/20\d{2}[.\-/년 ]+\d{1,2}(?:[.\-/월 ]+\d{1,2})?/g,/작성[^<>{}\n]{0,60}/g]){
    const m=[...html.matchAll(re)].slice(0,12).map(x=>x[0]);
    tokens.push(...m);
   }
   out.push({url,status:r.status,final_url:r.url,html_bytes:html.length,title:(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]?.replace(/\s+/g,' ').trim()||null,matches:[...new Set(tokens)].slice(0,30),text_preview:text.slice(0,1200)});
  }catch(e){out.push({url,error:String(e)});}
 }
 console.log('JINZZA_PROBE_JSON_BEGIN');
 console.log(JSON.stringify(out,null,2));
 console.log('JINZZA_PROBE_JSON_END');
}
main().catch(e=>{console.error(e);process.exit(1);});
