let currentPage = 1;
const pageNum = document.getElementById('page-num');
const gallery = document.getElementById('gallery');
const fileInput = document.getElementById('fileInput');

// FLIP용 위치 측정 함수
function getRects() {
  return Array.from(gallery.children).map(el => ({
    el,
    rect: el.getBoundingClientRect()
  }));
}

// FLIP 애니메이션 적용
function applyFLIP(before, after) {
  before.forEach(({ el, rect }, i) => {
    const newRect = after[i]?.rect;
    if (!newRect) return;

    const dx = rect.left - newRect.left;
    const dy = rect.top - newRect.top;

    if (dx || dy) {
      el.style.transition = 'none';
      el.style.transform = `translate(${dx}px, ${dy}px)`;

      requestAnimationFrame(() => {
        el.style.transition = 'transform 0.4s ease';
        el.style.transform = 'translate(0, 0)';
      });
    }
  });
}

// 이미지 로드
function loadImages(page) {
  fetch(`/images/${page}`)
    .then(res => res.json())
    .then(images => {
      const beforeRects = getRects();

      const current = Array.from(gallery.children);
      const used = new Set();

      images.forEach((src, i) => {
        let img = current[i];
        if (!img) {
          img = document.createElement('img');
          gallery.appendChild(img);
        }

        img.src = src;
        img.className = 'gallery-image';
        void img.offsetWidth;
        img.classList.add('fade-in');
        img.style.animationDelay = `${i * 80}ms`;
        used.add(img);

        img.onclick = () => img.classList.toggle('zoomed');

        img.oncontextmenu = (e) => {
          e.preventDefault();
          const filename = src.split('/').pop();

          const before = getRects();
          img.classList.add('pop-out');

          setTimeout(() => {
            img.remove();
            requestAnimationFrame(() => {
              const after = getRects();
              applyFLIP(before, after);
            });

            fetch('/delete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ page: currentPage, filename })
            });
          }, 400);
        };
      });

      current.forEach(img => {
        if (!used.has(img)) {
          gallery.removeChild(img);
        }
      });

      requestAnimationFrame(() => {
        const afterRects = getRects();
        applyFLIP(beforeRects, afterRects);
      });
    });
}

function updatePage(n) {
  currentPage = n;
  pageNum.textContent = currentPage;
  loadImages(currentPage);
}

// 이미지 업로드
function uploadFiles(files) {
  const beforeRects = getRects();

  [...files].forEach(file => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('page', currentPage);

    const tempImg = document.createElement('img');
    tempImg.className = 'gallery-image';
    tempImg.style.opacity = '0';

    const reader = new FileReader();
    reader.onload = (e) => {
      tempImg.src = e.target.result;
      gallery.appendChild(tempImg);

      requestAnimationFrame(() => {
        tempImg.style.opacity = '1';
        tempImg.classList.add('pop-in');

        const afterRects = getRects();
        applyFLIP(beforeRects, afterRects);
      });

      tempImg.onclick = () => tempImg.classList.toggle('zoomed');

      tempImg.oncontextmenu = (e) => {
        e.preventDefault();
        const filename = file.name;
        const before = getRects();

        tempImg.classList.add('pop-out');
        setTimeout(() => {
          tempImg.remove();
          requestAnimationFrame(() => {
            const after = getRects();
            applyFLIP(before, after);
          });

          fetch('/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ page: currentPage, filename })
          });
        }, 400);
      };
    };
    reader.readAsDataURL(file);

    fetch('/upload', {
      method: 'POST',
      body: formData
    });
  });
}

// 페이지 키보드 전환
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') updatePage(currentPage + 1);
  if (e.key === 'ArrowLeft' && currentPage > 1) updatePage(currentPage - 1);
});

// 드래그 앤 드롭
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => {
  e.preventDefault();
  if (e.dataTransfer.files.length > 0) {
    uploadFiles(e.dataTransfer.files);
  }
});

// 첫 로딩
setTimeout(() => updatePage(currentPage), 150);
