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

// 폴더가 없으면 자동 생성
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const page = String(req.query.page); // 예: "page-1"
    const pageDir = path.join(UPLOAD_DIR, page);
    ensureDir(pageDir); // <--- 여기가 핵심!
    cb(null, pageDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}_${file.originalname}`;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

app.post('/upload', upload.single('image'), (req, res) => {
  const filename = req.file.filename;
  res.json({ filename });
});

app.get('/images/:page', (req, res) => {
  const pageDir = path.join(UPLOAD_DIR, String(req.params.page));
  ensureDir(pageDir); // <--- 하위폴더가 없으면 여기서도 생성!
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
  let { page, filename } = req.body;
  if (!page || !filename) return res.status(400).json({ error: '잘못된 요청' });
  const filePath = path.join(UPLOAD_DIR, page, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: '파일 없음' });
  fs.unlink(filePath, (err) => {
    if (err) return res.status(500).json({ error: '삭제 실패', detail: err.message });
    res.sendStatus(200);
  });
});

app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
