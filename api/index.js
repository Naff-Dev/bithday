require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets from public directory
app.use(express.static(path.join(__dirname, '../public')));

const UCAPAN_FILE = path.join(__dirname, '../public/data/ucapan.json');
const UPLOADS_DIR = path.join(__dirname, '../public/uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage for uploaded photos, videos, and voice notes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    let ext = path.extname(file.originalname);
    if (!ext) {
      if (file.mimetype.startsWith('image/')) ext = '.webp';
      else if (file.mimetype.startsWith('video/')) ext = '.mp4';
      else if (file.mimetype.startsWith('audio/')) ext = '.webm';
      else ext = '.bin';
    }
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max file size
});

// API endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Sayang website running on Express & Vercel ♡',
    timestamp: new Date().toISOString()
  });
});

// Access status based on NODE_ENV and UNLOCK_DATE
app.get('/api/access-status', (req, res) => {
  const env = (process.env.NODE_ENV || 'development').toLowerCase();
  const unlockDateStr = process.env.UNLOCK_DATE || '2026-11-17';
  const now = new Date();
  const unlockDate = new Date(unlockDateStr + 'T00:00:00+07:00');
  const isPast = now >= unlockDate;

  res.json({
    env,
    unlockDate: unlockDateStr,
    isPastUnlockDate: isPast
  });
});

// Verify secret password (e.g. Tanggal Jadian: 19 November 2023 -> 19112023)
app.post('/api/verify-access', (req, res) => {
  const { password } = req.body;
  const correctPassword = process.env.ACCESS_PASSWORD || '19112023';

  const normalize = str => (str || '').toString().replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

  if (normalize(password) === normalize(correctPassword)) {
    return res.json({ success: true, message: 'Sandi tepat! Selamat datang sayang ♡' });
  } else {
    return res.status(401).json({
      success: false,
      message: 'Sandi belum tepat. Coba ingat tanggal jadian kita ya ♡'
    });
  }
});

app.get('/api/ucapan', (req, res) => {
  try {
    if (fs.existsSync(UCAPAN_FILE)) {
      const data = fs.readFileSync(UCAPAN_FILE, 'utf8');
      return res.json(JSON.parse(data));
    }
    return res.json([]);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to read ucapan data' });
  }
});

app.post('/api/ucapan', upload.single('file'), (req, res) => {
  try {
    const { nama, hubungan, tipe, pesan } = req.body;
    let media = req.body.media || '';

    if (req.file) {
      // Store relative path so public server can serve it
      media = 'uploads/' + req.file.filename;
    }

    if (!nama || !pesan) {
      return res.status(400).json({ error: 'Nama dan pesan wajib diisi' });
    }
    let list = [];
    if (fs.existsSync(UCAPAN_FILE)) {
      list = JSON.parse(fs.readFileSync(UCAPAN_FILE, 'utf8'));
    }
    const newItem = {
      id: 'u' + (Date.now()),
      nama: nama.trim(),
      hubungan: hubungan ? hubungan.trim() : 'Sahabat',
      tipe: tipe || 'text',
      media: media || '',
      durasi: req.body.durasi || '',
      pesan: pesan.trim(),
      waktu: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    };
    list.unshift(newItem);
    fs.writeFileSync(UCAPAN_FILE, JSON.stringify(list, null, 2), 'utf8');
    return res.status(201).json(newItem);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to save ucapan: ' + err.message });
  }
});

// Route for separate ucapan page
app.get('/ucapan', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/ucapan.html'));
});

// Fallback to index.html for all other routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start local server when run directly
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

module.exports = app;

