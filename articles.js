(() => {
  'use strict';
  const library = window.KOKE_ARTICLES;
  const articles = library.published(window.KOKE_CONTENT.articles);
  const list = document.querySelector('#article-list');
  if (list) {
    const cardReveals = window.KOKE_CARD_REVEAL?.create(list);
    const search = document.querySelector('#article-search');
    const sort = document.querySelector('#article-sort');
    const orders = [{value:'newest',label:'新しい順'},{value:'oldest',label:'古い順'},{value:'name',label:'名前順'}];
    let orderIndex = 0;
    const render = () => {
      const visible = library.select(articles,search?.value || '',orders[orderIndex].value);
      cardReveals?.disconnect();
      const fragment = document.createDocumentFragment();
      visible.forEach((article,index) => {
        const entry = document.createElement('article'); entry.className = 'article-card';
        cardReveals?.prepare(entry,index);
        const cover = library.safeURL(article.cover,true);
        const url = `./article.html?id=${encodeURIComponent(article.id)}`;
        const soundArt = article.body.includes('[[winter-bgm-mixer]]') ? `<div class="article-sound-art" aria-hidden="true">${[22,48,72,34,90,58,100,76,42,84].map(height=>`<i style="--bar-height:${height}%"></i>`).join('')}</div>` : '';
        entry.innerHTML = `<a class="article-card-link" href="${url}"><div class="article-card-cover">${cover ? `<img src="${library.escape(cover)}" alt="" loading="lazy">` : soundArt}</div><div class="article-card-meta"><time datetime="${library.escape(article.date)}">${library.escape(article.date.replaceAll('-','.'))}</time><h2>${library.escape(article.title)}</h2></div></a>`;
        fragment.append(entry);
      });
      list.replaceChildren(fragment);
      [...list.children].forEach(card => cardReveals?.observe(card));
      const empty = document.querySelector('#articles-empty');
      empty.hidden = visible.length > 0;
      empty.textContent = articles.length ? '検索条件に一致する記事がありません。' : '記事はまだありません。';
      const status = document.querySelector('#article-search-status');
      if (status) status.textContent = `${visible.length}件の記事 · ${orders[orderIndex].label}`;
    };
    search?.addEventListener('input',render);
    sort?.addEventListener('click',() => {
      orderIndex = (orderIndex + 1) % orders.length;
      sort.querySelector('.sort-label').textContent = orders[orderIndex].label;
      sort.setAttribute('aria-label',`${orders[orderIndex].label}。押すと${orders[(orderIndex + 1) % orders.length].label}に切り替え`);
      render();
    });
    render();
  }
  const detail = document.querySelector('#article-detail');
  if (detail) {
    const id = new URLSearchParams(location.search).get('id');
    const article = articles.find(article => article.id === id);
    if (!article) { document.querySelector('#article-missing').hidden = false; detail.hidden = true; return; }
    document.title = 'Koke';
    document.querySelector('meta[name="description"]').content = 'Kokeのサイトです。';
    const cover = library.safeURL(article.cover,true);
    detail.innerHTML = `<header class="article-detail-header"><time datetime="${library.escape(article.date)}">${library.escape(article.date.replaceAll('-','.'))}</time><h1>${library.escape(article.title)}</h1></header>${cover ? `<img class="article-detail-cover" src="${library.escape(cover)}" alt="">` : ''}<div class="article-body">${library.renderBody(article.body)}</div>`;
  }
})();
