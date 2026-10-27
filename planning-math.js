/* Pure cost arithmetic; no stored prices or scoring writes. */
(function(root){'use strict';
function calculate(v){
 const keys=['guests','meal','guarantee','rental','flowers','required','optional','discount'];
 const missing=keys.filter(k=>v[k]===''||v[k]==null);const n={};
 for(const k of keys){if(missing.includes(k)){n[k]=0;continue;}n[k]=Number(v[k]);if(!Number.isFinite(n[k])||n[k]<0||!Number.isInteger(n[k]))return {error:'인원과 금액은 0 이상의 정수로 입력하세요.'};}
 if(n.guests<1&&!missing.includes('guests'))return {error:'예상 하객 수는 1명 이상 입력하세요.'};
 if(missing.some(k=>['guests','meal','guarantee'].includes(k)))return {missing,total:null};
 const billed=Math.max(n.guests,n.guarantee),food=billed*n.meal,total=food+n.rental+n.flowers+n.required+n.optional-n.discount;
 if(!Number.isSafeInteger(total)||!Number.isSafeInteger(food))return {error:'계산 가능한 범위를 초과했습니다.'};
 if(total<0)return {error:'할인 금액이 합계보다 큽니다.'};
 return {total,food,billed,average:total/n.guests,missing,plus50:(Math.max(n.guests+50,n.guarantee)-billed)*n.meal,minus50:(Math.max(Math.max(1,n.guests-50),n.guarantee)-billed)*n.meal,guaranteeCost:Math.max(0,n.guarantee-n.guests)*n.meal};
}
const api={calculate};if(typeof module!=='undefined')module.exports=api;else root.WeddingCost=api;
})(typeof window!=='undefined'?window:this);
