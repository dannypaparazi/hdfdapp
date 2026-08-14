import { useState } from 'react'
import { getCurrentUser, logout } from './utils/auth'
import Login from './components/Login'
import OrderConfirmation from './pages/OrderConfirmation'
import OrderHistory from './pages/OrderHistory'
import AdminPanel from './pages/AdminPanel'
import styles from './App.module.css'

export default function App() {
  const [currentUser, setCurrentUser] = useState(getCurrentUser())
  const [activeTab, setActiveTab] = useState('confirm')

  const handleLoginSuccess = (user) => {
    setCurrentUser(user)
    setActiveTab('confirm')
  }

  const handleLogout = () => {
    logout()
    setCurrentUser(null)
    setActiveTab('confirm')
  }

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Hotpot Di Focolare</h1>
        <div className={styles.userInfo}>
          <span>{currentUser.username}</span>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <nav className={styles.nav}>
        <button
          className={`${styles.tab} ${activeTab === 'confirm' ? styles.active : ''}`}
          onClick={() => setActiveTab('confirm')}
        >
          Order Confirmation
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'history' ? styles.active : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Order History
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'admin' ? styles.active : ''}`}
          onClick={() => setActiveTab('admin')}
        >
          Admin
        </button>
      </nav>

      <main className={styles.content}>
        {activeTab === 'confirm' && <OrderConfirmation />}
        {activeTab === 'history' && <OrderHistory />}
        {activeTab === 'admin' && <AdminPanel currentUser={currentUser} />}
      </main>
    </div>
  )
}
