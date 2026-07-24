// ---------- Utilities ----------
const STORAGE_KEY = 'habitTrackerData';

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function daysAgoStr(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function loadHabits() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveHabits(habits) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
}

// ---------- Streak Calculation ----------
// A habit has: { id, name, category, log: { 'YYYY-MM-DD': true }, freezeUsedDates: [] }
function calcStreak(habit) {
  let streak = 0;
  let cursor = new Date();

  // if today not done yet, start checking from yesterday for "current" streak baseline
  let checkDate = new Date(cursor);
  while (true) {
    const dStr = checkDate.toISOString().split('T')[0];
    if (habit.log[dStr]) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (dStr === todayStr()) {
      // today not done yet — don't break streak, just skip and check yesterday
      checkDate.setDate(checkDate.getDate() - 1);
      continue;
    } else {
      break;
    }
  }
  return streak;
}

function calcBestStreak(habit) {
  const dates = Object.keys(habit.log).filter(d => habit.log[d]).sort();
  if (dates.length === 0) return 0;

  let best = 1, current = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diff = (curr - prev) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      current++;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }
  return Math.max(best, calcStreak(habit));
}

// ---------- Rendering ----------
function render() {
  const habits = loadHabits();
  const list = document.getElementById('habitList');
  const emptyState = document.getElementById('emptyState');
  list.innerHTML = '';

  if (habits.length === 0) {
    emptyState.style.display = 'block';
  } else {
    emptyState.style.display = 'none';
  }

  let bestOverall = 0;
  let doneToday = 0;

  habits.forEach(habit => {
    const streak = calcStreak(habit);
    const best = calcBestStreak(habit);
    bestOverall = Math.max(bestOverall, best);
    const isDoneToday = !!habit.log[todayStr()];
    if (isDoneToday) doneToday++;

    const card = document.createElement('div');
    card.className = 'habit-card';

    // heatmap for last 7 days
    let heatmapHtml = '<div class="heatmap">';
    for (let i = 6; i >= 0; i--) {
      const d = daysAgoStr(i);
      const filled = habit.log[d] ? 'filled' : '';
      heatmapHtml += `<div class="heatmap-day ${filled}" title="${d}"></div>`;
    }
    heatmapHtml += '</div>';

    card.innerHTML = `
      <div class="habit-info">
        <div class="habit-name">${habit.name}</div>
        <div class="habit-meta">
          <span class="habit-category">${habit.category}</span>
          <span class="streak-badge">🔥 ${streak} day streak</span>
          &nbsp;·&nbsp; Best: ${best}
        </div>
        ${heatmapHtml}
      </div>
      <div class="habit-actions">
        <button class="checkin-btn ${isDoneToday ? 'done' : 'pending'}" data-id="${habit.id}">
          ${isDoneToday ? '✓ Done' : 'Check In'}
        </button>
        <button class="delete-btn" data-id="${habit.id}" title="Delete habit">🗑</button>
      </div>
    `;
    list.appendChild(card);
  });

  document.getElementById('totalHabits').textContent = habits.length;
  document.getElementById('bestStreak').textContent = bestOverall;
  document.getElementById('doneToday').textContent = doneToday;

  // attach listeners
  document.querySelectorAll('.checkin-btn.pending').forEach(btn => {
    btn.addEventListener('click', () => checkIn(btn.dataset.id));
  });
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteHabit(btn.dataset.id));
  });
}

// ---------- Actions ----------
function addHabit() {
  const nameInput = document.getElementById('habitName');
  const categorySelect = document.getElementById('habitCategory');
  const name = nameInput.value.trim();
  if (!name) {
    nameInput.focus();
    return;
  }

  const habits = loadHabits();
  habits.push({
    id: Date.now().toString(),
    name,
    category: categorySelect.value,
    log: {}
  });
  saveHabits(habits);
  nameInput.value = '';
  render();
}

function checkIn(id) {
  const habits = loadHabits();
  const habit = habits.find(h => h.id === id);
  if (habit) {
    habit.log[todayStr()] = true;
    saveHabits(habits);
    render();
  }
}

function deleteHabit(id) {
  let habits = loadHabits();
  habits = habits.filter(h => h.id !== id);
  saveHabits(habits);
  render();
}

// ---------- Init ----------
document.getElementById('addHabitBtn').addEventListener('click', addHabit);
document.getElementById('habitName').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addHabit();
});

render();
