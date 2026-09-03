// WeddingRank Supabase public browser configuration.
// Use only the public publishable key in the browser. Never expose service_role / secret keys.
window.WEDDINGRANK_CONFIG = {
  SUPABASE_URL: "https://mozmxkmaynhxqwzovzhi.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_I4myPqLM3PzjLpYCPwtjrA_jfMD0prR"
};
try {
  const authHash = new URLSearchParams(location.hash.slice(1));
  const refreshToken = authHash.get("refresh_token");
  const expiresIn = Number(authHash.get("expires_in") || 0);
  if (refreshToken) localStorage.setItem("wr_refresh_token", refreshToken);
  if (expiresIn) localStorage.setItem("wr_expires_at", String(Date.now() + expiresIn * 1000));
} catch (_) {}

function wrLoadScriptOnce(id, src) {
  if (document.getElementById(id)) return;
  const s = document.createElement("script");
  s.id = id;
  s.src = src;
  s.defer = true;
  document.body.appendChild(s);
}
function wrLoadStyleOnce(id, href) {
  if (document.getElementById(id)) return;
  const l = document.createElement("link");
  l.id = id;
  l.rel = "stylesheet";
  l.href = href;
  document.head.appendChild(l);
}
function wrMaybeLoadDetailEnhancements() {
  if (/^#hall=/.test(location.hash)) wrLoadScriptOnce("wr-detail-enhancements", "enhancements.js?v=5.69");
}

window.addEventListener("DOMContentLoaded", () => {
  wrLoadStyleOnce("wr-visual-restore", "visual-restore-v569.css?v=5.69");
  wrLoadScriptOnce("wr-home-lite", "home-lite-v567.js?v=5.69");
  wrLoadScriptOnce("wr-engagement", "wedding-engagement-v575.js?v=5.76");
  wrLoadScriptOnce("wr-member-history", "member-history-v1.js?v=1.10");
  wrMaybeLoadDetailEnhancements();
  window.addEventListener("hashchange", wrMaybeLoadDetailEnhancements);

  if (/\/admin\.html$/.test(location.pathname)) {
    wrLoadScriptOnce("wr-price-audit", "price-audit.js?v=5.69");
  }
});
