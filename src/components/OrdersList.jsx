import { getOrders, deleteOrder } from '../utils/storage'
import styles from './OrdersList.module.css'

export default function OrdersList({ orders, onOrdersChange }) {
  const handleDelete = (id) => {
    if (confirm('Delete this order?')) {
      deleteOrder(id)
      onOrdersChange(getOrders())
    }
  }

  const formatDate = (isoString) => {
    const date = new Date(isoString)
    return date.toLocaleString()
  }

  if (orders.length === 0) {
    return (
      <div className={styles.empty}>
        No orders to display
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <h3>All Orders</h3>
      <div className={styles.table}>
        <div className={styles.tableHeader}>
          <div className={styles.col}>Item</div>
          <div className={styles.col}>Qty</div>
          <div className={styles.col}>Description</div>
          <div className={styles.col}>Date</div>
          <div className={styles.col}>Action</div>
        </div>
        {orders.map(order => (
          <div key={order.id} className={styles.tableRow}>
            <div className={styles.col}>{order.itemName}</div>
            <div className={styles.col}>{order.quantity}</div>
            <div className={styles.col}>{order.description || '-'}</div>
            <div className={styles.col}>{formatDate(order.timestamp)}</div>
            <div className={styles.col}>
              <button
                className={styles.deleteBtn}
                onClick={() => handleDelete(order.id)}
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
