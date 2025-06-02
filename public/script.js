// ✅ script.js (FLIP 정확한 적용 및 깜빡임 제거 + 이미지 추가/삭제 시 부드럽게 밀림 애니메이션 적용)

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
  const currentImageMap = new Map();

  for (const child of [...gallery.children]) {
    currentImageMap.set(child.dataset.filename, child);
  }

  const newImageMap = new Map();

  images.forEach((image, i) => {
    newImageMap.set(image.filename, image);
    let img = currentImageMap.get(image.filename);

    if (!img) {
      img = document.createElement('img');
      img.src = image.url;
      img.dataset.filename = image.filename;
      img.className = 'gallery-image pop-in';
      gallery.appendChild(img);
    }

    img.onclick = () => img.classList.toggle('zoomed');
    img.oncontextmenu = (e) => {
      e.preventDefault();
      const filename = img.dataset.filename;
      const beforeRects = getRects();

      img.classList.add('pop-out');
      setTimeout(() => {
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
      }, 350);
    };

    if (isPageChange) {
      img.style.animation = `fadeInUp 0.4s ease-out both`;
      img.style.animationDelay = `${i * 60}ms`;
    }
  });

  // 제거된 이미지 처리 후 FLIP 적용
  const toRemove = [...currentImageMap.keys()].filter(key => !newImageMap.has(key));
  if (toRemove.length > 0) {
    const rectsBefore = getRects();
    toRemove.forEach(key => {
      const el = currentImageMap.get(key);
      if (gallery.contains(el)) gallery.removeChild(el);
    });
    requestAnimationFrame(() => {
      const rectsAfter = getRects();
      applyFLIP(rectsBefore, rectsAfter);
    });
  } else {
    requestAnimationFrame(() => {
      const afterRects = getRects();
      applyFLIP(beforeRects, afterRects);
    });
  }
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
