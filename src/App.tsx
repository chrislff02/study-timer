import { useEffect, useRef, useState } from "react";
import "./App.css";

const STORAGE_KEY = "study-timer-recent-durations";
const SOUND_STORAGE_KEY = "study-timer-sound-enabled";

// Play a short alarm using the Web Audio API
const playAlarm = async (audioContext: AudioContext) => {
  try {
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    // Play three short tones
    for (let i = 0; i < 3; i++) {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = 880;

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const startTime = audioContext.currentTime + i * 0.35;

      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

      oscillator.start(startTime);
      oscillator.stop(startTime + 0.25);
    }
  } catch (error) {
    console.error("Unable to play alarm:", error);
  }
};

function App() {
  // Tracks whether a study session has finished
  const [isComplete, setIsComplete] = useState<boolean>(false);

  // Load the saved sound preference when the application starts
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(SOUND_STORAGE_KEY);

      // Enable sound by default if no preference exists
      return saved === null ? true : saved === "true";
    } catch {
      return true;
    }
  });

  // Keep track of the latest sound preference
  const soundEnabledRef = useRef(soundEnabled);

  // Update the ref whenever the sound preference changes
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // Duration selected by the user (in minutes)
  const [duration, setDuration] = useState<number>(25);

  // Remaining time (in seconds)
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);

  // Tracks whether the timer is currently running
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // Stores the exact timestamp when the timer should finish
  const endTimeRef = useRef<number | null>(null);

  // Stores the audio context between renders
  const audioContextRef = useRef<AudioContext | null>(null);

  // Load the four most recent study durations from localStorage
  const [recentDurations, setRecentDurations] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (!saved) return [];

      const parsed: unknown = JSON.parse(saved);

      if (!Array.isArray(parsed)) return [];

      return [
        ...new Set(
          parsed.filter(
            (value): value is number =>
              typeof value === "number" &&
              Number.isInteger(value) &&
              value >= 1 &&
              value <= 1440,
          ),
        ),
      ].slice(0, 4);
    } catch {
      return [];
    }
  });

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

      if (remaining === 0) {
        setIsRunning(false);
        setIsComplete(true);
        endTimeRef.current = null;
      }
    }, 250);

    // Clean up the interval when paused or unmounted
    return () => window.clearInterval(interval);
  }, [isRunning]);

  // Play the alarm once when the session finishes
  useEffect(() => {
    if (!isComplete) return;

    if (soundEnabledRef.current && audioContextRef.current) {
      void playAlarm(audioContextRef.current);
    }
  }, [isComplete]);

  // Save recent durations whenever the list changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentDurations));
    } catch {
      // Storage may be unavailable in some browser environments
    }
  }, [recentDurations]);

  // Save sound preference whenever the user changes it
  useEffect(() => {
    try {
      localStorage.setItem(SOUND_STORAGE_KEY, String(soundEnabled));
    } catch {
      // Storage may be unavailable in some browser environments
    }
  }, [soundEnabled]);

  // Update the browser tab title when the timer finishes
  useEffect(() => {
    document.title = isComplete ? "⏰ Study Session Complete!" : "Study Timer";

    return () => {
      document.title = "Study Timer";
    };
  }, [isComplete]);

  // Remember a duration, keeping only the four most recent unique values
  const saveRecentDuration = (minutes: number) => {
    setRecentDurations((previous) => {
      const updated = [
        minutes,
        ...previous.filter((value) => value !== minutes),
      ];

      return updated.slice(0, 4);
    });
  };

  // Stores what the user is currently typing
  const [durationInput, setDurationInput] = useState<string>("25");

  // Prepare audio when the user interacts with the timer
  const prepareAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    if (audioContextRef.current.state === "suspended") {
      void audioContextRef.current.resume().catch(console.error);
    }
  };

  const handleStart = () => {
    if (isRunning) return;

    // Check whether the user typed a new duration
    const trimmed = durationInput.trim();
    const enteredDuration = Number(trimmed);

    const isValidInput =
      trimmed !== "" &&
      Number.isInteger(enteredDuration) &&
      enteredDuration >= 1 &&
      enteredDuration <= 1440;

    // Reject invalid input and restore the previous duration
    if (!isValidInput) {
      setDurationInput(String(duration));
      return;
    }

    // Determine whether this is a newly selected duration
    const hasNewDuration = enteredDuration !== duration;

    // Use the newly entered duration, or resume the existing timer
    const startingSeconds = hasNewDuration ? enteredDuration * 60 : timeLeft;

    if (startingSeconds <= 0) return;

    // Apply the new duration if it changed
    if (hasNewDuration) {
      setDuration(enteredDuration);
      setTimeLeft(startingSeconds);
      setIsComplete(false);
    }

    // Prepare audio after the user clicks Start
    if (soundEnabled) {
      prepareAudio();
    }

    // Remember the duration when starting a fresh session
    if (hasNewDuration || startingSeconds === enteredDuration * 60) {
      saveRecentDuration(enteredDuration);
    }

    setIsComplete(false);

    // Store the exact time when the countdown should finish
    endTimeRef.current = Date.now() + startingSeconds * 1000;
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

  const handleReset = () => {
    setIsRunning(false);
    setIsComplete(false);
    endTimeRef.current = null;
    setTimeLeft(duration * 60);
  };

  // Apply a valid duration to the timer
  const handleDurationChange = (value: number) => {
    if (!Number.isInteger(value) || value < 1 || value > 1440) {
      return;
    }

    setDuration(value);
    setDurationInput(String(value));
    setTimeLeft(value * 60);
    setIsRunning(false);
    setIsComplete(false);
    endTimeRef.current = null;
  };

  // Validate and apply the duration entered by the user
  const handleDurationSubmit = () => {
    const trimmed = durationInput.trim();
    const value = Number(trimmed);

    if (
      trimmed === "" ||
      !Number.isInteger(value) ||
      value < 1 ||
      value > 1440
    ) {
      // Restore the last valid duration
      setDurationInput(String(duration));
      return;
    }

    handleDurationChange(value);
  };

  // Convert seconds into MM:SS format
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  // Calculate the percentage of time remaining
  const totalSeconds = duration * 60;

  const progress = totalSeconds > 0 ? (timeLeft / totalSeconds) * 100 : 0;

  // Change the timer color based on remaining time
  const getTimerColor = () => {
    if (progress > 50) return "#22c55e"; // Green
    if (progress > 15) return "#eab308"; // Yellow
    return "#ef4444"; // Red
  };

  const timerColor = getTimerColor();

  // Calculate the circular progress indicator
  const radius = 90;
  const circumference = 2 * Math.PI * radius;

  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="app">
      <main className="timer-card">
        <header className="app-header">
          <div className="header-icon">📖</div>

          <div className="header-text">
            <h1>Study Timer</h1>
            <p>Stay focused, one session at a time.</p>
          </div>
        </header>

        <div className="header-divider" />

        {/* Circular countdown timer */}
        <div className="timer">
          <div className="timer-circle">
            <svg className="progress-ring" viewBox="0 0 220 220">
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

            <div className="timer-display">
              <h2>{formatTime(timeLeft)}</h2>
              <span>{Math.round(progress)}% remaining</span>
            </div>
          </div>
        </div>

        {/* Timer status */}
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
                : timeLeft < duration * 60 && timeLeft > 0
                  ? "Session paused"
                  : "Ready to focus"}
          </span>
        </div>

        {/* Completion notification */}
        {isComplete && (
          <div className="completion-message" role="status">
            <h3>Study Session Complete!</h3>
            <p>Great work! Your study session has finished.</p>
          </div>
        )}

        {/* Duration selection */}
        <div className="duration-input">
          <label htmlFor="duration">Study Duration (minutes)</label>

          <input
            id="duration"
            type="number"
            min="1"
            max="1440"
            step="1"
            value={durationInput}
            disabled={isRunning}
            onChange={(e) => setDurationInput(e.target.value)}
            onBlur={handleDurationSubmit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
            }}
          />
        </div>

        {/* Timer controls */}
        <div className="timer-controls">
          <button
            className="start-button"
            onClick={handleStart}
            disabled={
              isRunning || (timeLeft <= 0 && durationInput === String(duration))
            }
          >
            {timeLeft < duration * 60 && timeLeft > 0 ? "Resume" : "Start"}
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

        {/* Recent durations */}
        {recentDurations.length > 0 && (
          <section className="recent-durations">
            <h3>Recent Durations</h3>

            <div className="recent-buttons">
              {recentDurations.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  disabled={isRunning}
                  onClick={() => handleDurationChange(minutes)}
                  className={duration === minutes ? "selected" : ""}
                >
                  {minutes} min
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Sound settings */}
        <div className="sound-settings">
          <label>
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => setSoundEnabled(e.target.checked)}
            />
            Enable completion sound
          </label>
        </div>
      </main>

      <footer className="app-footer">
        Stay consistent. Every minute counts.
      </footer>
    </div>
  );
}

export default App;
