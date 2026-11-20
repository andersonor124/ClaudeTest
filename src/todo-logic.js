// Pure to-do list logic. No DOM access, so it can be tested in Node.
// Every function returns new arrays/objects and never changes its input.
(function (root) {
  "use strict";

  const STATUS_DONE = "Complete";
  const STATUS_OPEN = "Not Complete";
  const PRIORITIES = ["High", "Medium", "Low"];
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const EXPORT_HEADER = ["Title", "Notes", "Date", "Priority", "Category", "Status", "Created"];

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  // Local (not UTC) date as YYYY-MM-DD.
  function todayString(now) {
    const d = now || new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function makeId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function cleanText(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function requireTitle(value) {
    const title = cleanText(value);
    if (!title) throw new Error("Task title cannot be empty.");
    return title;
  }

  function requirePriority(value) {
    if (!PRIORITIES.includes(value)) throw new Error("Priority must be High, Medium or Low.");
    return value;
  }

  function requireDate(value) {
    if (typeof value !== "string" || !DATE_RE.test(value)) {
      throw new Error("Date must look like YYYY-MM-DD.");
    }
    return value;
  }

  function createTask(input) {
    const data = input || {};
    return {
      id: makeId(),
      title: requireTitle(data.title),
      notes: cleanText(data.notes),
      date: requireDate(data.date || todayString()),
      status: STATUS_OPEN,
      priority: requirePriority(data.priority || "Medium"),
      category: cleanText(data.category),
      createdAt: new Date().toISOString(),
    };
  }

  function updateById(tasks, id, change) {
    return tasks.map((t) => (t.id === id ? change(t) : t));
  }

  function toggleStatus(tasks, id) {
    return updateById(tasks, id, (t) => ({
      ...t,
      status: t.status === STATUS_DONE ? STATUS_OPEN : STATUS_DONE,
    }));
  }

  function editTask(tasks, id, changes) {
    const c = changes || {};
    return updateById(tasks, id, (t) => {
      const next = { ...t };
      if ("title" in c) next.title = requireTitle(c.title);
      if ("notes" in c) next.notes = cleanText(c.notes);
      if ("category" in c) next.category = cleanText(c.category);
      if ("priority" in c) next.priority = requirePriority(c.priority);
      return next;
    });
  }

  function deleteTask(tasks, id) {
    return tasks.filter((t) => t.id !== id);
  }

  function tasksForDate(tasks, date) {
    return tasks.filter((t) => t.date === date);
  }

  function filterByStatus(tasks, filter) {
    if (filter === "complete") return tasks.filter((t) => t.status === STATUS_DONE);
    if (filter === "not-complete") return tasks.filter((t) => t.status !== STATUS_DONE);
    return tasks.slice();
  }

  function filterByCategory(tasks, category) {
    if (!category || category === "all") return tasks.slice();
    return tasks.filter((t) => t.category === category);
  }

  function listCategories(tasks) {
    const set = new Set(tasks.map((t) => t.category).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  function searchTasks(tasks, query) {
    const q = cleanText(query).toLowerCase();
    if (!q) return tasks.slice();
    return tasks.filter((t) =>
      [t.title, t.notes, t.category].some((field) => (field || "").toLowerCase().includes(q))
    );
  }

  function sortTasks(tasks) {
    return tasks.slice().sort((a, b) => {
      const doneA = a.status === STATUS_DONE ? 1 : 0;
      const doneB = b.status === STATUS_DONE ? 1 : 0;
      if (doneA !== doneB) return doneA - doneB;
      const prA = PRIORITIES.indexOf(a.priority);
      const prB = PRIORITIES.indexOf(b.priority);
      if (prA !== prB) return prA - prB;
      return a.createdAt.localeCompare(b.createdAt);
    });
  }

  function progressFor(tasks) {
    return {
      done: tasks.filter((t) => t.status === STATUS_DONE).length,
      total: tasks.length,
    };
  }

  function carryOver(tasks, fromDate, toDate) {
    if (fromDate === toDate) return tasks.slice();
    return tasks.map((t) =>
      t.date === fromDate && t.status !== STATUS_DONE ? { ...t, date: toDate } : t
    );
  }

  function formatCreated(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return todayString(d) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  function buildExportRows(tasks) {
    const sorted = tasks.slice().sort((a, b) =>
      a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date.localeCompare(b.date)
    );
    return [EXPORT_HEADER.slice()].concat(
      sorted.map((t) => [
        t.title,
        t.notes,
        t.date,
        t.priority,
        t.category,
        t.status,
        formatCreated(t.createdAt),
      ])
    );
  }

  function exportFileName(now) {
    return "todo-export-" + todayString(now) + ".xlsx";
  }

  function backupFileName(now) {
    return "todo-backup-" + todayString(now) + ".json";
  }

  function serializeBackup(tasks) {
    return JSON.stringify({ app: "daily-todo", version: 1, tasks: tasks }, null, 2);
  }

  // Validates a backup file's text and returns clean tasks. Throws on anything invalid.
  function parseBackup(text) {
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error("This file is not valid JSON.");
    }
    if (!data || !Array.isArray(data.tasks)) {
      throw new Error("This file is not a to-do backup.");
    }
    return data.tasks.map((t, i) => {
      const where = " (task " + (i + 1) + ")";
      if (!t || typeof t !== "object") throw new Error("Invalid task" + where);
      if (t.status !== STATUS_DONE && t.status !== STATUS_OPEN) {
        throw new Error("Invalid status" + where);
      }
      try {
        return {
          id: typeof t.id === "string" && t.id ? t.id : makeId(),
          title: requireTitle(t.title),
          notes: cleanText(t.notes),
          date: requireDate(t.date),
          status: t.status,
          priority: requirePriority(t.priority || "Medium"),
          category: cleanText(t.category),
          createdAt: typeof t.createdAt === "string" ? t.createdAt : new Date().toISOString(),
        };
      } catch (e) {
        throw new Error(e.message + where);
      }
    });
  }

  const api = {
    STATUS_DONE,
    STATUS_OPEN,
    PRIORITIES,
    todayString,
    createTask,
    toggleStatus,
    editTask,
    deleteTask,
    tasksForDate,
    filterByStatus,
    filterByCategory,
    listCategories,
    searchTasks,
    sortTasks,
    progressFor,
    carryOver,
    buildExportRows,
    exportFileName,
    backupFileName,
    serializeBackup,
    parseBackup,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.TodoLogic = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
