const target = document.getElementById('content');
const src = target.dataset.src;

fetch(src)
  .then(r => {
    if (!r.ok) throw new Error(`${src} ${r.status}`);
    return r.text();
  })
  .then(md => {
    target.innerHTML = window.marked ? window.marked.parse(md) : `<pre>${md}</pre>`;
  })
  .catch(err => {
    target.textContent = `Failed to load: ${err.message}`;
  });
