let currentPage = 1;
const pageNum = document.getElementById('page-num');
const gallery = document.getElementById('gallery');
const fileInput = document.getElementById('fileInput');

// 페이지 폴더 이름 가져오기
function getPageFolder(n) {
  return `page-${n}`;
}

// 이미지들의 위치와 크기 정보 가져오기
function getRects() {
  return Array.from(gallery.children).map(el => ({
    el,
    rect: el.getBoundingClientRect(),
    key: el.dataset.filename || el.src
  }));
}

// FLIP 애니메이션 적용
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

// 이미지 목록을 서버에서 가져와서 렌더링
function fetchImagesAndRender(isPageChange = false) {
  const pageFolder = getPageFolder(currentPage);
  fetch(`/images/${pageFolder}?v=${Date.now()}`, { cache: 'no-store' })
    .then(res => res.json())
    .then(images => {
      renderImages(images, isPageChange);
    });
}

// 이미지를 렌더링하는 함수
function renderImages(images, isPageChange = false) {
  const beforeRects = getRects();
  const filenames = new Set();

  images.forEach((image, i) => {
    filenames.add(image.filename);
    let img = document.querySelector(`img[data-filename="${image.filename}"]`);

    if (!img) {
      img = document.createElement('img');
      img.className = 'gallery-image';
      img.src = image.url + `?v=${Date.now()}`;
      img.dataset.filename = image.filename;
      gallery.appendChild(img);
    } else {
      img.src = image.url + `?v=${Date.now()}`;
    }

    img.onclick = () => img.classList.toggle('zoomed');

    img.oncontextmenu = (e) => {
      e.preventDefault();
      img.classList.add('pop-out');
      setTimeout(() => gallery.removeChild(img), 500);

      // 이미지 삭제 요청
      fetch('/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: getPageFolder(currentPage), filename: image.filename })
      }).then(response => {
        if (response.ok) {
          console.log('Image deleted successfully');
          setTimeout(() => fetchImagesAndRender(false), 1000); // 이미지 삭제 후 갱신
        } else {
          console.error('Failed to delete image');
        }
      });
    };
  });

  requestAnimationFrame(() => applyFLIP(beforeRects, getRects()));
}

// 페이지 업데이트
function updatePage(n) {
  currentPage = n;
  pageNum.textContent = currentPage;
  fetchImagesAndRender(true);
}

// 파일 업로드 함수
function uploadFiles(files) {
  const pageFolder = getPageFolder(currentPage);
  const formData = new FormData();
  [...files].forEach(file => formData.append('image', file));

  fetch(`/upload?page=${pageFolder}`, { method: 'POST', body: formData })
    .then(() => fetchImagesAndRender(false)); // 업로드 후 이미지 렌더링
}

// 키보드 이벤트 처리 (페이지 이동)
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') updatePage(currentPage + 1);
  if (e.key === 'ArrowLeft' && currentPage > 1) updatePage(currentPage - 1);
});

// 드래그 앤 드롭 처리
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => {
  e.preventDefault();
  if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files);
});

// DOMContentLoaded 시 첫 페이지로 업데이트
document.addEventListener('DOMContentLoaded', () => updatePage(currentPage));
