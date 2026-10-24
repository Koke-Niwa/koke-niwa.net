/* Keep the address masked in the page; resolve it only after a user clicks. */
(() => {
  'use strict';
  const fallback = 'Koke28sss[at]gmail.com';
  const configured = window.KOKE_CONTENT?.email;
  const masked = typeof configured === 'string' ? configured.replaceAll('@','[at]') : fallback;
  const display = /^[^\s<>\[\]]+\[at\][^\s<>\[\]]+\.[^\s<>\[\]]+$/.test(masked) ? masked : fallback;
  document.querySelectorAll('[data-contact-email]').forEach(link => {
    link.textContent = display;
    link.setAttribute('href','#');
    link.setAttribute('aria-label',`${display} 宛てのメールを作成`);
    link.setAttribute('title','メールを作成');
    link.addEventListener('click',event => {
      event.preventDefault();
      const address = display.replace('[at]',String.fromCharCode(64));
      window.location.href = `mailto:${encodeURIComponent(address)}`;
    });
  });
})();
