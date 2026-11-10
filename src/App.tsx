import { useEffect, useRef, useState } from "react";
import "./App.css";

function App() {
  // Duration selected by the user (in minutes)
  const [duration, setDuration] = useState<number>(25);

  // Remaining time (in seconds)
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);

  // Tracks whether the timer is currently running
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // Stores the exact timestamp when the timer should finish
  const endTimeRef = useRef<number | null>(null);

  // Countdown logic
  useEffect(() => {
    if (!isRunning) return;

    const interval = window.setInterval(() => {
      if (endTimeRef.current === null) return;

      // Calculate remaining seconds using the actual clock
      const remaining = Math.max(
        0,
        Math.ceil((endTimeRef.current - Date.now()) / 1000),
      );

      setTimeLeft(remaining);

      // Stop automatically when the timer reaches zero
      if (remaining === 0) {
        setIsRunning(false);
        endTimeRef.current = null;
      }
    }, 250);

    // Clean up the interval when paused or unmounted
    return () => window.clearInterval(interval);
  }, [isRunning]);

  // Start or resume the timer
  const handleStart = () => {
    if (isRunning || timeLeft <= 0) return;

    endTimeRef.current = Date.now() + timeLeft * 1000;
    setIsRunning(true);
  };

  // Pause the timer without losing its remaining time
  const handlePause = () => {
    if (!isRunning || endTimeRef.current === null) return;

    const remaining = Math.max(
      0,
      Math.ceil((endTimeRef.current - Date.now()) / 1000),
    );

    setTimeLeft(remaining);
    endTimeRef.current = null;
    setIsRunning(false);
  };

  // Reset the timer to the selected duration
  const handleReset = () => {
    setIsRunning(false);
    endTimeRef.current = null;
    setTimeLeft(duration * 60);
  };

  // Update the duration and reset the countdown
  const handleDurationChange = (value: number) => {
    const validDuration = Number.isFinite(value)
      ? Math.max(0, Math.min(1440, Math.trunc(value)))
      : 0;

    setDuration(validDuration);
    setTimeLeft(validDuration * 60);
    setIsRunning(false);
    endTimeRef.current = null;
  };

  // Convert seconds into MM:SS format
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div className="app">
      <h1>Study Timer</h1>
      <p>Stay focused, one session at a time.</p>

      <div className="timer">
        <h2>{formatTime(timeLeft)}</h2>
      </div>

      <div className="duration-input">
        <label htmlFor="duration">Study Duration (minutes)</label>

        <input
          id="duration"
          type="number"
          min="1"
          max="1440"
          value={duration}
          disabled={isRunning}
          onChange={(e) => handleDurationChange(Number(e.target.value))}
        />
      </div>

      <div className="timer-controls">
        <button onClick={handleStart} disabled={isRunning || timeLeft <= 0}>
          {timeLeft < duration * 60 && timeLeft > 0 ? "Resume" : "Start"}
        </button>

        <button onClick={handlePause} disabled={!isRunning}>
          Pause
        </button>

        <button onClick={handleReset}>Reset</button>
      </div>
    </div>
  );
}

export default App;
