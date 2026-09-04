import { useState } from 'react'
import { getCurrentUser, logout } from './utils/auth'
import Login from './components/Login'
import UserLogin from './pages/UserLogin'
import UserOrder from './pages/UserOrder'
import Home from './pages/Home'
import OrderConfirmation from './pages/OrderConfirmation'
import OrderHistory from './pages/OrderHistory'
import QuantityHistory from './pages/QuantityHistory'
import AuditTrail from './pages/AuditTrail'
import AdminPanel from './pages/AdminPanel'
import styles from './App.module.css'

export default function App() {
  const [currentUser, setCurrentUser] = useState(getCurrentUser())
  const [userTable, setUserTable] = useState(null)
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

  const handleUserLogin = (tableNum) => {
    setUserTable(tableNum)
  }

  const handleUserLogout = () => {
    setUserTable(null)
  }

  const handleTableSelect = (tableNum) => {
    setSelectedTable(tableNum)
    setActiveTab('confirm')
  }

  // User ordering mode (via QR code)
  if (userTable !== null) {
    return <UserOrder table={userTable} onLogout={handleUserLogout} />
  }

  // User login via QR code
  if (currentUser === null && typeof currentUser !== 'object') {
    return <UserLogin onLogin={handleUserLogin} />
  }

  // Admin login
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
          className={`${styles.tab} ${activeTab === 'quantity' ? styles.active : ''}`}
          onClick={() => setActiveTab('quantity')}
        >
          Quantity History
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'audit' ? styles.active : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          Audit Trail
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
        {activeTab === 'quantity' && <QuantityHistory />}
        {activeTab === 'audit' && <AuditTrail />}
        {activeTab === 'admin' && <AdminPanel currentUser={currentUser} />}
      </main>
    </div>
  )
}
