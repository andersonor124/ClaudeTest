# Daily To-Do

A to-do list web page for tracking daily tasks, with Excel export.

## Demo
[Watch the 78-second demo video](docs/demo.mp4) (MP4, 1.6 MB). On GitHub, open the
file and click **View raw** or **Download** if it doesn't play in the page.

## Features
- Tasks belong to a day (defaults to today). Move between days with the arrows, the date picker, or **Today**.
- **Complete / Not Complete** button on each task: click to switch.
- Priority (High / Medium / Low), category, and notes per task.
- Edit and delete tasks (delete asks for confirmation).
- Filter by status and category; search across all days.
- Progress counter for the selected day.
- **Carry over**: on a past day, move its unfinished tasks to today.
- **Export to Excel**: downloads `todo-export-YYYY-MM-DD.xlsx` with every task
  (Title, Notes, Date, Priority, Category, Status, Created).
- **Backup / Restore**: save all tasks to a `.json` file and load them back.
- Light/dark mode follows your device setting.

## How to use
Open `index.html` in a browser (double-click it). No install or server needed.

Tasks are saved in that browser only. Clearing browser data deletes them, and a
different browser or computer won't see them; use **Backup** to keep a copy.

Excel export loads the SheetJS library from cdnjs, so it needs an internet
connection. Everything else works offline.

## Tests
Requires Node.js 18 or newer.

```bash
npm test
```

## Files
- `index.html` – the page
- `styles.css` – styling
- `src/todo-logic.js` – task logic (no browser code; unit-tested)
- `src/app.js` – connects the page to the logic, storage, export, backup
- `tests/todo-logic.test.js` – unit tests
- `docs/demo.mp4` – demo video
