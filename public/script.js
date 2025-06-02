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

        // 드래그 애니메이션
        img.setAttribute('draggable', true);
        img.addEventListener('dragstart', (e) => {
          e.dataTransfer.setDragImage(new Image(), 0, 0);
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

// 썸네일 미리보기 기능
let previewImg;

window.addEventListener('dragenter', (e) => {
  e.preventDefault();

  if (!previewImg && e.dataTransfer.items.length > 0) {
    const item = e.dataTransfer.items[0];
    if (item.kind === 'file') {
      const file = item.getAsFile();
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const wrapper = document.createElement('div');
          wrapper.style.position = 'absolute';
          wrapper.style.left = `${e.pageX + 20}px`;
          wrapper.style.top = `${e.pageY + 20}px`;
          wrapper.style.width = '120px';
          wrapper.style.height = '120px';
          wrapper.style.backgroundColor = '#111';
          wrapper.style.borderRadius = '8px';
          wrapper.style.overflow = 'hidden';
          wrapper.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
          wrapper.style.zIndex = '9999';
          wrapper.style.pointerEvents = 'none';

          const img = document.createElement('img');
          img.src = event.target.result;
          img.style.width = '100%';
          img.style.height = '100%';
          img.style.objectFit = 'contain';
          img.style.pointerEvents = 'none';

          wrapper.appendChild(img);
          document.body.appendChild(wrapper);
          previewImg = wrapper;
        };
        reader.readAsDataURL(file);
      }
    }
  }
});

window.addEventListener('dragover', (e) => {
  e.preventDefault();
  if (previewImg) {
    previewImg.style.left = `${e.pageX + 20}px`;
    previewImg.style.top = `${e.pageY + 20}px`;
  }
});

window.addEventListener('dragleave', () => {
  if (previewImg) {
    previewImg.remove();
    previewImg = null;
  }
});

window.addEventListener('drop', (e) => {
  e.preventDefault();
  if (previewImg) {
    previewImg.remove();
    previewImg = null;
  }

  if (e.dataTransfer.files.length > 0) {
    uploadFiles(e.dataTransfer.files);
  }
});

// 초기 로딩
updatePage(currentPage);
