// ✅ 완전 통합된 script.js (애니메이션 타이밍 개선: pop-in, fade-in)

let currentPage = 1;
const pageNum = document.getElementById('page-num');
const gallery = document.getElementById('gallery');
const fileInput = document.getElementById('fileInput');

function getRects() {
  return Array.from(gallery.children).map(el => ({ el, rect: el.getBoundingClientRect() }));
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
      images.forEach((image, i) => {
        const img = document.createElement('img');
        img.src = image.url;
        img.dataset.filename = image.filename;
        img.className = 'gallery-image';

        img.style.animation = 'none';
        img.style.animationDelay = `${i * 60}ms`;
        void img.offsetWidth;
        img.classList.add('fade-in');

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
            .then(res => {
              if (!res.ok) throw new Error('삭제 실패');
              return res.text();
            })
            .then(() => {
              setTimeout(() => updatePage(currentPage), 150);
            })
            .catch(err => console.error('삭제 오류:', err));

          }, 400);
        };

        gallery.appendChild(img);
      });
    })
    .catch(err => console.error('페이지 로드 오류:', err));
}

function uploadFiles(files) {
  [...files].forEach(file => {
    const formData = new FormData();
    formData.append('image', file);

    const tempImg = document.createElement('img');
    tempImg.className = 'gallery-image';
    tempImg.style.opacity = '0';
    tempImg.style.animation = 'none';
    void tempImg.offsetWidth;
    tempImg.classList.add('pop-in');

    const reader = new FileReader();
    reader.onload = (e) => {
      tempImg.src = e.target.result;
      gallery.appendChild(tempImg);
      requestAnimationFrame(() => {
        tempImg.style.opacity = '1';
      });
    };
    reader.readAsDataURL(file);

    fetch(`/upload?page=${currentPage}`, {
      method: 'POST',
      body: formData
    })
    .then(res => res.json())
    .then(() => updatePage(currentPage))
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
