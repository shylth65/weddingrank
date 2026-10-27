import copy,importlib.util,pathlib,unittest
p=pathlib.Path(__file__).resolve().parents[1]/'scripts/weddingrank_bulk_publish_once.py'
s=importlib.util.spec_from_file_location('bulk',p);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
class SafetyTests(unittest.TestCase):
 def setUp(self):
  self.h={'hall_id':'venue-1','name':'Test hall','road_address':'서울 중구 예식로 10','operation_status':'운영','verification_status':'검색확인','website':None,'source_url':'https://directory.invalid/','is_public':False}
  self.a={'hall_id':'venue-1','name':'Test hall','road_address':self.h['road_address'],'official_url':'https://official.invalid/wedding','checked_at':'2026-10-27','approved':True,'official_wedding_evidence':'Official wedding reservation program with verified identity and address.','expected_before':copy.deepcopy(self.h)}
 def check(self):return m.validate([self.a],[self.h],'2026-10-27')
 def test_explicit_current_approval_is_required(self):
  for field,value in [('approved',False),('checked_at','2026-10-26'),('official_wedding_evidence','')]:
   original=self.a[field];self.a[field]=value;valid,errors=self.check();self.assertFalse(valid);self.assertEqual(len(errors),1);self.a[field]=original
 def test_existing_public_record_is_never_eligible(self):
  self.h['is_public']=True;self.assertFalse(self.check()[0])
 def test_changed_row_is_not_overwritten(self):
  self.h['road_address']='Different address';self.assertFalse(self.check()[0])
 def test_duplicate_identity_is_rejected(self):
  public={**self.h,'hall_id':'public-2','is_public':True};self.assertFalse(m.validate([self.a],[self.h,public],'2026-10-27')[0])
 def test_one_invalid_candidate_does_not_hide_valid_candidates(self):
  bad={**self.a,'hall_id':'missing'};valid,errors=m.validate([bad,self.a],[self.h],'2026-10-27');self.assertEqual(len(valid),1);self.assertEqual(len(errors),1)
 def test_sql_quotes_payload_and_scopes_write_to_approved_row(self):
  self.a['official_wedding_evidence']="Quoted ' evidence is data, never SQL";sql=m.render_sql([self.a]);self.assertIn("Quoted '' evidence",sql);self.assertIn('h.is_public IS FALSE',sql);self.assertIn('EXCEPTION WHEN OTHERS',sql);self.assertEqual(sql.count('UPDATE public.wedding_halls'),1);self.assertNotIn('UPDATE public.wedding_prices',sql)
if __name__=='__main__':unittest.main()
