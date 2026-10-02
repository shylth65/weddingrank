async function main(){
 const r=await fetch('https://jinzzawedding.com/halls',{headers:{'user-agent':'Mozilla/5.0 Chrome/140 Safari/537.36','accept-language':'ko-KR,ko;q=0.9,en;q=0.8'}});
 const html=await r.text();
 const needles=['보타닉','Botanic','JW 메리어트 동대문','JW메리어트 동대문','메리어트 동대문','동대문 스퀘어'];
 const hits={};
 for(const needle of needles){
   const arr=[];let pos=0;
   while((pos=html.indexOf(needle,pos))>=0&&arr.length<20){
     const frag=html.slice(Math.max(0,pos-1200),Math.min(html.length,pos+1800));
     const hrefs=[...frag.matchAll(/href=["']\/halls\/(\d+)["']/g)].map(m=>m[1]);
     arr.push({pos,hallIds:[...new Set(hrefs)],fragment:frag.replace(/\s+/g,' ').slice(0,3000)});
     pos+=needle.length;
   }
   hits[needle]=arr;
 }
 const ids=[...new Set([...html.matchAll(/href=["']\/halls\/(\d+)["']/g)].map(m=>m[1]))];
 console.log('JINZZA_DIRECTORY_SEARCH_BEGIN');
 console.log(JSON.stringify({status:r.status,bytes:html.length,totalHallLinks:ids.length,hits},null,2));
 console.log('JINZZA_DIRECTORY_SEARCH_END');
}
main().catch(e=>{console.error(e);process.exit(1)});