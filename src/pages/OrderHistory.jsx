import { useState, useEffect } from 'react'
import { getOrders, deleteOrder } from '../utils/storage'
import styles from './OrderHistory.module.css'

export default function OrderHistory() {
  const [orders, setOrders] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [currentMonth, setCurrentMonth] = useState(new Date())

  useEffect(() => {
    setOrders(getOrders(undefined, true))
  }, [])

  const handleDeleteOrder = (id) => {
    if (confirm('Are you sure you want to delete this order?')) {
      deleteOrder(id)
      setOrders(getOrders(undefined, true))
    }
  }

  const formatDate = (isoString) => {
    const date = new Date(isoString)
    return date.toLocaleString()
  }

  const getDateKey = (isoString) => {
    return isoString.split('T')[0]
  }

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const getOrderDates = () => {
    return new Set(orders.map(order => getDateKey(order.timestamp)))
  }

  const getOrdersForDate = (dateStr) => {
    return orders.filter(order => getDateKey(order.timestamp) === dateStr)
  }

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const daysInMonth = getDaysInMonth(currentMonth)
  const firstDay = getFirstDayOfMonth(currentMonth)
  const orderDates = getOrderDates()
  const daysList = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const selectedDateOrders = getOrdersForDate(selectedDate)

  const groupedByTable = selectedDateOrders.reduce((acc, order) => {
    // Group by tableSession (e.g., "1-1", "1-2") or fall back to table number
    const tableKey = order.tableSession || `${order.table}-1` || 'Unknown'
    if (!acc[tableKey]) {
      acc[tableKey] = []
    }
    acc[tableKey].push(order)
    return acc
  }, {})

  const sortedTables = Object.keys(groupedByTable).sort((a, b) => {
    if (a === 'Unknown') return 1
    if (b === 'Unknown') return -1
    // Sort by table number first, then by session number
    const [aTable, aSession] = a.split('-').map(Number)
    const [bTable, bSession] = b.split('-').map(Number)
    if (aTable !== bTable) return aTable - bTable
    return (aSession || 1) - (bSession || 1)
  })

  const formatDateDisplay = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const monthYear = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

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

      {/* Calendar */}
      <div className={styles.calendarSection}>
        <div className={styles.calendarHeader}>
          <button className={styles.monthBtn} onClick={previousMonth}>←</button>
          <h3>{monthYear}</h3>
          <button className={styles.monthBtn} onClick={nextMonth}>→</button>
        </div>

        <div className={styles.calendar}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className={styles.dayHeader}>{day}</div>
          ))}

          {Array(firstDay).fill(null).map((_, i) => (
            <div key={`empty-${i}`} className={styles.emptyDay}></div>
          ))}

          {daysList.map(day => {
            const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const hasOrders = orderDates.has(dateStr)
            const isSelected = selectedDate === dateStr

            return (
              <button
                key={day}
                className={`${styles.calendarDay} ${hasOrders ? styles.hasOrders : ''} ${isSelected ? styles.selected : ''}`}
                onClick={() => setSelectedDate(dateStr)}
              >
                {day}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected Date Orders */}
      {selectedDateOrders.length > 0 ? (
        <>
          <div className={styles.selectedDateInfo}>
            <h3>Orders for {formatDateDisplay(selectedDate)}</h3>
          </div>

          {sortedTables.map(tableNum => {
            const tableOrders = groupedByTable[tableNum]
            const tableTotal = tableOrders.reduce((sum, order) => {
              return sum + (order.unitPrice ? order.unitPrice * order.quantity : 0)
            }, 0)

            return (
              <div key={tableNum} className={styles.tableSection}>
                <h3 className={styles.tableHeading}>Table {tableNum}</h3>
                <div className={styles.ordersList}>
                  {tableOrders.map(order => (
                    <div key={order.id} className={styles.orderLineItem}>
                      {order.photo && (
                        <div className={styles.lineItemPhoto}>
                          <img src={order.photo} alt={order.itemName} />
                        </div>
                      )}
                      <div className={styles.lineItemContent}>
                        <div className={styles.itemNameRow}>
                          <span className={styles.itemName}>{order.itemName}</span>
                          {order.description && (
                            <span className={styles.lineItemDescription}>{order.description}</span>
                          )}
                        </div>
                      </div>
                      <div className={styles.lineItemPrice}>
                        ${order.unitPrice ? order.unitPrice.toFixed(2) : '0.00'}
                      </div>
                      <div className={styles.lineItemQty}>
                        {order.quantity}
                      </div>
                      <div className={styles.lineItemTotal}>
                        ${order.unitPrice ? (order.unitPrice * order.quantity).toFixed(2) : '0.00'}
                      </div>
                      <button
                        className={styles.deleteLineBtn}
                        onClick={() => handleDeleteOrder(order.id)}
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <div className={styles.tableTotalSection}>
                  <h3>Table Total</h3>
                  <p className={styles.tableTotalAmount}>${tableTotal.toFixed(2)}</p>
                </div>
              </div>
            )
          })}
        </>
      ) : (
        <div className={styles.emptyState}>
          <p>No orders for {formatDateDisplay(selectedDate)}</p>
        </div>
      )}
    </div>
  )
}
