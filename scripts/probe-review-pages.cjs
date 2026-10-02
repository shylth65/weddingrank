const urls = [
'https://jinzzawedding.com/reviews/578','https://jinzzawedding.com/reviews/576','https://jinzzawedding.com/reviews/575',
'https://jinzzawedding.com/reviews/1102','https://jinzzawedding.com/reviews/1101','https://jinzzawedding.com/reviews/1100',
'https://jinzzawedding.com/reviews/777','https://jinzzawedding.com/reviews/1198','https://jinzzawedding.com/reviews/1268',
'https://jinzzawedding.com/reviews/1505','https://jinzzawedding.com/reviews/1088','https://jinzzawedding.com/reviews/1086'
];
const clean=s=>s.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const around=(s,needle,n=180)=>{
 const out=[]; let pos=0;
 while((pos=s.indexOf(needle,pos))>=0&&out.length<8){out.push(s.slice(Math.max(0,pos-n),Math.min(s.length,pos+needle.length+n)).replace(/\s+/g,' '));pos+=needle.length;}
 return out;
};
async function main(){
 const out=[];
 for(const url of urls){
  try{
   const r=await fetch(url,{redirect:'follow',headers:{'user-agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36','accept-language':'ko-KR,ko;q=0.9,en;q=0.8'}});
   const html=await r.text();
   const text=clean(html);
   const title=(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]?.replace(/\s+/g,' ').trim()||null;
   const rating=(html.match(/"ratingValue"\s*:\s*([0-9.]+)/i)||[])[1]||null;
   const best=(html.match(/"bestRating"\s*:\s*([0-9.]+)/i)||[])[1]||null;
   const category={};
   for(const k of ['시설','식사','서비스','가격','주차','접근성']) category[k]=around(html,k,140);
   const english={};
   for(const k of ['facility','food','service','price','parking','access','value','score']) english[k]=around(html,k,140);
   const dateMatches=[...new Set([...(text.match(/20\d{2}[.-]\d{1,2}(?:[.-]\d{1,2})?/g)||[]),...(html.match(/20\d{2}-\d{2}-\d{2}/g)||[])])].slice(0,20);
   out.push({url,status:r.status,title,rating,best,dateMatches,category,english});
  }catch(e){out.push({url,error:String(e)});}
 }
 console.log('JINZZA_DETAIL_PROBE_JSON_BEGIN');
 console.log(JSON.stringify(out,null,2));
 console.log('JINZZA_DETAIL_PROBE_JSON_END');
}
main().catch(e=>{console.error(e);process.exit(1);});
