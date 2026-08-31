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
function wrMaybeLoadDetailEnhancements() {
  if (/^#hall=/.test(location.hash)) wrLoadScriptOnce("wr-detail-enhancements", "enhancements.js?v=5.67");
}

window.addEventListener("DOMContentLoaded", () => {
  wrLoadScriptOnce("wr-home-lite", "home-lite-v567.js?v=5.67");
  wrMaybeLoadDetailEnhancements();
  window.addEventListener("hashchange", wrMaybeLoadDetailEnhancements);

  if (/\/admin\.html$/.test(location.pathname)) {
    wrLoadScriptOnce("wr-price-audit", "price-audit.js?v=5.67");
  }
});
