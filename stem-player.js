(() => {
  'use strict';
  const names = [
    ['Atmos','Atmos'], ['Bass','Bass'], ['Click','Click'],
    ['Grockenspiel','Glockenspiel'], ['Guitar','Guitar'], ['Harp','Harp'],
    ['Melodion','Melodion'], ['Percussion','Percussion'],
    ['Piano','Piano'], ['Violin','Violin']
  ];
  const tracks = names.map(([file,name]) => ({name,src:`./assets/audio/winter-bgm/GGX_Winter_${file}.mp3`}));
  const time = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2,'0')}`;
  document.querySelectorAll('[data-audio-mixer="winter-bgm"]').forEach(root => {
    root.className = 'stem-mixer';
    root.innerHTML = `<div class="stem-transport">
      <div class="stem-transport-heading"><h2>雪灯</h2><span>${tracks.length} TRACKS</span></div>
      <div class="stem-playback"><button type="button" class="stem-play" aria-label="再生"><img src="./assets/icons/lucide/play.svg" alt="" width="22" height="22"></button><div class="stem-timeline"><label class="sr-only" for="winter-seek">再生位置</label><input id="winter-seek" class="stem-seek" type="range" min="0" max="1" value="0" step="0.1" disabled><div class="stem-times"><span class="stem-current">0:00</span><span class="stem-duration">—:—</span></div></div>
      <div class="stem-actions"><button class="stem-loop" type="button" aria-label="ループをONにする" aria-pressed="false" title="ループ：OFF"><img src="./assets/icons/lucide/repeat.svg" alt="" width="18" height="18"></button><div class="stem-master"><button class="stem-volume-toggle" type="button" aria-label="全体の音量を調整" aria-expanded="false" aria-controls="winter-volume-panel"><img src="./assets/icons/lucide/volume-2.svg" alt="" width="18" height="18"></button><div class="stem-volume-panel" id="winter-volume-panel" inert><label class="sr-only" for="winter-volume">全体の音量</label><input id="winter-volume" type="range" min="0" max="100" value="55" aria-valuetext="55%"></div></div></div></div>
      <p class="stem-status" role="status" aria-live="polite"></p>
    </div><div class="stem-track-toolbar"><span>トラック</span><div><button type="button" data-stem-all="on">すべてON</button><button type="button" data-stem-all="off">すべてOFF</button></div></div>
    <div class="stem-track-grid">${tracks.map((track,index) => `<div class="stem-row" data-stem-row="${index}"><button class="stem-toggle" type="button" role="switch" data-stem="${index}" aria-checked="true" aria-label="${track.name}"><span class="stem-number">${String(index + 1).padStart(2,'0')}</span><span class="stem-name">${track.name}</span><span class="stem-switch" aria-hidden="true"></span></button></div>`).join('')}</div>`;
    const play = root.querySelector('.stem-play');
    const seek = root.querySelector('.stem-seek');
    const current = root.querySelector('.stem-current');
    const duration = root.querySelector('.stem-duration');
    const status = root.querySelector('.stem-status');
    const volume = root.querySelector('#winter-volume');
    const loop = root.querySelector('.stem-loop');
    volume.style.setProperty('--progress',`${volume.value}%`);
    const master = root.querySelector('.stem-master');
    const volumeToggle = root.querySelector('.stem-volume-toggle');
    const volumePanel = root.querySelector('.stem-volume-panel');
    let volumeOpen = false; let volumeDragging = false; let volumeCloseTimer = 0;
    let volumePointer = {clientX:-1,clientY:-1};
    const rememberVolumePointer = event => {
      volumePointer = {clientX:event.clientX,clientY:event.clientY};
    };
    const showVolume = open => {
      clearTimeout(volumeCloseTimer);
      volumeCloseTimer = 0;
      volumeOpen = open;
      master.classList.toggle('is-open',open);
      volumeToggle.setAttribute('aria-expanded',String(open));
      volumePanel.inert = !open;
    };
    const pointerInVolume = event => [master,...(volumeOpen ? [volumePanel] : [])].some(element => {
      const rect = element.getBoundingClientRect();
      return event.clientX >= rect.left && event.clientX < rect.right
        && event.clientY >= rect.top && event.clientY < rect.bottom;
    });
    const queueVolumeClose = () => {
      if (volumeCloseTimer || volumeDragging || master.querySelector(':focus-visible')) return;
      volumeCloseTimer = setTimeout(() => {
        volumeCloseTimer = 0;
        if (!volumeDragging && !pointerInVolume(volumePointer) && !master.querySelector(':focus-visible')) showVolume(false);
      },100);
    };
    master.addEventListener('pointerenter',event => {
      if (event.pointerType !== 'mouse') return;
      rememberVolumePointer(event);
      showVolume(true);
    });
    master.addEventListener('pointerleave',queueVolumeClose);
    document.addEventListener('pointermove',event => {
      if (!volumeOpen || event.pointerType !== 'mouse') return;
      rememberVolumePointer(event);
      if (pointerInVolume(event)) { clearTimeout(volumeCloseTimer); volumeCloseTimer = 0; }
      else queueVolumeClose();
    },{passive:true});
    master.addEventListener('focusin',event => { if (event.target.matches(':focus-visible')) showVolume(true); });
    master.addEventListener('focusout',event => queueMicrotask(() => {
      const focusOutside = event.relatedTarget && !master.contains(event.relatedTarget);
      if (!volumeDragging && !master.contains(document.activeElement)
        && (focusOutside || !pointerInVolume(volumePointer))) showVolume(false);
    }));
    volumeToggle.addEventListener('click',event => showVolume(event.detail === 0 || matchMedia('(hover: none)').matches ? !volumeOpen : true));
    volume.addEventListener('pointerdown',event => {
      rememberVolumePointer(event);
      volumeDragging = true;
      clearTimeout(volumeCloseTimer); volumeCloseTimer = 0;
    });
    document.addEventListener('pointerup',event => {
      rememberVolumePointer(event);
      volumeDragging = false;
      // Native range controls can briefly lose :hover during pointer capture.
      // Use the pointer's actual position so releasing the slider does not close it.
      if (!pointerInVolume(event) && !master.querySelector(':focus-visible')) showVolume(false);
    });
    document.addEventListener('pointerdown',event => { if (!master.contains(event.target)) showVolume(false); });
    master.addEventListener('keydown',event => { if (event.key === 'Escape') { volumeToggle.focus(); showVolume(false); } });
    const directFile = location.protocol === 'file:';
    const showPreviewLink = () => {
      status.textContent = '音源はプレビュー画面で再生できます。 ';
      const link = document.createElement('a');
      link.href = `http://127.0.0.1:4173/article.html${location.search}`;
      link.textContent = 'プレビューを開く';
      status.append(link); play.disabled = true;
    };
    let scrubbing = false; let frame = 0;
    const updateTime = () => {
      if (!scrubbing) {
        seek.value = mixer.position;
        current.textContent = time(mixer.position);
        seek.setAttribute('aria-valuetext',`${time(mixer.position)} / ${time(mixer.duration)}`);
        seek.style.setProperty('--progress',`${mixer.duration ? mixer.position / mixer.duration * 100 : 0}%`);
      }
    };
    const tick = () => { updateTime(); if (mixer.state === 'playing') frame = requestAnimationFrame(tick); };
    const mixer = new window.KOKE_STEM_AUDIO.StemMixer(tracks, () => {
      const playing = mixer.state === 'playing'; const loading = ['loading','starting'].includes(mixer.state);
      play.disabled = loading;
      play.classList.toggle('is-loading',loading);
      play.setAttribute('aria-label',loading ? '読み込み中' : playing ? '一時停止' : mixer.state === 'error' ? 'もう一度再生' : '再生');
      play.querySelector('img').src = `./assets/icons/lucide/${playing ? 'pause' : 'play'}.svg`;
      loop.setAttribute('aria-pressed',String(mixer.loop));
      loop.setAttribute('aria-label',mixer.loop ? 'ループをOFFにする' : 'ループをONにする');
      loop.title = `ループ：${mixer.loop ? 'ON' : 'OFF'}`;
      status.textContent = mixer.state === 'starting' ? '再生を開始しています…' : loading ? `音源を読み込んでいます… ${mixer.loaded} / ${tracks.length}` : mixer.error || '';
      status.classList.toggle('is-error',mixer.state === 'error');
      if (directFile) showPreviewLink();
      root.setAttribute('aria-busy',String(loading));
      seek.disabled = !mixer.duration; seek.max = mixer.duration || 1;
      duration.textContent = mixer.duration ? time(mixer.duration) : '—:—';
      tracks.forEach((_,index) => {
        const track = mixer.tracks[index]; const row = root.querySelector(`[data-stem-row="${index}"]`);
        row.classList.toggle('is-muted',!track.enabled);
        row.querySelector('button').setAttribute('aria-checked',String(track.enabled));
      });
      cancelAnimationFrame(frame); updateTime();
      if (playing) frame = requestAnimationFrame(tick);
    });
    play.addEventListener('click',() => mixer.state === 'playing' ? mixer.pause() : mixer.play());
    loop.addEventListener('click',() => mixer.setLoop(!mixer.loop));
    seek.addEventListener('input',() => { scrubbing = true; current.textContent = time(Number(seek.value)); seek.style.setProperty('--progress',`${Number(seek.value) / mixer.duration * 100}%`); });
    seek.addEventListener('change',() => { scrubbing = false; mixer.seek(seek.value); });
    seek.addEventListener('pointercancel',() => { scrubbing = false; updateTime(); });
    volume.addEventListener('input',() => {
      mixer.setVolume(Number(volume.value) / 100);
      volume.setAttribute('aria-valuetext',`${volume.value}%`);
      volume.style.setProperty('--progress',`${volume.value}%`);
    });
    root.querySelectorAll('[data-stem]').forEach(button => button.addEventListener('click',() => {
      const index = Number(button.dataset.stem); mixer.setEnabled(index,!mixer.tracks[index].enabled);
    }));
    root.querySelectorAll('[data-stem-all]').forEach(button => button.addEventListener('click',() => {
      tracks.forEach((_,index) => mixer.setEnabled(index,button.dataset.stemAll === 'on'));
    }));
    // Leaving the page stops sound and releases decoded audio memory.
    window.addEventListener('pagehide',() => { mixer.pause(); cancelAnimationFrame(frame); mixer.dispose(); },{once:true});
    window.addEventListener('pageshow',event => { if (event.persisted) location.reload(); });
    if (directFile) showPreviewLink();
  });
})();
