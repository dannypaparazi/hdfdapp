import { useState, useEffect } from 'react'
import { getOrders } from '../utils/storage'
import AdminLogin from '../components/AdminLogin'
import OrdersList from '../components/OrdersList'
import styles from './AdminPanel.module.css'

const ADMIN_PASSWORD = 'admin123'

export default function AdminPanel({ isLoggedIn, onLogin, onLogout }) {
  const [orders, setOrders] = useState([])

  useEffect(() => {
    if (isLoggedIn) {
      setOrders(getOrders())
    }
  }, [isLoggedIn])

  const handleLogin = (password) => {
    if (password === ADMIN_PASSWORD) {
      onLogin()
      return true
    }
    return false
  }

  if (!isLoggedIn) {
    return <AdminLogin onLogin={handleLogin} />
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Admin Panel</h2>
        <button className={styles.logoutBtn} onClick={onLogout}>
          Logout
        </button>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Total Orders</span>
          <span className={styles.statValue}>{orders.length}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Total Items</span>
          <span className={styles.statValue}>
            {orders.reduce((sum, order) => sum + order.quantity, 0)}
          </span>
        </div>
      </div>

      <OrdersList orders={orders} onOrdersChange={setOrders} />
    </div>
  )
}
