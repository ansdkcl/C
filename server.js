// ✅ 서버에서 cloudinary_url 포함한 목록 관리용 JSON 캐시 파일 생성 방식 추가

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const DATA_DIR = path.join(__dirname, 'data');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getPageDataPath(page) {
  return path.join(DATA_DIR, `${page}.json`);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const page = String(req.query.page);
    const pageDir = path.join(UPLOAD_DIR, page);
    ensureDir(pageDir);
    cb(null, pageDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});
const upload = multer({ storage });

// ✅ 업로드 + cloudinary_url 캐싱
app.post('/upload', upload.single('image'), async (req, res) => {
  const page = String(req.query.page);
  const filename = req.file.filename;
  const filePath = path.join(req.file.destination, filename);

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      transformation: [{ width: 500, height: 500, crop: 'fill', quality: 'auto' }]
    });

    fs.unlink(filePath, () => {});

    ensureDir(DATA_DIR);
    const jsonPath = getPageDataPath(page);
    let pageData = [];
    if (fs.existsSync(jsonPath)) {
      pageData = JSON.parse(fs.readFileSync(jsonPath));
    }
    pageData.push({ filename, cloudinary_url: result.secure_url });
    fs.writeFileSync(jsonPath, JSON.stringify(pageData, null, 2));

    res.json({ filename, cloudinary_url: result.secure_url });
  } catch (err) {
    res.status(500).json({ error: 'Cloudinary upload failed', detail: err.message });
  }
});

// ✅ 이미지 목록 조회 (캐시된 cloudinary_url 반환)
app.get('/images/:page', (req, res) => {
  const jsonPath = getPageDataPath(req.params.page);
  if (fs.existsSync(jsonPath)) {
    const data = fs.readFileSync(jsonPath);
    res.json(JSON.parse(data));
  } else {
    res.json([]);
  }
});

// ✅ 삭제 시 캐시에서도 제거
app.post('/delete', (req, res) => {
  const { filename, page } = req.body;
  const jsonPath = getPageDataPath(page);
  const filePath = path.join(UPLOAD_DIR, page, filename);

  // 실제 파일 삭제 (남아있을 경우)
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  if (fs.existsSync(jsonPath)) {
    const list = JSON.parse(fs.readFileSync(jsonPath));
    const filtered = list.filter(item => item.filename !== filename);
    fs.writeFileSync(jsonPath, JSON.stringify(filtered, null, 2));
  }

  res.json({ message: 'Deleted' });
});

app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
});
