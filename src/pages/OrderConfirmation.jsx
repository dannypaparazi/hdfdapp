import { useState, useEffect, useRef } from 'react'
import { addOrder, getOrders, deleteOrder, getItems, getOrdersFromServer, getItemsFromServer, updateOrderStatus } from '../utils/storage'
import { getFormattedTableName, incrementTableCounter } from '../utils/tableCounter'
import styles from './OrderConfirmation.module.css'

const formatTime = (isoString) => {
  if (!isoString) return ''
  return new Date(isoString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export default function OrderConfirmation({ table }) {
  const [menuItems, setMenuItems] = useState([])
  const [orders, setOrders] = useState([])
  const [selectedQuantities, setSelectedQuantities] = useState({})
  const [customQuantityId, setCustomQuantityId] = useState(null)
  const [customQuantityValue, setCustomQuantityValue] = useState('')
  const [message, setMessage] = useState({ type: '', text: '' })
  const requestIdRef = useRef(0)

  // Flow: Current Order (pending) -> Items Served (served) -> Order History
  // (completed, after Checkout).
  //
  // Active orders are matched by table number and non-completed status only
  // — NOT by tableSession. The session counter lives in each device's own
  // localStorage and is never synced through Firebase, so a customer's app
  // and the admin's app can easily disagree on the current session number
  // for a table (e.g. admin checked out a previous round, bumping its local
  // counter, while an in-flight order still carries the old session tag).
  // Filtering strictly by session match then hides real, unresolved orders
  // from admin — silently losing orders is far worse than an old pending
  // item lingering an extra session, so match on table alone here.
  //
  // The 3s poll and an action's own post-update refresh both call this
  // independently. Without ordering, a poll fetch that started BEFORE a
  // status write committed can resolve AFTER the action's fresh refresh and
  // clobber the state with stale pre-write data. requestIdRef makes only the
  // most recently *issued* fetch allowed to update state, regardless of
  // which resolves last.
  const refreshOrders = async () => {
    const requestId = ++requestIdRef.current
    const allOrders = await getOrdersFromServer(table)
    if (requestId !== requestIdRef.current) return

    const activeOrders = allOrders.filter(order => order.status !== 'completed')
    setOrders(activeOrders)
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

  // Current Order -> Items Served
  const handleMarkServed = async (order) => {
    try {
      console.log('🟠 ADMIN: handleMarkServed clicked - orderId:', order.id)
      await updateOrderStatus(order.id, 'served')
      await refreshOrders()
      console.log('🟢 ADMIN: Status update sent to Firebase')
    } catch (error) {
      console.error('🔴 ADMIN: Error marking served:', error)
      setMessage({ type: 'error', text: 'Failed to update status' })
    }
  }

  // Current Order -> rejected (item can't be served). UserOrder.jsx already
  // watches for this status and shows the customer a "not available"
  // notification — this is what actually triggers it.
  const handleReject = async (order) => {
    if (!confirm(`Mark "${order.itemName}" as unable to serve? The customer will be notified.`)) {
      return
    }
    try {
      console.log('🟠 ADMIN: handleReject clicked - orderId:', order.id)
      await updateOrderStatus(order.id, 'unable_to_serve')
      await refreshOrders()
      setMessage({ type: 'success', text: `"${order.itemName}" marked unable to serve — customer notified` })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (error) {
      console.error('🔴 ADMIN: Error rejecting order:', error)
      setMessage({ type: 'error', text: 'Failed to update status' })
    }
  }

  // Items Served -> Order History (transfers this one item individually,
  // no need to wait for Checkout)
  const handleTransferToHistory = async (order) => {
    try {
      console.log('🟠 ADMIN: handleTransferToHistory clicked - orderId:', order.id)
      await updateOrderStatus(order.id, 'completed')
      await refreshOrders()
      console.log('🟢 ADMIN: Transferred to Order History')
    } catch (error) {
      console.error('🔴 ADMIN: Error transferring to history:', error)
      setMessage({ type: 'error', text: 'Failed to update status' })
    }
  }

  const handleCheckout = async () => {
    if (orders.length === 0) {
      setMessage({ type: 'error', text: 'No items to checkout' })
      return
    }
    try {
      await Promise.all(orders.map(order => updateOrderStatus(order.id, 'completed')))
      incrementTableCounter(table)
      await refreshOrders()
      setMessage({ type: 'success', text: 'Order checked out successfully! Items moved to Order History.' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (error) {
      console.error('Error during checkout:', error)
      setMessage({ type: 'error', text: 'Checkout failed. Please try again.' })
    }
  }

  const currentOrderItems = orders.filter(order => !order.status || order.status === 'pending')
  const servedOrderItems = orders.filter(order => order.status === 'served')
  const totalAmount = currentOrderItems.reduce((sum, order) => sum + (order.unitPrice * order.quantity), 0)
  const servedTotal = servedOrderItems.reduce((sum, order) => sum + (order.unitPrice * order.quantity), 0)

  return (
    <div className={styles.container}>
      {table && (
        <div className={styles.tableHeader}>
          <h3>Table {getFormattedTableName(table)}</h3>
        </div>
      )}

      {/* Current Order: pending items, awaiting service */}
      {currentOrderItems.length > 0 && (
        <div className={styles.ordersSection}>
          <h2>Current Order</h2>
          <div className={styles.ordersList}>
            {currentOrderItems.map(order => (
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
                  <div className={styles.itemTimestamp}>{formatTime(order.timestamp || order.createdAt)}</div>
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
                  className={styles.rejectBtn}
                  onClick={() => handleReject(order)}
                  title="Unable to serve — notifies customer"
                >
                  ⚠
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

      {/* Order Total: subtotal of pending items still in Current Order. */}
      {orders.length > 0 && (
        <div className={styles.totalSection}>
          <h3>Order Total</h3>
          <p className={styles.totalAmount}>${totalAmount.toFixed(2)}</p>
        </div>
      )}

      {/* Items Served: tick transfers this item to Order History individually */}
      {servedOrderItems.length > 0 && (
        <div className={styles.servedSection}>
          <h2>Items Served</h2>
          <div className={styles.ordersList}>
            {servedOrderItems.map(order => (
              <div key={order.id} className={`${styles.orderItem} ${styles.served}`}>
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
                  <div className={styles.itemTimestamp}>{formatTime(order.timestamp || order.createdAt)}</div>
                </div>
                <button
                  className={styles.servedBtn}
                  onClick={() => handleTransferToHistory(order)}
                  title="Send to Order History"
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

      {/* Served Total: Checkout lives here — finalizes whatever's still active
          for this table (pending + served) as completed, and starts a fresh
          session for the next customer. Shown whenever there's anything
          active so Checkout stays reachable even before anything's served. */}
      {orders.length > 0 && (
        <div className={styles.totalSection}>
          <h3>Served Total</h3>
          <p className={styles.totalAmount}>${servedTotal.toFixed(2)}</p>
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
