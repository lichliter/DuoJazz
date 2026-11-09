/** One searchable, favorite-aware picker for both practice libraries. */
export function setupLibraryPicker({ modules, charts, getFavorites, getProgress, onFavorite, onPick, currentId }) {
  const dialog = document.getElementById('quick-view');
  const list = document.getElementById('quick-view-list');
  const search = document.getElementById('library-search');
  const filter = document.getElementById('library-favorites');
  let type = 'licks', favoritesOnly = false;
  function render() {
    const focused = document.activeElement?.dataset.favorite;
    document.getElementById('quick-view-title').textContent = type === 'licks' ? 'Licks' : 'Charts';
    search.placeholder = type === 'licks' ? 'Search licks' : 'Search charts';
    filter.setAttribute('aria-pressed', String(favoritesOnly));
    const favorites = new Set(getFavorites(type));
    const progress = type === 'licks' ? getProgress() : {};
    const query = search.value.trim().toLocaleLowerCase();
    const source = type === 'licks' ? modules : charts;
    const matches = source.filter(item => (!favoritesOnly || favorites.has(item.id)) && (item.name ?? item.title).toLocaleLowerCase().includes(query));
    matches.sort((a,b) => Number(favorites.has(b.id)) - Number(favorites.has(a.id)));
    list.replaceChildren(...matches.map(item => {
      const title = item.name ?? item.title, favorite = favorites.has(item.id);
      const row = document.createElement('div'); row.className = 'library-picker-row';
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
      star.textContent = favorite ? '★' : '☆'; star.setAttribute('aria-pressed', String(favorite));
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
  return { render, open(next = type) { type = next; search.value = ''; favoritesOnly = false; render(); if (!dialog.open) dialog.showModal(); } };
}
