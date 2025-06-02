const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// CORS, JSON 파싱, 진단 로그
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log('요청 들어옴:', req.method, req.url, req.body);
  next();
});

// uploads 폴더 자동 생성
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log('폴더 생성:', dir);
  }
}

// 정적 파일 서빙 (항상 라우터 밑에 배치!)
// => 이거보다 "라우터 코드가 항상 위에" 있어야 함
// (아래로 내림!)

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

// 이미지 업로드
app.post('/upload', upload.single('image'), (req, res) => {
  const filename = req.file.filename;
  res.json({ filename });
});

// 이미지 목록
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

// 이미지 삭제
app.post('/delete', (req, res) => {
  console.log('삭제 요청 도착:', req.body);
  let { page, filename } = req.body;
  if (!page || !filename) return res.status(400).json({ error: '잘못된 요청' });

  const filePath = path.join(UPLOAD_DIR, page, filename);
  console.log('실제 삭제 시도 파일 경로:', filePath);
  console.log('존재여부:', fs.existsSync(filePath));

  if (!fs.existsSync(filePath)) {
    console.log('파일 없음:', filePath);
    return res.status(404).json({ error: '파일 없음' });
  }
  fs.unlink(filePath, (err) => {
    if (err) {
      console.log('삭제 실패:', err);
      return res.status(500).json({ error: '삭제 실패', detail: err.message });
    }
    console.log('삭제 성공:', filename);
    res.sendStatus(200);
  });
});


// **정적 파일 서빙은 마지막에!**
app.use(express.static('public'));
app.use('/uploads', express.static(UPLOAD_DIR));

app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
