(() => {
  'use strict';
  const content = window.KOKE_CONTENT;
  const grid = document.querySelector('#track-grid');
  const trackSort = document.querySelector('#track-sort');
  const trackOrders = [
    {value:'newest',label:'新しい順'},
    {value:'oldest',label:'古い順'},
    {value:'name',label:'名前順'}
  ];
  let trackOrderIndex = 0;
  const library = window.KOKE_LIBRARY;
  const searchInput = document.querySelector('#track-search');
  const tagFilters = document.querySelector('#track-tags');
  const resetFilters = document.querySelector('#track-reset');
  const selectedTags = new Set();
  const tagMenu = document.querySelector('#tag-menu');
  const tagMenuToggle = document.querySelector('#tag-menu-toggle');
  const tagPanel = document.querySelector('#tag-panel');
  const setTagMenuOpen = open => {
    if (!tagPanel) return;
    tagPanel.hidden = !open;
    tagMenuToggle.setAttribute('aria-expanded',String(open));
  };
  tagMenuToggle?.addEventListener('click',() => {
    const open = tagPanel.hidden;
    setTagMenuOpen(open);
    if (open) tagPanel.querySelector('[aria-pressed="true"]')?.focus({preventScroll:true});
  });
  document.addEventListener('click',event => {
    if (tagMenu && !tagMenu.contains(event.target)) setTagMenuOpen(false);
  });
  tagMenu?.addEventListener('keydown',event => {
    if (event.key === 'Escape' && !tagPanel.hidden) {
      event.preventDefault();
      setTagMenuOpen(false);
      tagMenuToggle.focus({preventScroll:true});
    }
  });
  tagMenu?.addEventListener('focusout',event => {
    if (!tagMenu.contains(event.relatedTarget)) setTagMenuOpen(false);
  });
  const header = document.querySelector('.site-header');

  // Accumulate travel before switching direction, so tiny scrolls do not flicker.
  let lastScrollY = Math.max(0, window.scrollY);
  let scrollDirection = 0;
  let scrollTravel = 0;
  let scrollFrame = 0;
  const updateHeader = () => {
    scrollFrame = 0;
    const maximum = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const position = Math.min(maximum, Math.max(0, window.scrollY));
    const delta = position - lastScrollY;
    lastScrollY = position;
    if (position <= header.offsetHeight) {
      header.classList.remove('is-hidden');
      scrollTravel = 0;
      scrollDirection = 0;
      return;
    }
    if (!delta) return;
    const direction = Math.sign(delta);
    scrollTravel = direction === scrollDirection ? scrollTravel + Math.abs(delta) : Math.abs(delta);
    scrollDirection = direction;
    if (scrollTravel >= (direction > 0 ? 12 : 8)) {
      header.classList.toggle('is-hidden', direction > 0);
      scrollTravel = 0;
    }
  };
  window.addEventListener('scroll', () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateHeader);
  }, { passive: true });
  window.addEventListener('resize', () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateHeader);
  }, { passive: true });
  header.addEventListener('focusin', () => {
    header.classList.remove('is-hidden');
    scrollTravel = 0;
  });
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeUrl = (value, local = false) => {
    if (!value) return '';
    try { const url = new URL(value, document.baseURI); return url.protocol === 'https:' || (local && url.origin === location.origin) ? url.href : ''; } catch { return ''; }
  };
  const creditsList = document.querySelector('#credits-list');
  const creditGroups = new Map();
  (creditsList ? content.credits || [] : []).forEach(credit => {
    const category = credit.category || 'その他';
    if (!creditGroups.has(category)) {
      const group = document.createElement('section');
      group.className = 'credit-group';
      const heading = document.createElement('h3');
      heading.className = 'credit-category';
      heading.textContent = category;
      group.append(heading);
      creditsList.append(group);
      creditGroups.set(category,group);
    }
    const entry = document.createElement('article');
    entry.className = 'credit-entry';
    const url = safeUrl(credit.url);
    const title = escapeHtml(credit.title || '');
    entry.innerHTML = `<h4>${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${title}</a>` : title}${credit.artist ? `<span class="credit-artist"> / ${escapeHtml(credit.artist)}</span>` : ''}</h4>${credit.detail ? `<p>${escapeHtml(credit.detail)}</p>` : ''}`;
    creditGroups.get(category).append(entry);
  });
  if (creditsList) document.querySelector('#credits-empty').hidden = creditsList.children.length > 0;
  const newsList = document.querySelector('#news-list');
  if (newsList) {
    const news = [...(content.news || [])].sort((a,b) => String(b.date || '').localeCompare(String(a.date || '')));
    news.forEach(item => {
      const entry = document.createElement('article');
      entry.className = 'news-entry';
      const date = /^\d{4}-\d{2}-\d{2}$/.test(item.date || '') ? item.date : '';
      const url = safeUrl(item.url,true);
      const linkAttributes = url && new URL(url).origin !== location.origin ? ' target="_blank" rel="noopener noreferrer"' : '';
      const title = escapeHtml(item.title || '');
      entry.innerHTML = `${date ? `<time datetime="${date}">${date.replaceAll('-','.')}</time>` : '<span aria-hidden="true"></span>'}<div class="news-content"><h3>${url ? `<a href="${escapeHtml(url)}"${linkAttributes}>${title}</a>` : title}</h3>${item.body ? `<p>${escapeHtml(item.body)}</p>` : ''}</div>`;
      newsList.append(entry);
    });
    document.querySelector('#news-empty').hidden = news.length > 0;
    newsList.hidden = news.length === 0;
  }
  const cardReveals = window.KOKE_CARD_REVEAL?.create(grid);
  const renderTracks = () => {
    if (!grid || !trackSort) return;
    cardReveals?.disconnect();
    grid.replaceChildren();
    const filtered = content.tracks.filter(track => library.matches(track,searchInput.value,[...selectedTags]));
    window.KOKE_SORT_TRACKS(filtered,trackOrders[trackOrderIndex].value).forEach((track,index) => {
      const article = document.createElement('article');
      article.className = 'song-card';
      const title = escapeHtml(track.title);
      const art = safeUrl(track.art,true);
      const links = [...(track.links || [])];
      if (track.youtubeUrl) links.unshift({label:'YouTube',url:track.youtubeUrl});
      const listenLinks = links.map(link => {
        const url = safeUrl(link.url);
        if (!url) return '';
        const hostname = new URL(url).hostname;
        const service = [
          ['youtube',['youtube.com','youtu.be']],
          ['soundcloud',['soundcloud.com']],
          ['x',['x.com','twitter.com']],
          ['niconico',['nicovideo.jp','nico.ms']]
        ].find(([,hosts]) => hosts.some(host => hostname === host || hostname.endsWith(`.${host}`)))?.[0];
        const icon = service && header.querySelector(`[data-social="${service}"] img`);
        const label = escapeHtml(link.label || '視聴する');
        return icon
          ? `<a class="social-icon song-service" data-service="${service}" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" aria-label="${title}を${label}で視聴（新しいタブで開く）" title="${label}で視聴">${icon.outerHTML}</a>`
          : `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${label}<span aria-hidden="true">↗</span></a>`;
      }).join('');
      article.innerHTML = `<div class="song-cover">${art ? `<img src="${escapeHtml(art)}" alt="${title}のジャケット" loading="lazy">` : '<span>No Image</span>'}</div><div class="song-info"><h3>${title}</h3><p class="song-artist"><span class="song-credit-label">Composer:</span> ${escapeHtml(track.artist || 'Koke')}</p>${(track.tags || []).includes('vocal') || track.vocal ? `<p class="song-vocal"><span class="song-credit-label">Vocal:</span> ${escapeHtml(track.vocal || '—')}</p>` : ''}<p class="song-artwork"><span class="song-credit-label">Artwork:</span> ${escapeHtml(track.artworkCredit || '—')}</p><div class="song-links">${listenLinks || '<span class="song-link-pending">視聴リンク準備中</span>'}</div></div>`;
      if (track.artCrop === 'left') article.querySelector('.song-cover').classList.add('crop-left');
      if (track.artCrop === 'center') article.querySelector('.song-cover').classList.add('crop-center');
      cardReveals?.prepare(article,index);
      grid.append(article);
      cardReveals?.observe(article);
    });
    const empty = document.querySelector('#music-empty');
    empty.hidden = filtered.length > 0;
    empty.textContent = content.tracks.length ? '条件に一致する楽曲がありません。検索語やタグを変えてみてください。' : '掲載する楽曲を準備しています。';
    document.querySelector('#music-sort-status').textContent = `${filtered.length} / ${content.tracks.length}曲 · ${trackOrders[trackOrderIndex].label}`;
    resetFilters.hidden = !searchInput.value && selectedTags.size === 0;
    tagFilters.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed',button.dataset.tag ? String(selectedTags.has(button.dataset.tag)) : String(selectedTags.size === 0)));
    const tagCount = document.querySelector('#tag-selection-count');
    tagCount.hidden = selectedTags.size === 0;
    tagCount.textContent = selectedTags.size;
    tagMenuToggle.classList.toggle('has-selection',selectedTags.size > 0);
    tagMenuToggle.setAttribute('aria-label',selectedTags.size ? `タグで絞り込む。${[...selectedTags].join('・')}を選択中` : 'タグで絞り込む');
  };
  if (tagFilters) {
    ['',...library.allTags(content.tracks)].forEach(tag => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tag-filter';
      button.dataset.tag = tag;
      button.setAttribute('aria-controls','track-grid');
      button.textContent = tag || 'すべて';
      button.addEventListener('click',() => {
        if (!tag) selectedTags.clear();
        else if (selectedTags.has(tag)) selectedTags.delete(tag);
        else selectedTags.add(tag);
        renderTracks();
      });
      tagFilters.append(button);
    });
  }
  searchInput?.addEventListener('input',renderTracks);
  resetFilters?.addEventListener('click',() => {
    searchInput.value = '';
    selectedTags.clear();
    renderTracks();
    searchInput.focus();
  });
  trackSort?.addEventListener('click',() => {
    trackOrderIndex = (trackOrderIndex + 1) % trackOrders.length;
    const label = trackSort.querySelector('.sort-label');
    label.textContent = trackOrders[trackOrderIndex].label;
    const next = trackOrders[(trackOrderIndex + 1) % trackOrders.length].label;
    trackSort.setAttribute('aria-label',`${label.textContent}。押すと${next}に切り替え`);
    renderTracks();
  });
  document.querySelectorAll('[data-social]').forEach(button => {
    const network = button.dataset.social;
    const url = safeUrl(content[network]);
    if (url) {
      const anchor = document.createElement('a');
      anchor.className = button.className;
      for (const name of ['aria-label', 'title']) {
        if (button.hasAttribute(name)) anchor.setAttribute(name, button.getAttribute(name));
      }
      anchor.dataset.social = network;
      anchor.innerHTML = button.innerHTML;
      anchor.href = url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      button.replaceWith(anchor);
    } else {button.disabled = true;button.title = 'リンク準備中';}
  });

  const menuButton = document.querySelector('#menu-toggle');
  const menu = document.querySelector('#site-menu');
  const menuPanel = menu.querySelector('.menu-panel');
  const reducedMenuMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const desktopNavigation = matchMedia('(min-width:760px)');
  let menuClosing = false;
  let menuScrollbarGap = 0;
  let menuCloseTimer = 0;
  let menuTransitionEnd = null;
  const resetMenu = () => {
    clearTimeout(menuCloseTimer);
    if (menuTransitionEnd) menu.removeEventListener('transitionend',menuTransitionEnd);
    menuTransitionEnd = null;
    menu.classList.remove('is-open');
    menu.close();
    menu.before(menuButton);
    document.body.classList.remove('menu-open');
    menuButton.setAttribute('aria-expanded','false');
    menuButton.setAttribute('aria-label','メニューを開く');
    menuClosing = false;
  };
  const closeMenu = () => {
    if (!menu.open || menuClosing) return;
    menuClosing = true;
    menu.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded','false');
    menuButton.setAttribute('aria-label','メニューを開く');
    const finish = () => {
      resetMenu();
      if (!desktopNavigation.matches) menuButton.focus({preventScroll:true});
    };
    menuTransitionEnd = event => {
      if (event.target === menuPanel && event.propertyName === 'transform') finish();
    };
    if (reducedMenuMotion.matches) finish();
    else {
      menu.addEventListener('transitionend',menuTransitionEnd);
      menuCloseTimer = setTimeout(finish,500);
    }
  };
  menuButton.addEventListener('click',() => {
    if (desktopNavigation.matches) return;
    if (menu.open) { closeMenu(); return; }
    menuClosing = false;
    menuScrollbarGap = window.innerWidth - document.documentElement.clientWidth;
    menu.style.setProperty('--toggle-left',`${menuButton.getBoundingClientRect().left}px`);
    menu.append(menuButton);
    menu.showModal();
    document.body.classList.add('menu-open');
    menuButton.focus({preventScroll:true});
    // Establish the closed panel before starting one continuous slide.
    menuPanel.getBoundingClientRect();
    menu.classList.add('is-open');
    menuButton.setAttribute('aria-expanded','true');
    menuButton.setAttribute('aria-label','メニューを閉じる');
  });
  menu.addEventListener('cancel',event => {event.preventDefault();closeMenu();});
  menu.addEventListener('click',event => {
    if (event.target === menu) closeMenu();
  });
  menu.querySelectorAll('.menu-navigation a').forEach(link => link.addEventListener('click',() => {
    // Close the modal before the browser follows either a page link or a same-page anchor.
    resetMenu();
  }));
  desktopNavigation.addEventListener('change',event => {
    if (!event.matches || !menu.open) return;
    const restoreFocus = menu.contains(document.activeElement);
    resetMenu();
    if (restoreFocus) header.querySelector('.header-pages [aria-current="page"]')?.focus({preventScroll:true});
  });
  window.addEventListener('resize',() => {
    if (!menu.open) return;
    const right = matchMedia('(max-width:600px)').matches ? 12 : 24;
    menu.style.setProperty('--toggle-left',`${window.innerWidth - menuScrollbarGap - right - 44}px`);
  },{passive:true});
  window.addEventListener('pageshow',event => {if (event.persisted) resetMenu();});
  renderTracks();

  const pageIndexTargets = [...document.querySelectorAll('.page-index a')].map(link => ({
    link,target:document.getElementById(link.getAttribute('href').slice(1))
  })).filter(item => item.target);
  let pageIndexFrame = 0;
  const updatePageIndex = () => {
    pageIndexFrame = 0;
    if (!matchMedia('(min-width:1440px)').matches || !pageIndexTargets.length) return;
    const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
    const marker = atBottom ? window.innerHeight : window.innerHeight * .35;
    let current = pageIndexTargets[0];
    let nearestTop = -Infinity;
    pageIndexTargets.forEach(item => {
      const top = item.target.getBoundingClientRect().top;
      if (top <= marker && top > nearestTop) {current = item;nearestTop = top;}
    });
    pageIndexTargets.forEach(item => {
      if (item === current) item.link.setAttribute('aria-current','location');
      else item.link.removeAttribute('aria-current');
    });
  };
  const queuePageIndex = () => {
    if (!pageIndexFrame) pageIndexFrame = requestAnimationFrame(updatePageIndex);
  };
  pageIndexTargets.forEach(({link,target}) => link.addEventListener('click',() => {
    target.setAttribute('tabindex','-1');
    target.focus({preventScroll:true});
  }));
  window.addEventListener('scroll',queuePageIndex,{passive:true});
  window.addEventListener('resize',queuePageIndex,{passive:true});
  window.addEventListener('hashchange',queuePageIndex);
  updatePageIndex();
})();
