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

// 이미지 업로드 설정
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

// 이미지 업로드 (최적화 설정 포함)
app.post('/upload', upload.single('image'), async (req, res) => {
  const filename = req.file.filename;
  const filePath = path.join(req.file.destination, req.file.filename); // 서버에 저장된 파일 경로

  try {
    // Cloudinary로 이미지 업로드 (최적화 옵션 추가)
    const result = await cloudinary.uploader.upload(filePath, {
      transformation: [
        { width: 500, height: 500, crop: 'fill', quality: 'auto' } // 최적화: 크기와 품질 자동 설정
      ]
    });
    
    // Cloudinary에서 반환된 secure_url을 클라이언트에 전달
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
    if (err) return res.json([]);
    const images = files.map(f => ({
      url: `/uploads/${req.params.page}/${f}`,
      filename: f
    }));
    res.json(images);
  });
});

// 이미지 삭제 (Cloudinary에서 삭제)
app.post('/delete', (req, res) => {
  const { filename } = req.body; // 클라이언트가 전달한 filename
  if (!filename) {
    return res.status(400).json({ error: '잘못된 요청: filename이 없습니다.' });
  }

  const filePath = path.join(UPLOAD_DIR, getPageFolder(req.body.page), filename);

  // Cloudinary에서 이미지 삭제
  cloudinary.uploader.destroy(filename, (error, result) => {
    if (error) {
      console.log('Cloudinary 삭제 실패:', error);
      return res.status(500).json({ error: 'Cloudinary 삭제 실패', detail: error.message });
    }

    // 파일 시스템에서 이미지 삭제
    fs.unlink(filePath, (err) => {
      if (err) {
        console.log('파일 삭제 실패:', err);
        return res.status(500).json({ error: '파일 삭제 실패', detail: err.message });
      }

      console.log('Cloudinary 삭제 성공:', result);
      res.sendStatus(200); // 삭제 성공시 HTTP 200 반환
    });
  });
});

// **정적 파일 서빙은 마지막에!**
app.use(express.static('public'));
app.use('/uploads', express.static(UPLOAD_DIR));

app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
