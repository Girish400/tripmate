# GitHub Pages Hosting Guide

## One-Time Setup

### 1. Create the GitHub repo
Go to github.com → New repository → Name: `tripmate` → Public → Create.

### 2. Set the base path in `vite.config.js`
Already set to `/tripmate/` — no change needed.

### 3. Install the deploy package (already done)
```bash
npm install --save-dev gh-pages
```

### 4. Verify `package.json` scripts include
```json
"predeploy": "npm run build",
"deploy": "gh-pages -d dist"
```

### 5. Create your `.env` file
```bash
cp .env.example .env
# Fill in all VITE_FIREBASE_* values from your Firebase console
```

### 6. Authorize GitHub Pages domain in Firebase
- Go to [Firebase Console](https://console.firebase.google.com) → `camp-cbf1d` → Authentication → Settings → Authorized domains
- Click **Add domain**
- Enter: `<your-github-username>.github.io`

### 7. Restrict your API key (security)
- Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
- Click your Browser API key → Application restrictions → HTTP referrers
- Add: `https://<your-github-username>.github.io/*`

### 8. Push to GitHub and deploy
```bash
git remote add origin https://github.com/<your-username>/tripmate.git
git push -u origin main
npm run deploy
```

### 9. Enable GitHub Pages
- GitHub repo → Settings → Pages
- Source: **Deploy from a branch**
- Branch: `gh-pages` → `/ (root)` → Save

Your site will be live at: `https://<your-username>.github.io/tripmate`

## Every Deploy
```bash
npm run deploy
```
This runs `npm run build` then pushes `dist/` to the `gh-pages` branch automatically.

## Troubleshooting

**Blank page after deploy:**
Ensure `base: '/tripmate/'` is set in `vite.config.js`.

**Login popup blocked / redirect loop:**
Ensure your GitHub Pages domain is in Firebase authorized domains (Step 6).

**404 on direct URL access:**
This is handled by `HashRouter` — all URLs use `/#/path` format which GitHub Pages serves correctly.

**Safari login not working:**
The app automatically detects Safari and uses `signInWithRedirect` instead of `signInWithPopup`. Ensure your domain is in Firebase authorized domains.
