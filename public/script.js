let currentPage = 1;
const pageNum = document.getElementById('page-num');
const gallery = document.getElementById('gallery');
const fileInput = document.getElementById('fileInput');

// 렉 개선된 이미지 로드
function loadImages(page) {
  fetch(`/images/${page}`)
    .then(res => res.json())
    .then(images => {
      const existing = Array.from(gallery.children);
      const used = new Set();

      // 이미지 갱신 또는 추가
      images.forEach((src, i) => {
        let img = existing[i];
        if (!img) {
          img = document.createElement('img');
          img.classList.add('gallery-image', 'fade-in');
          gallery.appendChild(img);
        }
        img.src = src;
        used.add(img);

        // 이벤트 다시 연결
        img.onclick = () => img.classList.toggle('zoomed');
        img.oncontextmenu = (e) => {
          e.preventDefault();
          const filename = src.split('/').pop();

          const previousRects = Array.from(gallery.children).map(el => ({
            el,
            rect: el.getBoundingClientRect()
          }));

          img.classList.add('pop-out');

          setTimeout(() => {
            img.remove();

            previousRects.forEach(({ el, rect }) => {
              if (!document.body.contains(el)) return;
              const newRect = el.getBoundingClientRect();
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

            fetch('/delete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ page: currentPage, filename })
            });
          }, 400);
        };
      });

      // 남는 이미지 제거
      existing.forEach(img => {
        if (!used.has(img)) {
          gallery.removeChild(img);
        }
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

    const previousRects = Array.from(gallery.children).map(img => ({
      el: img,
      rect: img.getBoundingClientRect()
    }));

    const tempImg = document.createElement('img');
    tempImg.classList.add('gallery-image', 'pop-in');
    tempImg.style.opacity = '0';

    const reader = new FileReader();
    reader.onload = (e) => {
      tempImg.src = e.target.result;
      gallery.appendChild(tempImg);

      requestAnimationFrame(() => {
        tempImg.style.opacity = '1';

        previousRects.forEach(({ el, rect }) => {
          const newRect = el.getBoundingClientRect();
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
      });

      tempImg.onclick = () => tempImg.classList.toggle('zoomed');
      tempImg.oncontextmenu = (e) => {
        e.preventDefault();
        const filename = file.name;

        const previousRects = Array.from(gallery.children).map(el => ({
          el,
          rect: el.getBoundingClientRect()
        }));

        tempImg.classList.add('pop-out');

        setTimeout(() => {
          tempImg.remove();

          previousRects.forEach(({ el, rect }) => {
            if (!document.body.contains(el)) return;
            const newRect = el.getBoundingClientRect();
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
