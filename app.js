const gallery = document.getElementById('gallery');
const modal = document.getElementById('modal');
const modalImage = modal.querySelector('.modal-image');
const modalTitle = modal.querySelector('.modal-title');
const modalDesc = modal.querySelector('.modal-description');
const modalClose = modal.querySelector('.modal-close');

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function renderMarkdown(md) {
  if (window.marked) return window.marked.parse(md || '');
  return `<p>${escapeHtml(md || '')}</p>`;
}

function openModal(picture) {
  modalImage.src = picture.src;
  modalImage.alt = picture.title;
  modalTitle.textContent = picture.title;
  modalDesc.innerHTML = renderMarkdown(picture.description);
  modal.hidden = false;
}

function closeModal() {
  modal.hidden = true;
  modalImage.src = '';
}

modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', e => {
  if (e.target === modal) closeModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !modal.hidden) closeModal();
});

function renderGallery(index) {
  if (!index.categories.length) {
    gallery.textContent = 'No pictures yet.';
    return;
  }
  gallery.innerHTML = '';
  for (const cat of index.categories) {
    const section = document.createElement('section');
    section.className = 'category';
    section.innerHTML = `<h2>${escapeHtml(cat.name)}</h2>`;
    const grid = document.createElement('div');
    grid.className = 'grid';
    for (const pic of cat.pictures) {
      const btn = document.createElement('button');
      btn.className = 'thumb';
      btn.type = 'button';
      const img = document.createElement('img');
      img.src = pic.src;
      img.alt = pic.title;
      img.loading = 'lazy';
      btn.appendChild(img);
      btn.addEventListener('click', () => openModal(pic));
      grid.appendChild(btn);
    }
    section.appendChild(grid);
    gallery.appendChild(section);
  }
}

fetch('index.json')
  .then(r => {
    if (!r.ok) throw new Error(`index.json ${r.status}`);
    return r.json();
  })
  .then(renderGallery)
  .catch(err => {
    gallery.textContent = `Failed to load gallery: ${err.message}`;
  });
