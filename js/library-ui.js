/** One searchable, favorite-aware picker for both practice libraries. */
export function setupLibraryPicker({ modules, charts, getFavorites, getProgress, onFavorite, onPick, currentId }) {
  const dialog = document.getElementById('quick-view');
  const list = document.getElementById('quick-view-list');
  const search = document.getElementById('library-search');
  const filter = document.getElementById('library-favorites');
  const tabs = [...dialog.querySelectorAll('[data-library-tab]')];
  let type = 'licks', favoritesOnly = false;
  function render() {
    const focused = document.activeElement?.dataset.favorite;
    document.getElementById('quick-view-title').textContent = type === 'licks' ? 'Licks' : 'Charts';
    for (const tab of tabs) tab.setAttribute('aria-pressed', String(tab.dataset.libraryTab === type));
    search.placeholder = type === 'licks' ? 'Search licks' : 'Search charts';
    filter.setAttribute('aria-pressed', String(favoritesOnly));
    const favorites = new Set(getFavorites(type));
    const progress = type === 'licks' ? getProgress() : {};
    const query = search.value.trim().toLocaleLowerCase();
    const source = type === 'licks' ? modules : charts;
    const matches = source.filter(item => (!favoritesOnly || favorites.has(item.id)) && (item.name ?? item.title).toLocaleLowerCase().includes(query));
    document.getElementById('library-count').textContent = `${matches.length} ${favoritesOnly ? 'favorite ' : ''}${matches.length === 1 ? type.slice(0, -1) : type}`;
    list.replaceChildren(...matches.map(item => {
      const title = item.name ?? item.title, favorite = favorites.has(item.id);
      const row = document.createElement('div'); row.className = 'library-picker-row';
      row.dataset.current = String(item.id === currentId(type));
      const pick = document.createElement('button'); pick.type = 'button'; pick.className = 'module-sheet-row';
      pick.dataset.testid = `quick-view-${type === 'licks' ? 'module' : 'chart'}-${item.id}`;
      pick.setAttribute('aria-current', item.id === currentId(type) ? 'page' : 'false');
      const text = document.createElement('span'); text.className = 'module-sheet-copy';
      const name = document.createElement('span'); name.className = 'module-sheet-name'; name.textContent = title;
      const meta = document.createElement('span'); meta.className = 'module-sheet-meta';
      meta.textContent = type === 'licks' ? `Module ${item.number} · ${progress[item.id]?.masteredKeys.length ?? 0}/12 keys mastered` : item.excerpt ? 'Chart excerpt' : item.composer ?? 'Chart';
      text.append(name, meta); pick.append(text);
      pick.onclick = () => { dialog.close(); onPick(type, item.id); };
      const star = document.createElement('button'); star.type = 'button'; star.className = 'favorite-toggle'; star.dataset.favorite = item.id;
      star.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3-4.6-4.5 6.3-.9Z"/></svg>';
      star.setAttribute('aria-pressed', String(favorite));
      star.setAttribute('aria-label', `${favorite ? 'Remove' : 'Add'} ${title} ${favorite ? 'from' : 'to'} favorites`);
      star.onclick = () => { onFavorite(type, item.id, !favorite); render(); document.getElementById('library-status').textContent = `${title} ${favorite ? 'removed from' : 'added to'} favorites.`; };
      row.append(pick, star); return row;
    }));
    if (!matches.length) {
      const empty = document.createElement('p'); empty.className = 'help library-empty';
      empty.textContent = query ? 'No matches. Try another name.' : 'No favorites yet. Turn off Favorites only and tap a star to add one.';
      list.append(empty);
    }
    if (focused) [...list.querySelectorAll('[data-favorite]')].find(button => button.dataset.favorite === focused)?.focus({ preventScroll: true });
  }
  search.addEventListener('input', render);
  filter.onclick = () => { favoritesOnly = !favoritesOnly; render(); };
  for (const tab of tabs) tab.onclick = () => {
    if (type === tab.dataset.libraryTab) return;
    type = tab.dataset.libraryTab;
    search.value = '';
    render();
    list.scrollTop = 0;
  };
  return { render, open(next = type) { type = next; search.value = ''; favoritesOnly = false; render(); if (!dialog.open) dialog.showModal(); } };
}
