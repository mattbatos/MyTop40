const songInput = document.getElementById('song-input');
const startButton = document.getElementById('start-button');
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

let songs = [];
let rankedSongs = [];
let currentIndex = 0;
let compareState = null;

function parseSongs(raw) {
  return raw
    .split('\n')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function resetApp() {
  songInput.value = '';
  songs = [];
  rankedSongs = [];
  currentIndex = 0;
  compareState = null;
  inputHint.textContent = 'You can add between 1 and 40 songs.';
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
  const parsed = parseSongs(songInput.value);

  if (parsed.length === 0) {
    inputHint.textContent = 'Please enter at least one song to begin.';
    return;
  }

  if (parsed.length > 40) {
    inputHint.textContent = 'You can only rank up to 40 songs at a time.';
    return;
  }

  songs = parsed;
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

restartButton.addEventListener('click', resetApp);
skipButton.addEventListener('click', resetApp);

// Allow pressing Enter + Ctrl/Cmd to start ranking quickly.
songInput.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    startButton.click();
  }
});

resetApp();
