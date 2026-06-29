const express = require("express");
const { execFile, exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 3000;
const DOWNLOADS_DIR = path.join(__dirname, "downloads");

// Ensure downloads directory exists
if (!fs.existsSync(DOWNLOADS_DIR)) fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Clean up old files (older than 15 minutes) to save disk space
function cleanOldFiles() {
  const files = fs.readdirSync(DOWNLOADS_DIR);
  const now = Date.now();
  files.forEach((file) => {
    const filePath = path.join(DOWNLOADS_DIR, file);
    const stat = fs.statSync(filePath);
    if (now - stat.mtimeMs > 15 * 60 * 1000) {
      fs.unlinkSync(filePath);
    }
  });
}

// Check if yt-dlp is installed
function checkYtDlp() {
  return new Promise((resolve) => {
    exec("yt-dlp --version", (err) => resolve(!err));
  });
}

// Get video info (title, formats)
app.post("/api/info", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL is required" });

  const ytDlpAvailable = await checkYtDlp();
  if (!ytDlpAvailable) {
    return res.status(500).json({
      error: "yt-dlp is not installed on this server. See README for setup.",
    });
  }

  execFile(
    "yt-dlp",
    ["--dump-json", "--no-playlist", url],
    { timeout: 30000 },
    (err, stdout, stderr) => {
      if (err) {
        return res.status(400).json({
          error: "Could not fetch video info. Check the URL and try again.",
          detail: stderr?.slice(0, 300),
        });
      }
      try {
        const info = JSON.parse(stdout);
        res.json({
          title: info.title,
          thumbnail: info.thumbnail,
          duration: info.duration_string || formatDuration(info.duration),
          uploader: info.uploader || info.channel,
          platform: info.extractor_key,
          formats: getFormats(info),
        });
      } catch {
        res.status(500).json({ error: "Failed to parse video info" });
      }
    }
  );
});

// Download endpoint
app.post("/api/download", async (req, res) => {
  const { url, format, type } = req.body; // type: "audio" | "video"
  if (!url) return res.status(400).json({ error: "URL is required" });

  cleanOldFiles();

  const jobId = uuidv4();
  const outputTemplate = path.join(DOWNLOADS_DIR, `${jobId}.%(ext)s`);

  let args;
  if (type === "audio") {
    args = [
      "--no-playlist",
      "-x",
      "--audio-format",
      format || "mp3",
      "--audio-quality",
      "0",
      "-o",
      outputTemplate,
      url,
    ];
  } else {
    // video
    const formatStr = format || "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best";
    args = ["--no-playlist", "-f", formatStr, "--merge-output-format", "mp4", "-o", outputTemplate, url];
  }

  execFile("yt-dlp", args, { timeout: 120000 }, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({
        error: "Download failed. The URL may not be supported.",
        detail: stderr?.slice(0, 300),
      });
    }

    // Find the downloaded file
    const files = fs.readdirSync(DOWNLOADS_DIR).filter((f) => f.startsWith(jobId));
    if (!files.length) {
      return res.status(500).json({ error: "Download completed but file not found." });
    }

    const fileName = files[0];
    const filePath = path.join(DOWNLOADS_DIR, fileName);
    const ext = path.extname(fileName);

    res.json({ fileId: jobId, filename: `download${ext}`, ext });
  });
});

// Serve the file
app.get("/api/file/:fileId", (req, res) => {
  const { fileId } = req.params;
  // Sanitize fileId — only allow UUID format
  if (!/^[0-9a-f-]{36}$/.test(fileId)) {
    return res.status(400).json({ error: "Invalid file ID" });
  }

  const files = fs.readdirSync(DOWNLOADS_DIR).filter((f) => f.startsWith(fileId));
  if (!files.length) return res.status(404).json({ error: "File not found or expired" });

  const filePath = path.join(DOWNLOADS_DIR, files[0]);
  const ext = path.extname(files[0]);
  const mimeTypes = {
    ".mp3": "audio/mpeg",
    ".m4a": "audio/mp4",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".opus": "audio/opus",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mkv": "video/x-matroska",
  };

  res.setHeader("Content-Type", mimeTypes[ext] || "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="download${ext}"`);
  res.sendFile(filePath, (err) => {
    if (!err) {
      // Delete after sending
      setTimeout(() => {
        try { fs.unlinkSync(filePath); } catch {}
      }, 5000);
    }
  });
});

// Health check
app.get("/health", (req, res) => res.json({ status: "ok" }));

function formatDuration(seconds) {
  if (!seconds) return "Unknown";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

function getFormats(info) {
  const videoFormats = [];
  const seen = new Set();
  const formats = info.formats || [];

  for (const f of formats) {
    if (f.vcodec !== "none" && f.acodec !== "none" && f.ext === "mp4" && f.height) {
      const label = `${f.height}p`;
      if (!seen.has(label)) {
        seen.add(label);
        videoFormats.push({ label, value: f.format_id, height: f.height });
      }
    }
  }

  videoFormats.sort((a, b) => b.height - a.height);
  return {
    video: videoFormats.length ? videoFormats : [{ label: "Best Quality", value: "best" }],
    audio: [
      { label: "MP3 (Best)", value: "mp3" },
      { label: "M4A", value: "m4a" },
      { label: "WAV", value: "wav" },
      { label: "Opus", value: "opus" },
    ],
  };
}

app.listen(PORT, () => console.log(`🎬 Media Downloader running on http://localhost:${PORT}`));
