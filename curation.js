(function () {
  'use strict';
  const dataNode = document.getElementById('curation-data');
  const issue = dataNode ? JSON.parse(dataNode.textContent) : {date: document.querySelector('.cover-meta span')?.textContent.trim() || '', stories: []};
  const key = 'csm-editorial-library-v1';
  let records = {};
  try { records = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch (_) {}
  let filter = 'All';
  let sort = 'recent';
  let source = '';
  let topic = '';
  const normalize = value => {
    try { const u = new URL(value); if (!['http:', 'https:'].includes(u.protocol)) return ''; u.hash = ''; [...u.searchParams.keys()].forEach(k => { if (/^(utm_|fbclid$|gclid$)/i.test(k)) u.searchParams.delete(k); }); return u.href.replace(/\/$/, ''); } catch (_) { return ''; }
  };
  const stories = new Map((issue.stories || []).map(story => [normalize(story.url), story]).filter(pair => pair[0]));
  const escape = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const storageNotice = 'Stored in this browser on this device. Clearing browser data removes the library.';
  const drawer = document.createElement('section');
  drawer.className = 'curation-library';
  drawer.hidden = true;
  drawer.setAttribute('aria-label', 'Personal library');
  drawer.innerHTML = '<div class="library-head"><div><p class="story-label">Your personal archive</p><h2>Library.</h2></div><button type="button" class="library-close" aria-label="Close library">×</button></div><p class="library-storage"></p><div class="library-tabs" aria-label="Library views"></div><div class="library-options"><label>Sort <select class="library-sort"><option value="recent">Recently reviewed or saved</option><option value="rating">Highest rated</option><option value="date">Publication date</option><option value="source">Source</option></select></label><label>Source <select class="library-source"></select></label><label>Topic <select class="library-topic"></select></label></div><p class="library-count" aria-live="polite"></p><div class="library-list"></div>';
  document.body.append(drawer);
  drawer.querySelector('.library-storage').textContent = storageNotice;
  const opener = document.createElement('button');
  opener.type = 'button'; opener.className = 'library-open'; opener.textContent = 'Library';
  const nav = document.querySelector('#issue-nav');
  (nav || document.querySelector('header') || document.body).append(opener);
  if (!nav) opener.classList.add('library-open-floating');
  const notice = document.createElement('div'); notice.className = 'curation-notice'; notice.setAttribute('role', 'status'); document.body.append(notice);
  let noticeTimer;
  function announce(message) { notice.textContent = message; notice.classList.add('visible'); clearTimeout(noticeTimer); noticeTimer = setTimeout(() => notice.classList.remove('visible'), 2200); }
  function persist(id, patch, story, message) {
    const old = records[id] || {};
    const next = {...old, ...patch, item: {...(old.item || {}), ...story}, updatedAt: new Date().toISOString()};
    if (next.status === 'rejected') { next.saved = false; next.rating = 0; }
    if (next.status !== 'approved') next.rating = 0;
    const updated = {...records};
    if (!next.status && !next.saved) delete updated[id]; else updated[id] = next;
    try { localStorage.setItem(key, JSON.stringify(updated)); records = updated; } catch (_) { announce('Could not save. Browser storage may be unavailable or full.'); return; }
    refresh(); announce(message);
  }
  function controls(id, item) {
    const state = records[id] || {};
    const el = document.createElement('div'); el.className = 'curation-controls';
    el.setAttribute('aria-label', 'Article actions');
    el.innerHTML = '<button type="button" data-action="approve" title="Approve" aria-label="'+(state.status === 'approved' ? 'Undo approval' : 'Approve')+'" aria-pressed="'+(state.status === 'approved')+'">✓</button><button type="button" data-action="reject" title="Reject" aria-label="'+(state.status === 'rejected' ? 'Undo rejection' : 'Reject')+'" aria-pressed="'+(state.status === 'rejected')+'">✕</button><button type="button" data-action="save" title="'+(state.status === 'rejected' ? 'Undo rejection to save' : 'Save to library')+'" aria-label="'+(state.saved ? 'Remove bookmark' : 'Save to library')+'" aria-pressed="'+!!state.saved+'" '+(state.status === 'rejected' ? 'disabled' : '')+'>🔖</button><span class="curation-stars" aria-label="'+(state.status === 'approved' ? 'Rating' : 'Approve to rate')+'">'+[1,2,3,4,5].map(n => '<button type="button" data-rating="'+n+'" aria-label="'+n+' out of 5 stars" title="'+n+' out of 5 stars" aria-pressed="'+(state.rating === n)+'" '+(state.status !== 'approved' ? 'disabled' : '')+' class="'+(n <= (state.rating || 0) ? 'selected' : '')+'">★</button>').join('')+'</span>';
    el.addEventListener('click', event => {
      const button = event.target.closest('button'); if (!button) return;
      const current = records[id] || {};
      if (button.dataset.action === 'approve') persist(id, {status: current.status === 'approved' ? '' : 'approved'}, item, current.status === 'approved' ? 'Approval removed' : 'Article approved');
      if (button.dataset.action === 'reject') persist(id, {status: current.status === 'rejected' ? '' : 'rejected'}, item, current.status === 'rejected' ? 'Rejection removed' : 'Article rejected and removed from saved');
      if (button.dataset.action === 'save') persist(id, {saved: !current.saved}, item, current.saved ? 'Removed from library' : 'Saved to library');
      if (button.dataset.rating) persist(id, {rating: Number(button.dataset.rating)}, item, 'Rating updated');
    });
    return el;
  }
  const slots = [];
  function fallbackStory(anchor) {
    const heading = anchor.querySelector('h3, strong');
    if (!heading) return null;
    return {url: anchor.href, title: heading.textContent.trim(), source: anchor.querySelector('figcaption')?.textContent.trim() || new URL(anchor.href).hostname.replace(/^www\./, ''), summary: anchor.querySelector('.department-copy > p:not(.story-label), small')?.textContent.trim() || '', beat: anchor.closest('section')?.querySelector('.section-index p')?.textContent.trim() || '', editionDate: issue.date};
  }
  document.querySelectorAll('a.front-story, a.department-story, a.mood-item, a.source-item').forEach(anchor => {
    const id = normalize(anchor.href), story = stories.get(id) || (id && fallbackStory(anchor)); if (!story) return;
    const wrapper = document.createElement('div'); wrapper.className = 'curation-card'; anchor.before(wrapper); wrapper.append(anchor);
    const slot = document.createElement('div'); wrapper.append(slot); slots.push({slot, id, story: {...story, editionDate: issue.date}});
  });
  const leadLink = document.querySelector('.lead-story .text-link');
  if (leadLink) { const id = normalize(leadLink.href), lead = leadLink.closest('.lead-story'), story = stories.get(id) || (id && {url: id, title: lead.querySelector('h2')?.textContent.trim(), source: lead.querySelector('figcaption')?.textContent.trim() || new URL(id).hostname, summary: lead.querySelector('.lead-dek')?.textContent.trim() || '', editionDate: issue.date}); if (story) { const slot = document.createElement('div'); leadLink.after(slot); slots.push({slot, id, story: {...story, editionDate: issue.date}}); } }
  if (!leadLink) {
    const lead = document.querySelector('.lead-story');
    const title = lead?.querySelector('h2')?.textContent.trim();
    const match = slots.find(entry => entry.story.title === title);
    if (match) { const slot = document.createElement('div'); lead.querySelector('div').append(slot); slots.push({...match, slot}); }
  }
  function optionList(selector, values, current, label) {
    const select = drawer.querySelector(selector); select.innerHTML = '<option value="">All '+label+'</option>' + [...new Set(values.filter(Boolean))].sort().map(v => '<option value="'+escape(v)+'">'+escape(v)+'</option>').join(''); select.value = current;
  }
  function renderLibrary() {
    const all = Object.entries(records);
    drawer.querySelector('.library-tabs').innerHTML = ['All','Approved','Rejected','Rated','Saved'].map(name => '<button type="button" data-filter="'+name+'" aria-pressed="'+(filter === name)+'">'+name+'</button>').join('');
    optionList('.library-source', all.map(([, r]) => r.item?.source), source, 'sources');
    optionList('.library-topic', all.map(([, r]) => r.item?.beat), topic, 'topics');
    let list = all.filter(([,r]) => (filter === 'All' || filter === 'Approved' && r.status === 'approved' || filter === 'Rejected' && r.status === 'rejected' || filter === 'Rated' && r.status === 'approved' && r.rating || filter === 'Saved' && r.saved && r.status !== 'rejected') && (!source || r.item?.source === source) && (!topic || r.item?.beat === topic));
    list.sort((a,b) => sort === 'rating' ? (b[1].rating || 0) - (a[1].rating || 0) || (b[1].updatedAt || '').localeCompare(a[1].updatedAt || '') : sort === 'date' ? (b[1].item?.published || b[1].item?.published_at || b[1].item?.editionDate || '').localeCompare(a[1].item?.published || a[1].item?.published_at || a[1].item?.editionDate || '') : sort === 'source' ? (a[1].item?.source || '').localeCompare(b[1].item?.source || '') : (b[1].updatedAt || '').localeCompare(a[1].updatedAt || ''));
    drawer.querySelector('.library-count').textContent = list.length + (list.length === 1 ? ' article' : ' articles');
    const container = drawer.querySelector('.library-list'); container.replaceChildren();
    if (!list.length) { container.innerHTML = '<p class="library-empty">No articles in this view yet.</p>'; return; }
    list.forEach(([id, r]) => { const item = r.item || {}; const row = document.createElement('article'); row.className = 'library-item'; row.innerHTML = '<p class="story-label">'+escape(item.source || 'Source')+' · '+escape(item.beat || 'Editorial')+' · '+escape(item.published || item.published_at || item.editionDate || '')+'</p><h3><a target="_blank" rel="noopener noreferrer" href="'+escape(id)+'">'+escape(item.title || 'Untitled')+' ↗</a></h3><p>'+escape(item.summary || item.why || '')+'</p><small>'+escape(r.status || (r.saved ? 'Saved' : ''))+(r.saved && r.status ? ' · Saved' : '')+' · Updated '+escape((r.updatedAt || '').slice(0,10))+'</small>'; row.append(controls(id, item)); container.append(row); });
  }
  function refresh() { slots.forEach(({slot,id,story}) => slot.replaceChildren(controls(id, story))); renderLibrary(); }
  opener.addEventListener('click', () => { drawer.hidden = false; renderLibrary(); drawer.querySelector('.library-close').focus(); });
  drawer.querySelector('.library-close').addEventListener('click', () => { drawer.hidden = true; opener.focus(); });
  drawer.addEventListener('click', e => { if (e.target.dataset.filter) { filter = e.target.dataset.filter; renderLibrary(); } });
  drawer.querySelector('.library-sort').addEventListener('change', e => { sort = e.target.value; renderLibrary(); });
  drawer.querySelector('.library-source').addEventListener('change', e => { source = e.target.value; renderLibrary(); });
  drawer.querySelector('.library-topic').addEventListener('change', e => { topic = e.target.value; renderLibrary(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !drawer.hidden) { drawer.hidden = true; opener.focus(); } });
  window.addEventListener('storage', e => { if (e.key === key) { try { records = JSON.parse(e.newValue || '{}'); refresh(); } catch (_) {} } });
  refresh();
}());
