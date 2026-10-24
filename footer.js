(() => {
  'use strict';
  const footer = document.querySelector('[data-site-footer]');
  if (!footer) return;
  const content = window.KOKE_CONTENT || {};
  const pages = [
    ['index.html','ホーム','./index.html#home'],
    ['music.html','楽曲','./music.html'],
    ['terms.html','楽曲の利用規約','./terms.html'],
    ['articles.html','記事','./articles.html']
  ];
  const file = location.pathname.split('/').pop() || 'index.html';
  const current = file === 'article.html' ? 'articles.html' : file;
  const year = new Intl.DateTimeFormat('en',{year:'numeric',timeZone:'Asia/Tokyo'}).format(new Date());
  footer.innerHTML = `<div class="footer-main">
    <div class="footer-identity"><a class="footer-brand" href="./index.html#home" aria-label="Koke ホーム">Koke</a><nav class="footer-socials" aria-label="フッターのSNSリンク"></nav></div>
    <nav class="footer-pages" aria-label="フッターのページナビゲーション">${pages.map(([name,label,href]) => `<a href="${href}"${current === name ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav>
    <div class="footer-contact"><p class="footer-label">お問い合わせ</p><a class="footer-email"></a></div>
  </div><div class="footer-bottom"><div class="footer-rights"><small>© ${year} Koke</small><p>掲載楽曲・画像の権利は、各権利者に帰属します。</p></div><a class="footer-back-top" href="#page-top">ページ先頭へ戻る<img src="./assets/icons/lucide/arrow-up.svg" alt="" aria-hidden="true" width="16" height="16"></a></div>`;
  const email = typeof content.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(content.email) ? content.email : 'Koke28sss@gmail.com';
  const contact = footer.querySelector('.footer-email');
  contact.textContent = email; contact.href = `mailto:${encodeURIComponent(email)}`;
  footer.querySelector('.footer-back-top').addEventListener('click',event => {
    event.preventDefault();
    window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
    document.getElementById('page-top')?.focus({preventScroll:true});
  });
  const networks = [
    ['soundcloud','SoundCloud','soundcloud.webp'],
    ['youtube','YouTube','youtube.png'],
    ['x','X','x.png'],
    ['niconico','niconico','niconico.png']
  ];
  networks.forEach(([key,label,asset]) => {
    let url;
    try { url = new URL(content[key]); } catch { return; }
    if (url.protocol !== 'https:') return;
    // The personal dashboard is not a public artist profile.
    if (key === 'niconico' && url.hostname === 'www.nicovideo.jp' && url.pathname === '/my') url = new URL('https://www.nicovideo.jp/user/130576613');
    const link = document.createElement('a');
    link.className = 'social-icon'; link.dataset.service = key;
    link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label',`${label}（新しいタブで開く）`); link.title = label;
    const image = document.createElement('img');
    image.src = `./assets/brands/${asset}`; image.alt = ''; image.width = 24; image.height = 24;
    image.setAttribute('aria-hidden','true'); link.append(image);
    footer.querySelector('.footer-socials').append(link);
  });
})();
