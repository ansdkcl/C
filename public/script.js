let currentPage = 1;
const pageNum = document.getElementById('page-num');
const gallery = document.getElementById('gallery');
const fileInput = document.getElementById('fileInput');

function loadImages(page) {
  fetch(`/images/${page}`)
    .then(res => res.json())
    .then(images => {
      gallery.innerHTML = '';
      images.forEach(src => {
        const img = document.createElement('img');
        img.src = src;
        img.classList.add('gallery-image');
        img.addEventListener('click', () => img.classList.toggle('zoomed'));
        img.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          const filename = src.split('/').pop();
          if (confirm('삭제할까요?')) {
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

let previewImg;
let previewImgCreated = false;
let lastMouseX = 0;
let lastMouseY = 0;

window.addEventListener('dragover', (e) => {
  e.preventDefault();
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  if (!previewImgCreated && e.dataTransfer.files.length > 0) {
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    previewImgCreated = true;
    const reader = new FileReader();
    reader.onload = (event) => {
      const wrapper = document.createElement('div');
      wrapper.style.position = 'fixed';
      wrapper.style.transform = `translate(${lastMouseX + 20}px, ${lastMouseY + 20}px)`;
      wrapper.style.width = '120px';
      wrapper.style.height = '120px';
      wrapper.style.backgroundColor = '#111';
      wrapper.style.borderRadius = '8px';
      wrapper.style.overflow = 'hidden';
      wrapper.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
      wrapper.style.zIndex = '9999';
      wrapper.style.pointerEvents = 'none';

      const img = new Image();
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.src = event.target.result;
      wrapper.appendChild(img);
      document.body.appendChild(wrapper);
      previewImg = wrapper;
    };
    reader.readAsDataURL(file);
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
    previewImg.remove();
    previewImg = null;
    previewImgCreated = false;
  }
  if (e.dataTransfer.files.length > 0) {
    uploadFiles(e.dataTransfer.files);
  }
});

loadImages(currentPage);