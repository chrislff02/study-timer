import { useState } from "react";
import "./App.css";

function App() {
  const [duration, setDuration] = useState<number>(25);

  return (
    <div className="app">
      <h1>Study Timer</h1>
      <p>Stay focused, one session at a time.</p>

      <div className="timer">
        <h2>{duration}:00</h2>
      </div>

      <div className="duration-input">
        <label htmlFor="duration">Study Duration (minutes)</label>

        <input
          id="duration"
          type="number"
          min="1"
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
        />
      </div>

      <div className="timer-controls">
        <button>Start</button>
        <button>Pause</button>
        <button>Reset</button>
      </div>
    </div>
  );
}

export default App;
