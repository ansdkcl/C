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
  beforeRects.forEach(({ el, rect }, i) => {
    const newRect = afterRects[i]?.rect;
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

function updatePage(n) {
  currentPage = n;
  pageNum.textContent = currentPage;
  loadImages(currentPage);
}

function loadImages(page) {
  fetch(`/images/${page}`)
    .then(res => res.json())
    .then(images => {
      gallery.innerHTML = '';

      images.forEach((src, i) => {
        const img = document.createElement('img');
        img.src = src;
        img.className = 'gallery-image';

        img.style.animation = 'none';
        void img.offsetWidth;
        img.classList.add('fade-in');
        img.style.animationDelay = `${i * 80}ms`;

        img.onclick = () => img.classList.toggle('zoomed');

        img.oncontextmenu = (e) => {
          e.preventDefault();
          const filename = src.split('/').pop();
          const before = getRects();

          img.classList.add('pop-out');
          setTimeout(() => {
            gallery.removeChild(img);
            const after = getRects();
            applyFLIP(before, after);

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
  const beforeRects = getRects();

  [...files].forEach(file => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('page', currentPage);

    const tempImg = document.createElement('img');
    tempImg.className = 'gallery-image pop-in';
    tempImg.style.opacity = '0';

    const reader = new FileReader();
    reader.onload = (e) => {
      tempImg.src = e.target.result;
      gallery.appendChild(tempImg);

      requestAnimationFrame(() => {
        tempImg.style.opacity = '1';
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
          gallery.removeChild(tempImg);
          const after = getRects();
          applyFLIP(before, after);

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

setTimeout(() => updatePage(currentPage), 150);
