let currentPage = 1;

const pageNum = document.getElementById('page-num');
const gallery = document.getElementById('gallery');
const fileInput = document.getElementById('fileInput');

function loadImages(page, popInFilename = null) {
  fetch(`/images/${page}`)
    .then(res => res.json())
    .then(images => {
      gallery.innerHTML = '';
      images.forEach(src => {
        const img = document.createElement('img');
        img.src = src;
        const filename = src.split('/').pop();
        if (filename === popInFilename) {
          img.classList.add('gallery-image', 'pop-in');
        } else {
          img.classList.add('gallery-image', 'fade-in');
        }

        img.addEventListener('click', () => {
          img.classList.toggle('zoomed');
        });

        img.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          if (confirm('이 이미지를 삭제할까요?')) {
            fetch('/delete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ page: currentPage, filename })
            }).then(() => loadImages(currentPage));
          }
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
    }).then(() => {
      const img = document.createElement('img');
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target.result;
        img.classList.add('gallery-image');
        gallery.appendChild(img);

        // 다음 프레임에 애니메이션 클래스 추가
        requestAnimationFrame(() => {
          img.classList.add('pop-in');
        });

        // 클릭 확대
        img.addEventListener('click', () => {
          img.classList.toggle('zoomed');
        });

        // 우클릭 삭제
        img.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          const filename = file.name;
          if (confirm('이 이미지를 삭제할까요?')) {
            fetch('/delete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ page: currentPage, filename })
            }).then(() => loadImages(currentPage));
          }
        });
      };

      reader.readAsDataURL(file);
    });
  });
}
