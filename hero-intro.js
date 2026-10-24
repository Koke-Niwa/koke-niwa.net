/* Short monochrome scan-line reveal. The real heading remains accessible. */
(() => {
  'use strict';
  const heading = document.querySelector('.hero-heading');
  const word = heading?.querySelector('.hero-title-word');
  const text = word?.querySelector('.hero-title-text');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (!text || reduced.matches) return;

  const slices = document.createElement('span');
  slices.className = 'hero-title-slices';
  slices.setAttribute('aria-hidden', 'true');
  const offsets = [-18, 10, -7, 22, -13, 6, 15, -9];
  const delays = [0, 30, 10, 60, 20, 70, 40, 50];
  offsets.forEach((offset, index) => {
    const slice = document.createElement('span');
    slice.className = 'hero-title-slice';
    slice.textContent = text.textContent;
    slice.style.setProperty('--slice-x', `${offset}px`);
    slice.style.setProperty('--slice-delay', `${delays[index]}ms`);
    slice.style.clipPath = `inset(${index * 12.5}% -32px ${100 - (index + 1) * 12.5}% -32px)`;
    slices.append(slice);
  });
  word.append(slices);
  heading.classList.add('is-intro-preparing');

  let frame = 0;
  let profileTimer = 0;
  let finishTimer = 0;
  const finish = () => {
    cancelAnimationFrame(frame);
    clearTimeout(profileTimer);
    clearTimeout(finishTimer);
    heading.classList.remove('is-intro-preparing', 'is-intro-active');
    heading.classList.add('is-profile-visible');
    slices.remove();
    window.removeEventListener('pagehide', finish);
    reduced.removeEventListener('change', finish);
  };
  window.addEventListener('pagehide', finish, {once: true});
  reduced.addEventListener('change', finish, {once: true});
  frame = requestAnimationFrame(() => {
    heading.classList.replace('is-intro-preparing', 'is-intro-active');
    profileTimer = setTimeout(() => heading.classList.add('is-profile-visible'), 500);
    finishTimer = setTimeout(finish, 700);
  });
})();
