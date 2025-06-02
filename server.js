const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 정적 파일 서빙
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 업로드 경로 설정
const tmpDir = path.join(__dirname, 'uploads/tmp');
fs.mkdirSync(tmpDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tmpDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// 이미지 업로드 처리
app.post('/upload', upload.single('image'), (req, res) => {
  const page = req.body.page || '1';
  const destDir = path.join(__dirname, 'uploads', `page-${page}`);
  fs.mkdirSync(destDir, { recursive: true });

  const destPath = path.join(destDir, req.file.filename);
  fs.renameSync(req.file.path, destPath);

  res.json({ success: true });
});

// 이미지 목록 반환
app.get('/images/:page', (req, res) => {
  const dir = path.join(__dirname, 'uploads', `page-${req.params.page}`);
  if (!fs.existsSync(dir)) return res.json([]);

  const files = fs.readdirSync(dir).map(f => `/uploads/page-${req.params.page}/${f}`);
  res.json(files);
});

// 이미지 삭제
app.post('/delete', (req, res) => {
  const { page, filename } = req.body;
  const filePath = path.join(__dirname, 'uploads', `page-${page}`, filename);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return res.json({ success: true });
  }

  res.status(404).json({ success: false });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
});
