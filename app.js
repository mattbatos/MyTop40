const songInput = document.getElementById('song-input');
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
const skipButton = document.getElementById('skip-button');

const MAX_SONGS = 40;

let songs = [];
let rankedSongs = [];
let currentIndex = 0;
let compareState = null;

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
    name.textContent = song;

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'song-list__remove';
    removeButton.textContent = 'Remove';
    removeButton.addEventListener('click', () => {
      songs.splice(index, 1);
      renderSongList();
      syncInputState();
      songInput.focus();
    });

    li.appendChild(name);
    li.appendChild(removeButton);
    songList.appendChild(li);
  });
}

function handleAddSong(event) {
  event.preventDefault();

  const entry = songInput.value.trim();

  if (entry.length === 0) {
    syncInputState('Enter a song before adding.');
    songInput.focus();
    return;
  }

  if (songs.length >= MAX_SONGS) {
    syncInputState('You can only rank up to 40 songs at a time.');
    songInput.focus();
    return;
  }

  songs.push(entry);
  songInput.value = '';
  renderSongList();
  syncInputState();
  songInput.focus();
}

function resetApp() {
  songInput.value = '';
  songs = [];
  rankedSongs = [];
  currentIndex = 0;
  compareState = null;
  renderSongList();
  syncInputState();
  showPanel('input');
  songInput.focus();
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

  optionLeft.textContent = compareState.song;
  optionRight.textContent = rankedSongs[mid];
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
    li.textContent = song;
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
restartButton.addEventListener('click', resetApp);
skipButton.addEventListener('click', resetApp);

// Allow pressing Enter + Ctrl/Cmd to start ranking quickly.
songInput.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    startButton.click();
  }
});

resetApp();
