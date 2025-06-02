let currentPage = 1;
const pageNum = document.getElementById('page-num');
const gallery = document.getElementById('gallery');
const fileInput = document.getElementById('fileInput');

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

        img.addEventListener('click', () => {
          img.classList.toggle('zoomed');
        });

        img.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          const filename = src.split('/').pop();
          img.classList.add('pop-out');
          setTimeout(() => {
            fetch('/delete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ page: currentPage, filename })
            }).then(() => loadImages(currentPage));
          }, 400); // 애니메이션 시간만큼 지연
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

    const tempImg = document.createElement('img');
    tempImg.classList.add('gallery-image', 'pop-in');
    tempImg.style.opacity = '0';
    const reader = new FileReader();
    reader.onload = (e) => {
      tempImg.src = e.target.result;
      gallery.appendChild(tempImg);
      requestAnimationFrame(() => {
        tempImg.style.opacity = '1';
      });

      tempImg.addEventListener('click', () => {
        tempImg.classList.toggle('zoomed');
      });

      tempImg.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const filename = file.name;
        tempImg.classList.add('pop-out');
        setTimeout(() => {
          fetch('/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ page: currentPage, filename })
          }).then(() => loadImages(currentPage));
        }, 400);
      });
    };
    reader.readAsDataURL(file);

    fetch('/upload', {
      method: 'POST',
      body: formData
    }).then(() => {
      setTimeout(() => loadImages(currentPage), 600);
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

updatePage(currentPage);
