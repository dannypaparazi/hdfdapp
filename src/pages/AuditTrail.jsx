import { useState, useEffect } from 'react'
import { getOrdersFromServer } from '../utils/storage'
import styles from './AuditTrail.module.css'

export default function AuditTrail() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [tableFilter, setTableFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const allOrders = await getOrdersFromServer()
        setOrders(allOrders)
      } catch (error) {
        console.error('Failed to fetch audit trail:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  const formatDate = (isoString) => {
    if (!isoString) return '—'
    return new Date(isoString).toLocaleString()
  }

  const statusLabel = (status) => {
    switch (status) {
      case 'served':
        return { text: '✅ Served', className: styles.served }
      case 'unable_to_serve':
        return { text: '❌ Unable to Serve', className: styles.unable }
      case 'completed':
        return { text: '✔️ Completed', className: styles.completed }
      default:
        return { text: '⏳ Pending', className: styles.pending }
    }
  }

  const tables = [...new Set(orders.map(o => o.table))].sort((a, b) => a - b)

  const filtered = orders
    .filter(o => tableFilter === 'all' || String(o.table) === tableFilter)
    .filter(o => statusFilter === 'all' || o.status === statusFilter)
    .sort((a, b) => {
      const aTime = a.statusUpdatedAt || a.createdAt || a.timestamp || ''
      const bTime = b.statusUpdatedAt || b.createdAt || b.timestamp || ''
      return bTime.localeCompare(aTime)
    })

  if (loading) {
    return (
      <div className={styles.container}>
        <h2>Audit Trail</h2>
        <div className={styles.emptyState}>
          <p>Loading order timeline...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <h2>Audit Trail</h2>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label htmlFor="tableFilter">Table</label>
          <select
            id="tableFilter"
            value={tableFilter}
            onChange={(e) => setTableFilter(e.target.value)}
          >
            <option value="all">All Tables</option>
            {tables.map(t => (
              <option key={t} value={t}>Table {t}</option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="statusFilter">Status</label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="served">Served</option>
            <option value="unable_to_serve">Unable to Serve</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className={styles.summary}>
          {filtered.length} record{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No orders match this filter.</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.auditTable}>
            <thead>
              <tr>
                <th>Table</th>
                <th>Item</th>
                <th>Qty</th>
                <th>Status</th>
                <th>Created</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(order => {
                const badge = statusLabel(order.status)
                return (
                  <tr key={order.id}>
                    <td>{order.tableSession || order.table}</td>
                    <td>{order.itemName}</td>
                    <td>{order.quantity}</td>
                    <td>
                      <span className={`${styles.badge} ${badge.className}`}>
                        {badge.text}
                      </span>
                    </td>
                    <td>{formatDate(order.createdAt)}</td>
                    <td>{formatDate(order.statusUpdatedAt)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
