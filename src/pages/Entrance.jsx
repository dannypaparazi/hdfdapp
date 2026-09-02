import { useState } from 'react'
import styles from './Entrance.module.css'

export default function Entrance({ onSelectMode }) {
  const [selectedMode, setSelectedMode] = useState(null)

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>🍲 Hotpot Di Focolare</h1>
        <p className={styles.subtitle}>Order Management System</p>

        {!selectedMode ? (
          <div className={styles.modeSelection}>
            <button
              onClick={() => setSelectedMode('admin')}
              className={styles.modeBtn}
            >
              <div className={styles.icon}>👨‍💼</div>
              <div className={styles.label}>Admin Portal</div>
              <div className={styles.description}>Manage menu & orders</div>
            </button>

            <button
              onClick={() => setSelectedMode('user')}
              className={styles.modeBtn}
            >
              <div className={styles.icon}>👥</div>
              <div className={styles.label}>Customer Order</div>
              <div className={styles.description}>Scan QR & order food</div>
            </button>
          </div>
        ) : selectedMode === 'admin' ? (
          <div className={styles.actionContainer}>
            <p className={styles.instruction}>Redirecting to Admin Portal...</p>
            <div className={styles.loader}></div>
          </div>
        ) : (
          <div className={styles.actionContainer}>
            <p className={styles.instruction}>Redirecting to User Order...</p>
            <div className={styles.loader}></div>
          </div>
        )}
      </div>

      {selectedMode && (
        <button
          onClick={() => onSelectMode(selectedMode)}
          className={styles.proceedBtn}
        >
          Continue
        </button>
      )}

      {selectedMode && (
        <button
          onClick={() => setSelectedMode(null)}
          className={styles.backBtn}
        >
          Back
        </button>
      )}
    </div>
  )
}
