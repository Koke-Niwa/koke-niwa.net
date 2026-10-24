(() => {
  'use strict';
  const players = [...document.querySelectorAll('.free-preview')];
  const time = seconds => {
    if (!Number.isFinite(seconds)) return '—:—';
    return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2,'0')}`;
  };
  players.forEach(root => {
    const audio = root.querySelector('audio');
    const button = root.querySelector('.free-play');
    const icon = button.querySelector('img');
    const seek = root.querySelector('.free-seek');
    const current = root.querySelector('.free-current');
    const duration = root.querySelector('.free-duration');
    const error = root.querySelector('.free-play-error');
    const volumeRoot = root.parentElement.querySelector('.free-volume');
    const volume = volumeRoot.querySelector('.free-volume-range');
    const volumeToggle = volumeRoot.querySelector('.free-volume-toggle');
    const volumePanel = volumeRoot.querySelector('.free-volume-panel');
    const updateVolume = () => {
      volume.value = Math.round(audio.volume * 100);
      volume.style.setProperty('--progress',`${volume.value}%`);
      volume.setAttribute('aria-valuetext',`${volume.value}%`);
    };
    volume.addEventListener('input',() => { audio.volume = Number(volume.value) / 100; updateVolume(); });
    audio.addEventListener('volumechange',updateVolume);
    updateVolume();

    // Keep the icon-to-slider path stable, including native range pointer capture.
    let volumeOpen = false;
    let volumeDragging = false;
    let volumeCloseTimer = 0;
    let volumePointer = {clientX:-1,clientY:-1};
    const rememberPointer = event => { volumePointer = {clientX:event.clientX,clientY:event.clientY}; };
    const showVolume = open => {
      clearTimeout(volumeCloseTimer);
      volumeCloseTimer = 0;
      volumeOpen = open;
      volumeRoot.classList.toggle('is-open',open);
      volumeToggle.setAttribute('aria-expanded',String(open));
      volumePanel.inert = !open;
    };
    const pointerInVolume = event => [volumeRoot,...(volumeOpen ? [volumePanel] : [])].some(element => {
      const rect = element.getBoundingClientRect();
      return event.clientX >= rect.left && event.clientX < rect.right
        && event.clientY >= rect.top && event.clientY < rect.bottom;
    });
    const queueVolumeClose = () => {
      if (volumeCloseTimer || volumeDragging || volumeRoot.querySelector(':focus-visible')) return;
      volumeCloseTimer = setTimeout(() => {
        volumeCloseTimer = 0;
        if (!volumeDragging && !pointerInVolume(volumePointer) && !volumeRoot.querySelector(':focus-visible')) showVolume(false);
      },100);
    };
    volumeRoot.addEventListener('pointerenter',event => {
      if (event.pointerType !== 'mouse') return;
      rememberPointer(event);
      showVolume(true);
    });
    volumeRoot.addEventListener('pointerleave',queueVolumeClose);
    document.addEventListener('pointermove',event => {
      if (!volumeOpen || event.pointerType !== 'mouse') return;
      rememberPointer(event);
      if (pointerInVolume(event)) { clearTimeout(volumeCloseTimer); volumeCloseTimer = 0; }
      else queueVolumeClose();
    },{passive:true});
    volumeRoot.addEventListener('focusin',event => { if (event.target.matches(':focus-visible')) showVolume(true); });
    volumeRoot.addEventListener('focusout',event => queueMicrotask(() => {
      const focusOutside = event.relatedTarget && !volumeRoot.contains(event.relatedTarget);
      if (!volumeDragging && !volumeRoot.contains(document.activeElement)
        && (focusOutside || !pointerInVolume(volumePointer))) showVolume(false);
    }));
    volumeToggle.addEventListener('click',event => showVolume(event.detail === 0 || matchMedia('(hover: none)').matches ? !volumeOpen : true));
    volume.addEventListener('pointerdown',event => {
      rememberPointer(event);
      volumeDragging = true;
      clearTimeout(volumeCloseTimer);
      volumeCloseTimer = 0;
    });
    document.addEventListener('pointerup',event => {
      rememberPointer(event);
      volumeDragging = false;
      if (!pointerInVolume(event) && !volumeRoot.querySelector(':focus-visible')) showVolume(false);
    });
    document.addEventListener('pointerdown',event => { if (!volumeRoot.contains(event.target)) showVolume(false); });
    volumeRoot.addEventListener('keydown',event => {
      if (event.key === 'Escape') { volumeToggle.focus(); showVolume(false); }
    });
    const showError = () => {
      error.textContent = '音源を再生できませんでした。もう一度お試しください。';
      error.hidden = false;
    };
    const updateState = () => {
      const playing = !audio.paused && !audio.ended;
      button.setAttribute('aria-label',`${root.dataset.title}を${playing ? '一時停止' : '再生'}`);
      button.setAttribute('aria-pressed',String(playing));
      icon.src = `./assets/icons/lucide/${playing ? 'pause' : 'play'}.svg`;
      root.classList.toggle('is-playing',playing);
      if (!playing) root.classList.remove('is-loading');
    };
    const updateTime = () => {
      const ready = Number.isFinite(audio.duration) && audio.duration > 0;
      seek.disabled = !ready;
      seek.max = ready ? audio.duration : 100;
      seek.value = audio.currentTime;
      seek.style.setProperty('--progress',`${ready ? audio.currentTime / audio.duration * 100 : 0}%`);
      seek.setAttribute('aria-valuetext',`${time(audio.currentTime)} / ${time(audio.duration)}`);
      current.textContent = time(audio.currentTime);
      duration.textContent = time(audio.duration);
    };
    button.addEventListener('click',async () => {
      error.hidden = true;
      if (!audio.paused) { audio.pause(); return; }
      players.forEach(other => { if (other !== root) other.querySelector('audio').pause(); });
      if (audio.ended) audio.currentTime = 0;
      if (audio.error) audio.load();
      root.classList.add('is-loading');
      try { await audio.play(); } catch (failure) {
        if (failure.name !== 'AbortError') showError();
      } finally { root.classList.remove('is-loading'); updateState(); }
    });
    seek.addEventListener('input',() => {
      if (!Number.isFinite(audio.duration)) return;
      audio.currentTime = Number(seek.value);
      updateTime();
    });
    ['loadedmetadata','durationchange','timeupdate','seeked'].forEach(name => audio.addEventListener(name,updateTime));
    ['play','pause','ended'].forEach(name => audio.addEventListener(name,updateState));
    audio.addEventListener('waiting',() => { if (!audio.paused) root.classList.add('is-loading'); });
    audio.addEventListener('playing',() => root.classList.remove('is-loading'));
    audio.addEventListener('error',() => { root.classList.remove('is-loading'); updateState(); showError(); });
    window.addEventListener('pagehide',() => audio.pause());
    updateTime();
    updateState();
  });
})();
