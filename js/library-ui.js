const categories = [
  ['Classics', 'cmar bo hsr dlr tm cbc ssr jcdp bcf'],
  ['Minor', 'cmar emr mp ntp minor-rise-return lotus-inspired south-of-the-river'],
  ['Major', '1235 br ssr bb lg dct et ctdc'],
  ['ii–V–I & Turnarounds', 'gts acvl tm se sat tpr bcf nnr'],
  ['Enclosures & Chromatic', 'se ae fe ntp emr bcf acvl'],
  ['Arpeggios & Triads', 'tisc et sat tpr dct 1235 lg acvl'],
  ['Diminished & Altered', 'jcdp tdp ctdc dss ae'],
  ['Lines & Runs', 'bo gts jcdp dlr bcf mp nnr south-of-the-river'],
  ['Modern & Groove', 'lotus-inspired south-of-the-river minor-rise-return'],
];

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function button(label, action, className = 'library-action') {
  const node = element('button', className, label);
  node.type = 'button';
  node.onclick = action;
  return node;
}

export function setupLibraryPicker({
  modules, charts, getRotation, getProgress, onEnrollment, onPick, currentId,
  engravePreview, previewAudio, chartKeyLabel,
}) {
  const dialog = document.getElementById('quick-view');
  const list = document.getElementById('quick-view-list');
  const title = document.getElementById('quick-view-title');
  const status = document.getElementById('library-status');
  const search = document.getElementById('library-search');
  const browseButton = document.getElementById('library-browse');
  const backButton = document.getElementById('library-back');
  const rotationBackButton = document.getElementById('library-rotation-back');
  const breadcrumbs = document.getElementById('library-category');
  const categoryToolbar = breadcrumbs.parentElement;
  const tabs = [...dialog.querySelectorAll('[data-library-tab]')];
  const licks = modules.filter(item => item.id !== 'chord-tones');
  const sortedCharts = [...charts].sort((a, b) => a.title.localeCompare(b.title));
  let type = 'licks';
  let browsing = false;
  let category = null;
  let activePlay = null;
  let revealedRow = null;

  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      const module = licks.find(item => item.id === entry.target.dataset.lick);
      void engravePreview(entry.target, module).catch(() => {
        entry.target.textContent = 'Notation unavailable';
      });
    }
  }, { root: list, rootMargin: '160px' });

  function stop() {
    previewAudio.stop();
    if (!activePlay) return;
    activePlay.textContent = 'Play';
    activePlay.setAttribute('aria-label', activePlay.dataset.playLabel);
    activePlay = null;
  }
  previewAudio.onEnded = stop;

  function openItem(item) {
    if (!getRotation(type).includes(item.id)) return;
    stop();
    dialog.close();
    onPick(type, item.id);
  }

  function updateMembership(item, enrolled) {
    onEnrollment(type, item.id, enrolled);
    status.textContent = `${item.name ?? item.title} ${enrolled ? 'added to' : 'removed from'} My Rotation.`;
  }

  function actionsFor(item, enrolled, progress, moveToAdded) {
    const actions = element('div', 'library-actions');
    if (type === 'licks') {
      const play = button('Play', async () => {
        const wasPlaying = activePlay === play;
        stop();
        if (wasPlaying) return;
        activePlay = play;
        play.textContent = 'Stop';
        play.setAttribute('aria-label', `Stop ${item.name}`);
        try {
          await previewAudio.play(item);
        } catch {
          if (activePlay !== play) return;
          stop();
          status.textContent = 'Audio preview unavailable.';
        }
      });
      play.dataset.playLabel = `Play ${item.name}`;
      play.setAttribute('aria-label', play.dataset.playLabel);
      actions.append(play);
      if (progress > 0) actions.append(masteryBadge(progress));
    }
    const open = button('Open', () => openItem(item), 'library-action library-item-action');
    open.setAttribute('aria-label', `Open ${item.name ?? item.title}`);
    if (enrolled) actions.append(open);
    else {
      const add = button('Add', () => {
        updateMembership(item, true);
        add.replaceWith(open);
        moveToAdded();
        open.focus();
      }, 'library-action library-item-action library-action-primary');
      add.setAttribute('aria-label', `Add ${item.name ?? item.title}`);
      actions.append(add);
    }
    return actions;
  }

  function masteryBadge(progress) {
    return element('span', 'library-mastery', progress === 100 ? 'Mastered' : `${progress}% mastered`);
  }

  function itemCopy(item) {
    const copy = element('span', 'module-sheet-copy');
    copy.append(element('span', 'module-sheet-name', item.name ?? item.title));
    if (type === 'charts') {
      copy.append(element('span', 'module-sheet-meta', [item.composer, chartKeyLabel(item)].filter(Boolean).join(' · ')));
    }
    return copy;
  }

  function revealRow(row) {
    if (revealedRow === row) return;
    if (revealedRow) delete revealedRow.dataset.revealed;
    revealedRow = row;
    if (row) row.dataset.revealed = 'true';
  }

  function enableSwipe(row, pick, remove, removeItem) {
    let gesture = null;
    let suppressClick = false;

    pick.addEventListener('click', event => {
      if (suppressClick && event.detail !== 0) event.stopImmediatePropagation();
    }, { capture: true });

    pick.onpointerdown = event => {
      if (!event.isPrimary || event.button !== 0) return;
      suppressClick = false;
      gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, start: revealedRow === row ? remove.offsetWidth : 0 };
    };

    pick.onpointermove = event => {
      if (gesture?.id !== event.pointerId || !event.buttons) return;
      const dx = gesture.x - event.clientX;
      const dy = Math.abs(gesture.y - event.clientY);
      if (!gesture.dragging) {
        if (Math.max(Math.abs(dx), dy) < 10) return;
        if (dy >= Math.abs(dx)) {
          gesture = null;
          return;
        }
        gesture.dragging = true;
        row.dataset.dragging = 'true';
        pick.setPointerCapture(event.pointerId);
      }
      const distance = Math.min(row.clientWidth, Math.max(0, gesture.start + dx));
      row.style.setProperty('--rotation-row-offset', `${-distance}px`);
    };

    function finishSwipe(event, cancelled) {
      if (gesture?.id !== event.pointerId) return;
      const { dragging, start, x } = gesture;
      gesture = null;
      if (!dragging) return;
      suppressClick = true;
      delete row.dataset.dragging;
      row.style.removeProperty('--rotation-row-offset');
      if (cancelled) return;
      const distance = start + x - event.clientX;
      if (distance >= Math.max(remove.offsetWidth + 32, row.clientWidth * 0.6)) {
        removeItem();
      } else {
        revealRow(distance >= remove.offsetWidth / 2 ? row : null);
      }
    }

    pick.onpointerup = event => finishSwipe(event, false);
    pick.onpointercancel = event => finishSwipe(event, true);
    pick.onlostpointercapture = event => {
      if (event.target === pick) finishSwipe(event, true);
    };
    remove.onfocus = () => revealRow(row);
    row.onfocusout = event => {
      if (revealedRow === row && !row.contains(event.relatedTarget)) revealRow(null);
    };
    pick.setAttribute('aria-keyshortcuts', 'ArrowLeft');
    row.onkeydown = event => {
      if (event.key === 'ArrowLeft' && event.target === pick) {
        event.preventDefault();
        remove.focus();
      } else if (event.key === 'ArrowRight' && revealedRow === row) {
        event.preventDefault();
        revealRow(null);
        pick.focus();
      }
    };
  }

  function rotationRow(item, progress) {
    const row = element('div', 'library-picker-row');
    row.dataset.current = String(item.id === currentId(type));
    const pick = button('', () => openItem(item), 'module-sheet-row');
    pick.dataset.testid = `quick-view-${type === 'licks' ? 'module' : 'chart'}-${item.id}`;
    pick.setAttribute('aria-current', item.id === currentId(type) ? 'page' : 'false');
    pick.append(itemCopy(item));
    if (progress > 0) pick.append(masteryBadge(progress));
    row.append(pick);
    if (item.id !== 'chord-tones') {
      const removeItem = () => {
        const next = row.nextElementSibling?.querySelector('button') ?? row.previousElementSibling?.querySelector('button');
        const nextId = next?.dataset.testid;
        updateMembership(item, false);
        render();
        (list.querySelector(`[data-testid="${nextId}"]`) ?? browseButton).focus();
      };
      const remove = button('Remove', removeItem, 'library-remove');
      remove.setAttribute('aria-label', `Remove ${item.name ?? item.title}`);
      row.append(remove);
      enableSwipe(row, pick, remove, removeItem);
    }
    return row;
  }

  function exploreItem(item, enrolled, progress, addedSection) {
    const isLick = type === 'licks';
    const row = element(isLick ? 'article' : 'div', isLick ? 'library-lick-card' : 'library-chart-row');
    if (isLick) {
      const staff = element('div', 'library-staff');
      staff.dataset.lick = item.id;
      staff.setAttribute('aria-label', `Sheet music for ${item.name}`);
      row.append(element('h3', '', item.name), staff);
      observer.observe(staff);
    } else {
      row.append(itemCopy(item));
    }
    row.append(actionsFor(item, enrolled, progress, () => {
      addedSection.append(row);
      addedSection.hidden = false;
    }));
    return row;
  }

  function render() {
    // A settings refresh or navigation can replace the button for an active preview.
    stop();
    observer.disconnect();
    revealRow(null);
    const query = search.value.trim().toLocaleLowerCase();
    const rotation = getRotation(type);
    const progress = getProgress(type);
    const categoryName = category?.[0];
    const showTiles = browsing && type === 'licks' && !category && !query;
    dialog.dataset.mode = browsing ? 'browse' : 'rotation';
    list.dataset.layout = showTiles ? 'tiles' : browsing && type === 'licks' ? 'cards' : 'list';
    title.textContent = browsing ? (type === 'licks' ? 'Explore Licks' : 'Browse Charts') : 'My Rotation';
    breadcrumbs.hidden = !categoryName;
    breadcrumbs.textContent = categoryName ?? '';
    browseButton.hidden = browsing;
    browseButton.setAttribute('aria-label', type === 'licks' ? 'Explore licks' : 'Browse charts');
    rotationBackButton.hidden = !browsing || type !== 'charts';
    categoryToolbar.hidden = !browsing || type !== 'licks' || showTiles;
    for (const tab of tabs) tab.setAttribute('aria-pressed', String(tab.dataset.libraryTab === type));
    search.closest('label').hidden = !browsing;
    search.placeholder = type === 'licks' ? 'Search licks' : 'Search charts';

    if (showTiles) {
      list.replaceChildren(...categories.flatMap(([label, ids], index) => {
        const categoryIds = ids.split(' ');
        const members = licks.filter(lick => categoryIds.includes(lick.id) || categoryIds.includes(lick.compositeId));
        if (!members.length) return [];
        const tile = button(label, () => {
          category = [label, members];
          render();
          list.scrollTop = 0;
          breadcrumbs.focus();
        }, 'library-tile');
        tile.dataset.sleeve = ['oxblood', 'teal', 'amber'][index % 3];
        tile.append(element('span', 'library-tile-count', `${members.length} licks`));
        return [tile];
      }));
      return;
    }

    const source = type === 'licks' ? (browsing ? licks : modules) : sortedCharts;
    const matches = browsing
      ? (category?.[1] ?? source).filter(item => [item.name ?? item.title, item.composer].some(text => text?.toLocaleLowerCase().includes(query)))
      : rotation.map(id => source.find(item => item.id === id)).filter(Boolean);
    if (!matches.length) {
      list.replaceChildren(element('p', 'help library-empty', browsing ? 'No matches. Try another search.' : 'What tunes are you working on?'));
    } else if (browsing) {
      const addedSection = element('section', 'library-added-section');
      const heading = element('h3', '', 'Added');
      heading.id = 'library-added-title';
      addedSection.setAttribute('aria-labelledby', heading.id);
      addedSection.append(heading);
      addedSection.hidden = true;
      const available = [];
      for (const item of matches) {
        const enrolled = rotation.includes(item.id);
        const row = exploreItem(item, enrolled, progress[item.id], addedSection);
        if (enrolled) {
          addedSection.append(row);
          addedSection.hidden = false;
        } else {
          available.push(row);
        }
      }
      list.replaceChildren(...available, addedSection);
    } else {
      list.replaceChildren(...matches.map(item => rotationRow(item, progress[item.id])));
    }
  }

  function navigate() {
    category = null;
    search.value = '';
    render();
    list.scrollTop = 0;
  }

  search.addEventListener('input', () => {
    render();
    list.scrollTop = 0;
  });
  browseButton.onclick = () => {
    browsing = true;
    navigate();
    if (type === 'licks') void previewAudio.prepare().catch(() => {});
    (type === 'charts' ? search : title).focus();
  };
  backButton.onclick = () => {
    const previousCategory = category?.[0];
    navigate();
    const tile = [...list.querySelectorAll('.library-tile')].find(item => item.firstChild.textContent === previousCategory);
    (tile ?? title).focus();
  };
  rotationBackButton.onclick = () => {
    browsing = false;
    navigate();
    browseButton.focus();
  };
  for (const tab of tabs) {
    tab.onclick = () => {
      if (type === tab.dataset.libraryTab) return;
      type = tab.dataset.libraryTab;
      navigate();
      if (browsing && type === 'licks') void previewAudio.prepare().catch(() => {});
    };
  }
  dialog.addEventListener('pointerdown', event => {
    if (revealedRow && !revealedRow.contains(event.target)) revealRow(null);
  });
  dialog.addEventListener('close', () => {
    if (dialog.open) return;
    observer.disconnect();
    stop();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && dialog.open) stop();
  });
  return {
    render,
    open(next, { browse = false } = {}) {
      type = next;
      browsing = browse;
      if (!dialog.open) dialog.showModal();
      navigate();
      if (browse && type === 'licks') void previewAudio.prepare().catch(() => {});
      title.focus();
    },
  };
}
