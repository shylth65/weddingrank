-- Additive provenance ledger. Original venue/price/review/rank rows stay unchanged.
CREATE TABLE public.wedding_venue_fact_checks (
 batch_id text NOT NULL,
 hall_id uuid NOT NULL REFERENCES public.wedding_halls(hall_id),
 checked_at date NOT NULL,
 status text NOT NULL CHECK(status IN ('verified','held')),
 source_url text,
 reason text NOT NULL,
 fields jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(fields)='object'),
 http_status text,
 sha256 text,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (batch_id,hall_id)
);
ALTER TABLE public.wedding_venue_fact_checks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.wedding_venue_fact_checks FROM anon,authenticated;
GRANT SELECT ON public.wedding_venue_fact_checks TO anon,authenticated;
GRANT ALL ON public.wedding_venue_fact_checks TO service_role;
CREATE POLICY public_venue_facts_read ON public.wedding_venue_fact_checks
 FOR SELECT TO anon,authenticated USING (
 EXISTS(SELECT 1 FROM public.wedding_halls h WHERE h.hall_id=wedding_venue_fact_checks.hall_id AND h.is_public IS TRUE AND h.operation_status='운영')
 );
CREATE INDEX wedding_venue_fact_checks_hall_date_idx ON public.wedding_venue_fact_checks(hall_id,checked_at DESC);
COMMENT ON TABLE public.wedding_venue_fact_checks IS 'Append-only audit batches of public venue facts; official fields require individual source/date; no pricing or ranking writes.';
