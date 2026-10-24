(() => {
  'use strict';
  const defaultTags = ['inst', 'vocal', 'リズムゲーム曲'];
  const normalize = value => String(value || '').normalize('NFKC').toLocaleLowerCase('ja')
    .replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
  const tags = value => [...new Set((Array.isArray(value) ? value : String(value || '').split(/[,、\n]/))
    .map(tag => String(tag).trim()).filter(Boolean))];
  const allTags = tracks => [...new Set([...defaultTags, ...tracks.flatMap(track => tags(track.tags))])];
  const matches = (track, query = '', selected = []) => {
    const trackTags = tags(track.tags);
    const haystack = normalize([track.title, track.artist, track.vocal, ...trackTags].join(' '));
    return normalize(query).trim().split(/\s+/).filter(Boolean).every(word => haystack.includes(word))
      && selected.every(tag => trackTags.includes(tag));
  };
  const validDate = value => !value || (/^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(`${value}T00:00:00Z`))
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0,10) === value);
  const validURL = (value, local = false) => {
    if (!value) return true;
    if (local && /^(\.\/)?assets\/[\w\-./ !()+\u0080-\uFFFF]+$/u.test(value)
      && !value.split('/').includes('..')) return true;
    try { return new URL(value).protocol === 'https:'; } catch { return false; }
  };
  const validate = tracks => {
    if (!Array.isArray(tracks)) return ['楽曲一覧の形式が正しくありません。'];
    const errors = [];
    const ids = new Set();
    tracks.forEach((track,index) => {
      const name = `${index + 1}曲目`;
      if (!track || typeof track !== 'object' || Array.isArray(track)) { errors.push(`${name}の形式が正しくありません。`); return; }
      if (typeof track.title !== 'string' || !track.title.trim()) errors.push(`${name}の曲名を入力してください。`);
      if (typeof track.artist !== 'string' || !track.artist.trim()) errors.push(`${name}の作曲者・名義を入力してください。`);
      if (track.vocal !== undefined && typeof track.vocal !== 'string') errors.push(`${name}の歌唱者名を確認してください。`);
      if (track.artworkCredit !== undefined && typeof track.artworkCredit !== 'string') errors.push(`${name}のジャケット制作者名を確認してください。`);
      if (track.rhythmFree !== undefined && typeof track.rhythmFree !== 'boolean') errors.push(`${name}の配布設定を確認してください。`);
      if ((track.previewUrl !== undefined && typeof track.previewUrl !== 'string') || !validURL(track.previewUrl,true)) errors.push(`${name}の試聴音源のパス・URLを確認してください。`);
      if (track.downloadUrl && !validURL(track.downloadUrl,true)) errors.push(`${name}の配布音源のパス・URLを確認してください。`);
      if (track.licenseNotes !== undefined && typeof track.licenseNotes !== 'string') errors.push(`${name}の利用条件を確認してください。`);
      if (typeof track.id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(track.id) || ids.has(track.id)) errors.push(`${name}のIDが不正、または重複しています。`);
      ids.add(track.id);
      for (const field of ['publishedAt','releaseDate']) if (!validDate(track[field])) errors.push(`${name}の日付を確認してください。`);
      if (track.tags !== undefined && (!Array.isArray(track.tags) || track.tags.some(tag => typeof tag !== 'string'))) errors.push(`${name}のタグの形式が正しくありません。`);
      if (!validURL(track.art,true)) errors.push(`${name}のジャケットはassets内のパス、またはhttpsのURLにしてください。`);
      if (!validURL(track.youtubeUrl)) errors.push(`${name}のYouTube URLを確認してください。`);
      if (track.links !== undefined && (!Array.isArray(track.links) || track.links.some(link => !link || typeof link.label !== 'string' || !link.label.trim() || !link.url || !validURL(link.url)))) errors.push(`${name}の視聴リンクを確認してください。`);
      if (track.artCrop && !['left','center','contain'].includes(track.artCrop)) errors.push(`${name}のジャケット表示方法を確認してください。`);
    });
    return errors;
  };
  // JSON only; imported files are never executed as JavaScript.
  const parse = text => {
    const source = text.replace(/^\uFEFF/,'').trim();
    const match = source.match(/^(?:\/\/[^\n]*\n\s*)*window\.KOKE_CONTENT\s*=\s*([\s\S]*);\s*$/);
    const data = JSON.parse(match ? match[1] : source);
    const tracks = Array.isArray(data) ? data : data.tracks;
    const errors = validate(tracks);
    if (errors.length) throw new Error(errors.join('\n'));
    return tracks;
  };
  const serialize = content => '// 掲載情報。楽曲は admin.html で編集できます。\nwindow.KOKE_CONTENT = '
    + JSON.stringify(content,null,2).replace(/</g,'\\u003c') + ';\n';
  window.KOKE_LIBRARY = {normalize,tags,allTags,matches,validate,parse,serialize};
})();
