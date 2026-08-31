import { useState } from 'react'
import { login } from '../utils/auth'
import logo from '../assets/logo.png'
import styles from './Login.module.css'

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    if (!username.trim()) {
      setError('Please enter username')
      setIsLoading(false)
      return
    }

    if (!password) {
      setError('Please enter password')
      setIsLoading(false)
      return
    }

    const user = login(username, password)
    setIsLoading(false)

    if (user) {
      onLoginSuccess(user)
    } else {
      setError('Invalid username or password')
      setPassword('')
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.loginBox}>
        <div className={styles.logoContainer}>
          <img src={logo} alt="Hotpot Di Focolare" className={styles.logo} />
        </div>
        <h1>Hotpot Di Focolare</h1>
        <p className={styles.subtitle}>Order Management System</p>

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoFocus
              disabled={isLoading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={isLoading}
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button type="submit" className={styles.loginBtn} disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className={styles.hint}>Demo: username: <strong>admin</strong>, password: <strong>admin123</strong></p>
      </div>
    </div>
  )
}
