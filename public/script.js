// ✅ 완전 통합된 script.js (FLIP: 추가/삭제만 적용, 페이지 전환은 fade-in만, 업로드 버그 수정)

let currentPage = 1;
const pageNum = document.getElementById('page-num');
const gallery = document.getElementById('gallery');
const fileInput = document.getElementById('fileInput');

function getRects() {
  return Array.from(gallery.children).map(el => ({
    el,
    rect: el.getBoundingClientRect()
  }));
}

function applyFLIP(beforeRects, afterRects) {
  afterRects.forEach(({ el }) => {
    const before = beforeRects.find(b => b.el === el);
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

function updatePage(n) {
  currentPage = n;
  pageNum.textContent = currentPage;
  fetch(`/images/${currentPage}`)
    .then(res => res.json())
    .then(images => {
      gallery.innerHTML = '';
      images.forEach((src, i) => {
        const img = document.createElement('img');
        img.src = src;
        img.className = 'gallery-image';

        img.style.animation = 'none';
        img.style.animationDelay = `${i * 60}ms`;
        void img.offsetWidth;
        img.classList.add('fade-in');

        img.onclick = () => img.classList.toggle('zoomed');

        img.oncontextmenu = (e) => {
          e.preventDefault();
          const filename = src.split('/').pop();
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
            });
          }, 400);
        };

        gallery.appendChild(img);
      });
    });
}

function uploadFiles(files) {
  [...files].forEach(file => {
    const formData = new FormData();
    formData.append('image', file);
    // formData.append('page', currentPage); ← 제거됨
    // 페이지 정보는 쿼리스트링으로 전달


    fetch(`/upload?page=${currentPage}`, {
      method: 'POST',
      body: formData
    }).then(() => {
      setTimeout(() => updatePage(currentPage), 100); // 업로드 후 서버 기준으로 새로고침
    });
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
