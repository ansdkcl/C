// ✅ script.js (FLIP 정확한 적용 + 삭제 시 부드럽게 적용 + 삭제 시 FLIP 적용 위치 수정)

let currentPage = 1;
const pageNum = document.getElementById('page-num');
const gallery = document.getElementById('gallery');
const fileInput = document.getElementById('fileInput');

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
        el.style.transition = 'transform 0.5s ease-in-out';
        el.style.transform = 'translate(0, 0)';
      });
    }
  });
}

function renderImages(images, isPageChange = false) {
  const beforeRects = getRects();
  const existing = [...gallery.children];
  const existingMap = new Map(existing.map(el => [el.dataset.filename, el]));

  const filenames = new Set();

  images.forEach((image, i) => {
    filenames.add(image.filename);
    let img = existingMap.get(image.filename);

    if (!img) {
      img = document.createElement('img');
      img.src = image.url;
      img.className = 'gallery-image';
      img.dataset.filename = image.filename;
      img.classList.add('pop-in');
      gallery.appendChild(img);
    }

    img.onclick = () => img.classList.toggle('zoomed');

    img.oncontextmenu = (e) => {
      e.preventDefault();
      const filename = img.dataset.filename;
      const beforeRects = getRects();

      img.classList.add('pop-out');
      img.addEventListener('animationend', () => {
        if (gallery.contains(img)) {
          gallery.removeChild(img);
          requestAnimationFrame(() => {
            const afterRects = getRects();
            applyFLIP(beforeRects, afterRects);
          });
        }

        fetch('/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ page: currentPage, filename })
        }).catch(err => console.error('삭제 오류:', err));
      }, { once: true });
    };

    if (isPageChange) {
      img.style.animation = `fadeInUp 0.4s ease-out both`;
      img.style.animationDelay = `${i * 60}ms`;
    }
  });

  existing.forEach(el => {
    if (!filenames.has(el.dataset.filename)) {
      gallery.removeChild(el);
    }
  });

  requestAnimationFrame(() => {
    const afterRects = getRects();
    applyFLIP(beforeRects, afterRects);
  });
}

function updatePage(n) {
  currentPage = n;
  pageNum.textContent = currentPage;
  fetch(`/images/${currentPage}`)
    .then(res => res.json())
    .then(images => renderImages(images, true))
    .catch(err => console.error('페이지 로드 오류:', err));
}

function uploadFiles(files) {
  const beforeRects = getRects();

  [...files].forEach(file => {
    const formData = new FormData();
    formData.append('image', file);

    fetch(`/upload?page=${currentPage}`, {
      method: 'POST',
      body: formData
    })
      .then(res => res.json())
      .then(({ filename }) => {
        fetch(`/images/${currentPage}`)
          .then(res => res.json())
          .then(images => {
            const afterRects = getRects();
            applyFLIP(beforeRects, afterRects);
            renderImages(images, false);
          });
      })
      .catch(err => console.error('업로드 오류:', err));
  });
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') updatePage(currentPage + 1);
  if (e.key === 'ArrowLeft' && currentPage > 1) updatePage(currentPage - 1);
});

window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => {
  e.preventDefault();
  if (e.dataTransfer.files.length > 0) {
    uploadFiles(e.dataTransfer.files);
  }
});

document.addEventListener('DOMContentLoaded', () => updatePage(currentPage));
