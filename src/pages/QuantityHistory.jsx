import { useState, useEffect } from 'react'
import { getOrders } from '../utils/storage'
import styles from './QuantityHistory.module.css'

export default function QuantityHistory() {
  const [orders, setOrders] = useState([])
  const [groupedData, setGroupedData] = useState({})

  useEffect(() => {
    const allOrders = getOrders(undefined, true)
    setOrders(allOrders)
    processOrderData(allOrders)
  }, [])

  const processOrderData = (orderList) => {
    const grouped = {}

    orderList.forEach(order => {
      const dateKey = order.timestamp.split('T')[0]
      if (!grouped[dateKey]) {
        grouped[dateKey] = {}
      }

      if (!grouped[dateKey][order.itemName]) {
        grouped[dateKey][order.itemName] = {
          itemName: order.itemName,
          totalQty: 0,
          totalSales: 0,
          orders: 0
        }
      }

      grouped[dateKey][order.itemName].totalQty += order.quantity
      grouped[dateKey][order.itemName].totalSales += order.unitPrice * order.quantity
      grouped[dateKey][order.itemName].orders += 1
    })

    setGroupedData(grouped)
  }

  const sortedDates = Object.keys(groupedData).sort().reverse()

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className={styles.container}>
      <h1>Quantity History</h1>
      <p className={styles.subtitle}>Daily breakdown of items ordered by quantity</p>

      {sortedDates.length === 0 ? (
        <div className={styles.empty}>
          <p>No order data available</p>
        </div>
      ) : (
        <div className={styles.dailyBreakdown}>
          {sortedDates.map(dateStr => {
            const dayData = groupedData[dateStr]
            const itemList = Object.values(dayData).sort((a, b) => b.totalQty - a.totalQty)
            const dayTotal = itemList.reduce((sum, item) => sum + item.totalSales, 0)
            const dayQtyTotal = itemList.reduce((sum, item) => sum + item.totalQty, 0)

            return (
              <div key={dateStr} className={styles.dayCard}>
                <div className={styles.dayHeader}>
                  <h3>{formatDate(dateStr)}</h3>
                  <div className={styles.daySummary}>
                    <span className={styles.totalQty}>📦 {dayQtyTotal} items</span>
                    <span className={styles.totalSales}>💰 ${dayTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div className={styles.itemsTable}>
                  <div className={styles.tableHeader}>
                    <div className={styles.colItemName}>Item</div>
                    <div className={styles.colQty}>Qty</div>
                    <div className={styles.colOrders}>Orders</div>
                    <div className={styles.colPrice}>Price/Unit</div>
                    <div className={styles.colTotal}>Total</div>
                  </div>

                  {itemList.map((item, idx) => (
                    <div key={idx} className={styles.tableRow}>
                      <div className={styles.colItemName}>{item.itemName}</div>
                      <div className={styles.colQty}>
                        <span className={styles.badge}>{item.totalQty}</span>
                      </div>
                      <div className={styles.colOrders}>{item.orders}</div>
                      <div className={styles.colPrice}>${(item.totalSales / item.totalQty).toFixed(2)}</div>
                      <div className={styles.colTotal}>
                        <span className={styles.totalBadge}>${item.totalSales.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
