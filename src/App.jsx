import { useState } from 'react'
import { getCurrentUser, logout } from './utils/auth'
import Login from './components/Login'
import Home from './pages/Home'
import OrderConfirmation from './pages/OrderConfirmation'
import OrderHistory from './pages/OrderHistory'
import AdminPanel from './pages/AdminPanel'
import styles from './App.module.css'

export default function App() {
  const [currentUser, setCurrentUser] = useState(getCurrentUser())
  const [activeTab, setActiveTab] = useState('home')
  const [selectedTable, setSelectedTable] = useState(null)

  const handleLoginSuccess = (user) => {
    setCurrentUser(user)
    setActiveTab('home')
    setSelectedTable(null)
  }

  const handleLogout = () => {
    logout()
    setCurrentUser(null)
    setActiveTab('home')
    setSelectedTable(null)
  }

  const handleTableSelect = (tableNum) => {
    setSelectedTable(tableNum)
    setActiveTab('confirm')
  }

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Hotpot Di Focolare</h1>
          {selectedTable && (
            <span className={styles.tableIndicator}>Table {selectedTable}</span>
          )}
        </div>
        <div className={styles.userInfo}>
          <span>{currentUser.username}</span>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <nav className={styles.nav}>
        <button
          className={`${styles.tab} ${activeTab === 'home' ? styles.active : ''}`}
          onClick={() => setActiveTab('home')}
        >
          Home
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'confirm' ? styles.active : ''}`}
          onClick={() => setActiveTab('confirm')}
          disabled={!selectedTable}
          title={!selectedTable ? 'Select a table first' : ''}
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
        {activeTab === 'home' && <Home onTableSelect={handleTableSelect} />}
        {activeTab === 'confirm' && selectedTable && <OrderConfirmation table={selectedTable} />}
        {activeTab === 'history' && <OrderHistory />}
        {activeTab === 'admin' && <AdminPanel currentUser={currentUser} />}
      </main>
    </div>
  )
}
