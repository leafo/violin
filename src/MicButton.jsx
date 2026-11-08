import styles from "./App.module.css";

// "listening" means pitches are being used right now; "paused" means the mic is on but ignored.
export function MicState({ state, children }) {
  return (
    <span className={styles.micState} data-state={state}>
      {children}
    </span>
  );
}

export default function MicButton({ mic, offLabel, onLabel }) {
  return (
    <>
      <button className={mic.listening ? styles.on : ""} onClick={mic.toggle}>
        🎤 {mic.listening ? onLabel : offLabel}
      </button>
      {mic.error && <span className={styles.error}>{mic.error}</span>}
    </>
  );
}
