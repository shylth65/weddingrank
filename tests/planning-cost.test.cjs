const {test}=require('node:test'),assert=require('node:assert/strict'),{calculate}=require('../planning-math');
const base={guests:150,meal:70000,guarantee:200,rental:3000000,flowers:1000000,required:500000,optional:0,discount:500000};
test('below guarantee charges the guarantee without confusing capacity',()=>{const r=calculate(base);assert.equal(r.billed,200);assert.equal(r.food,14000000);assert.equal(r.total,18000000);assert.equal(r.plus50,0);assert.equal(r.guaranteeCost,3500000);});
test('above guarantee charges actual attendance',()=>{const r=calculate({...base,guests:250});assert.equal(r.food,17500000);assert.equal(r.total,21500000);assert.equal(r.minus50,-3500000);assert.equal(r.average,86000);});
test('missing meal or guarantee cannot imply a free wedding',()=>{assert.equal(calculate({...base,meal:''}).total,null);assert.equal(calculate({...base,guarantee:''}).total,null);});
test('unconfirmed options produce a partial sum',()=>{const r=calculate({...base,flowers:''});assert.equal(r.total,17000000);assert.deepEqual(r.missing,['flowers']);});
test('explicit zero rental is different from unknown',()=>{assert.equal(calculate({...base,rental:0}).missing.length,0);assert.deepEqual(calculate({...base,rental:''}).missing,['rental']);});
test('negative, fractional, zero guests, oversized or excessive discount rejected',()=>{for(const v of [{meal:-1},{guests:0},{guests:1.5},{meal:Infinity},{meal:1e18},{discount:99999999}])assert.ok(calculate({...base,...v}).error);});
