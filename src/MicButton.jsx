import styles from "./App.module.css";

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
