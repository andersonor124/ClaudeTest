// Connects the page to TodoLogic. Handles storage, rendering and buttons.
(function () {
  "use strict";

  const L = window.TodoLogic;
  const STORAGE_KEY = "daily-todo.tasks";

  const $ = (id) => document.getElementById(id);
  const els = {
    dayPicker: $("day-picker"),
    prevDay: $("prev-day"),
    nextDay: $("next-day"),
    todayBtn: $("today-btn"),
    progressText: $("progress-text"),
    progressFill: $("progress-fill"),
    addForm: $("add-form"),
    addTitle: $("add-title"),
    addPriority: $("add-priority"),
    addCategory: $("add-category"),
    addNotes: $("add-notes"),
    categoryList: $("category-list"),
    categoryFilter: $("category-filter"),
    search: $("search"),
    carryBar: $("carry-bar"),
    carryText: $("carry-text"),
    carryBtn: $("carry-btn"),
    message: $("message"),
    listHeading: $("list-heading"),
    list: $("task-list"),
    empty: $("empty"),
    exportBtn: $("export-btn"),
    backupBtn: $("backup-btn"),
    restoreBtn: $("restore-btn"),
    restoreFile: $("restore-file"),
    taskTemplate: $("task-template"),
    editTemplate: $("edit-template"),
  };

  const state = {
    tasks: loadTasks(),
    day: L.todayString(),
    status: "all",
    category: "all",
    query: "",
    editingId: null,
  };

  // ---------- storage ----------

  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? L.parseBackup(raw) : [];
    } catch (e) {
      console.warn("Could not load saved tasks:", e);
      return [];
    }
  }

  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, L.serializeBackup(state.tasks));
    } catch (e) {
      showMessage("Could not save to this browser. Use Backup to keep a copy.");
    }
  }

  function setTasks(next) {
    state.tasks = next;
    saveTasks();
    render();
  }

  // ---------- helpers ----------

  function shiftDay(dateStr, delta) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return L.todayString(new Date(y, m - 1, d + delta));
  }

  function prettyDate(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
  }

  let messageTimer = null;
  function showMessage(text, ok) {
    els.message.textContent = text;
    els.message.classList.toggle("ok", !!ok);
    els.message.hidden = false;
    clearTimeout(messageTimer);
    messageTimer = setTimeout(() => { els.message.hidden = true; }, 5000);
  }

  function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ---------- rendering ----------

  function render() {
    const today = L.todayString();
    const searching = state.query.trim() !== "";
    const dayTasks = L.tasksForDate(state.tasks, state.day);

    els.dayPicker.value = state.day;

    // Progress is always for the selected day.
    const p = L.progressFor(dayTasks);
    els.progressText.textContent = p.done + " of " + p.total + " complete";
    els.progressFill.style.width = p.total ? (100 * p.done) / p.total + "%" : "0";

    // Carry-over bar: only for past days with unfinished tasks.
    const unfinished = dayTasks.filter((t) => t.status !== L.STATUS_DONE).length;
    const showCarry = !searching && state.day < today && unfinished > 0;
    els.carryBar.hidden = !showCarry;
    if (showCarry) {
      els.carryText.textContent =
        unfinished + (unfinished === 1 ? " unfinished task" : " unfinished tasks") + " on this day.";
    }

    renderCategories();

    let visible = searching ? L.searchTasks(state.tasks, state.query) : dayTasks;
    visible = L.filterByStatus(visible, state.status);
    visible = L.filterByCategory(visible, state.category);
    visible = searching
      ? visible.slice().sort((a, b) => b.date.localeCompare(a.date) || a.createdAt.localeCompare(b.createdAt))
      : L.sortTasks(visible);

    els.listHeading.textContent = searching
      ? "Search results across all days (" + visible.length + ")"
      : (state.day === today ? "Today — " : "") + prettyDate(state.day);

    els.list.replaceChildren(...visible.map((t) => renderTask(t, searching)));

    els.empty.hidden = visible.length > 0;
    if (!visible.length) {
      els.empty.textContent = searching
        ? "No tasks match your search."
        : dayTasks.length ? "No tasks match these filters." : "No tasks for this day yet.";
    }

    document.querySelectorAll(".seg-btn").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.status === state.status));
    });
  }

  function renderCategories() {
    const cats = L.listCategories(state.tasks);
    if (state.category !== "all" && !cats.includes(state.category)) state.category = "all";

    const options = [new Option("All categories", "all")].concat(cats.map((c) => new Option(c, c)));
    els.categoryFilter.replaceChildren(...options);
    els.categoryFilter.value = state.category;

    els.categoryList.replaceChildren(...cats.map((c) => new Option(c)));
  }

  function renderTask(t, showDate) {
    if (t.id === state.editingId) return renderEditor(t);

    const li = els.taskTemplate.content.firstElementChild.cloneNode(true);
    const done = t.status === L.STATUS_DONE;
    li.dataset.id = t.id;
    li.classList.toggle("is-done", done);
    li.querySelector(".task-title").textContent = t.title;
    const pri = li.querySelector(".tag-priority");
    pri.textContent = t.priority;
    pri.dataset.p = t.priority;
    li.querySelector(".tag-category").textContent = t.category;
    li.querySelector(".tag-date").textContent = showDate ? t.date : "";
    li.querySelector(".task-notes").textContent = t.notes;

    const statusBtn = li.querySelector(".status-btn");
    statusBtn.textContent = t.status;
    statusBtn.classList.toggle("is-done", done);
    statusBtn.title = "Click to mark " + (done ? L.STATUS_OPEN : L.STATUS_DONE);
    statusBtn.setAttribute("aria-label", t.title + ": " + t.status + ". " + statusBtn.title);
    return li;
  }

  function renderEditor(t) {
    const li = els.editTemplate.content.firstElementChild.cloneNode(true);
    li.dataset.id = t.id;
    const form = li.querySelector("form");
    form.elements.title.value = t.title;
    form.elements.priority.value = t.priority;
    form.elements.category.value = t.category;
    form.elements.notes.value = t.notes;
    setTimeout(() => form.elements.title.focus(), 0);
    return li;
  }

  // ---------- events ----------

  els.addForm.addEventListener("submit", (e) => {
    e.preventDefault();
    try {
      const task = L.createTask({
        title: els.addTitle.value,
        priority: els.addPriority.value,
        category: els.addCategory.value,
        notes: els.addNotes.value,
        date: state.day,
      });
      els.addTitle.value = "";
      els.addNotes.value = "";
      setTasks(state.tasks.concat(task));
      els.addTitle.focus();
    } catch (err) {
      showMessage(err.message);
    }
  });

  els.list.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const id = btn.closest("li").dataset.id;
    const action = btn.dataset.action;

    if (action === "toggle") {
      setTasks(L.toggleStatus(state.tasks, id));
    } else if (action === "edit") {
      state.editingId = id;
      render();
    } else if (action === "cancel") {
      state.editingId = null;
      render();
    } else if (action === "delete") {
      const task = state.tasks.find((t) => t.id === id);
      if (task && confirm('Delete this task?\n\n"' + task.title + '"')) {
        if (state.editingId === id) state.editingId = null;
        setTasks(L.deleteTask(state.tasks, id));
      }
    }
  });

  els.list.addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.target;
    const id = form.closest("li").dataset.id;
    try {
      const next = L.editTask(state.tasks, id, {
        title: form.elements.title.value,
        priority: form.elements.priority.value,
        category: form.elements.category.value,
        notes: form.elements.notes.value,
      });
      state.editingId = null;
      setTasks(next);
    } catch (err) {
      showMessage(err.message);
    }
  });

  els.list.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && state.editingId) {
      state.editingId = null;
      render();
    }
  });

  function goToDay(day) {
    if (!day) return;
    state.day = day;
    state.editingId = null;
    render();
  }

  els.dayPicker.addEventListener("change", () => goToDay(els.dayPicker.value));
  els.prevDay.addEventListener("click", () => goToDay(shiftDay(state.day, -1)));
  els.nextDay.addEventListener("click", () => goToDay(shiftDay(state.day, 1)));
  els.todayBtn.addEventListener("click", () => goToDay(L.todayString()));

  document.querySelectorAll(".seg-btn").forEach((b) => {
    b.addEventListener("click", () => {
      state.status = b.dataset.status;
      render();
    });
  });

  els.categoryFilter.addEventListener("change", () => {
    state.category = els.categoryFilter.value;
    render();
  });

  els.search.addEventListener("input", () => {
    state.query = els.search.value;
    render();
  });

  els.carryBtn.addEventListener("click", () => {
    const today = L.todayString();
    const before = L.tasksForDate(state.tasks, state.day).filter((t) => t.status !== L.STATUS_DONE).length;
    setTasks(L.carryOver(state.tasks, state.day, today));
    showMessage("Moved " + before + (before === 1 ? " task" : " tasks") + " to today.", true);
  });

  els.exportBtn.addEventListener("click", () => {
    if (typeof XLSX === "undefined") {
      showMessage("Excel export needs an internet connection to load. Please check your connection and reload.");
      return;
    }
    const rows = L.buildExportRows(state.tasks);
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet["!cols"] = [{ wch: 36 }, { wch: 40 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 17 }];
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Tasks");
    XLSX.writeFile(book, L.exportFileName());
    showMessage("Exported " + (rows.length - 1) + " tasks to Excel.", true);
  });

  els.backupBtn.addEventListener("click", () => {
    const blob = new Blob([L.serializeBackup(state.tasks)], { type: "application/json" });
    downloadBlob(blob, L.backupFileName());
    showMessage("Backup saved.", true);
  });

  els.restoreBtn.addEventListener("click", () => els.restoreFile.click());

  els.restoreFile.addEventListener("change", async () => {
    const file = els.restoreFile.files[0];
    els.restoreFile.value = "";
    if (!file) return;
    let tasks;
    try {
      tasks = L.parseBackup(await file.text());
    } catch (err) {
      showMessage("Restore failed: " + err.message + " Your current tasks were not changed.");
      return;
    }
    if (!confirm("Replace your current " + state.tasks.length + " tasks with the " + tasks.length + " tasks in this backup?")) {
      return;
    }
    state.editingId = null;
    setTasks(tasks);
    showMessage("Restored " + tasks.length + " tasks.", true);
  });

  // Keep tabs in sync if the app is open twice.
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      state.tasks = loadTasks();
      render();
    }
  });

  render();
})();
