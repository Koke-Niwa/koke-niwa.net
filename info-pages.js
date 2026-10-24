(() => {
  'use strict';
  const content = window.KOKE_CONTENT;
  const library = window.KOKE_ARTICLES;
  const commission = document.querySelector('#commission-copy');
  if (commission && content.commissionText?.trim()) {
    commission.classList.remove('section-empty');
    commission.innerHTML = library.renderBody(content.commissionText);
    commission.classList.add('article-body');
  }
  const list = document.querySelector('#free-tracks');
  if (!list) return;
  const tracks = content.tracks.filter(track=>track.rhythmFree);
  tracks.forEach(track => {
    const article = document.createElement('article'); article.className = 'free-track';
    const download = library.safeURL(track.downloadUrl,true);
    const preview = library.safeURL(track.previewUrl,true);
    const art = library.safeURL(track.art,true);
    article.innerHTML = `${art ? `<img class="free-track-cover" src="${library.escape(art)}" alt="${library.escape(track.title)}のジャケット" loading="lazy">` : ''}<div class="free-track-details"><div class="free-track-meta"><h3>${library.escape(track.title)}</h3><p class="free-track-artist">Composer: ${library.escape(track.artist)}</p>${art ? `<p class="free-track-artist">Artwork: ${library.escape(track.artworkCredit || '記載準備中')}</p>` : ''}${track.licenseNotes ? `<p class="free-track-conditions">${library.escape(track.licenseNotes)}</p>` : ''}</div><div class="free-track-controls${preview ? '' : ' is-pending'}">${download ? `<a class="free-download" href="${library.escape(download)}" download aria-label="${library.escape(track.title)}の音源をダウンロード" title="音源をダウンロード"><img src="./assets/icons/lucide/download.svg" width="20" height="20" alt="" aria-hidden="true"></a>` : '<p class="download-pending">配布音源は準備中です。</p>'}</div></div>`;
    const controls = article.querySelector('.free-track-controls');
    if (preview) {
      const player = document.createElement('div');
      player.className = 'free-preview';
      player.dataset.title = track.title;
      player.innerHTML = `<audio preload="metadata" src="${library.escape(preview)}"></audio><div class="free-playback"><button class="free-play" type="button" aria-label="${library.escape(track.title)}を再生" aria-pressed="false"><img src="./assets/icons/lucide/play.svg" width="16" height="16" alt="" aria-hidden="true"></button><div class="free-timeline"><input class="free-seek" type="range" min="0" max="100" value="0" step="0.1" aria-label="${library.escape(track.title)}の再生位置" disabled><div class="free-times" aria-hidden="true"><span class="free-current">0:00</span><span class="free-duration">—:—</span></div></div></div><p class="free-play-error" role="status" hidden></p>`;
      controls.prepend(player);
    } else {
      const pending = document.createElement('p');
      pending.className = 'preview-pending';
      pending.textContent = '試聴音源は準備中です。';
      controls.prepend(pending);
    }
    list.append(article);
  });
  document.querySelector('#free-empty').hidden = tracks.length > 0;
})();
