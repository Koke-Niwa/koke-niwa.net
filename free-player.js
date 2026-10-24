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
