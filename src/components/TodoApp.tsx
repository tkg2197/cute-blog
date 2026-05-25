import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { AuthorKey, Profile, TodoItem } from "../lib/types";

type Filter = "all" | "active" | "completed";

interface Props {
  initialView: AuthorKey;
  authorNames: Record<AuthorKey, string>;
  currentAuthor: AuthorKey | null;
  profile: Profile | null;
}

interface ApiState {
  todos: TodoItem[];
  canEdit: boolean;
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function fmtMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours} hr${hours > 1 ? "s" : ""}${rest ? ` ${rest} min` : ""}`;
}

function postForm(path: string, fields: Record<string, string>) {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => form.set(key, value));
  return fetch(path, { method: "POST", body: form }).then(async (res) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  });
}

function sumMinutes(todos: TodoItem[]) {
  return todos.reduce((sum, todo) => sum + Number(todo.completed_minutes || 0), 0);
}

function streakDays(minutesByDay: Map<string, number>) {
  let streak = 0;
  let day = new Date();
  while (minutesByDay.get(dateKey(day))) {
    streak += 1;
    day = addDays(day, -1);
  }
  return streak;
}

export default function TodoApp({ initialView, authorNames, currentAuthor, profile }: Props) {
  const [view, setView] = useState<AuthorKey>(initialView);
  const [filter, setFilter] = useState<Filter>("all");
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [message, setMessage] = useState("");
  const [completionIds, setCompletionIds] = useState<string[]>([]);
  const [completionDate, setCompletionDate] = useState(todayKey());
  const [completionStart, setCompletionStart] = useState("09:00");
  const [completionEnd, setCompletionEnd] = useState("10:00");
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedName = authorNames[view];
  const activeTodos = todos.filter((todo) => !todo.completed);
  const completedTodos = todos.filter((todo) => todo.completed);
  const doneToday = completedTodos.filter((todo) => todo.completed_on === todayKey());
  const visibleTodos = todos.filter((todo) => {
    if (filter === "active") return !todo.completed;
    if (filter === "completed") return todo.completed;
    return true;
  });
  const todayTotalCount = activeTodos.length + doneToday.length;
  const todayPercent = todayTotalCount ? Math.round((doneToday.length / todayTotalCount) * 100) : 0;
  const todayMinutes = sumMinutes(doneToday);

  const minutesByDay = useMemo(() => {
    const map = new Map<string, number>();
    completedTodos.forEach((todo) => {
      if (!todo.completed_on) return;
      map.set(todo.completed_on, (map.get(todo.completed_on) || 0) + Number(todo.completed_minutes || 0));
    });
    return map;
  }, [completedTodos]);

  const heatmap = useMemo(() => {
    const today = new Date();
    const start = addDays(today, -364);
    const leading = start.getDay();
    const blanks = Array.from({ length: leading }, () => null);
    const days = Array.from({ length: 365 }, (_item, index) => {
      const day = addDays(start, index);
      const key = dateKey(day);
      const minutes = minutesByDay.get(key) || 0;
      return { key, minutes };
    });
    return [...blanks, ...days];
  }, [minutesByDay]);

  const yearMinutes = sumMinutes(completedTodos);
  const activeDays = Array.from(minutesByDay.values()).filter(Boolean).length;
  const streak = streakDays(minutesByDay);
  const weeklyAverage = Array.from({ length: 7 }, (_item, index) => {
    const key = dateKey(addDays(new Date(), -index));
    return minutesByDay.get(key) || 0;
  }).reduce((sum, minutes) => sum + minutes, 0) / 7;

  async function loadTodos(nextView = view) {
    const res = await fetch(`/api/todos?view=${nextView}`);
    const data = (await res.json()) as ApiState & { error?: string };
    if (!res.ok) throw new Error(data.error || "Failed to load tasks");
    setTodos(data.todos || []);
    setCanEdit(data.canEdit);
    setMessage("");
  }

  useEffect(() => {
    loadTodos(view).catch((error) => setMessage(error.message));
  }, [view]);

  async function addTodo() {
    const title = draft.trim();
    if (!title) return;
    try {
      await postForm("/api/todos/create", { title });
      setDraft("");
      await loadTodos();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not add task");
    }
  }

  async function saveEdit(id: string) {
    const title = editingTitle.trim();
    if (!title) {
      await deleteTodo(id);
      return;
    }
    try {
      await postForm("/api/todos/update", { id, title });
      setEditingId(null);
      await loadTodos();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update task");
    }
  }

  async function deleteTodo(id: string) {
    try {
      await postForm("/api/todos/delete", { id });
      await loadTodos();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete task");
    }
  }

  function requestCompletion(id: string) {
    setCompletionIds([id]);
    setCompletionDate(todayKey());
    setCompletionStart("09:00");
    setCompletionEnd("10:00");
  }

  async function completeSelected() {
    try {
      for (const id of completionIds) {
        await postForm("/api/todos/complete", {
          id,
          completed_on: completionDate,
          start_time: completionStart,
          end_time: completionEnd,
        });
      }
      setCompletionIds([]);
      await loadTodos();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not complete task");
    }
  }

  async function uncomplete(id: string) {
    try {
      await postForm("/api/todos/uncomplete", { id });
      await loadTodos();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not reopen task");
    }
  }

  async function clearCompleted() {
    try {
      await postForm("/api/todos/clear-completed", {});
      await loadTodos();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not clear completed tasks");
    }
  }

  function toggleAll() {
    if (activeTodos.length) {
      setCompletionIds(activeTodos.map((todo) => todo.id));
    } else if (completedTodos.length) {
      Promise.all(completedTodos.map((todo) => postForm("/api/todos/uncomplete", { id: todo.id })))
        .then(() => loadTodos())
        .catch((error) => setMessage(error instanceof Error ? error.message : "Could not reopen tasks"));
    }
  }

  const completionTitle = completionIds.length === 1
    ? todos.find((todo) => todo.id === completionIds[0])?.title || "Complete task"
    : `Complete ${completionIds.length} tasks`;

  return (
    <main className="todo-shell">
      <section className="todo-main" aria-labelledby="todoTitle">
        <header className="todo-hero">
          <p className="todo-kicker">A gentle little plan for the days ahead</p>
          <h1 id="todoTitle">To <em>Do.</em></h1>
          <p className="todo-summary">
            {selectedName} has <strong>{activeTodos.length}</strong> open tasks today, and a quiet streak of <strong>{streak} days</strong>.
          </p>

          <div className="todo-tools">
            <div className="todo-switch" aria-label="Choose todo owner">
              {(["white", "brown"] as AuthorKey[]).map((key) => (
                <button key={key} className={view === key ? "is-active" : ""} type="button" onClick={() => setView(key)}>
                  <i></i>{authorNames[key]}
                </button>
              ))}
            </div>
            <button className="todo-date-pill" type="button" aria-label="Today">
              <span>Monday, May 25</span>
            </button>
            <button className="todo-add-hero" type="button" onClick={() => inputRef.current?.focus()} disabled={!canEdit}>
              + Add a task
            </button>
          </div>
        </header>

        <section className="todo-card" aria-label={`${selectedName}'s todo list`}>
          <div className="todo-card__head">
            <div>
              <p>Today · {selectedName}'s list</p>
              <h2>{activeTodos.length} small things</h2>
            </div>
            <div className="todo-progress">
              <span>Progress</span>
              <strong>{fmtMinutes(todayMinutes)}</strong>
              <small>/ {fmtMinutes(Math.max(todayMinutes, todayMinutes + activeTodos.length * 30))}</small>
            </div>
          </div>

          {message && <p className="todo-message">{message}</p>}
          {!canEdit && (
            <p className="todo-message">
              {profile ? `Current account can edit ${authorNames[currentAuthor || "white"]}'s list only.` : "Log in to add or edit tasks."}
            </p>
          )}

          <div className="todo-new">
            <button className="todo-toggle-all" type="button" onClick={toggleAll} disabled={!canEdit || !todos.length} aria-label="Toggle all tasks">
              {activeTodos.length ? "○" : "✓"}
            </button>
            <input
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") addTodo();
              }}
              placeholder={canEdit ? "Write a small thing to do..." : "Switch to your own list to add tasks"}
              disabled={!canEdit}
            />
            <button type="button" onClick={addTodo} disabled={!canEdit || !draft.trim()} aria-label="Add task">↗</button>
          </div>

          <div className="todo-filters" aria-label="Task filters">
            {(["all", "active", "completed"] as Filter[]).map((item) => (
              <button key={item} className={filter === item ? "is-active" : ""} type="button" onClick={() => setFilter(item)}>
                {item === "all" ? "All" : item === "active" ? "In bloom" : "Done"}
              </button>
            ))}
            <span>{activeTodos.length} left</span>
            <button type="button" onClick={clearCompleted} disabled={!canEdit || !completedTodos.length}>Clear completed</button>
          </div>

          <div className="todo-list">
            {visibleTodos.map((todo) => (
              <article key={todo.id} className={`todo-item ${todo.completed ? "is-completed" : ""}`}>
                <button
                  className="todo-check"
                  type="button"
                  disabled={!canEdit}
                  onClick={() => (todo.completed ? uncomplete(todo.id) : requestCompletion(todo.id))}
                  aria-label={todo.completed ? "Reopen task" : "Complete task"}
                >
                  {todo.completed ? "✓" : ""}
                </button>
                <div className="todo-item__body">
                  {editingId === todo.id ? (
                    <input
                      className="todo-edit"
                      value={editingTitle}
                      autoFocus
                      onChange={(event) => setEditingTitle(event.target.value)}
                      onBlur={() => saveEdit(todo.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") saveEdit(todo.id);
                        if (event.key === "Escape") setEditingId(null);
                      }}
                    />
                  ) : (
                    <button
                      className="todo-title"
                      type="button"
                      onDoubleClick={() => {
                        if (!canEdit) return;
                        setEditingId(todo.id);
                        setEditingTitle(todo.title);
                      }}
                    >
                      {todo.title}
                    </button>
                  )}
                  <p>
                    <span>{todo.completed ? "done" : "open"}</span>
                    {todo.completed && todo.completed_on && (
                      <>
                        <i>·</i>
                <span>{todo.completed_on}</span>
                {todo.completed_start_time && todo.completed_end_time && (
                  <>
                    <i>·</i>
                    <span>{todo.completed_start_time.slice(0, 5)}-{todo.completed_end_time.slice(0, 5)}</span>
                  </>
                )}
                <i>·</i>
                <span>{fmtMinutes(todo.completed_minutes)}</span>
              </>
                    )}
                  </p>
                </div>
                <button className="todo-destroy" type="button" onClick={() => deleteTodo(todo.id)} disabled={!canEdit} aria-label="Delete task">×</button>
              </article>
            ))}
            {!visibleTodos.length && <p className="todo-empty">Nothing here yet. Tiny plans are welcome.</p>}
          </div>
        </section>

        <section className="todo-heat-card" aria-label="365 days of completed task effort">
          <div className="todo-heat-card__head">
            <div>
              <p>365 days of effort</p>
              <h2>A year in small squares</h2>
            </div>
            <div>
              <strong>{fmtMinutes(yearMinutes)}</strong>
              <span>{activeDays} active days</span>
            </div>
          </div>
          <div className="todo-heatmap" role="img" aria-label="Daily completed task duration heatmap">
            {heatmap.map((day, index) => (
              day ? (
                <span
                  key={day.key}
                  className={`todo-square level-${Math.min(5, Math.ceil(day.minutes / 60))}`}
                  title={`${day.key}: ${fmtMinutes(day.minutes)}`}
                ></span>
              ) : <span key={`blank-${index}`} className="todo-square is-blank"></span>
            ))}
          </div>
          <div className="todo-heat-legend">
            <span>quiet</span>
            {[0, 1, 2, 3, 4, 5].map((level) => <i key={level} className={`level-${level}`}></i>)}
            <span>a full day</span>
          </div>
        </section>
      </section>

      <aside className="todo-side" aria-label="Task time stats">
        <section className="todo-side-card">
          <p>{selectedName}'s day at a glance</p>
          <h2>{todayPercent}% of today, done.</h2>
          <div className="todo-ring-row">
            <div className="todo-ring" style={{ "--p": `${todayPercent}%` } as CSSProperties}>
              <span>{fmtMinutes(todayMinutes)}</span>
            </div>
            <dl>
              <div><dt>Completed</dt><dd>{doneToday.length} / {todayTotalCount}</dd></div>
              <div><dt>Streak</dt><dd>{streak} days</dd></div>
              <div><dt>Weekly avg</dt><dd>{(weeklyAverage / 60).toFixed(1)} hr</dd></div>
            </dl>
          </div>
          <blockquote>Small commits, every day. The page can wait; the little thing counts.</blockquote>
        </section>
        <section className="todo-side-card">
          <p>A nudge for the week</p>
          <h2>{streak >= 3 ? "Three days of momentum. Nice." : activeTodos.length ? "One gentle task is enough." : "A quiet list today."}</h2>
          <span>Finish tasks first, then record the real time. The log will stay honest.</span>
        </section>
      </aside>

      {completionIds.length > 0 && (
        <div className="todo-modal" role="dialog" aria-modal="true" aria-labelledby="todoCompleteTitle">
          <div className="todo-modal__mask" onClick={() => setCompletionIds([])}></div>
          <section className="todo-modal__card">
            <button type="button" className="todo-modal__close" onClick={() => setCompletionIds([])} aria-label="Close">×</button>
            <p>Completion time</p>
            <h2 id="todoCompleteTitle">{completionTitle}</h2>
            <label>
              <span>Date</span>
              <input type="date" value={completionDate} onChange={(event) => setCompletionDate(event.target.value)} />
            </label>
            <div className="todo-modal__row">
              <label>
                <span>Start (24-hour)</span>
                <input type="time" step="60" inputMode="numeric" lang="en-GB" value={completionStart} onChange={(event) => setCompletionStart(event.target.value)} />
              </label>
              <label>
                <span>End (24-hour)</span>
                <input type="time" step="60" inputMode="numeric" lang="en-GB" value={completionEnd} onChange={(event) => setCompletionEnd(event.target.value)} />
              </label>
            </div>
            <div className="todo-modal__actions">
              <button type="button" onClick={() => setCompletionIds([])}>Cancel</button>
              <button type="button" onClick={completeSelected}>Save completion</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
