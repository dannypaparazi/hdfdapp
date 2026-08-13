import { useState } from 'react'
import OrderConfirmation from './pages/OrderConfirmation'
import OrderHistory from './pages/OrderHistory'
import AdminPanel from './pages/AdminPanel'
import styles from './App.module.css'

export default function App() {
  const [activeTab, setActiveTab] = useState('confirm')
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false)

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false)
    setActiveTab('confirm')
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Hotpot Di Focolare</h1>
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
        {activeTab === 'admin' && (
          <AdminPanel
            isLoggedIn={isAdminLoggedIn}
            onLogin={() => setIsAdminLoggedIn(true)}
            onLogout={handleAdminLogout}
          />
        )}
      </main>
    </div>
  )
}
