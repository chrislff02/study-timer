import { useEffect, useRef, useState } from "react";

type Lap = {
  number: number;
  splitMs: number;
  totalMs: number;
};

function formatElapsed(totalMilliseconds: number): string {
  const totalSeconds = Math.floor(totalMilliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

export default function Stopwatch() {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [laps, setLaps] = useState<Lap[]>([]);

  // A running stopwatch's start timestamp is offset by time already elapsed.
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isRunning) return;

    const interval = window.setInterval(() => {
      if (startTimeRef.current !== null) {
        setElapsedMs(Math.max(0, Date.now() - startTimeRef.current));
      }
    }, 100);

    return () => window.clearInterval(interval);
  }, [isRunning]);

  const handleStart = () => {
    if (isRunning) return;

    startTimeRef.current = Date.now() - elapsedMs;
    setIsRunning(true);
  };

  const handlePause = () => {
    if (!isRunning || startTimeRef.current === null) return;

    setElapsedMs(Math.max(0, Date.now() - startTimeRef.current));
    startTimeRef.current = null;
    setIsRunning(false);
  };

  const handleLap = () => {
    if (!isRunning || startTimeRef.current === null) return;

    // Capture the exact time at the click, rather than the last interval tick.
    const totalMs = Math.max(0, Date.now() - startTimeRef.current);
    setElapsedMs(totalMs);
    setLaps((previous) => {
      const previousTotal = previous.length > 0 ? previous[0].totalMs : 0;
      return [
        {
          number: previous.length + 1,
          splitMs: totalMs - previousTotal,
          totalMs,
        },
        ...previous,
      ];
    });
  };

  const handleReset = () => {
    startTimeRef.current = null;
    setIsRunning(false);
    setElapsedMs(0);
    setLaps([]);
  };

  const hasStarted = elapsedMs > 0;

  return (
    <>
      <div className="timer-layout stopwatch-layout">
        <div className="timer-visual-column">
          <div className="timer">
            <div className="timer-circle">
              <svg
                className="progress-ring"
                viewBox="0 0 220 220"
                aria-hidden="true"
              >
                <circle
                  className="progress-ring-background"
                  cx="110"
                  cy="110"
                  r="90"
                />
                <circle className="stopwatch-ring" cx="110" cy="110" r="90" />
              </svg>
              <div
                className="timer-display"
                role="timer"
                aria-label={`${formatElapsed(elapsedMs)} elapsed`}
                aria-live="off"
              >
                <h2 aria-hidden="true">{formatElapsed(elapsedMs)}</h2>
                <span aria-hidden="true">Elapsed time</span>
              </div>
            </div>
          </div>

          <div className="timer-status">
            <span
              className="status-dot"
              style={{ backgroundColor: isRunning ? "#3b82f6" : "#64748b" }}
            />
            <span>
              {isRunning
                ? "Stopwatch running"
                : hasStarted
                  ? "Stopwatch paused"
                  : "Ready to start"}
            </span>
          </div>
        </div>
        <div className="timer-actions-column">
          <div className="timer-controls stopwatch-controls">
            <button
              className="start-button"
              onClick={handleStart}
              disabled={isRunning}
            >
              {hasStarted ? "Resume" : "Start"}
            </button>
            <button
              className="pause-button"
              onClick={handlePause}
              disabled={!isRunning}
            >
              Pause
            </button>
            <button
              className="lap-button"
              onClick={handleLap}
              disabled={!isRunning}
            >
              Lap
            </button>
            <button className="reset-button" onClick={handleReset}>
              Reset
            </button>
          </div>

          {laps.length > 0 && (
            <section
              className="stopwatch-laps"
              aria-label="Recorded stopwatch laps"
            >
              <h3>Laps</h3>
              <div className="lap-table-wrap">
                <table className="lap-table">
                  <thead>
                    <tr>
                      <th scope="col">Lap</th>
                      <th scope="col">Lap time</th>
                      <th scope="col">Total time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {laps.map((lap) => (
                      <tr key={lap.number}>
                        <th scope="row">{lap.number}</th>
                        <td>{formatElapsed(lap.splitMs)}</td>
                        <td>{formatElapsed(lap.totalMs)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
