const songTitleInput = document.getElementById('song-title-input');
const songArtistInput = document.getElementById('song-artist-input');
const songAlbumInput = document.getElementById('song-album-input');
const songTitleSuggestions = document.getElementById('song-title-suggestions');
const songArtistSuggestions = document.getElementById('song-artist-suggestions');
const songAlbumSuggestions = document.getElementById('song-album-suggestions');
const keepArtistInput = document.getElementById('keep-artist');
const keepAlbumInput = document.getElementById('keep-album');
const songForm = document.getElementById('song-form');
const addButton = document.getElementById('add-button');
const startButton = document.getElementById('start-button');
const songList = document.getElementById('song-list');
const inputHint = document.getElementById('input-hint');
const inputPanel = document.getElementById('input-panel');
const rankingPanel = document.getElementById('ranking-panel');
const resultsPanel = document.getElementById('results-panel');
const progressText = document.getElementById('progress-text');
const optionLeft = document.getElementById('option-left');
const optionRight = document.getElementById('option-right');
const resultsList = document.getElementById('results-list');
const restartButton = document.getElementById('restart-button');
const newListButton = document.getElementById('new-list-button');
const skipButton = document.getElementById('skip-button');

const MAX_SONGS = 40;
const AUTOCOMPLETE_MIN_CHARS = 2;
const AUTOCOMPLETE_DEBOUNCE_MS = 250;
const AUTOCOMPLETE_LIMIT = 8;
const ITUNES_SEARCH_URL = 'https://itunes.apple.com/search';

let songs = [];
let rankedSongs = [];
let currentIndex = 0;
let compareState = null;

function buildItunesSearchUrl(term, entity) {
  const params = new URLSearchParams({
    term,
    entity,
    limit: String(AUTOCOMPLETE_LIMIT),
    media: 'music',
  });
  return `${ITUNES_SEARCH_URL}?${params.toString()}`;
}

function normalizeSuggestions(items) {
  const seen = new Set();
  const results = [];

  items.forEach((item) => {
    const value = typeof item === 'string' ? item.trim() : '';
    if (!value || seen.has(value)) {
      return;
    }
    seen.add(value);
    results.push(value);
  });

  return results;
}

function updateDatalist(datalist, suggestions) {
  datalist.innerHTML = '';
  normalizeSuggestions(suggestions).forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    datalist.appendChild(option);
  });
}

function findExactMatch(results, query, getValue) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return null;
  }

  return (
    results.find((result) => {
      const value = getValue(result);
      if (typeof value !== 'string') {
        return false;
      }
      return value.trim().toLowerCase() === normalizedQuery;
    }) ?? null
  );
}

function setupAutocomplete({ input, datalist, entity, getValue, onSelect }) {
  let debounceId = null;
  let abortController = null;
  let latestResults = [];

  const clearSuggestions = () => {
    latestResults = [];
    updateDatalist(datalist, []);
  };

  const handleSelection = () => {
    if (!onSelect || latestResults.length === 0) {
      return;
    }
    const match = findExactMatch(latestResults, input.value, getValue);
    if (match) {
      onSelect(match);
    }
  };

  const fetchSuggestions = async () => {
    const term = input.value.trim();
    if (term.length < AUTOCOMPLETE_MIN_CHARS) {
      clearSuggestions();
      return;
    }

    if (abortController) {
      abortController.abort();
    }
    abortController = new AbortController();

    try {
      const response = await fetch(buildItunesSearchUrl(term, entity), {
        signal: abortController.signal,
      });

      if (!response.ok) {
        clearSuggestions();
        return;
      }

      const data = await response.json();
      const results = Array.isArray(data.results) ? data.results : [];
      latestResults = results;
      updateDatalist(datalist, results.map(getValue));
      handleSelection();
    } catch (error) {
      if (error.name !== 'AbortError') {
        clearSuggestions();
      }
    }
  };

  input.addEventListener('input', () => {
    window.clearTimeout(debounceId);
    debounceId = window.setTimeout(fetchSuggestions, AUTOCOMPLETE_DEBOUNCE_MS);
    handleSelection();
  });

  input.addEventListener('change', handleSelection);
  input.addEventListener('blur', handleSelection);
}

function formatSong(song) {
  const parts = [song.title, song.artist, song.album].filter(Boolean);
  return parts.join(' — ');
}

function isSongEmpty(song) {
  return !song.title && !song.artist && !song.album;
}

function readSongInputs() {
  return {
    title: songTitleInput.value.trim(),
    artist: songArtistInput.value.trim(),
    album: songAlbumInput.value.trim(),
  };
}

function syncInputState(customHint) {
  inputHint.textContent = customHint ?? `Added ${songs.length} of ${MAX_SONGS} songs.`;
  startButton.disabled = songs.length === 0;
  addButton.disabled = songs.length >= MAX_SONGS;
}

function renderSongList() {
  songList.innerHTML = '';

  songs.forEach((song, index) => {
    const li = document.createElement('li');
    li.className = 'song-list__item';

    const name = document.createElement('span');
    name.className = 'song-list__name';
    name.textContent = formatSong(song);

    const actions = document.createElement('div');
    actions.className = 'song-list__actions';

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'song-list__button';
    editButton.textContent = 'Edit';
    editButton.addEventListener('click', () => startSongEdit(li, index));

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'song-list__button';
    removeButton.textContent = 'Remove';
    removeButton.addEventListener('click', () => {
      songs.splice(index, 1);
      renderSongList();
      syncInputState();
      songInput.focus();
    });

    actions.appendChild(editButton);
    actions.appendChild(removeButton);

    li.appendChild(name);
    li.appendChild(actions);
    songList.appendChild(li);
  });
}

function startSongEdit(listItem, songIndex) {
  const nameElement = listItem.querySelector('.song-list__name');
  const actions = listItem.querySelector('.song-list__actions');

  if (!nameElement || !actions) {
    return;
  }

  const editFields = document.createElement('div');
  editFields.className = 'song-list__edit-fields';

  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.placeholder = 'Song title';
  titleInput.value = songs[songIndex].title ?? '';
  titleInput.className = 'song-list__edit-input';

  const artistInput = document.createElement('input');
  artistInput.type = 'text';
  artistInput.placeholder = 'Artist';
  artistInput.value = songs[songIndex].artist ?? '';
  artistInput.className = 'song-list__edit-input';

  const albumInput = document.createElement('input');
  albumInput.type = 'text';
  albumInput.placeholder = 'Album';
  albumInput.value = songs[songIndex].album ?? '';
  albumInput.className = 'song-list__edit-input';

  editFields.appendChild(titleInput);
  editFields.appendChild(artistInput);
  editFields.appendChild(albumInput);

  listItem.replaceChild(editFields, nameElement);
  actions.innerHTML = '';

  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.className = 'song-list__button song-list__button--primary';
  saveButton.textContent = 'Save';

  const cancelButton = document.createElement('button');
  cancelButton.type = 'button';
  cancelButton.className = 'song-list__button';
  cancelButton.textContent = 'Cancel';

  const exitEditMode = () => {
    renderSongList();
    songInput.focus();
  };

  cancelButton.addEventListener('click', exitEditMode);

  saveButton.addEventListener('click', () => {
    const updatedSong = {
      title: titleInput.value.trim(),
      artist: artistInput.value.trim(),
      album: albumInput.value.trim(),
    };
    if (isSongEmpty(updatedSong)) {
      syncInputState('Enter at least one field before saving.');
      titleInput.focus();
      return;
    }

    songs[songIndex] = updatedSong;
    renderSongList();
    syncInputState();
    songTitleInput.focus();
  });

  actions.appendChild(saveButton);
  actions.appendChild(cancelButton);

  const handleEditKeydown = (event) => {
    if (event.key === 'Enter') {
      saveButton.click();
    } else if (event.key === 'Escape') {
      exitEditMode();
    }
  };

  titleInput.addEventListener('keydown', handleEditKeydown);
  artistInput.addEventListener('keydown', handleEditKeydown);
  albumInput.addEventListener('keydown', handleEditKeydown);

  titleInput.focus();
  titleInput.select();
}

function handleAddSong(event) {
  event.preventDefault();

  const entry = readSongInputs();

  if (isSongEmpty(entry)) {
    syncInputState('Enter at least one field before adding.');
    songTitleInput.focus();
    return;
  }

  if (songs.length >= MAX_SONGS) {
    syncInputState('You can only rank up to 40 songs at a time.');
    songTitleInput.focus();
    return;
  }

  songs.push(entry);
  songTitleInput.value = '';
  if (!keepArtistInput.checked) {
    songArtistInput.value = '';
  }
  if (!keepAlbumInput.checked) {
    songAlbumInput.value = '';
  }
  renderSongList();
  syncInputState();
  songTitleInput.focus();
}

function resetApp() {
  songTitleInput.value = '';
  songArtistInput.value = '';
  songAlbumInput.value = '';
  keepArtistInput.checked = false;
  keepAlbumInput.checked = false;
  songs = [];
  rankedSongs = [];
  currentIndex = 0;
  compareState = null;
  renderSongList();
  syncInputState();
  showPanel('input');
  songTitleInput.focus();
}

function resetRanking() {
  rankedSongs = [];
  currentIndex = 0;
  compareState = null;
  progressText.textContent = '';
  syncInputState();
  showPanel('input');
  songTitleInput.focus();
}

function showPanel(panel) {
  inputPanel.classList.toggle('panel--hidden', panel !== 'input');
  rankingPanel.classList.toggle('panel--hidden', panel !== 'ranking');
  resultsPanel.classList.toggle('panel--hidden', panel !== 'results');
}

function updateProgress() {
  progressText.textContent = `Comparing song ${currentIndex + 1} of ${songs.length}`;
  if (compareState) {
    const comparisonsRemaining = compareState.high - compareState.low;
    if (comparisonsRemaining > 0) {
      progressText.textContent += ` — ${comparisonsRemaining} comparison${comparisonsRemaining === 1 ? '' : 's'} left for this song.`;
    }
  }
}

function presentComparison() {
  if (!compareState) {
    return;
  }

  if (compareState.low >= compareState.high) {
    rankedSongs.splice(compareState.low, 0, compareState.song);
    currentIndex += 1;

    if (currentIndex >= songs.length) {
      showResults();
      return;
    }

    startComparisonForSong(songs[currentIndex]);
    return;
  }

  const mid = Math.floor((compareState.low + compareState.high) / 2);
  compareState.mid = mid;

  optionLeft.textContent = formatSong(compareState.song);
  optionRight.textContent = formatSong(rankedSongs[mid]);
  updateProgress();
}

function handleChoice(isLeftPreferred) {
  if (!compareState) return;

  if (isLeftPreferred) {
    compareState.high = compareState.mid;
  } else {
    compareState.low = compareState.mid + 1;
  }
  presentComparison();
}

function startComparisonForSong(song) {
  compareState = {
    song,
    low: 0,
    high: rankedSongs.length,
    mid: null,
  };
  presentComparison();
}

function showResults() {
  showPanel('results');
  resultsList.innerHTML = '';
  rankedSongs.forEach((song) => {
    const li = document.createElement('li');
    li.textContent = formatSong(song);
    resultsList.appendChild(li);
  });
}

startButton.addEventListener('click', () => {
  if (songs.length === 0) {
    syncInputState('Add at least one song to begin.');
    return;
  }

  rankedSongs = [songs[0]];
  currentIndex = 1;

  inputHint.textContent = '';
  showPanel('ranking');
  updateProgress();

  if (songs.length === 1) {
    showResults();
    return;
  }

  startComparisonForSong(songs[currentIndex]);
});

optionLeft.addEventListener('click', () => handleChoice(true));
optionRight.addEventListener('click', () => handleChoice(false));

songForm.addEventListener('submit', handleAddSong);
restartButton.addEventListener('click', resetRanking);
newListButton.addEventListener('click', resetApp);
skipButton.addEventListener('click', resetRanking);

// Allow pressing Enter + Ctrl/Cmd to start ranking quickly.
const inputsForShortcut = [songTitleInput, songArtistInput, songAlbumInput];
inputsForShortcut.forEach((input) => {
  input.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      startButton.click();
    }
  });
});

setupAutocomplete({
  input: songTitleInput,
  datalist: songTitleSuggestions,
  entity: 'song',
  getValue: (result) => result.trackName,
  onSelect: (result) => {
    if (result.artistName) {
      songArtistInput.value = result.artistName;
    }
    if (result.collectionName) {
      songAlbumInput.value = result.collectionName;
    }
  },
});

setupAutocomplete({
  input: songArtistInput,
  datalist: songArtistSuggestions,
  entity: 'musicArtist',
  getValue: (result) => result.artistName,
});

setupAutocomplete({
  input: songAlbumInput,
  datalist: songAlbumSuggestions,
  entity: 'album',
  getValue: (result) => result.collectionName,
  onSelect: (result) => {
    if (result.artistName) {
      songArtistInput.value = result.artistName;
    }
  },
});

resetApp();
