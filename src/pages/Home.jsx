import { useState, useEffect } from 'react'
import logo from '../assets/logo.png'
import { getOrdersFromServer } from '../utils/storage'
import styles from './Home.module.css'

const formatTime = (isoString) => {
  if (!isoString) return ''
  return new Date(isoString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export default function Home({ onTableSelect }) {
  const tables = Array.from({ length: 20 }, (_, i) => i + 1)
  const [pendingOrders, setPendingOrders] = useState([])
  const pendingTables = new Set(pendingOrders.map(o => o.table))

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const allOrders = await getOrdersFromServer()
        setPendingOrders(allOrders.filter(o => !o.status || o.status === 'pending'))
      } catch (error) {
        console.error('Failed to fetch pending orders:', error)
      }
    }

    fetchPending()
    const interval = setInterval(fetchPending, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <img src={logo} alt="Hotpot Di Focolare" className={styles.logo} />
        <h1>Hotpot Di Focolare</h1>
        <p className={styles.subtitle}>Order Management System</p>
      </div>

      {pendingOrders.length > 0 && (
        <div className={styles.pendingSection}>
          <h3>⏳ Pending Orders ({pendingOrders.length})</h3>
          <div className={styles.pendingList}>
            {pendingOrders.map(order => (
              <button
                key={order.id}
                className={styles.pendingItem}
                onClick={() => onTableSelect(order.table)}
                title={`Go to Table ${order.table}`}
              >
                <span className={styles.pendingTable}>Table {order.table}</span>
                <span className={styles.pendingName}>{order.itemName} × {order.quantity}</span>
                <span className={styles.pendingTime}>{formatTime(order.timestamp || order.createdAt)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={styles.content}>
        <h2>Select Table</h2>
        <div className={styles.tablesGrid}>
          {tables.map(tableNum => (
            <button
              key={tableNum}
              className={`${styles.tableButton} ${pendingTables.has(tableNum) ? styles.tableHasPending : ''}`}
              onClick={() => onTableSelect(tableNum)}
              title={pendingTables.has(tableNum) ? `Table ${tableNum} — pending order` : `Table ${tableNum}`}
            >
              <span className={styles.tableIcon}>🪑</span>
              <span className={styles.tableNumber}>{tableNum}</span>
              {pendingTables.has(tableNum) && <span className={styles.pendingDot} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
