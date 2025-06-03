require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// Cloudinary 설정
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const page = String(req.query.page);
    const pageDir = path.join(UPLOAD_DIR, page);
    ensureDir(pageDir);
    cb(null, pageDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}_${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

app.post('/upload', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const filename = req.file.filename;
  const filePath = path.join(req.file.destination, filename);

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      transformation: [{ width: 500, height: 500, crop: 'fill', quality: 'auto' }]
    });

    fs.unlink(filePath, () => {}); // 임시 파일 삭제
    res.json({ filename, cloudinary_url: result.secure_url });
  } catch (err) {
    console.error('Cloudinary 업로드 실패:', err);
    res.status(500).json({ error: 'Cloudinary upload failed', detail: err.message });
  }
});

app.get('/images/:page', (req, res) => {
  const pageDir = path.join(UPLOAD_DIR, req.params.page);
  ensureDir(pageDir);

  fs.readdir(pageDir, (err, files) => {
    if (err || !files.length) return res.json([]);

    res.json(
      files.map(f => ({
        filename: f,
        url: `/uploads/${req.params.page}/${f}` // fallback 경로
      }))
    );
  });
});

app.post('/delete', (req, res) => {
  const { filename, page } = req.body;
  const filePath = path.join(UPLOAD_DIR, page, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });

  fs.unlink(filePath, err => {
    if (err) return res.status(500).json({ error: 'File delete failed' });
    res.status(200).json({ message: 'File deleted' });
  });
});

app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중 http://localhost:${PORT}`);
});
