/* ============================================================
   heyabdel.com: the small amount of JS the main page needs.
   · mobile nav toggle
   · photos that appear once their file exists in assets/media
   · project popups (banner panels) with a photo gallery
   · optional Rover Run sandbox in a <dialog> (lazy iframe)
   · placeholder links that aren't wired up yet
   ============================================================ */
(function () {
  /* ---------- Mobile nav ---------- */
  const toggle = document.getElementById('nav-toggle');
  const menu = document.getElementById('mobile-nav');
  if (toggle && menu) {
    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? 'Close' : 'Menu';
      menu.classList.toggle('hidden', !open);
    };
    toggle.addEventListener('click', () => setOpen(menu.classList.contains('hidden')));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  }

  /* ---------- Photos ----------
     Every <img data-src> sits on top of a grey placeholder. If the file
     isn't there yet the image hides itself and the placeholder shows, so
     adding a photo is just dropping the file at the path in data-src. */
  function setPhoto(img, src) {
    img.hidden = false;
    img.src = src;
  }
  document.querySelectorAll('img[data-src]').forEach((img) => {
    img.addEventListener('error', () => { img.hidden = true; });
    setPhoto(img, img.dataset.src);
  });

  /* ---------- Dialog helpers ---------- */
  const lockScroll = () => { document.documentElement.style.overflow = 'hidden'; };
  const unlockScroll = () => {
    if (!document.querySelector('dialog[open]')) document.documentElement.style.overflow = '';
  };
  const canModal = typeof HTMLDialogElement === 'function';

  function wireDialog(dialog, onClose) {
    dialog.addEventListener('close', () => { if (onClose) onClose(); unlockScroll(); });
    // Click on the backdrop (the dialog element itself, outside its content) closes it.
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    dialog.querySelectorAll('[data-close], [data-close-sandbox]').forEach((b) =>
      b.addEventListener('click', () => dialog.close()));
  }

  /* ---------- Project popups ---------- */
  const projects = [...document.querySelectorAll('.project-dialog')];
  let opener = null;

  function openProject(dialog) {
    if (!canModal) return;
    projects.forEach((d) => { if (d.open) d.close(); });
    dialog.showModal();
    dialog.scrollTop = 0;
    lockScroll();
  }

  projects.forEach((dialog, i) => {
    wireDialog(dialog, () => { if (opener && !document.querySelector('dialog[open]')) opener.focus(); });

    dialog.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => {
      const next = projects[(i + Number(b.dataset.step) + projects.length) % projects.length];
      openProject(next);
    }));

    // Gallery: thumbnails swap the main photo and caption.
    const main = dialog.querySelector('[data-main]');
    const caption = dialog.querySelector('[data-figcaption]');
    const thumbs = dialog.querySelectorAll('.thumb');
    thumbs.forEach((t) => t.addEventListener('click', () => {
      thumbs.forEach((o) => o.setAttribute('aria-pressed', String(o === t)));
      if (main) setPhoto(main, t.dataset.full);
      if (caption) caption.textContent = t.dataset.caption;
    }));
  });

  document.querySelectorAll('[data-project]').forEach((btn) => btn.addEventListener('click', () => {
    const dialog = document.getElementById(btn.dataset.project);
    if (!dialog) return;
    opener = btn;
    openProject(dialog);
  }));

  /* ---------- Rover Run sandbox ---------- */
  const sandbox = document.getElementById('sandbox');
  const slot = sandbox && sandbox.querySelector('[data-sandbox-slot]');

  function openSandbox() {
    // Browsers without <dialog> just get the full-screen page.
    if (!sandbox || !canModal) {
      location.href = 'rover.html';
      return;
    }
    const frame = document.createElement('iframe');
    frame.src = 'rover.html';
    frame.title = 'Rover Run 3D sandbox';
    frame.className = 'absolute inset-0 h-full w-full border-0';
    frame.allow = 'fullscreen; autoplay';
    frame.addEventListener('load', () => frame.focus());
    slot.replaceChildren(frame);
    sandbox.showModal();
    lockScroll();
  }

  if (sandbox) {
    // Tear the iframe down on close so WebGL and audio stop completely.
    wireDialog(sandbox, () => slot.replaceChildren());
  }
  document.querySelectorAll('[data-open-sandbox]').forEach((b) => b.addEventListener('click', openSandbox));

  // rover.html posts this when its own "back to site" / Escape is used while embedded.
  addEventListener('message', (e) => {
    if (e.origin === location.origin && e.data === 'rover:close' && sandbox && sandbox.open) sandbox.close();
  });

  /* ---------- Links that aren't wired up yet ---------- */
  document.querySelectorAll('a[aria-disabled="true"]').forEach((a) => {
    a.addEventListener('click', (e) => e.preventDefault());
  });

  /* ---------- Footer year ---------- */
  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
})();
