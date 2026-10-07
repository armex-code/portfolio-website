/* ============================================================
   heyabdel.com: the small amount of JS the main page needs.
   · mobile nav toggle
   · optional Rover Run sandbox in a <dialog> (lazy iframe)
   · autoplay for project clips only while they're on screen
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

  /* ---------- Rover Run sandbox ---------- */
  const dialog = document.getElementById('sandbox');
  const slot = dialog && dialog.querySelector('[data-sandbox-slot]');

  function openSandbox() {
    // Browsers without <dialog> just get the full-screen page.
    if (!dialog || typeof dialog.showModal !== 'function') {
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
    dialog.showModal();
    document.documentElement.style.overflow = 'hidden';
  }

  function closeSandbox() {
    if (dialog && dialog.open) dialog.close();
  }

  if (dialog) {
    // Tear the iframe down on close so WebGL and audio stop completely.
    dialog.addEventListener('close', () => {
      slot.replaceChildren();
      document.documentElement.style.overflow = '';
    });
    dialog.addEventListener('click', (e) => { if (e.target === dialog) closeSandbox(); });
    dialog.querySelectorAll('[data-close-sandbox]').forEach((b) => b.addEventListener('click', closeSandbox));
  }
  document.querySelectorAll('[data-open-sandbox]').forEach((b) => b.addEventListener('click', openSandbox));

  // rover.html posts this when its own "back to site" / Escape is used while embedded.
  addEventListener('message', (e) => {
    if (e.origin === location.origin && e.data === 'rover:close') closeSandbox();
  });

  /* ---------- Project clips: play only when visible ---------- */
  const clips = document.querySelectorAll('video[data-autoplay]');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (clips.length && !reduceMotion && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (isIntersecting) target.play().catch(() => {});
        else target.pause();
      });
    }, { threshold: 0.35 });
    clips.forEach((v) => io.observe(v));
  }

  /* ---------- Links that aren't wired up yet ---------- */
  document.querySelectorAll('a[aria-disabled="true"]').forEach((a) => {
    a.addEventListener('click', (e) => e.preventDefault());
  });

  /* ---------- Footer year ---------- */
  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
})();
