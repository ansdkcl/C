let currentPage = 1;

const pageNum = document.getElementById('page-num');
const gallery = document.getElementById('gallery');
const fileInput = document.getElementById('fileInput');

// 이미지 로드
function loadImages(page) {
  fetch(`/images/${page}`)
    .then(res => res.json())
    .then(images => {
      gallery.innerHTML = '';
      images.forEach(src => {
        const img = document.createElement('img');
        img.src = src;
        img.classList.add('gallery-image', 'fade-in');

        img.addEventListener('click', () => {
          img.classList.toggle('zoomed');
        });

        img.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          const filename = src.split('/').pop();
          if (confirm('이 이미지를 삭제할까요?')) {
            fetch('/delete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ page: currentPage, filename })
            }).then(() => loadImages(currentPage));
          }
        });

        gallery.appendChild(img);
      });
    });
}

function updatePage(n) {
  currentPage = n;
  pageNum.textContent = currentPage;
  loadImages(currentPage);
}

function uploadFiles(files) {
  [...files].forEach(file => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('page', currentPage);
    fetch('/upload', {
      method: 'POST',
      body: formData
    }).then(() => loadImages(currentPage));
  });
}

// 썸네일 미리보기
let previewImg = null;
let previewImgCreated = false;
let lastMouseX = 0;
let lastMouseY = 0;

window.addEventListener('dragover', (e) => {
  e.preventDefault();
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;

  if (!previewImgCreated && e.dataTransfer.files.length > 0) {
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      previewImgCreated = true;
      const reader = new FileReader();
      reader.onload = (event) => {
        const imgWrapper = document.createElement('div');
        imgWrapper.style.position = 'fixed';
        imgWrapper.style.transform = `translate(${lastMouseX + 20}px, ${lastMouseY + 20}px)`;
        imgWrapper.style.width = '120px';
        imgWrapper.style.height = '120px';
        imgWrapper.style.borderRadius = '8px';
        imgWrapper.style.overflow = 'hidden';
        imgWrapper.style.zIndex = '9999';
        imgWrapper.style.pointerEvents = 'none';
        imgWrapper.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
        imgWrapper.style.transition = 'opacity 0.2s ease';
        imgWrapper.style.opacity = '0.9';

        const img = new Image();
        img.src = event.target.result;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        imgWrapper.appendChild(img);

        document.body.appendChild(imgWrapper);
        previewImg = imgWrapper;
      };
      reader.readAsDataURL(file);
    }
  }

  if (previewImg) {
    previewImg.style.transform = `translate(${lastMouseX + 20}px, ${lastMouseY + 20}px)`;
  }
});

window.addEventListener('dragleave', () => {
  if (previewImg) {
    previewImg.remove();
    previewImg = null;
    previewImgCreated = false;
  }
});

window.addEventListener('drop', (e) => {
  e.preventDefault();

  if (previewImg) {
    previewImg.style.transition = 'transform 0.4s ease, opacity 0.4s ease';
    previewImg.style.transform = 'translate(50vw, 50vh) scale(0.5)';
    previewImg.style.opacity = '0';

    setTimeout(() => {
      previewImg.remove();
      previewImg = null;
      previewImgCreated = false;
    }, 400);
  }

  if (e.dataTransfer.files.length > 0) {
    uploadFiles(e.dataTransfer.files);
  }
});

// 방향키 페이지 이동
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') updatePage(currentPage + 1);
  if (e.key === 'ArrowLeft' && currentPage > 1) updatePage(currentPage - 1);
});

// 초기 로딩
updatePage(currentPage);
