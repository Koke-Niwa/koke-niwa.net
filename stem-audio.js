(() => {
  'use strict';
  // Every stem uses one audio clock and an identical start time / seek offset.
  class StemMixer {
    constructor(tracks, onChange = () => {}) {
      this.tracks = tracks.map(track => ({...track, enabled:true, volume:1}));
      this.onChange = onChange;
      this.state = 'idle'; this.offset = 0; this.duration = 0; this.volume = .55; this.loop = false;
      this.buffers = []; this.sources = []; this.loaded = 0; this.request = 0;
    }
    get position() {
      if (this.state !== 'playing') return this.offset;
      const elapsed = this.offset + Math.max(0, this.context.currentTime - this.startedAt);
      return this.loop && this.duration ? elapsed % this.duration : Math.min(this.duration,elapsed);
    }
    notify() { this.onChange(this); }
    ensureContext() {
      if (this.context) return;
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error('このブラウザーでは再生できません。別のブラウザーでお試しください。');
      this.context = new Audio();
      this.context.addEventListener?.('statechange',() => {
        if (this.state === 'playing' && this.context.state !== 'running') this.pause();
      });
      this.master = this.context.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.context.destination);
      this.gains = this.tracks.map(track => {
        const gain = this.context.createGain();
        gain.gain.value = track.enabled ? track.volume : 0;
        gain.connect(this.master); return gain;
      });
    }
    async load() {
      if (window.location?.protocol === 'file:') throw new Error('音源はプレビュー画面から再生してください。');
      if (this.tracks.every((_,index) => this.buffers[index])) return;
      if (this.loading) return this.loading;
      this.state = 'loading'; this.error = ''; this.notify();
      this.controller = new AbortController();
      const signal = this.controller.signal;
      const timeout = setTimeout(() => this.controller.abort(),35000);
      this.loading = (async () => {
        let next = 0;
        const worker = async () => {
          while (next < this.tracks.length) {
            const index = next++;
            if (this.buffers[index]) continue;
            const response = await fetch(this.tracks[index].src, {signal});
            if (!response.ok) throw new Error('音源を読み込めませんでした。もう一度再生してください。');
            const buffer = await this.context.decodeAudioData(await response.arrayBuffer());
            if (signal.aborted) return;
            this.buffers[index] = buffer;
            this.loaded = this.buffers.filter(Boolean).length; this.notify();
          }
        };
        const tasks = [worker(), worker()];
        try { await Promise.all(tasks); }
        catch (error) { this.controller.abort(); await Promise.allSettled(tasks); throw error; }
        this.duration = Math.max(...this.buffers.map(buffer => buffer.duration));
        // MP3 padding can differ by a few milliseconds. Share one loop boundary.
        this.buffers = this.buffers.map(buffer => {
          if (buffer.duration === this.duration) return buffer;
          const padded = this.context.createBuffer(buffer.numberOfChannels,Math.round(this.duration * buffer.sampleRate),buffer.sampleRate);
          for (let channel = 0; channel < buffer.numberOfChannels; channel++) padded.copyToChannel(buffer.getChannelData(channel),channel);
          return padded;
        });
      })();
      try { await this.loading; } finally { clearTimeout(timeout); this.loading = null; }
    }
    async play() {
      if (['playing','loading','starting'].includes(this.state) || this.disposed) return;
      const request = ++this.request;
      try {
        this.ensureContext();
        this.error = ''; this.state = 'loading'; this.notify();
        // Unlock during the gesture, but never block loading on a pending resume.
        const resume = this.context.resume().then(() => true,() => false);
        await this.load();
        if (request !== this.request || this.disposed) return;
        this.state = 'starting'; this.notify();
        await new Promise(resolve => {
          const timeout = setTimeout(resolve,2000);
          resume.then(() => { clearTimeout(timeout); resolve(); });
        });
        if (request !== this.request || this.disposed) return;
        if (this.context.state !== 'running') throw new Error('音源の準備ができました。もう一度再生ボタンを押してください。');
        if (this.offset >= this.duration) this.offset = 0;
        this.start();
      } catch (error) {
        if (this.disposed || request !== this.request) return;
        this.state = 'error';
        this.error = error.name === 'AbortError' ? '音源を読み込めませんでした。もう一度再生してください。' : error.message || '再生できませんでした。もう一度お試しください。';
        this.notify();
      }
    }
    start() {
      this.stopSources();
      this.startedAt = this.context.currentTime + .06;
      this.sources = this.buffers.map((buffer, index) => {
        if (this.offset >= buffer.duration) return null;
        const source = this.context.createBufferSource();
        source.buffer = buffer; source.connect(this.gains[index]);
        source.loop = this.loop; source.loopStart = 0; source.loopEnd = this.duration;
        if (buffer.duration === this.duration) source.onended = () => {
          if (this.state !== 'playing' || this.loop) return;
          this.offset = this.duration; this.state = 'ended'; this.stopSources(); this.notify();
        };
        source.start(this.startedAt, this.offset); return source;
      });
      this.state = 'playing'; this.notify();
    }
    stopSources() {
      this.sources.forEach(source => {
        if (!source) return;
        source.onended = null;
        try { source.stop(); } catch { /* Already ended. */ }
        source.disconnect();
      });
      this.sources = [];
    }
    pause() {
      if (this.state !== 'playing') return;
      this.offset = this.position; this.state = 'paused';
      this.stopSources(); this.notify();
    }
    seek(seconds) {
      if (!this.duration) return;
      const playing = this.state === 'playing';
      this.offset = Math.max(0, Math.min(this.duration, Number(seconds) || 0));
      if (playing && this.loop && this.offset >= this.duration) this.offset = 0;
      this.stopSources();
      if (this.offset >= this.duration) this.state = 'ended';
      else if (playing) { this.start(); return; }
      else this.state = 'paused';
      this.notify();
    }
    ramp(node, value) {
      if (!node) return;
      node.gain.cancelScheduledValues(this.context.currentTime);
      node.gain.setTargetAtTime(value, this.context.currentTime, .012);
    }
    setEnabled(index, enabled) {
      const track = this.tracks[index]; if (!track) return;
      track.enabled = Boolean(enabled);
      this.ramp(this.gains?.[index], track.enabled ? track.volume : 0); this.notify();
    }
    setTrackVolume(index, value) {
      const track = this.tracks[index]; if (!track) return;
      track.volume = Math.max(0, Math.min(1, Number(value) || 0));
      this.ramp(this.gains?.[index], track.enabled ? track.volume : 0); this.notify();
    }
    setVolume(value) {
      this.volume = Math.max(0, Math.min(1, Number(value) || 0));
      this.ramp(this.master, this.volume); this.notify();
    }
    setLoop(enabled) {
      const position = this.position;
      if (this.state === 'playing') {
        this.offset = position;
        this.startedAt = Math.max(this.startedAt,this.context.currentTime);
      }
      this.loop = Boolean(enabled);
      this.sources.forEach(source => { if (source) source.loop = this.loop; });
      this.notify();
    }
    dispose() {
      this.disposed = true; ++this.request; this.controller?.abort();
      this.state = 'disposed'; this.stopSources(); this.buffers = []; this.context?.close();
    }
  }
  window.KOKE_STEM_AUDIO = {StemMixer};
})();
