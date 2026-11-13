import { useState } from "react";
import CountdownTimer from "./components/CountdownTimer";
import Stopwatch from "./components/Stopwatch";
import "./App.css";

type Mode = "countdown" | "stopwatch";

export default function App() {
  const [mode, setMode] = useState<Mode>("countdown");

  return (
    <div className="app">
      <main className="timer-card">
        <header className="app-header">
          <div className="header-text">
            <h1>Study Timer</h1>
          </div>
        </header>

        <div className="mode-switcher" role="group" aria-label="Timing mode">
          <button
            type="button"
            className={
              mode === "countdown" ? "mode-button active" : "mode-button"
            }
            aria-pressed={mode === "countdown"}
            onClick={() => setMode("countdown")}
          >
            Countdown
          </button>
          <button
            type="button"
            className={
              mode === "stopwatch" ? "mode-button active" : "mode-button"
            }
            aria-pressed={mode === "stopwatch"}
            onClick={() => setMode("stopwatch")}
          >
            Stopwatch
          </button>
        </div>

        {/* Keep both mounted: switching modes won't reset either clock. */}
        <section
          className="mode-panel"
          hidden={mode !== "countdown"}
          aria-label="Countdown timer"
        >
          <CountdownTimer />
        </section>
        <section
          className="mode-panel"
          hidden={mode !== "stopwatch"}
          aria-label="Stopwatch"
        >
          <Stopwatch />
        </section>
      </main>
    </div>
  );
}
