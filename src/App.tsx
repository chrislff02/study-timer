import { useEffect, useRef, useState } from "react";
import "./App.css";

const STORAGE_KEY = "study-timer-recent-durations-seconds";
const LEGACY_STORAGE_KEY = "study-timer-recent-durations";
const SOUND_STORAGE_KEY = "study-timer-sound-enabled";
const DEFAULT_DURATION = 25 * 60;
const MAX_DURATION = 24 * 60 * 60;

function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function parseDurationInputs(
  hours: string,
  minutes: string,
  seconds: string,
): number | null {
  const parts = [hours, minutes, seconds];

  // Treat a cleared field as zero while the user is editing.
  const values = parts.map((part) => {
    const trimmed = part.trim();
    return trimmed === "" ? 0 : Number(trimmed);
  });

  if (
    values.some((value) => !Number.isInteger(value) || value < 0) ||
    values[0] > 24 ||
    values[1] > 59 ||
    values[2] > 59
  ) {
    return null;
  }

  const total = values[0] * 3600 + values[1] * 60 + values[2];
  return total >= 1 && total <= MAX_DURATION ? total : null;
}

function loadRecentDurations(): number[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const oldFormat = saved === null;
    const raw = saved ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const valid = parsed.filter(
      (value): value is number =>
        typeof value === "number" &&
        Number.isInteger(value) &&
        value >= 1 &&
        value <= (oldFormat ? 1440 : MAX_DURATION),
    );

    // Previous versions stored minutes; new versions store seconds.
    const durations = oldFormat ? valid.map((minutes) => minutes * 60) : valid;
    return [...new Set(durations)].slice(0, 4);
  } catch {
    return [];
  }
}

async function playAlarm(audioContext: AudioContext): Promise<void> {
  try {
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    for (let i = 0; i < 3; i++) {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      const startTime = audioContext.currentTime + i * 0.35;

      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

      oscillator.start(startTime);
      oscillator.stop(startTime + 0.25);
    }
  } catch (error) {
    console.error("Unable to play alarm:", error);
  }
}

function App() {
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_DURATION);
  const [hoursInput, setHoursInput] = useState("0");
  const [minutesInput, setMinutesInput] = useState("25");
  const [secondsInput, setSecondsInput] = useState("0");
  const [inputError, setInputError] = useState("");

  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [recentDurations, setRecentDurations] =
    useState<number[]>(loadRecentDurations);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SOUND_STORAGE_KEY) !== "false";
    } catch {
      return true;
    }
  });

  const endTimeRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Close the audio context when the component unmounts
  useEffect(() => {
    return () => {
      const audioContext = audioContextRef.current;

      if (audioContext && audioContext.state !== "closed") {
        void audioContext.close().catch(console.error);
      }

      audioContextRef.current = null;
    };
  }, []);

  const soundEnabledRef = useRef(soundEnabled);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    if (!isRunning) return;

    const interval = window.setInterval(() => {
      if (endTimeRef.current === null) return;

      const remaining = Math.max(
        0,
        Math.ceil((endTimeRef.current - Date.now()) / 1000),
      );
      setTimeLeft(remaining);

      if (remaining === 0) {
        endTimeRef.current = null;
        setIsRunning(false);
        setIsComplete(true);
      }
    }, 250);

    return () => window.clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    if (isComplete && soundEnabledRef.current && audioContextRef.current) {
      void playAlarm(audioContextRef.current);
    }
  }, [isComplete]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentDurations));
    } catch {
      // Storage may be disabled or full.
    }
  }, [recentDurations]);

  useEffect(() => {
    try {
      localStorage.setItem(SOUND_STORAGE_KEY, String(soundEnabled));
    } catch {
      // Storage may be disabled or full.
    }
  }, [soundEnabled]);

  useEffect(() => {
    document.title = isComplete ? "Study Session Complete!" : "Study Timer";
    return () => {
      document.title = "Study Timer";
    };
  }, [isComplete]);

  // Close the audio context when the component is removed.
  useEffect(() => {
    return () => {
      const context = audioContextRef.current;
      if (context && context.state !== "closed") {
        void context.close().catch(console.error);
      }
    };
  }, []);

  const saveRecentDuration = (seconds: number) => {
    setRecentDurations((previous) =>
      [seconds, ...previous.filter((value) => value !== seconds)].slice(0, 4),
    );
  };

  const setDurationInputs = (seconds: number) => {
    setHoursInput(String(Math.floor(seconds / 3600)));
    setMinutesInput(String(Math.floor((seconds % 3600) / 60)));
    setSecondsInput(String(seconds % 60));
  };

  const handleDurationChange = (seconds: number) => {
    if (!Number.isInteger(seconds) || seconds < 1 || seconds > MAX_DURATION) {
      return;
    }

    setDuration(seconds);
    setTimeLeft(seconds);
    setDurationInputs(seconds);
    setInputError("");
    setIsRunning(false);
    setIsComplete(false);
    endTimeRef.current = null;
  };

  const prepareAudio = () => {
    try {
      if (
        !audioContextRef.current ||
        audioContextRef.current.state === "closed"
      ) {
        audioContextRef.current = new AudioContext();
      }
      if (audioContextRef.current.state === "suspended") {
        void audioContextRef.current.resume().catch(console.error);
      }
    } catch (error) {
      console.error("Unable to initialize audio:", error);
    }
  };

  const handleStart = () => {
    if (isRunning) return;

    const enteredDuration = parseDurationInputs(
      hoursInput,
      minutesInput,
      secondsInput,
    );
    if (enteredDuration === null) {
      setInputError(
        "Enter a duration from 1 second to 24 hours (minutes and seconds: 0–59).",
      );
      return;
    }

    const hasNewDuration = enteredDuration !== duration;
    const freshSession =
      hasNewDuration || timeLeft === 0 || timeLeft === duration;
    const startingSeconds = freshSession ? enteredDuration : timeLeft;

    if (soundEnabled) prepareAudio();
    if (freshSession) saveRecentDuration(enteredDuration);

    if (hasNewDuration) {
      setDuration(enteredDuration);
      setTimeLeft(enteredDuration);
    }

    setDurationInputs(enteredDuration);
    setInputError("");
    setIsComplete(false);
    endTimeRef.current = Date.now() + startingSeconds * 1000;
    setIsRunning(true);
  };

  const handlePause = () => {
    if (!isRunning || endTimeRef.current === null) return;

    const remaining = Math.max(
      0,
      Math.ceil((endTimeRef.current - Date.now()) / 1000),
    );
    setTimeLeft(remaining);
    endTimeRef.current = null;
    setIsRunning(false);

    if (remaining === 0) setIsComplete(true);
  };

  const handleReset = () => {
    endTimeRef.current = null;
    setIsRunning(false);
    setIsComplete(false);
    setTimeLeft(duration);
    setDurationInputs(duration);
    setInputError("");
  };

  const enteredDuration = parseDurationInputs(
    hoursInput,
    minutesInput,
    secondsInput,
  );
  const canResume =
    !isRunning &&
    timeLeft > 0 &&
    timeLeft < duration &&
    enteredDuration === duration;
  const progress = duration > 0 ? (timeLeft / duration) * 100 : 0;
  const timerColor =
    progress > 50 ? "#22c55e" : progress > 15 ? "#eab308" : "#ef4444";
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress / 100);

  return (
    <div className="app">
      <main className="timer-card">
        <header className="app-header">
          <div className="header-text">
            <h1>Study Timer</h1>
          </div>
        </header>

        <div className="header-divider" />

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
                r={radius}
              />
              <circle
                className="progress-ring-progress"
                cx="110"
                cy="110"
                r={radius}
                stroke={timerColor}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>
            <div
              className="timer-display"
              role="timer"
              aria-label={`${formatTime(timeLeft)} remaining`}
              aria-live="off"
            >
              <h2 aria-hidden="true">{formatTime(timeLeft)}</h2>
              <span aria-hidden="true">{Math.round(progress)}% remaining</span>
            </div>
          </div>
        </div>

        <div className="timer-status">
          <span
            className="status-dot"
            style={{
              backgroundColor: isComplete
                ? "#22c55e"
                : isRunning
                  ? timerColor
                  : "#64748b",
            }}
          />
          <span>
            {isComplete
              ? "Session completed"
              : isRunning
                ? "Focus session in progress"
                : canResume
                  ? "Session paused"
                  : "Ready to focus"}
          </span>
        </div>

        {isComplete && (
          <div className="completion-message" role="status">
            <h3>Study Session Complete!</h3>
          </div>
        )}

        <div className="duration-input">
          <p className="duration-heading">Study Duration</p>
          <div className="duration-fields">
            <div className="duration-field">
              <label htmlFor="hours">Hours</label>
              <input
                id="hours"
                type="number"
                min="0"
                max="24"
                step="1"
                value={hoursInput}
                disabled={isRunning}
                onChange={(event) => {
                  setHoursInput(event.target.value);
                  setInputError("");
                }}
              />
            </div>
            <div className="duration-field">
              <label htmlFor="minutes">Minutes</label>
              <input
                id="minutes"
                type="number"
                min="0"
                max="59"
                step="1"
                value={minutesInput}
                disabled={isRunning}
                onChange={(event) => {
                  setMinutesInput(event.target.value);
                  setInputError("");
                }}
              />
            </div>
            <div className="duration-field">
              <label htmlFor="seconds">Seconds</label>
              <input
                id="seconds"
                type="number"
                min="0"
                max="59"
                step="1"
                value={secondsInput}
                disabled={isRunning}
                onChange={(event) => {
                  setSecondsInput(event.target.value);
                  setInputError("");
                }}
              />
            </div>
          </div>
          {inputError && (
            <p className="input-error" role="alert">
              {inputError}
            </p>
          )}
        </div>

        <div className="timer-controls">
          <button
            className="start-button"
            onClick={handleStart}
            disabled={isRunning}
          >
            {canResume ? "Resume" : "Start"}
          </button>
          <button
            className="pause-button"
            onClick={handlePause}
            disabled={!isRunning}
          >
            Pause
          </button>
          <button className="reset-button" onClick={handleReset}>
            Reset
          </button>
        </div>

        {recentDurations.length > 0 && (
          <section
            className="recent-durations"
            aria-label="Recent study durations"
          >
            <h3>Recent Durations</h3>
            <div className="recent-buttons">
              {recentDurations.map((seconds) => (
                <button
                  key={seconds}
                  type="button"
                  disabled={isRunning}
                  onClick={() => handleDurationChange(seconds)}
                  className={duration === seconds ? "selected" : ""}
                >
                  {formatTime(seconds)}
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="sound-settings">
          <label>
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(event) => setSoundEnabled(event.target.checked)}
            />
            Enable completion sound
          </label>
        </div>
      </main>
    </div>
  );
}

export default App;
