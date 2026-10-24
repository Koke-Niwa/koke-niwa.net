(() => {
  'use strict';
  const escape = value => String(value ?? '').replace(/[&<>"']/g,c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeURL = (value,image = false) => {
    if (typeof value !== 'string' || !value.trim()) return '';
    if (image && /^(\.\/)?assets\/[^?#:]+$/.test(value) && !value.split('/').includes('..') && !value.includes('\\')) return value;
    try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; }
  };
  const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0,10) === value;
  const validate = (articles,drafts = false) => {
    if (!Array.isArray(articles)) return ['記事データの形式を確認してください。'];
    const ids = new Set(); const errors = [];
    articles.forEach((article,index) => {
      const name = `${index + 1}件目`;
      if (!article || typeof article !== 'object') { errors.push(`${name}の形式を確認してください。`); return; }
      if (typeof article.id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(article.id) || ids.has(article.id)) errors.push(`${name}の記事IDを確認してください。`);
      ids.add(article.id);
      const isDraft = drafts && article.status === 'draft';
      if (!isDraft && (typeof article.title !== 'string' || !article.title.trim())) errors.push(`${name}のタイトルを入力してください。`);
      if (!isDraft && !validDate(article.date)) errors.push(`${name}の公開日を入力してください。`);
      if (!isDraft && (typeof article.body !== 'string' || !article.body.trim())) errors.push(`${name}の本文を入力してください。`);
      for (const field of ['title','date','body','excerpt','cover']) if (article[field] !== undefined && typeof article[field] !== 'string') errors.push(`${name}の${field}の形式を確認してください。`);
      if (!isDraft && article.cover && !safeURL(article.cover,true)) errors.push(`${name}の画像URLを確認してください。`);
      if (article.status && !['draft','published'].includes(article.status)) errors.push(`${name}の公開状態を確認してください。`);
    });
    return errors;
  };
  const published = articles => (articles || []).filter(article => article.status !== 'draft')
    .map(({status,...article}) => article).sort((a,b) => String(b.date).localeCompare(String(a.date)));
  const select = (articles,query = '',order = 'newest') => {
    const normalize = value => String(value || '').normalize('NFKC').toLocaleLowerCase('ja');
    const words = normalize(query).trim().split(/\s+/).filter(Boolean);
    const result = published(articles).filter(article => {
      const text = normalize([article.title,article.excerpt,String(article.body || '').replace('[[winter-bgm-mixer]]','')].join(' '));
      return words.every(word => text.includes(word));
    });
    if (order === 'oldest') result.sort((a,b) => String(a.date).localeCompare(String(b.date)));
    if (order === 'name') result.sort((a,b) => a.title.localeCompare(b.title,'ja',{numeric:true,sensitivity:'base'}));
    return result;
  };
  const summary = article => article.excerpt || String(article.body || '').replace('[[winter-bgm-mixer]]','').replace(/!\[[^\]]*\]\([^)]*\)/g,'').replace(/[#*>`_\[\]]/g,'').replace(/\s+/g,' ').slice(0,110);
  const inline = value => {
    const tokens = [];
    let text = String(value).replace(/(!?)\[([^\]\n]*)\]\(([^)\s]+)\)/g,(_match,image,label,url) => {
      const safe = safeURL(url,Boolean(image));
      const html = !safe ? escape(label) : image
        ? `<img src="${escape(safe)}" alt="${escape(label)}" loading="lazy">`
        : `<a href="${escape(safe)}" target="_blank" rel="noopener noreferrer">${escape(label)}</a>`;
      tokens.push(html); return `\u0000${tokens.length - 1}\u0000`;
    });
    text = escape(text).replace(/\*\*([^*\n]+)\*\*/g,'<strong>$1</strong>');
    return text.replace(/\u0000(\d+)\u0000/g,(_match,index) => tokens[Number(index)] || '');
  };
  const renderBody = body => {
    const blocks = String(body || '').replace(/\u0000/g,'').replace(/\r\n?/g,'\n').split(/\n\s*\n/);
    return blocks.filter(block=>block.trim()).map(block => {
      if (block.trim() === '[[winter-bgm-mixer]]') return '<div data-audio-mixer="winter-bgm"></div>';
      const lines = block.trim().split('\n');
      if (lines.every(line=>/^[-*] /.test(line))) return `<ul>${lines.map(line=>`<li>${inline(line.slice(2))}</li>`).join('')}</ul>`;
      if (lines.every(line=>/^>\s?/.test(line))) return `<blockquote>${lines.map(line=>inline(line.replace(/^>\s?/,''))).join('<br>')}</blockquote>`;
      return lines.map(line => {
        const heading = line.match(/^(#{1,3})\s+(.+)/);
        return heading ? `<h${Math.max(2,heading[1].length)}>${inline(heading[2])}</h${Math.max(2,heading[1].length)}>` : `<p>${inline(line)}</p>`;
      }).join('');
    }).join('');
  };
  const serialize = content => '// 掲載情報。管理ページで編集できます。\nwindow.KOKE_CONTENT = '+JSON.stringify(content,null,2).replace(/</g,'\\u003c')+';\n';
  window.KOKE_ARTICLES = {escape,safeURL,validDate,validate,published,select,summary,renderBody,serialize};
})();
