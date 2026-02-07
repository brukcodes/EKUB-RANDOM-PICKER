const participantsKey = "rp_participants";
const stateKey = "rp_state";

const participantsList = document.getElementById("participantsList");
const participantsEmpty = document.getElementById("participantsEmpty");
const historyList = document.getElementById("historyList");
const winnerName = document.getElementById("winnerName");
const winnerMeta = document.getElementById("winnerMeta");
const frequencySelect = document.getElementById("frequency");
const periodLabel = document.getElementById("periodLabel");
const statusMeta = document.getElementById("statusMeta");

const newNameInput = document.getElementById("newName");
const bulkNamesInput = document.getElementById("bulkNames");

const addPersonButton = document.getElementById("addPerson");
const bulkAddButton = document.getElementById("bulkAdd");
const shuffleButton = document.getElementById("shuffle");
const resetCycleButton = document.getElementById("resetCycle");
const drawWinnerButton = document.getElementById("drawWinner");

const defaultState = {
  daily: { remaining: [], history: [], lastWinner: null },
  weekly: { remaining: [], history: [], lastWinner: null },
  monthly: { remaining: [], history: [], lastWinner: null },
  yearly: { remaining: [], history: [], lastWinner: null },
};

const readParticipants = () => {
  const raw = localStorage.getItem(participantsKey);
  return raw ? JSON.parse(raw) : [];
};

const saveParticipants = (list) => {
  localStorage.setItem(participantsKey, JSON.stringify(list));
};

const readState = () => {
  const raw = localStorage.getItem(stateKey);
  if (!raw) return structuredClone(defaultState);
  const parsed = JSON.parse(raw);
  return { ...structuredClone(defaultState), ...parsed };
};

const saveState = (state) => {
  localStorage.setItem(stateKey, JSON.stringify(state));
};

const currentFrequency = () => frequencySelect.value;

const getPeriodKey = (freq) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  if (freq === "daily") return `${year}-${month}-${day}`;
  if (freq === "monthly") return `${year}-${month}`;
  if (freq === "yearly") return `${year}`;

  const firstDayOfYear = new Date(year, 0, 1);
  const dayOfYear = Math.floor((now - firstDayOfYear) / 86400000) + 1;
  const week = String(Math.ceil(dayOfYear / 7)).padStart(2, "0");
  return `${year}-W${week}`;
};

const syncRemaining = (state, participants, freq) => {
  const uniqueParticipants = Array.from(new Set(participants));
  const existing = state[freq].remaining;
  const remaining = existing.filter((name) => uniqueParticipants.includes(name));

  if (remaining.length === 0 && uniqueParticipants.length > 0) {
    state[freq].remaining = [...uniqueParticipants];
  } else {
    state[freq].remaining = remaining;
  }
};

const updateStatus = () => {
  const participants = readParticipants();
  const state = readState();
  const freq = currentFrequency();
  syncRemaining(state, participants, freq);

  const period = getPeriodKey(freq);
  periodLabel.textContent = `${freq[0].toUpperCase()}${freq.slice(1)} · ${period}`;

  const historyCount = state[freq].history.length;
  statusMeta.textContent = `${historyCount} winner${historyCount === 1 ? "" : "s"} this cycle`;

  winnerName.textContent = state[freq].lastWinner ?? "—";
  winnerMeta.textContent = state[freq].lastWinner
    ? `Drawn for ${period}`
    : "Ready to draw.";

  saveState(state);
};

const renderParticipants = () => {
  const participants = readParticipants();
  participantsList.innerHTML = "";

  if (participants.length === 0) {
    participantsEmpty.style.display = "block";
    return;
  }

  participantsEmpty.style.display = "none";

  participants.forEach((name, index) => {
    const li = document.createElement("li");
    li.textContent = name;

    const removeButton = document.createElement("button");
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => {
      const updated = participants.filter((_, idx) => idx !== index);
      saveParticipants(updated);
      renderParticipants();
      updateStatus();
      renderHistory();
    });

    li.appendChild(removeButton);
    participantsList.appendChild(li);
  });
};

const renderHistory = () => {
  const state = readState();
  const freq = currentFrequency();
  const history = state[freq].history.slice(0, 6);
  historyList.innerHTML = "";

  if (history.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No winners yet.";
    historyList.appendChild(li);
    return;
  }

  history.forEach((entry) => {
    const li = document.createElement("li");
    li.textContent = `${entry.name} · ${entry.period}`;
    historyList.appendChild(li);
  });
};

const addParticipants = (names) => {
  const cleaned = names.map((name) => name.trim()).filter(Boolean);
  if (cleaned.length === 0) return;

  const participants = readParticipants();
  const merged = [...participants, ...cleaned];
  const unique = Array.from(new Set(merged));
  saveParticipants(unique);
  renderParticipants();
  updateStatus();
  renderHistory();
};

addPersonButton.addEventListener("click", () => {
  addParticipants([newNameInput.value]);
  newNameInput.value = "";
});

bulkAddButton.addEventListener("click", () => {
  const names = bulkNamesInput.value.split("\n");
  addParticipants(names);
  bulkNamesInput.value = "";
});

shuffleButton.addEventListener("click", () => {
  const participants = readParticipants();
  if (participants.length === 0) return;

  const shuffled = [...participants];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  saveParticipants(shuffled);
  renderParticipants();
});

resetCycleButton.addEventListener("click", () => {
  const state = readState();
  const participants = readParticipants();
  const freq = currentFrequency();
  state[freq].remaining = [...participants];
  state[freq].history = [];
  state[freq].lastWinner = null;
  saveState(state);
  updateStatus();
  renderHistory();
});

drawWinnerButton.addEventListener("click", () => {
  const participants = readParticipants();
  if (participants.length === 0) {
    winnerMeta.textContent = "Add participants to start.";
    return;
  }

  const state = readState();
  const freq = currentFrequency();
  syncRemaining(state, participants, freq);

  if (state[freq].remaining.length === 0) {
    state[freq].remaining = [...participants];
  }

  const pool = state[freq].remaining;
  const winnerIndex = Math.floor(Math.random() * pool.length);
  const winner = pool[winnerIndex];
  state[freq].remaining = pool.filter((_, idx) => idx !== winnerIndex);

  const period = getPeriodKey(freq);
  state[freq].lastWinner = winner;
  state[freq].history.unshift({ name: winner, period });

  saveState(state);
  updateStatus();
  renderHistory();
});

frequencySelect.addEventListener("change", () => {
  updateStatus();
  renderHistory();
});

renderParticipants();
updateStatus();
renderHistory();
