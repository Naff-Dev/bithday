/**
 * tarik.js
 * Script mandiri untuk mengompres database dan seluruh berkas public menjadi zip,
 * lalu mengirimkannya langsung ke Telegram melalui Telegram Bot API.
 * 
 * Penggunaan:
 *   node tarik.js
 * atau dengan argumen:
 *   node tarik.js <BOT_TOKEN> <CHAT_ID>
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BOT_TOKEN = process.argv[2] || process.env.TELEGRAM_BOT_TOKEN || '7591478527:AAEMhdaoCbyC_AkqCzdca4iBbngUqBONxSk';
const CHAT_ID = process.argv[3] || process.env.TELEGRAM_CHAT_ID || '7028129028';

// Target direktori yang akan di-backup (database & seluruh berkas media/halaman)
const TARGET_DIR = path.join(__dirname, 'public');
const DB_FILE = path.join(__dirname, 'public/data/ucapan.json');

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
}

function getFormattedTimestamp() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `${y}${m}${d}_${h}${min}${s}`;
}

async function createZip(outputZipPath) {
  console.log('📦 Sedang mengompres berkas public & database ke dalam format .zip...');

  // Metode 1: bsdtar / tar (tersedia secara native di Windows 10/11 & Linux)
  try {
    execSync(`tar -a -c -f "${outputZipPath}" public`, { cwd: __dirname, stdio: 'pipe' });
    if (fs.existsSync(outputZipPath) && fs.statSync(outputZipPath).size > 0) {
      return;
    }
  } catch (err) {
    // Fallback ke PowerShell jika tar tidak tersedia
  }

  // Metode 2: PowerShell Compress-Archive (Windows)
  try {
    const psCmd = `powershell -NoProfile -Command "Compress-Archive -Path 'public' -DestinationPath '${outputZipPath}' -Force"`;
    execSync(psCmd, { cwd: __dirname, stdio: 'pipe' });
    if (fs.existsSync(outputZipPath) && fs.statSync(outputZipPath).size > 0) {
      return;
    }
  } catch (err) {
    throw new Error(`Gagal membuat berkas zip: ${err.message}`);
  }

  if (!fs.existsSync(outputZipPath)) {
    throw new Error('Gagal membuat berkas zip: Berkas keluaran tidak ditemukan.');
  }
}

async function sendToTelegram(zipPath) {
  const stats = fs.statSync(zipPath);
  const fileSizeStr = formatBytes(stats.size);
  const zipFileName = path.basename(zipPath);

  // Periksa batas Telegram Bot API (maksimal 50MB)
  if (stats.size > 50 * 1024 * 1024) {
    console.warn(`⚠️ Peringatan: Ukuran berkas (${fileSizeStr}) mendekati/melebihi batas bot Telegram (50MB).`);
  }

  console.log(`📤 Mengirim berkas ${zipFileName} (${fileSizeStr}) ke Telegram...`);

  // Hitung jumlah ucapan jika ada
  let ucapanCount = 0;
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      if (Array.isArray(data)) ucapanCount = data.length;
    }
  } catch (e) {}

  const caption = 
    `📦 *Backup Data & File Website Sayang*\n\n` +
    `📅 *Waktu:* ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB\n` +
    `📊 *Ukuran Zip:* ${fileSizeStr}\n` +
    `💌 *Jumlah Ucapan di DB:* ${ucapanCount} pesan\n` +
    `📁 *Isi Backup:* Folder \`public/\` (Database ucapan, foto, video, rekaman suara, galeri)`;

  const fileBuffer = fs.readFileSync(zipPath);
  const fileBlob = new Blob([fileBuffer], { type: 'application/zip' });

  const formData = new FormData();
  formData.append('chat_id', CHAT_ID);
  formData.append('caption', caption);
  formData.append('parse_mode', 'Markdown');
  formData.append('document', fileBlob, zipFileName);

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`;

  const response = await fetch(url, {
    method: 'POST',
    body: formData
  });

  const resJson = await response.json();

  if (!response.ok || !resJson.ok) {
    throw new Error(`Gagal mengirim ke Telegram: ${resJson.description || response.statusText}`);
  }

  return resJson;
}

async function main() {
  console.log('🚀 Memulai proses tarik data dan backup...');
  console.log(`🤖 Bot Token: ${BOT_TOKEN.substring(0, 10)}...`);
  console.log(`💬 Chat ID: ${CHAT_ID}`);

  if (!fs.existsSync(TARGET_DIR)) {
    console.error('❌ Folder public/ tidak ditemukan!');
    process.exit(1);
  }

  const timestamp = getFormattedTimestamp();
  const zipFileName = `backup_sayang_${timestamp}.zip`;
  const zipPath = path.join(__dirname, zipFileName);

  try {
    // 1. Buat zip
    await createZip(zipPath);
    const size = fs.statSync(zipPath).size;
    console.log(`✅ Berhasil membuat zip: ${zipFileName} (${formatBytes(size)})`);

    // 2. Kirim ke Telegram
    const result = await sendToTelegram(zipPath);
    console.log(`🎉 Berhasil terkirim ke Telegram! (Message ID: ${result.result.message_id})`);

  } catch (error) {
    console.error('❌ Terjadi kesalahan:', error.message);
    process.exitCode = 1;
  } finally {
    // 3. Bersihkan file zip sementara agar ruang disk tetap rapi
    if (fs.existsSync(zipPath)) {
      try {
        fs.unlinkSync(zipPath);
        console.log(`🧹 Berkas sementara ${zipFileName} telah dibersihkan.`);
      } catch (e) {}
    }
  }
}

main();
