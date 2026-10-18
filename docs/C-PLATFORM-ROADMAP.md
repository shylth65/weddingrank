# WeddingRank C-platform migration plan (2026-10-18)

## Purpose
WeddingRank helps couples compare real wedding venues using factual venue information, independent first-hand experiences, separately labeled qualitative analysis, and transparent evidence-based rankings. TOP30 is one service, not a quota.

## Source of truth and protection
- WeddingRank-owned Supabase project only; never sync to PICKRANK.
- Preserve all existing venue profiles, review sources and analyses, approved TOP30 evidence and scores, timestamps, and 2026-09-27 withheld candidates.
- Do not infer or generate raw review scores from narrative. No existing rank rewrite or reposting of withheld entries without fresh evidence review.
- A successful workflow run is NOT proof of a published website change.

## Tracks
1. Venue profiles: official identity, location, transport, parking, capacity, price and operational evidence. Display absent facts as unverified.
2. Qualitative reviews: first-hand independent experience, source URL, distinct author/origin, publication date when known, quality and verified analysis. Show pros/cons and evidence counts separately from ratings.
3. Quantitative ranking: three or more independent originals with separate verified analyses, raw score, original scale, actual sample size, specialist approval, source quality; update TOP30 only when approved evidence materially changes.
4. Custom comparison: compare by geography, budget, party size, convenience and verified pros/cons without pretending to compute a raw-score rank.

## Current observed DB contract
- wedding_halls: venue catalog.
- wedding_review_sources: source_id, hall_id, source_url, source_type, quality_score, summary, published_date, is_published, updated_at. No persistent content hash.
- wedding_review_analysis: source_id, hall_id, evidence_strength and topic analysis fields.
- weddingrank_top30_competition: rank_position, overall_score, source_count, evidence_hash, evidence_sources, approved ranking timestamps.
- Discovery currently outputs candidate leads into workflow logs, not a durable queue. Audit identifies unanalysed sources, but does not approve or publish.

## Safe next migration (not yet applied)
1. Design a separate, private `wedding_review_candidate_queue` with unique canonical_url, content_sha256, last_checked_at, first_seen_at, source_url, matched_hall_id, status (new/needs_review/analysed/held/approved), independent_source_evidence, raw_score, raw_scale, actual_sample_count and error_reason. Enforce independent keys and least-privilege access.
2. Bootstrap existing known sources and deduplicate before ingest; do not overwrite sources, analyses or ranking tables.
3. Only run new lead discovery 09/13/17/21 Asia/Seoul; use stored hashes and prior statuses to skip unchanged originals. Existing Github cron is allowed to run on schedule, but manual duplicate executions are prohibited.
4. Perform AI review analysis only for new or materially changed independent texts and send to specialist approval queue. Distinguish qualitative approval from quantitative score approval.
5. Add a gated ranking action that compares approved evidence hashes and makes no DB writes on a no-op.
6. Build venue/profile, qualitative reviews and condition-based comparison UI independently of TOP30. Keep current URLs and ranking presentation stable during rollout.
7. Introduce end-to-end tests for draft lead, held source, unchanged hash, new qualitative review, verified quantitative approval, no-op rank and website visibility.
8. Check GitHub Actions execution and billing usage; notify at 80%, throttle nonessential discovery/AI near 90%, preserve audits/error checks.

## Operations and reporting
Per run, report ranked count, newly approved, held, failed, fetched/analysed, skipped, DB writes, Actions and deployment status, and whether actual UI publication was verified. On two consecutive zero-approval runs identify the blocker, not just the count. Never equate read-only audit with completion of the source-to-publication pipeline.
