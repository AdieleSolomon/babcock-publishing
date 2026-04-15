# Vercel Deployment Guide

## Quick Start

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Deploy Frontend

Navigate to the frontend directory and deploy:

```bash
cd frontend
vercel
```

### 3. Connect Git Repository (CI/CD)

#### Step A: Push to GitHub (or GitLab/Bitbucket)

```bash
git add .
git commit -m "Initial commit for Vercel deployment"
git push origin main
```

#### Step B: Link Repository to Vercel

1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. **Import Git Repository** → Select `babcock-publishing`
4. **Configure Project:**
   - **Framework Preset:** Other
   - **Root Directory:** `frontend`
   - **Build Command:** (leave empty - no build needed)
   - **Output Directory:** `.`
   - **Environment Variables:** (add any needed variables)
5. Click **"Deploy"**

### 4. Automatic Deployments

Once connected, every push to your repository will automatically deploy:

- Push to `main` branch → Production deploy
- Create PR → Preview deployment

### 5. Custom Domain (Optional)

1. Go to project settings in Vercel dashboard
2. Navigate to **Domains**
3. Add your custom domain
4. Follow DNS configuration steps

## File Structure for Vercel

```
frontend/
├── index.html
├── staff.html
├── services.html
├── publications.html
├── gallery.html
├── about.html
├── authors.html
├── for-authors.html
├── insights.html
├── products.html
├── publishing.html
├── rights-permissions.html
├── solutions.html
├── support.html
├── robots.txt
├── sitemap.xml
├── styles.css
├── script.js
├── vercel.json              # Deployment config
├── .vercelignore            # Files to ignore
└── public/                  # Public assets
    ├── styles.css
    ├── script.js
    ├── config.js
    ├── enterprise.css
    ├── enterprise.js
    ├── publications.js
    ├── authors.js
    ├── assets/              # Images and media
    └── ...
```

## Configuration Details

### vercel.json

- **cleanUrls:** Removes `.html` extensions from URLs
- **trailingSlash:** Removes trailing slashes
- **rewrites:** Maps routes to HTML files (SPA-style routing)
- **headers:** Configures caching for assets and HTML files

### Cache Strategy

- **Static assets** (JS, CSS, images): 1 year (immutable)
- **HTML files**: No cache (must revalidate on each request)

## Troubleshooting

### 404 Errors on Refresh

✅ Solved by `rewrites` in `vercel.json` - all routes point to index.html if they don't match files

### Assets Not Loading

Check that asset paths in HTML are correct and match the file structure

### Deployment Fails

- Check `.vercelignore` - make sure necessary files aren't ignored
- Verify all HTML files exist in the frontend directory
- Check for broken symlinks or missing files

## Environment Variables (if needed)

Add environment variables in Vercel dashboard:

1. Project Settings → **Environment Variables**
2. Add key-value pairs
3. Access in JavaScript via `config.js` or similar

## Rollbacks

To rollback to a previous deployment:

1. Vercel dashboard → Deployments
2. Find the deployment you want
3. Click the three dots → **Promote to Production**

## Performance Tips

- Optimize images (use AVIF, WebP formats)
- Minify CSS and JavaScript
- Use browser caching headers
- Compress static assets

## Support

- Vercel Documentation: https://vercel.com/docs
- GitHub Issues: Link your repo for CI/CD help
- Vercel Support: https://vercel.com/support
