let currentPage = 1;
const pageNum = document.getElementById('page-num');
const gallery = document.getElementById('gallery');
const fileInput = document.getElementById('fileInput');

function getPageFolder(n) {
  return `page-${n}`;
}

function getRects() {
  return Array.from(gallery.children).map(el => ({
    el,
    rect: el.getBoundingClientRect(),
    key: el.dataset.filename || el.src
  }));
}

function applyFLIP(beforeRects, afterRects) {
  afterRects.forEach(({ el, key }) => {
    const before = beforeRects.find(b => b.key === key);
    if (!before) return;
    const dx = before.rect.left - el.getBoundingClientRect().left;
    const dy = before.rect.top - el.getBoundingClientRect().top;
    if (dx || dy) {
      el.style.transition = 'none';
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      requestAnimationFrame(() => {
        el.style.transition = 'transform 0.5s cubic-bezier(0.4,0.2,0.2,1)';
        el.style.transform = 'translate(0, 0)';
      });
    }
  });
}

function fetchImagesAndRender(isPageChange = false) {
  const pageFolder = getPageFolder(currentPage);
  fetch(`/images/${pageFolder}?v=${Date.now()}`, { cache: 'no-store' })
    .then(res => res.json())
    .then(images => {
      renderImages(images, isPageChange);
    });
}

function renderImages(images, isPageChange = false) {
  const beforeRects = getRects();
  const filenames = new Set();

  images.forEach((image, i) => {
    filenames.add(image.filename);
    let img = document.querySelector(`img[data-filename="${image.filename}"]`);

    // Cloudinary URL 우선 적용
    const imgUrl = image.cloudinary_url || image.url;

    if (!img) {
      img = document.createElement('img');
      img.className = 'gallery-image';
      img.src = imgUrl + `?v=${Date.now()}`;
      img.dataset.filename = image.filename;
      gallery.appendChild(img);
    } else {
      img.src = imgUrl + `?v=${Date.now()}`;
    }

    img.onclick = () => img.classList.toggle('zoomed');

    img.oncontextmenu = (e) => {
      e.preventDefault();
      img.classList.add('pop-out');
      setTimeout(() => gallery.removeChild(img), 500);

      fetch('/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: getPageFolder(currentPage),
          filename: image.filename
        })
      }).then(response => {
        if (response.ok) {
          console.log('Image deleted successfully');
          setTimeout(() => fetchImagesAndRender(false), 1000);
        } else {
          console.error('Failed to delete image');
        }
      });
    };
  });

  requestAnimationFrame(() => applyFLIP(beforeRects, getRects()));
}

function updatePage(n) {
  currentPage = n;
  pageNum.textContent = currentPage;
  fetchImagesAndRender(true);
}

function uploadFiles(files) {
  const pageFolder = getPageFolder(currentPage);
  const formData = new FormData();
  [...files].forEach(file => formData.append('image', file));

  fetch(`/upload?page=${pageFolder}`, {
    method: 'POST',
    body: formData
  }).then(() => fetchImagesAndRender(false));
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') updatePage(currentPage + 1);
  if (e.key === 'ArrowLeft' && currentPage > 1) updatePage(currentPage - 1);
});

window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => {
  e.preventDefault();
  if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files);
});

document.addEventListener('DOMContentLoaded', () => updatePage(currentPage));
