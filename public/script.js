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
    .then(images => renderImages(images, isPageChange));
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
      // 이미지 URL에 캐시를 방지하기 위한 쿼리 파라미터 추가
      img.src = image.url + `?v=${Date.now()}`;
      img.dataset.filename = image.filename;
      gallery.appendChild(img);
    } else {
      // 기존 이미지의 URL 갱신 (캐시 방지)
      img.src = image.url + `?v=${Date.now()}`;
    }

    // 클릭 이벤트 (이미지 확대/축소)
    img.onclick = () => {
      document.querySelectorAll('.gallery-image.zoomed').forEach(el => {
        if (el !== img) el.classList.remove('zoomed');
      });
      img.classList.toggle('zoomed');
    };

    // 우클릭 이벤트 (이미지 삭제)
    img.oncontextmenu = (e) => {
      e.preventDefault();
      if (img.classList.contains('pop-out')) return;

      img.classList.add('pop-out');

      img.addEventListener('animationend', () => {
        if (gallery.contains(img)) gallery.removeChild(img);
        // 이미지 삭제 후 1초 뒤에 갤러리 갱신
        setTimeout(() => fetchImagesAndRender(false), 1000);
      }, { once: true });

      fetch('/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: getPageFolder(currentPage), filename: image.filename })
      }).then(response => response.json())
        .then(() => {
          setTimeout(() => fetchImagesAndRender(false), 1000);
        });
    };

    // 페이지 변경 시 애니메이션 적용
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

  // 새로 추가된 이미지에 FLIP 효과 적용
  requestAnimationFrame(() => {
    const afterRects = getRects();
    applyFLIP(beforeRects, afterRects);
  });
}

// 페이지 이동 함수
function updatePage(n) {
  currentPage = n;
  pageNum.textContent = currentPage;
  fetchImagesAndRender(true);
}

// 파일 업로드 처리
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
        fetchImagesAndRender(false);
      });
  });
}

// 방향키 이벤트 처리 (페이지 이동)
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') updatePage(currentPage + 1);
  if (e.key === 'ArrowLeft' && currentPage > 1) updatePage(currentPage - 1);
});

// 이미지 드래그 앤 드랍 이벤트 처리
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => {
  e.preventDefault();
  if (e.dataTransfer.files.length > 0) {
    uploadFiles(e.dataTransfer.files);
  }
});

// 페이지 로드 시 첫 번째 페이지 로드
document.addEventListener('DOMContentLoaded', () => updatePage(currentPage));
