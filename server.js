const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// CORS 설정: 모든 도메인에서의 요청을 허용하도록 설정
app.use(cors({
  origin: '*',  // 모든 출처에서의 요청을 허용
  methods: ['GET', 'POST', 'PUT', 'DELETE'],  // 허용되는 메서드들
  allowedHeaders: ['Content-Type', 'Authorization']  // 허용되는 헤더들
}));

// Cloudinary 설정
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// 기본 경로 처리 (기본 경로에 대해 응답)
app.get('/', (req, res) => {
  res.send('Hello, world!');
});

// 이미지 업로드 설정 (폴더와 파일 이름 관리)
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

// 이미지 업로드 처리
app.post('/upload', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '파일이 업로드되지 않았습니다.' });
  }

  const filename = req.file.filename;
  const filePath = path.join(req.file.destination, filename);

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      transformation: [{ width: 500, height: 500, crop: 'fill', quality: 'auto' }]
    });

    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(`파일 삭제 실패: ${filePath}`, err);
        res.status(500).json({ error: '서버 파일 삭제 실패' });
      } else {
        console.log(`파일 삭제 성공: ${filePath}`);
      }
    });

    res.json({ filename, cloudinary_url: result.secure_url });
  } catch (error) {
    console.error("Cloudinary 업로드 실패:", error);
    res.status(500).json({ error: 'Cloudinary 업로드 실패', detail: error.message });
  }
});

// 이미지 목록 조회
app.get('/images/:page', (req, res) => {
  const pageDir = path.join(UPLOAD_DIR, String(req.params.page));
  ensureDir(pageDir);

  fs.readdir(pageDir, (err, files) => {
    if (err) {
      console.error(`디렉토리 읽기 실패: ${pageDir}`, err);
      return res.status(500).json({ error: '디렉토리 읽기 실패', detail: err.message });
    }

    const imageFiles = files.filter(file => file.match(/\.(jpg|jpeg|png|gif)$/));
    res.json(imageFiles.map(f => ({
      url: `/uploads/${req.params.page}/${f}`,
      filename: f
    })));
  });
});

// 이미지 삭제
app.post('/delete', (req, res) => {
  const { filename, page } = req.body;

  if (!filename || !page) {
    return res.status(400).json({ error: '파일명 및 페이지 정보가 필요합니다.' });
  }

  const filePath = path.join(UPLOAD_DIR, page, filename);

  fs.unlink(filePath, (err) => {
    if (err) {
      console.error(`파일 삭제 실패: ${filePath}`, err);
      return res.status(500).json({ error: '파일 삭제 실패', detail: err.message });
    }
    console.log(`파일 삭제 성공: ${filePath}`);
    res.status(200).json({ message: '파일 삭제 성공' });
  });
});

// 서버 실행
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
});
