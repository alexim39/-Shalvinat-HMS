# Shalvinat HMS — Split Hosting Deployment Guide

Frontend on shared hosting (cPanel/Apache) + Backend on Back4app + Database on MongoDB Atlas (free tier).

---

## 1. MongoDB Atlas (Database)

1. Create a free account at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a free **M0 cluster**
3. Under **Database Access**, create a user: `shalvinat` with a strong password
4. Under **Network Access**, add `0.0.0.0/0` (allow from anywhere) or Back4app IPs
5. Click **Connect** → **Drivers** → copy the connection string:
   ```
   mongodb+srv://shalvinat:<password>@cluster0.xxxxx.mongodb.net/shalvinat_hms?retryWrites=true&w=majority
   ```

---

## 2. Back4app (Backend API — via GitHub)

Back4app uses container-based deployment connected directly to your GitHub repo. No manual uploads needed.

### 2.1 Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USER/shalvinat-hms.git
git push -u origin main
```

### 2.2 Create Back4app Web App
1. Create a free account at [back4app.com](https://back4app.com)
2. Click **New App** → **Container as a Service (CaaS)** → **Create App**
3. Under **Deployment method**, choose **GitHub** and connect your repo
4. Set the following deployment settings:

| Setting | Value |
|---------|-------|
| **Branch** | `main` |
| **Root Directory** | `apps/api` |
| **Instance Size** | Shared (free tier) |

Back4app will detect the `Dockerfile` in `apps/api/` and build the container automatically. The Dockerfile handles everything — install deps, compile TypeScript, and start the server. No separate build/start commands needed.

### 2.3 Set Environment Variables
In the Back4app dashboard → **Settings** → **Environment Variables**:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `MONGO_URI` | Your MongoDB Atlas connection string |
| `JWT_ACCESS_SECRET` | *(generate below)* |
| `JWT_REFRESH_SECRET` | *(generate below)* |
| `FIELD_ENCRYPTION_KEY` | *(generate below)* |
| `CLIENT_ORIGIN` | `https://yourdomain.com` (your shared hosting URL) |
| `BCRYPT_ROUNDS` | `12` |

Generate strong secrets locally:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2.4 Deploy
Back4app auto-deploys on every push to `main`. Click **Deploy** to trigger the first deployment. After deployment, note the **App URL** (e.g., `https://shalvinat-api.xxxxx.back4app.io`).

### 2.5 Seed the database (one-time)
You can run the seed script from your local machine pointing at your MongoDB Atlas:
```bash
cd apps/api
set MONGO_URI=mongodb+srv://shalvinat:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/shalvinat_hms?retryWrites=true&w=majority
npm run seed
```

This creates 10 demo users (one per role) with password `Shalvinat@2026!`.

---

## 3. Shared Hosting (Frontend)

### 3.1 Build locally
```bash
cd apps/web
npm install
npm run build
```

### 3.2 Edit the API URL config
Open `dist/web/browser/config.json` and set your Back4app URL:
```json
{
  "apiBaseUrl": "https://shalvinat-api.xxxxx.back4app.io/api",
  "appName": "Shalvinat HMS"
}
```

### 3.3 Upload via FTP
Upload everything from `dist/web/browser/` to your `public_html/` folder:

```
public_html/
├── .htaccess          ← SPA routing (rename from htaccess if needed)
├── config.json        ← API URL config
├── index.html
├── favicon.ico
├── logo.jpeg
├── shalvinat-mark.svg
├── main-*.js
└── styles-*.css
```

**Important:** If your host uses a subfolder (e.g., `public_html/shalvinat/`), change `<base href="/">` to `<base href="/shalvinat/">` in `index.html` before uploading.

### 3.4 Seed the database (one-time)
Run this from your local machine (or use Back4app console):
```bash
cd apps/api
MONGO_URI="mongodb+srv://..." npm run seed
```

### 3.5 Test
- Open `https://yourdomain.com` — you should see the login page
- Login with `director@shalvinat.local` / `Shalvinat@2026!`
- **Change the default password immediately**

---

## 4. Updating the App Later

```bash
# 1. Pull latest code
git pull

# 2. Rebuild frontend
cd apps/web && npm install && npm run build

# 3. Update config.json in dist/web/browser/

# 4. Upload dist/web/browser/ to shared hosting via FTP

# 5. Rebuild backend (Back4app auto-deploys on git push)
cd apps/api && npm run build
# Push to Back4app repo or re-upload
```

---

## 5. Custom Domain with HTTPS

If your shared hosting has cPanel with AutoSSL:
1. The `.htaccess` already has SSL redirect rules (uncomment them)
2. Ensure Back4app's `CLIENT_ORIGIN` includes `https://` prefix

---

## 6. File Uploads

Back4app's ephemeral filesystem means uploaded files are lost on redeploy. For production file storage, integrate with:

- **Cloudinary** — free tier 25GB, has Node SDK
- **AWS S3** — cheap storage, presigned URLs
- **Back4app Parse Files** — built-in if using Parse Server

The current `uploads/` directory works for testing but needs to be swapped to cloud storage for production.

---

## 7. Troubleshooting

| Problem | Fix |
|---------|-----|
| Blank page on shared host | Check `.htaccess` is present and `mod_rewrite` is enabled |
| API 404 errors | Verify `config.json` has correct `apiBaseUrl` |
| CORS errors in browser console | Add your domain to `CLIENT_ORIGIN` in Back4app env vars |
| Login fails | Run `npm run seed` to create demo accounts, check MONGO_URI |
| File upload fails | Upload limit on Back4app? Filesystem is ephemeral — use S3/Cloudinary |
| 403 on file download | Only doctors/directors/uploader can download — check roles |
| Google Fonts don't load | Browser may be blocking external fonts; add `Content-Security-Policy` header |
