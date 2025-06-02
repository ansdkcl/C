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
      img.className = 'gallery-image';
      img.src = image.url;
      img.dataset.filename = image.filename;
      gallery.appendChild(img);
    }

    // 항상 이벤트 강제 재등록
    img.onclick = null;
    img.oncontextmenu = null;

    img.onclick = () => img.classList.toggle('zoomed');
    img.oncontextmenu = (e) => {
      e.preventDefault();
      if (img.classList.contains('pop-out')) return;

      img.classList.add('pop-out');

      img.addEventListener('animationend', () => {
        if (gallery.contains(img)) gallery.removeChild(img);

        // DOM에서 사라진 뒤 반드시 서버 상태와 동기화
        fetch(`/images/${getPageFolder(currentPage)}`, { cache: 'no-store' })
          .then(res => res.json())
          .then(images => renderImages(images, false));
      }, { once: true });

      fetch('/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: getPageFolder(currentPage), filename: image.filename })
      });
    };

    if (isPageChange) {
      img.style.animation = `fadeInUp 0.4s ease-out both`;
      img.style.animationDelay = `${i * 60}ms`;
    } else {
      img.style.animation = '';
      img.style.animationDelay = '';
    }
  });

  existing.forEach(el => {
    if (!filenames.has(el.dataset.filename)) {
      if (gallery.contains(el)) gallery.removeChild(el);
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
  const pageFolder = getPageFolder(currentPage);
  fetch(`/images/${pageFolder}`, { cache: 'no-store' })
    .then(res => res.json())
    .then(images => renderImages(images, true))
    .catch(err => console.error('페이지 로드 오류:', err));
}

function uploadFiles(files) {
  const beforeRects = getRects();
  const pageFolder = getPageFolder(currentPage);

  [...files].forEach(file => {
    const formData = new FormData();
    formData.append('image', file);

    fetch(`/upload?page=${pageFolder}`, {
      method: 'POST',
      body: formData
    })
      .then(res => res.json())
      .then(({ filename }) => {
        fetch(`/images/${pageFolder}`, { cache: 'no-store' })
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
