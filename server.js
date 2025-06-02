const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

// 모든 요청을 무조건 콘솔에 찍음(진단용)
app.use((req, res, next) => {
  console.log('요청 들어옴:', req.method, req.url, req.body);
  next();
});

const multer = require('multer');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// 정적 파일 서빙
app.use(express.static('public'));
app.use('/uploads', express.static(UPLOAD_DIR));

// 이하 multer/라우터 등 원래 코드...

// 삭제 라우트 (꼭 static 미들웨어 밑에 둘 것)
app.post('/delete', (req, res) => {
  console.log('삭제 요청 도착:', req.body); // ← 반드시 추가!
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
