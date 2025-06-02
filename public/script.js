// ✅ 대상 변경: window
window.addEventListener('dragover', (e) => {
  e.preventDefault();
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;

  if (!previewImgCreated && e.dataTransfer.files.length > 0) {
    previewImgCreated = true;
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target.result;

        const wrapper = document.createElement('div');
        wrapper.style.position = 'fixed';
        wrapper.style.transform = `translate(${lastMouseX + 20}px, ${lastMouseY + 20}px)`;
        wrapper.style.width = '360px';
        wrapper.style.height = '360px';
        wrapper.style.backgroundColor = '#111';
        wrapper.style.borderRadius = '12px';
        wrapper.style.overflow = 'hidden';
        wrapper.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.7)';
        wrapper.style.border = '2px solid #444';
        wrapper.style.zIndex = '9999';
        wrapper.style.pointerEvents = 'none';

        const img = new Image();
        img.src = result;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.pointerEvents = 'none';
        img.style.backgroundColor = '#111';

        wrapper.appendChild(img);
        document.body.appendChild(wrapper);
        previewImg = wrapper;
      };

      reader.readAsDataURL(file);
    }
  }

  if (previewImg) {
    previewImg.style.transform = `translate(${lastMouseX + 20}px, ${lastMouseY + 20}px)`;
  }
});

window.addEventListener('dragleave', () => {
  if (previewImg) {
    previewImg.remove();
    previewImg = null;
    previewImgCreated = false;
  }
});

window.addEventListener('drop', (e) => {
  e.preventDefault();

  if (previewImg) {
    previewImg.style.transition = 'transform 0.5s ease, opacity 0.4s ease';
    previewImg.style.transform = 'translate(50vw, 50vh) scale(0.5)';
    previewImg.style.opacity = '0';

    setTimeout(() => {
      previewImg.remove();
      previewImg = null;
      previewImgCreated = false;
    }, 500);
  }

  if (e.dataTransfer.files.length > 0) {
    uploadFiles(e.dataTransfer.files);
  }
});
