# Frontend Deployment Checklist (Vercel)

This directory is the static frontend.

Canonical editable pages live in `frontend/*.html`.
The `frontend/public/` folder is for shared assets and scripts, not page copies.

## Files

- `index.html`
- `public/styles.css`
- `public/script.js`
- `public/config.js`
- `vercel.json`

## 1. Update backend URL

Edit `vercel.json` and replace:
- `https://your-backend.up.railway.app`

with your real Railway backend URL.

Also set runtime config in `public/config.js`:

```js
window.APP_CONFIG = {
  API_BASE_URL: "https://your-backend.up.railway.app/api",
};
```

## 2. Deploy to Vercel

1. Import this repo into Vercel.
2. Set project root to `frontend`.
3. Framework preset: `Other`.
4. Build command: leave empty.
5. Output directory: leave empty (static root).
6. Deploy.

## 3. Post-deploy checks

- Open the deployed frontend URL.
- Test login and admin dashboard.
- Confirm API requests succeed (network tab should hit Railway URL).
- Confirm uploads render via `/uploads/*` rewrite.

## 4. Common issues

- CORS error: add Vercel URL to backend `CORS_ORIGIN` / `FRONTEND_URL`.
- 404 on API: verify `vercel.json` rewrite target and backend health route.
- Stale API URL: check `public/config.js` and browser cache.
