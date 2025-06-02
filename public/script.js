let currentPage = 1;

const pageNum = document.getElementById('page-num');
const gallery = document.getElementById('gallery');
const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('drop-zone');

// 이미지 로드
function loadImages(page) {
  fetch(`/images/${page}`)
    .then(res => res.json())
    .then(images => {
      gallery.innerHTML = '';
      images.forEach(src => {
        const img = document.createElement('img');
        img.src = src;
        img.classList.add('gallery-image', 'fade-in');

        // 확대/축소 토글
        img.addEventListener('click', () => {
          img.classList.toggle('zoomed');
        });

        // 우클릭 → 삭제
        img.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          const filename = src.split('/').pop();
          if (confirm('이 이미지를 삭제할까요?')) {
            fetch('/delete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ page: currentPage, filename })
            }).then(() => loadImages(currentPage));
          }
        });

        // 드래그 시 애니메이션
        img.setAttribute('draggable', true);
        img.addEventListener('dragstart', (e) => {
  e.dataTransfer.setDragImage(new Image(), 0, 0); // 썸네일 제거
  img.classList.add('dragging');
});
        img.addEventListener('dragend', () => {
          img.classList.remove('dragging');
        });

        gallery.appendChild(img);
      });
    });
}

function updatePage(n) {
  currentPage = n;
  pageNum.textContent = currentPage;
  loadImages(currentPage);
}

function uploadFiles(files) {
  [...files].forEach(file => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('page', currentPage);
    fetch('/upload', {
      method: 'POST',
      body: formData
    }).then(() => loadImages(currentPage));
  });
}

// 방향키 페이지 이동
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') updatePage(currentPage + 1);
  if (e.key === 'ArrowLeft' && currentPage > 1) updatePage(currentPage - 1);
});

window.addEventListener('dragover', (e) => {
  e.preventDefault();
});

window.addEventListener('drop', (e) => {
  e.preventDefault();
  if (e.dataTransfer.files.length > 0) {
    uploadFiles(e.dataTransfer.files);
  }
});

// 초기 로딩
updatePage(currentPage);
