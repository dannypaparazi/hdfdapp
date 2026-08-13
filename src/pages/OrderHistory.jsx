import { useState, useEffect } from 'react'
import { getOrders, deleteOrder } from '../utils/storage'
import styles from './OrderHistory.module.css'

export default function OrderHistory() {
  const [orders, setOrders] = useState([])

  useEffect(() => {
    setOrders(getOrders())
  }, [])

  const handleDeleteOrder = (id) => {
    if (confirm('Are you sure you want to delete this order?')) {
      deleteOrder(id)
      setOrders(getOrders())
    }
  }

  const formatDate = (isoString) => {
    const date = new Date(isoString)
    return date.toLocaleString()
  }

  if (orders.length === 0) {
    return (
      <div className={styles.container}>
        <h2>Order History</h2>
        <div className={styles.emptyState}>
          <p>No orders yet. Start by adding an item in the Order Confirmation tab.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <h2>Order History</h2>
      <div className={styles.ordersGrid}>
        {orders.map(order => (
          <div key={order.id} className={styles.orderCard}>
            {order.photo && (
              <div className={styles.photoContainer}>
                <img src={order.photo} alt={order.itemName} />
              </div>
            )}
            <div className={styles.cardContent}>
              <h3>{order.itemName}</h3>
              <p className={styles.quantity}>Qty: {order.quantity}</p>
              {order.description && (
                <p className={styles.description}>{order.description}</p>
              )}
              <p className={styles.timestamp}>
                {formatDate(order.timestamp)}
              </p>
              <button
                className={styles.deleteBtn}
                onClick={() => handleDeleteOrder(order.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
