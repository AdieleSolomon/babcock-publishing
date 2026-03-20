// Runtime frontend config for deployment.
// For Vercel -> Railway setup, set API_BASE_URL to your Railway backend URL + /api.
// Example: https://your-backend.up.railway.app/api
(() => {
  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  const fallbackBaseUrl = isLocalhost
    ? "http://localhost:3001/api"
    : "https://babcock-publishing-production.up.railway.app/api";

  window.APP_CONFIG = {
    ...(window.APP_CONFIG || {}),
    API_BASE_URL: window.APP_CONFIG?.API_BASE_URL || fallbackBaseUrl,
  };
})();
