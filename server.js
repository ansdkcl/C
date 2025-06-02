// ✅ 서버 코드 (삭제 경로 타입 문제 수정 포함)

const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const UPLOAD_DIR = path.join(__dirname, 'uploads');

app.use(express.static('public'));
app.use('/uploads', express.static(UPLOAD_DIR));
app.use(express.json());

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const page = req.query.page;
    const pageDir = path.join(UPLOAD_DIR, String(page));
    ensureDir(pageDir);
    cb(null, pageDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}_${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

app.post('/upload', upload.single('image'), (req, res) => {
  const page = req.query.page;
  const filename = req.file.filename;
  res.json({ filename });
});

app.get('/images/:page', (req, res) => {
  const pageDir = path.join(UPLOAD_DIR, String(req.params.page));
  ensureDir(pageDir);

  fs.readdir(pageDir, (err, files) => {
    if (err) return res.json([]);
    const images = files.map(f => ({
      url: `/uploads/${req.params.page}/${f}`,
      filename: f
    }));
    res.json(images);
  });
});

app.post('/delete', (req, res) => {
  const { page, filename } = req.body;
  const filePath = path.join(UPLOAD_DIR, String(page), filename);

  console.log('🧹 삭제 요청 경로:', filePath);
  if (!fs.existsSync(filePath)) {
    console.warn('⚠️ 삭제 대상 파일이 존재하지 않음:', filePath);
    return res.status(404).json({ error: '파일 없음' });
  }

  fs.unlink(filePath, (err) => {
    if (err) {
      console.error('❌ 삭제 실패:', err.message);
      return res.status(500).json({ error: '삭제 실패', detail: err.message });
    }
    console.log('✅ 삭제 성공:', filename);
    res.sendStatus(200);
  });
});

app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});