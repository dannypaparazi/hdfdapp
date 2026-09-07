import { useState, useEffect } from 'react'
import { addOrder, getOrders, deleteOrder, getItems, getOrdersFromServer, getItemsFromServer, updateOrderStatus } from '../utils/storage'
import { getFormattedTableName, incrementTableCounter } from '../utils/tableCounter'
import styles from './OrderConfirmation.module.css'

export default function OrderConfirmation({ table }) {
  const [menuItems, setMenuItems] = useState([])
  const [orders, setOrders] = useState([])
  const [checkoutTotal, setCheckoutTotal] = useState(0)
  const [selectedQuantities, setSelectedQuantities] = useState({})
  const [customQuantityId, setCustomQuantityId] = useState(null)
  const [customQuantityValue, setCustomQuantityValue] = useState('')
  const [message, setMessage] = useState({ type: '', text: '' })

  // A served item is immediately transferred to Order History (it's no longer
  // "current" work for this table), so only pending items stay in the active
  // list here. checkoutTotal is the running sum of served items for the
  // table's CURRENT session only, so it resets when the table is closed out
  // and doesn't pick up abandoned pending items from a past session.
  const refreshOrders = async () => {
    const allOrders = await getOrdersFromServer(table)
    const currentSession = getFormattedTableName(table)
    const sessionOrders = allOrders.filter(order => order.tableSession === currentSession)
    const pendingOrders = sessionOrders.filter(order => !order.status || order.status === 'pending')
    const servedOrders = sessionOrders.filter(order => order.status === 'served')

    setOrders(pendingOrders)
    setCheckoutTotal(servedOrders.reduce((sum, order) => sum + (order.unitPrice * order.quantity), 0))
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const items = await getItemsFromServer()
        setMenuItems(items)
      } catch (error) {
        console.error('Failed to fetch items:', error)
        setMenuItems(getItems())
      }

      try {
        await refreshOrders()
      } catch (error) {
        console.error('Failed to fetch orders:', error)
        setOrders(getOrders(table))
      }
    }

    fetchData()

    // Poll for updates every 3 seconds
    const interval = setInterval(fetchData, 3000)
    return () => clearInterval(interval)
  }, [table])

  const handleQuantityChange = (itemId, value) => {
    if (value === 'other') {
      setCustomQuantityId(itemId)
      setCustomQuantityValue('')
    } else {
      setSelectedQuantities(prev => ({
        ...prev,
        [itemId]: parseInt(value),
      }))
      setCustomQuantityId(null)
    }
  }

  const handleCustomQuantitySubmit = () => {
    const qty = parseInt(customQuantityValue)
    if (!customQuantityValue || qty < 1) {
      setMessage({ type: 'error', text: 'Please enter a valid quantity' })
      return
    }
    setSelectedQuantities(prev => ({
      ...prev,
      [customQuantityId]: qty,
    }))
    setCustomQuantityId(null)
    setCustomQuantityValue('')
  }

  const handleAddToOrder = async (item) => {
    const quantity = selectedQuantities[item.id]
    if (!quantity) {
      setMessage({ type: 'error', text: 'Please select a quantity' })
      return
    }

    if (!table) {
      setMessage({ type: 'error', text: 'Error: Table not selected' })
      return
    }

    try {
      console.log('🔵 ADDING ORDER - Table:', table, 'Item:', item.name, 'Qty:', quantity)

      await addOrder({
        itemName: item.name,
        quantity: quantity,
        description: item.description,
        unitPrice: item.cost,
        timestamp: new Date().toISOString(),
      }, table)

      console.log('🟢 ORDER ADDED')

      setSelectedQuantities(prev => {
        const updated = { ...prev }
        delete updated[item.id]
        return updated
      })

      await refreshOrders()
      console.log('🟣 STATE REFRESHED')

      setMessage({ type: 'success', text: `${item.name} x${quantity} added to order` })
      setTimeout(() => setMessage({ type: '', text: '' }), 2000)
    } catch (error) {
      console.error('Error adding order:', error)
      setMessage({ type: 'error', text: 'Failed to add order' })
    }
  }

  const handleQuantityChangeOrder = async (orderId, newQuantity) => {
    try {
      const order = orders.find(o => o.id === orderId)
      if (order) {
        await deleteOrder(orderId)
        await addOrder({
          ...order,
          quantity: parseInt(newQuantity),
        }, table)
        await refreshOrders()
      }
    } catch (error) {
      console.error('Error updating order quantity:', error)
      setMessage({ type: 'error', text: 'Failed to update order' })
    }
  }

  const handleDeleteOrder = async (orderId) => {
    try {
      await deleteOrder(orderId)
      await refreshOrders()
    } catch (error) {
      console.error('Error deleting order:', error)
      setMessage({ type: 'error', text: 'Failed to delete order' })
    }
  }

  const handleMarkServed = async (order) => {
    try {
      console.log('🟠 ADMIN: handleMarkServed clicked - orderId:', order.id)
      await updateOrderStatus(order.id, 'served')
      await refreshOrders()
      console.log('🟢 ADMIN: Marked served and transferred to Order History')
    } catch (error) {
      console.error('🔴 ADMIN: Error marking served:', error)
      setMessage({ type: 'error', text: 'Failed to update status' })
    }
  }

  const handleCheckout = async () => {
    if (orders.length === 0 && checkoutTotal === 0) {
      setMessage({ type: 'error', text: 'Nothing to check out yet' })
      return
    }
    try {
      incrementTableCounter(table)
      await refreshOrders()
      setMessage({ type: 'success', text: 'Table closed out. Ready for the next order!' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (error) {
      console.error('Error closing out table:', error)
      setMessage({ type: 'error', text: 'Failed to close out table. Please try again.' })
    }
  }

  return (
    <div className={styles.container}>
      {table && (
        <div className={styles.tableHeader}>
          <h3>Table {getFormattedTableName(table)}</h3>
        </div>
      )}

      {/* Current Order (pending items only — served items transfer to Order History) */}
      {orders.length > 0 && (
        <div className={styles.ordersSection}>
          <h2>Current Order</h2>
          <div className={styles.ordersList}>
            {orders.map(order => (
              <div key={order.id} className={styles.orderItem}>
                {order.photo && (
                  <div className={styles.itemPhoto}>
                    <img src={order.photo} alt={order.itemName} />
                  </div>
                )}
                <div className={styles.itemDetails}>
                  <div className={styles.itemName}>{order.itemName}</div>
                  {order.description && (
                    <div className={styles.itemDescription}>{order.description}</div>
                  )}
                  {order.unitPrice > 0 && (
                    <div className={styles.itemPrice}>
                      ${order.unitPrice.toFixed(2)} x {order.quantity} = ${(order.unitPrice * order.quantity).toFixed(2)}
                    </div>
                  )}
                </div>
                <div className={styles.quantitySection}>
                  <button
                    className={styles.quantityBtn}
                    onClick={() => handleQuantityChangeOrder(order.id, Math.max(1, order.quantity - 1))}
                    title="Decrease quantity"
                  >
                    −
                  </button>
                  <span className={styles.quantityDisplay}>{order.quantity}</span>
                  <button
                    className={styles.quantityBtn}
                    onClick={() => handleQuantityChangeOrder(order.id, order.quantity + 1)}
                    title="Increase quantity"
                  >
                    +
                  </button>
                </div>
                <button
                  className={styles.servedBtn}
                  onClick={() => handleMarkServed(order)}
                  title="Mark as served"
                >
                  ✓
                </button>
                <button
                  className={styles.deleteBtn}
                  onClick={() => handleDeleteOrder(order.id)}
                  title="Delete item"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Checkout Total: running sum of items served this session, ready to collect */}
      {(orders.length > 0 || checkoutTotal > 0) && (
        <div className={styles.totalSection}>
          <h3>Checkout Total</h3>
          <p className={styles.totalAmount}>${checkoutTotal.toFixed(2)}</p>
          <button className={styles.checkoutBtn} onClick={handleCheckout}>
            Checkout
          </button>
        </div>
      )}

      {/* Message */}
      {message.text && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      {/* Menu Items */}
      <div className={styles.menuSection}>
        <h2>Menu</h2>
        {menuItems.length === 0 ? (
          <div className={styles.empty}>
            No menu items available. Admin needs to create menu items first.
          </div>
        ) : (
          <div className={styles.menuList}>
            {menuItems.map(item => (
              <div key={item.id} className={styles.menuLineItem}>
                {item.photo && (
                  <div className={styles.lineItemPhoto}>
                    <img src={item.photo} alt={item.name} />
                  </div>
                )}
                <div className={styles.lineItemContent}>
                  <div className={styles.lineItemName}>{item.name}</div>
                  {item.description && (
                    <div className={styles.lineItemDescription}>{item.description}</div>
                  )}
                </div>
                <div className={styles.lineItemPrice}>
                  ${item.cost.toFixed(2)}
                </div>
                <div className={styles.lineItemQuantity}>
                  {customQuantityId === item.id ? (
                    <div className={styles.customQuantityInputLine}>
                      <input
                        type="number"
                        min="1"
                        value={customQuantityValue}
                        onChange={(e) => setCustomQuantityValue(e.target.value)}
                        placeholder="Qty"
                        autoFocus
                      />
                      <button
                        className={styles.confirmBtn}
                        onClick={handleCustomQuantitySubmit}
                      >
                        OK
                      </button>
                      <button
                        className={styles.cancelBtn}
                        onClick={() => setCustomQuantityId(null)}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className={styles.quantitySelectorLine}>
                      <select
                        value={selectedQuantities[item.id] || ''}
                        onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                        className={styles.lineQuantitySelect}
                      >
                        <option value="">Qty</option>
                        {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                          <option key={num} value={num}>{num}</option>
                        ))}
                        <option value="other">Other</option>
                      </select>
                      <button
                        className={styles.addLineBtn}
                        onClick={() => handleAddToOrder(item)}
                        disabled={!selectedQuantities[item.id]}
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
