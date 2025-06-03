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

// 미들웨어
app.use(cors());
app.use(express.json());

// ✅ 정적 파일 서비스 설정
app.use(express.static(path.join(__dirname, 'public')));

// ✅ 루트 경로 접근 시 index.html 반환
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// uploads 폴더 자동 생성
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// multer 설정
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

// ✅ 이미지 업로드
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

// ✅ 이미지 목록 조회 (클라이언트에서 사용)
app.get('/images/:page', (req, res) => {
  const pageDir = path.join(UPLOAD_DIR, req.params.page);
  ensureDir(pageDir);

  fs.readdir(pageDir, (err, files) => {
    if (err || !files.length) return res.json([]);

    res.json(
      files.map(f => ({
        filename: f,
        url: `/uploads/${req.params.page}/${f}` // fallback 용
      }))
    );
  });
});

// ✅ 이미지 삭제
app.post('/delete', (req, res) => {
  const { filename, page } = req.body;
  if (!filename || !page) return res.status(400).json({ error: 'filename/page required' });

  const filePath = path.join(UPLOAD_DIR, page, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });

  fs.unlink(filePath, err => {
    if (err) return res.status(500).json({ error: 'File delete failed' });
    res.status(200).json({ message: 'File deleted' });
  });
});

// ✅ 서버 시작
app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
});
