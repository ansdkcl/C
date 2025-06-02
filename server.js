// ✅ 서버 코드 (쿼리스트링 기반 업로드 대응)

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
    const pageDir = path.join(UPLOAD_DIR, page);
    ensureDir(pageDir);
    cb(null, pageDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});

const upload = multer({ storage });

app.post('/upload', upload.single('image'), (req, res) => {
  res.sendStatus(200);
});

app.get('/images/:page', (req, res) => {
  const pageDir = path.join(UPLOAD_DIR, req.params.page);
  ensureDir(pageDir);

  fs.readdir(pageDir, (err, files) => {
    if (err) return res.json([]);
    const urls = files.map(f => `/uploads/${req.params.page}/${f}`);
    res.json(urls);
  });
});

app.post('/delete', (req, res) => {
  const { page, filename } = req.body;
  const filePath = path.join(UPLOAD_DIR, page, filename);

  fs.unlink(filePath, (err) => {
    if (err) {
      console.error('삭제 실패:', err);
      return res.sendStatus(500);
    }
    res.sendStatus(200);
  });
});

app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});