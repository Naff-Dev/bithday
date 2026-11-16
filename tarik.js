/**
 * tarik.js
 * Script mandiri untuk menarik data ucapan (database JSON dan file unggahan
 * foto/video/suara), mengompresnya menjadi ZIP, dan mengirimkannya ke Telegram.
 * 
 * Penggunaan:
 *   node tarik.js
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

// Konfigurasi Bot Telegram langsung di dalam script
const BOT_TOKEN = '7591478527:AAEMhdaoCbyC_AkqCzdca4iBbngUqBONxSk';
const CHAT_ID = '7028129028';

// Target berkas ucapan sesuai arsitektur penyimpanan proyek:
// 1. Teks ucapan & data relasi: public/data/ucapan.json
// 2. Berkas foto, video, & rekaman suara: public/uploads/
// (Folder public/galeri TIDAK diikutsertakan sesuai permintaan)
const DB_FILE = path.join(__dirname, 'public/data/ucapan.json');
const UPLOADS_DIR = path.join(__dirname, 'public/uploads');

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

async function createBackupZip(outputZipPath) {
  console.log('📦 Sedang mengompres database ucapan dan berkas uploads ke dalam .zip...');

  // Pastikan folder uploads ada (jika belum ada, buatkan)
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  // Siapkan item yang akan di-zip
  const itemsToZip = [];
  if (fs.existsSync(DB_FILE)) itemsToZip.push("'public/data/ucapan.json'");
  if (fs.existsSync(UPLOADS_DIR)) itemsToZip.push("'public/uploads'");

  if (itemsToZip.length === 0) {
    throw new Error('Tidak ada data ucapan atau folder uploads yang ditemukan.');
  }

  // 1. Coba kompresi native dengan PowerShell (Windows)
  try {
    const psCmd = `powershell -NoProfile -Command "Compress-Archive -Path ${itemsToZip.join(', ')} -DestinationPath '${outputZipPath}' -Force"`;
    execSync(psCmd, { cwd: __dirname, stdio: 'pipe' });
    if (fs.existsSync(outputZipPath) && fs.statSync(outputZipPath).size > 0) {
      return;
    }
  } catch (err) {}

  // 2. Fallback kompresi native dengan tar / zip (Linux / macOS)
  try {
    const tarCmd = `tar -a -c -f "${outputZipPath}" public/data/ucapan.json public/uploads`;
    execSync(tarCmd, { cwd: __dirname, stdio: 'pipe' });
    if (fs.existsSync(outputZipPath) && fs.statSync(outputZipPath).size > 0) {
      return;
    }
  } catch (err) {
    throw new Error(`Gagal membuat berkas zip: ${err.message}`);
  }

  if (!fs.existsSync(outputZipPath)) {
    throw new Error('Gagal membuat berkas zip.');
  }
}

async function sendViaFetch(zipPath, caption) {
  const fileBuffer = fs.readFileSync(zipPath);
  const fileBlob = new Blob([fileBuffer], { type: 'application/zip' });
  const formData = new FormData();
  formData.append('chat_id', CHAT_ID);
  formData.append('caption', caption);
  formData.append('parse_mode', 'Markdown');
  formData.append('document', fileBlob, path.basename(zipPath));

  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
    method: 'POST',
    body: formData
  });

  const json = await res.json();
  if (!res.ok || !json.ok) {
    throw new Error(json.description || 'Gagal mengirim berkas via fetch');
  }
  return json;
}

function sendViaCurl(zipPath, caption) {
  return new Promise((resolve, reject) => {
    // Cross-platform: gunakan 'curl.exe' di Windows, 'curl' di Linux/VPS
    const curlBin = process.platform === 'win32' ? 'curl.exe' : 'curl';

    const args = [
      '-s',
      '-S',
      '-F', `chat_id=${CHAT_ID}`,
      '-F', `caption=${caption}`,
      '-F', `parse_mode=Markdown`,
      '-F', `document=@${zipPath}`,
      `https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`
    ];

    const child = spawn(curlBin, args);
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', chunk => { stdout += chunk.toString(); });
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });

    child.on('close', code => {
      if (code !== 0) {
        return reject(new Error(`curl error (code ${code}): ${stderr || stdout}`));
      }
      try {
        const json = JSON.parse(stdout);
        if (!json.ok) {
          return reject(new Error(json.description || 'Gagal mengirim berkas ke Telegram'));
        }
        resolve(json);
      } catch (err) {
        reject(new Error(`Respon Telegram tidak valid: ${stdout}`));
      }
    });

    child.on('error', err => reject(err));
  });
}

async function sendToTelegram(zipPath, caption) {
  // Coba metode 1: Native Node.js fetch (cross-platform untuk Linux VPS & Windows)
  try {
    return await sendViaFetch(zipPath, caption);
  } catch (fetchErr) {
    console.warn(`Catatan: fetch gagal (${fetchErr.message}), mencoba metode curl...`);
    // Fallback metode 2: curl cross-platform
    return await sendViaCurl(zipPath, caption);
  }
}

async function main() {
  console.log('==================================================');
  console.log('🚀 MEMULAI TARIK DATA UCAPAN & BACKUP TELEGRAM');
  console.log('==================================================');
  console.log(`🤖 Bot Token : ${BOT_TOKEN.substring(0, 10)}...`);
  console.log(`💬 Chat ID   : ${CHAT_ID}`);

  const timestamp = getFormattedTimestamp();
  const zipFileName = `backup_ucapan_${timestamp}.zip`;
  const zipPath = path.join(__dirname, zipFileName);

  try {
    // 1. Kompres data ucapan (JSON + Uploads)
    await createBackupZip(zipPath);
    const size = fs.statSync(zipPath).size;
    console.log(`✅ Berhasil membuat zip: ${zipFileName} (${formatBytes(size)})`);

    // 2. Baca ringkasan isi database
    let totalUcapan = 0;
    let fotoCount = 0;
    let videoCount = 0;
    let suaraCount = 0;

    try {
      if (fs.existsSync(DB_FILE)) {
        const list = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        if (Array.isArray(list)) {
          totalUcapan = list.length;
          fotoCount = list.filter(u => u.tipe === 'photo').length;
          videoCount = list.filter(u => u.tipe === 'video').length;
          suaraCount = list.filter(u => u.tipe === 'voice').length;
        }
      }
    } catch (e) {}

    const caption = 
      `📦 *Backup Kotak Ucapan & Kenangan Sayang*\n\n` +
      `📅 *Waktu:* ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB\n` +
      `📊 *Ukuran Zip:* ${formatBytes(size)}\n` +
      `💌 *Total Ucapan:* ${totalUcapan} pesan\n` +
      `🖼️ *Foto:* ${fotoCount} | 🎥 *Video:* ${videoCount} | 🎙️ *Suara:* ${suaraCount}\n` +
      `📁 *Isi:* \`ucapan.json\` (teks) & folder \`uploads/\` (media pengirim)`;

    // 3. Kirim ke Telegram
    console.log(`📤 Mengirimkan ${zipFileName} ke Telegram...`);
    const result = await sendToTelegram(zipPath, caption);
    console.log(`🎉 SUKSES! Berkas telah berhasil terkirim ke Telegram.`);
    console.log(`📄 ID Pesan : ${result.result.message_id}`);
    console.log(`👤 Penerima : ${result.result.chat.first_name} (@${result.result.chat.username || CHAT_ID})`);

  } catch (error) {
    console.error('❌ Terjadi kesalahan:', error.message);
    process.exitCode = 1;
  } finally {
    // 4. Bersihkan file zip sementara
    if (fs.existsSync(zipPath)) {
      try {
        fs.unlinkSync(zipPath);
        console.log(`🧹 Berkas sementara ${zipFileName} telah dibersihkan.`);
      } catch (e) {}
    }
    console.log('==================================================');
  }
}

main();
