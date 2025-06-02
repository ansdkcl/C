const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const pageDir = path.join(__dirname, 'public/uploads', req.body.page);
    fs.mkdirSync(pageDir, { recursive: true });
    cb(null, pageDir);
  },
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

app.post('/upload', upload.single('image'), (req, res) => res.sendStatus(200));

app.get('/images/:page', (req, res) => {
  const dir = path.join(__dirname, 'public/uploads', req.params.page);
  if (!fs.existsSync(dir)) return res.json([]);
  const files = fs.readdirSync(dir).map(file => `/uploads/${req.params.page}/${file}`);
  res.json(files);
});

app.post('/delete', (req, res) => {
  const filePath = path.join(__dirname, 'public/uploads', req.body.page, req.body.filename);
  fs.unlink(filePath, () => res.sendStatus(200));
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));