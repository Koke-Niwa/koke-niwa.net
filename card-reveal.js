(() => {
  'use strict';
  const create = container => {
    if (!container) return null;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let pageReady = false;
    const reveal = cards => {
      if (!pageReady) return;
      const columns = Math.max(1,getComputedStyle(container).gridTemplateColumns.split(' ').length);
      cards.filter(card => card.isConnected && card.classList.contains('is-pending')).forEach((card,index) => {
        observer?.unobserve(card);
        card.classList.remove('is-pending');
        if (reduced.matches) return;
        card.style.setProperty('--reveal-delay',`${Math.min(Math.floor(index / columns) * 65,260)}ms`);
        card.classList.add('is-revealing');
        card.addEventListener('animationend',() => card.classList.remove('is-revealing'),{once:true});
      });
    };
    const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
      reveal(entries.filter(entry => entry.isIntersecting).map(entry => entry.target)
        .sort((a,b) => Number(a.dataset.position) - Number(b.dataset.position)));
    },{threshold:.06}) : null;
    const revealVisible = () => {
      reveal([...container.querySelectorAll('.is-pending')].filter(card => {
        const rect = card.getBoundingClientRect();
        return rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
      }));
    };
    // Reveal visible cards as soon as the initial list has been rendered.
    Promise.resolve().then(() => {
      pageReady = true;
      revealVisible();
    });
    reduced.addEventListener('change',() => {
      if (!reduced.matches) return;
      observer?.disconnect();
      [...container.children].forEach(card => card.classList.remove('is-pending','is-revealing'));
    });
    container.addEventListener('focusin',event => {
      const card = event.target.closest('.song-card,.article-card');
      if (!card) return;
      observer?.unobserve(card);
      card.classList.remove('is-pending','is-revealing');
    });
    return {
      disconnect: () => observer?.disconnect(),
      prepare(card,index) {
        card.dataset.position = index;
        if (observer && !reduced.matches) card.classList.add('is-pending');
      },
      observe(card) {
        if (card.classList.contains('is-pending')) observer?.observe(card);
      }
    };
  };
  window.KOKE_CARD_REVEAL = {create};
})();
