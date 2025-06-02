const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express(); // << 반드시 먼저!

app.use(cors()); // << 그리고 여기서부터 미들웨어

const PORT = process.env.PORT || 3000;

// ★ 꼭 프로젝트 루트 uploads로 경로 맞춰주기
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// static 설정
app.use(express.static('public'));
app.use('/uploads', express.static(UPLOAD_DIR));
app.use(express.json());

// ★ 폴더 자동 생성 함수
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log('폴더 생성:', dir);
  }
}

// multer 저장 경로에 폴더 자동 생성!
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const page = String(req.query.page); // "page-1" 등
    const pageDir = path.join(UPLOAD_DIR, page);
    ensureDir(pageDir); // ★ 반드시 호출!
    cb(null, pageDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}_${file.originalname}`;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// 업로드
app.post('/upload', upload.single('image'), (req, res) => {
  const filename = req.file.filename;
  res.json({ filename });
});

// 이미지 목록
app.get('/images/:page', (req, res) => {
  const pageDir = path.join(UPLOAD_DIR, String(req.params.page));
  ensureDir(pageDir); // ★ 폴더 없으면 생성!
  fs.readdir(pageDir, (err, files) => {
    if (err) return res.json([]);
    const images = files.map(f => ({
      url: `/uploads/${req.params.page}/${f}`,
      filename: f
    }));
    res.json(images);
  });
});

// 삭제
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
