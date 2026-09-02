import { useState } from 'react'
import styles from './UserLogin.module.css'

export default function UserLogin({ onLogin }) {
  const [qrCode, setQrCode] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!qrCode.trim()) {
      setError('Please enter or scan a QR code')
      return
    }

    // QR code format: table_{number} (e.g., "table_1", "table_1-1")
    const match = qrCode.trim().match(/^table_(\d+(?:-\d+)?)$/i)
    if (!match) {
      setError('Invalid QR code. Please try again.')
      return
    }

    const tableId = match[1]
    onLogin(parseInt(tableId.split('-')[0]))
    setError('')
  }

  return (
    <div className={styles.container}>
      <div className={styles.loginBox}>
        <div className={styles.header}>
          <h1>🍲 Hotpot Di Focolare</h1>
          <p className={styles.subtitle}>User Ordering</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="qrCode">Scan QR Code or Enter Code</label>
            <input
              id="qrCode"
              type="text"
              value={qrCode}
              onChange={(e) => {
                setQrCode(e.target.value)
                setError('')
              }}
              placeholder="Scan the QR code on your table"
              autoFocus
              className={styles.input}
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button type="submit" className={styles.submitBtn}>
            Continue to Order
          </button>
        </form>

        <div className={styles.info}>
          <p>📱 Scan the QR code on your table to get started</p>
          <p>🔒 Your order will be tied to your table</p>
        </div>
      </div>
    </div>
  )
}
