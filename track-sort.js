(() => {
  'use strict';
  const names = new Intl.Collator('ja', {numeric:true, sensitivity:'base'});
  const dateValue = value => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
    const time = Date.parse(`${value}T00:00:00Z`);
    return Number.isFinite(time) && new Date(time).toISOString().slice(0,10) === value ? time : NaN;
  };
  // An explicit release date takes priority over the video's publication date.
  const trackDate = track => {
    const release = dateValue(track.releaseDate);
    return Number.isFinite(release) ? release : dateValue(track.publishedAt);
  };
  window.KOKE_SORT_TRACKS = (tracks, order = 'newest') => {
    const entries = tracks.map((track,index) => ({track,index,date:trackDate(track)}));
    entries.sort((a,b) => {
      if (order === 'name') return names.compare(a.track.title,b.track.title) || a.index - b.index;
      if (order !== 'newest' && order !== 'oldest') return a.index - b.index;
      const aDated = Number.isFinite(a.date);
      const bDated = Number.isFinite(b.date);
      if (aDated !== bDated) return aDated ? -1 : 1;
      if (aDated && a.date !== b.date) return order === 'newest' ? b.date - a.date : a.date - b.date;
      return a.index - b.index;
    });
    return entries.map(entry => entry.track);
  };
})();
