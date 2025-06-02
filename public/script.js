// ✅ script.js (깜빡임 제거 + FLIP + pop-in/pout 복원 + 페이드인 순차 애니메이션)

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
  const existingKeys = new Set(images.map(img => img.filename));

  existing.forEach(child => {
    if (!existingKeys.has(child.dataset.filename)) {
      gallery.removeChild(child);
    }
  });

  images.forEach((image, i) => {
    let img = [...gallery.children].find(el => el.dataset.filename === image.filename);
    if (!img) {
      img = document.createElement('img');
      img.src = image.url;
      img.dataset.filename = image.filename;
      img.className = 'gallery-image';
      gallery.appendChild(img);
    }

    img.onclick = () => img.classList.toggle('zoomed');
    img.oncontextmenu = (e) => {
      e.preventDefault();
      const filename = img.dataset.filename;
      const beforeRects = getRects();

      img.classList.add('pop-out');
      setTimeout(() => {
        if (gallery.contains(img)) gallery.removeChild(img);
        const afterRects = getRects();
        applyFLIP(beforeRects, afterRects);

        fetch('/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ page: currentPage, filename })
        })
          .catch(err => console.error('삭제 오류:', err));
      }, 350);
    };

    if (isPageChange) {
      img.style.animation = `fadeInUp 0.4s ease-out both`;
      img.style.animationDelay = `${i * 60}ms`;
    }
  });

  const afterRects = getRects();
  applyFLIP(beforeRects, afterRects);
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
        const reader = new FileReader();
        reader.onload = (e) => {
          const tempImg = document.createElement('img');
          tempImg.src = e.target.result;
          tempImg.className = 'gallery-image pop-in';
          tempImg.dataset.filename = filename;
          gallery.appendChild(tempImg);

          const afterRects = getRects();
          applyFLIP(beforeRects, afterRects);

          setTimeout(() => updatePage(currentPage), 300);
        };
        reader.readAsDataURL(file);
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
