# fetch. — Media Downloader

Download audio/video from YouTube, Twitter, Instagram, TikTok, SoundCloud and 1000+ sites.

## Tech Stack
- **Backend:** Node.js + Express
- **Downloader:** yt-dlp + ffmpeg
- **Frontend:** Vanilla HTML/CSS/JS (no build step)

---

## 🚀 Deploy to Railway (Recommended — Free tier available)

1. Push this repo to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/media-downloader.git
   git push -u origin main
   ```

2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**

3. Select your repository — Railway auto-detects the Dockerfile and deploys.

4. Your app will be live at `https://your-app.up.railway.app` in ~2 minutes.

> Railway gives you $5/month free credit — plenty for personal use.

---

## 🚀 Deploy to Render (Also Free)

1. Push to GitHub (same steps as above)

2. Go to [render.com](https://render.com) → **New** → **Web Service**

3. Connect your GitHub repo

4. Set these settings:
   - **Environment:** Docker
   - **Instance Type:** Free

5. Click **Deploy** — done!

---

## 💻 Run Locally

**Prerequisites:** Node.js 18+, `yt-dlp`, and `ffmpeg` installed on your system.

Install yt-dlp:
```bash
# macOS
brew install yt-dlp ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp

# Windows — download from https://github.com/yt-dlp/yt-dlp/releases
```

Then run:
```bash
npm install
npm start
# Open http://localhost:3000
```

---

## Notes
- Downloaded files are auto-deleted 15 minutes after creation
- For personal use only — respect copyright laws
- Some platforms may require cookies for age-restricted content
