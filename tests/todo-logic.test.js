const { test } = require("node:test");
const assert = require("node:assert/strict");
const logic = require("../src/todo-logic.js");

const {
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
  serializeBackup,
  parseBackup,
  todayString,
} = logic;

// Helper: build a task with fixed fields so tests are predictable.
function task(overrides) {
  return {
    id: "t1",
    title: "Task",
    notes: "",
    date: "2026-11-20",
    status: "Not Complete",
    priority: "Medium",
    category: "",
    createdAt: "2026-11-20T09:00:00.000Z",
    ...overrides,
  };
}

// ---------- createTask ----------

test("1. createTask sets defaults", () => {
  const t = createTask({ title: "Buy milk", date: "2026-11-20" });
  assert.equal(t.title, "Buy milk");
  assert.equal(t.date, "2026-11-20");
  assert.equal(t.status, "Not Complete");
  assert.equal(t.priority, "Medium");
  assert.equal(t.notes, "");
  assert.equal(t.category, "");
  assert.ok(typeof t.id === "string" && t.id.length > 0);
  assert.ok(!Number.isNaN(Date.parse(t.createdAt)));
});

test("1b. createTask gives unique ids", () => {
  const a = createTask({ title: "A" });
  const b = createTask({ title: "B" });
  assert.notEqual(a.id, b.id);
});

test("2. createTask trims title, notes and category", () => {
  const t = createTask({
    title: "  Buy milk  ",
    notes: "  2 litres ",
    category: " Home ",
    priority: "High",
  });
  assert.equal(t.title, "Buy milk");
  assert.equal(t.notes, "2 litres");
  assert.equal(t.category, "Home");
  assert.equal(t.priority, "High");
});

test("3. createTask rejects empty or whitespace title", () => {
  assert.throws(() => createTask({ title: "" }));
  assert.throws(() => createTask({ title: "   " }));
  assert.throws(() => createTask({}));
});

test("4. createTask defaults date to today", () => {
  const t = createTask({ title: "X" });
  assert.equal(t.date, todayString());
});

test("4b. todayString uses local date in YYYY-MM-DD", () => {
  assert.equal(todayString(new Date(2026, 0, 5)), "2026-01-05");
});

test("4c. createTask rejects invalid priority and bad date", () => {
  assert.throws(() => createTask({ title: "X", priority: "Urgent" }));
  assert.throws(() => createTask({ title: "X", date: "20/11/2026" }));
});

// ---------- toggleStatus ----------

test("5. toggleStatus flips status and does not mutate input", () => {
  const tasks = [task({ id: "a" }), task({ id: "b" })];
  const once = toggleStatus(tasks, "a");
  assert.equal(once[0].status, "Complete");
  assert.equal(once[1].status, "Not Complete");
  assert.equal(tasks[0].status, "Not Complete", "original not mutated");
  const twice = toggleStatus(once, "a");
  assert.equal(twice[0].status, "Not Complete");
});

test("5b. toggleStatus with unknown id leaves list unchanged", () => {
  const tasks = [task({ id: "a" })];
  assert.deepEqual(toggleStatus(tasks, "zzz"), tasks);
});

// ---------- editTask ----------

test("6. editTask updates only the given fields", () => {
  const tasks = [task({ id: "a", notes: "old", category: "Work" })];
  const out = editTask(tasks, "a", { title: "  New  ", priority: "Low" });
  assert.equal(out[0].title, "New");
  assert.equal(out[0].priority, "Low");
  assert.equal(out[0].notes, "old");
  assert.equal(out[0].category, "Work");
  assert.equal(tasks[0].title, "Task", "original not mutated");
});

test("6b. editTask rejects empty title and invalid priority", () => {
  const tasks = [task({ id: "a" })];
  assert.throws(() => editTask(tasks, "a", { title: "  " }));
  assert.throws(() => editTask(tasks, "a", { priority: "Urgent" }));
});

test("6c. editTask with unknown id leaves list unchanged", () => {
  const tasks = [task({ id: "a" })];
  assert.deepEqual(editTask(tasks, "zzz", { title: "New" }), tasks);
});

// ---------- deleteTask ----------

test("7. deleteTask removes the task; unknown id is a no-op", () => {
  const tasks = [task({ id: "a" }), task({ id: "b" })];
  const out = deleteTask(tasks, "a");
  assert.deepEqual(out.map((t) => t.id), ["b"]);
  assert.equal(tasks.length, 2, "original not mutated");
  assert.deepEqual(deleteTask(tasks, "zzz"), tasks);
});

// ---------- views ----------

test("8. tasksForDate returns only that day", () => {
  const tasks = [
    task({ id: "a", date: "2026-11-20" }),
    task({ id: "b", date: "2026-11-21" }),
  ];
  assert.deepEqual(tasksForDate(tasks, "2026-11-20").map((t) => t.id), ["a"]);
  assert.deepEqual(tasksForDate(tasks, "2026-01-01"), []);
});

test("9. filterByStatus", () => {
  const tasks = [
    task({ id: "a", status: "Complete" }),
    task({ id: "b", status: "Not Complete" }),
  ];
  assert.equal(filterByStatus(tasks, "all").length, 2);
  assert.deepEqual(filterByStatus(tasks, "complete").map((t) => t.id), ["a"]);
  assert.deepEqual(filterByStatus(tasks, "not-complete").map((t) => t.id), ["b"]);
});

test("10. filterByCategory and listCategories", () => {
  const tasks = [
    task({ id: "a", category: "Work" }),
    task({ id: "b", category: "Home" }),
    task({ id: "c", category: "Work" }),
    task({ id: "d", category: "" }),
  ];
  assert.deepEqual(filterByCategory(tasks, "Work").map((t) => t.id), ["a", "c"]);
  assert.equal(filterByCategory(tasks, "all").length, 4);
  assert.deepEqual(listCategories(tasks), ["Home", "Work"]);
});

test("11. searchTasks matches title, notes, category case-insensitively", () => {
  const tasks = [
    task({ id: "a", title: "Buy MILK", date: "2026-11-19" }),
    task({ id: "b", notes: "get milk too", date: "2026-11-20" }),
    task({ id: "c", category: "Milkman" }),
    task({ id: "d", title: "Other" }),
  ];
  assert.deepEqual(searchTasks(tasks, "milk").map((t) => t.id), ["a", "b", "c"]);
  assert.equal(searchTasks(tasks, "   ").length, 4);
  assert.deepEqual(searchTasks(tasks, "nothing"), []);
});

test("12. sortTasks: not complete first, then priority, then oldest", () => {
  const tasks = [
    task({ id: "done", status: "Complete", priority: "High" }),
    task({ id: "low", priority: "Low" }),
    task({ id: "high-new", priority: "High", createdAt: "2026-11-20T10:00:00.000Z" }),
    task({ id: "high-old", priority: "High", createdAt: "2026-11-20T08:00:00.000Z" }),
    task({ id: "med", priority: "Medium" }),
  ];
  assert.deepEqual(
    sortTasks(tasks).map((t) => t.id),
    ["high-old", "high-new", "med", "low", "done"]
  );
  assert.equal(tasks[0].id, "done", "original not mutated");
});

test("13. progressFor counts completed tasks", () => {
  const tasks = [
    task({ status: "Complete" }),
    task({ status: "Complete" }),
    task({}),
    task({}),
    task({}),
  ];
  assert.deepEqual(progressFor(tasks), { done: 2, total: 5 });
  assert.deepEqual(progressFor([]), { done: 0, total: 0 });
});

// ---------- carry over ----------

test("14. carryOver moves only unfinished tasks from that day", () => {
  const tasks = [
    task({ id: "a", date: "2026-11-19" }),
    task({ id: "b", date: "2026-11-19", status: "Complete" }),
    task({ id: "c", date: "2026-11-18" }),
  ];
  const out = carryOver(tasks, "2026-11-19", "2026-11-20");
  const byId = Object.fromEntries(out.map((t) => [t.id, t.date]));
  assert.deepEqual(byId, { a: "2026-11-20", b: "2026-11-19", c: "2026-11-18" });
  assert.equal(tasks[0].date, "2026-11-19", "original not mutated");
});

test("15. carryOver with same from/to date is a no-op", () => {
  const tasks = [task({ id: "a", date: "2026-11-20" })];
  assert.deepEqual(carryOver(tasks, "2026-11-20", "2026-11-20"), tasks);
});

// ---------- export ----------

test("16. buildExportRows: header + all tasks sorted by date then created", () => {
  const tasks = [
    task({ id: "b", title: "B", date: "2026-11-21", createdAt: "2026-11-21T08:00:00.000Z" }),
    task({ id: "a2", title: "A2", date: "2026-11-20", createdAt: "2026-11-20T10:00:00.000Z" }),
    task({
      id: "a1",
      title: "A1",
      notes: "n",
      date: "2026-11-20",
      priority: "High",
      category: "Work",
      status: "Complete",
      createdAt: "2026-11-20T09:00:00.000Z",
    }),
  ];
  const rows = buildExportRows(tasks);
  assert.deepEqual(rows[0], ["Title", "Notes", "Date", "Priority", "Category", "Status", "Created"]);
  assert.deepEqual(rows.slice(1).map((r) => r[0]), ["A1", "A2", "B"]);
  assert.deepEqual(rows[1].slice(0, 6), ["A1", "n", "2026-11-20", "High", "Work", "Complete"]);
  assert.equal(typeof rows[1][6], "string");
  assert.equal(rows.length, 4);
});

test("16b. buildExportRows with no tasks returns header only", () => {
  assert.equal(buildExportRows([]).length, 1);
});

test("17. exportFileName uses local date", () => {
  assert.equal(exportFileName(new Date(2026, 10, 20)), "todo-export-2026-11-20.xlsx");
});

// ---------- backup ----------

test("18. backup round-trips", () => {
  const tasks = [task({ id: "a" }), task({ id: "b", status: "Complete", notes: "x" })];
  assert.deepEqual(parseBackup(serializeBackup(tasks)), tasks);
});

test("19. parseBackup rejects bad input", () => {
  assert.throws(() => parseBackup("not json"));
  assert.throws(() => parseBackup(JSON.stringify({ hello: 1 })));
  assert.throws(() => parseBackup(JSON.stringify({ tasks: [{ date: "2026-11-20" }] })));
  assert.throws(() => parseBackup(JSON.stringify({ tasks: [task({ date: "" })] })));
  assert.throws(() => parseBackup(JSON.stringify({ tasks: [task({ status: "Done" })] })));
  assert.throws(() => parseBackup(JSON.stringify({ tasks: [task({ priority: "Urgent" })] })));
});

test("19b. parseBackup fills missing optional fields", () => {
  const raw = JSON.stringify({
    tasks: [{ id: "a", title: "T", date: "2026-11-20", status: "Complete" }],
  });
  const [t] = parseBackup(raw);
  assert.equal(t.priority, "Medium");
  assert.equal(t.notes, "");
  assert.equal(t.category, "");
  assert.ok(typeof t.createdAt === "string");
});
