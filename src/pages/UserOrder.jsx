import { useState, useEffect, useRef } from 'react'
import { getItems, getItemsFromServer, addOrder, getOrders, getOrdersFromServer } from '../utils/storage'
import { getFormattedTableName } from '../utils/tableCounter'
import styles from './UserOrder.module.css'

const formatTime = (isoString) => {
  if (!isoString) return ''
  return new Date(isoString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

// A customer who rescans a table's QR code after a past session was already
// paid for and closed out must never see that old order resurface as if
// still live -- table sessions live only in each device's own localStorage,
// so there's no reliable id to tell "my order, now checked out" apart from
// "a stranger's order from three sessions ago" except which ids this tab has
// actually observed. So: an order only ever enters `knownIds` while it's
// still non-completed, and a completed order is shown only if its id is
// already in there -- letting a live order that gets checked out while this
// tab is open surface as "Completed" without resurrecting stale history.
const fetchOrdersForDisplay = async (table, knownIds) => {
  const allOrders = await getOrdersFromServer(table)
  allOrders.forEach(o => {
    if (o.status !== 'completed') knownIds.add(o.id)
  })
  return allOrders.filter(o => o.status !== 'completed' || knownIds.has(o.id))
}

export default function UserOrder({ table, onLogout }) {
  const [menuItems, setMenuItems] = useState([])
  const [orders, setOrders] = useState([])
  const [selectedQuantities, setSelectedQuantities] = useState({})
  const [message, setMessage] = useState({ type: '', text: '' })
  const [servedNotifications, setServedNotifications] = useState(new Set())
  const [customQtyId, setCustomQtyId] = useState(null)
  const [customQtyValue, setCustomQtyValue] = useState('')
  const knownOrderIdsRef = useRef(new Set())
  const knownOrdersTableRef = useRef(table)

  useEffect(() => {
    if (knownOrdersTableRef.current !== table) {
      knownOrderIdsRef.current = new Set()
      knownOrdersTableRef.current = table
    }

    const fetchData = async () => {
      try {
        const items = await getItemsFromServer()
        setMenuItems(items)
      } catch (error) {
        console.error('Failed to fetch menu from server:', error)
        setMenuItems(getItems())
      }

      try {
        const fetchedOrders = await fetchOrdersForDisplay(table, knownOrderIdsRef.current)
        console.log('📱 USER POLL: Table:', table, '| Orders:', fetchedOrders.length, '| Details:', fetchedOrders.map(o => ({ id: o.id, itemName: o.itemName, status: o.status })))

        // Track which orders changed to served status
        const currentOrderIds = new Set(orders.map(o => o.id))
        fetchedOrders.forEach(order => {
          const wasServed = orders.find(o => o.id === order.id)?.status === 'served'
          const wasUnable = orders.find(o => o.id === order.id)?.status === 'unable_to_serve'

          if (order.status === 'served' && !wasServed && !servedNotifications.has(order.id)) {
            console.log('📱 USER: 🎉 STATUS CHANGED TO SERVED:', order.itemName)
            setMessage({ type: 'success', text: `✅ ${order.itemName} is ready!` })
            setServedNotifications(prev => new Set(prev).add(order.id))
            setTimeout(() => setMessage({ type: '', text: '' }), 4000)
          } else if (order.status === 'unable_to_serve' && !wasUnable && !servedNotifications.has(order.id)) {
            console.log('📱 USER: ❌ STATUS CHANGED TO UNABLE:', order.itemName)
            setMessage({ type: 'error', text: `❌ ${order.itemName} is not available` })
            setServedNotifications(prev => new Set(prev).add(order.id))
            setTimeout(() => setMessage({ type: '', text: '' }), 4000)
          }
        })

        setOrders(fetchedOrders)
      } catch (error) {
        console.error('Failed to fetch orders:', error)
        setOrders(getOrders(table))
      }
    }

    fetchData()

    // Poll for updates every 3 seconds
    const interval = setInterval(fetchData, 3000)
    return () => clearInterval(interval)
  }, [table, servedNotifications])

  const handleQuantityChange = (itemId, value) => {
    if (value === 'other') {
      setCustomQtyId(itemId)
      setCustomQtyValue('')
    } else {
      setSelectedQuantities(prev => ({
        ...prev,
        [itemId]: parseInt(value),
      }))
      setCustomQtyId(null)
    }
  }

  const handleCustomQtySubmit = () => {
    const qty = parseInt(customQtyValue)
    if (!customQtyValue || qty < 1) {
      setMessage({ type: 'error', text: 'Please enter a valid quantity' })
      return
    }
    setSelectedQuantities(prev => ({
      ...prev,
      [customQtyId]: qty,
    }))
    setCustomQtyId(null)
    setCustomQtyValue('')
  }

  const handleAddToOrder = async (item) => {
    const quantity = selectedQuantities[item.id]
    if (!quantity) {
      setMessage({ type: 'error', text: 'Please select a quantity' })
      return
    }

    try {
      await addOrder({
        itemName: item.name,
        quantity: quantity,
        description: item.description,
        unitPrice: item.cost,
        timestamp: new Date().toISOString(),
      }, table)

      setSelectedQuantities(prev => {
        const updated = { ...prev }
        delete updated[item.id]
        return updated
      })

      // Read back from the server rather than local storage. addOrder saves
      // locally first and syncs to Firebase in the background without
      // throwing on a sync failure (by design, so a flaky connection
      // doesn't block placing the order) -- so trusting the local echo here
      // would show the customer an order that staff can never actually see.
      const updatedOrders = await fetchOrdersForDisplay(table, knownOrderIdsRef.current)
      setOrders(updatedOrders)
      setMessage({ type: 'success', text: `${item.name} x${quantity} added!` })
      setTimeout(() => setMessage({ type: '', text: '' }), 2000)
    } catch (error) {
      console.error('Failed to add order:', error)
      setMessage({ type: 'error', text: 'Failed to add order. Please try again.' })
    }
  }

  // Rejected items aren't being charged for, so they shouldn't count toward
  // the order summary or total.
  const billableOrders = orders.filter(order => order.status !== 'unable_to_serve')
  const totalAmount = billableOrders.reduce((sum, order) => sum + (order.unitPrice * order.quantity), 0)

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1>🍲 Hotpot Di Focolare</h1>
          <div className={styles.tableInfo}>
            Table {getFormattedTableName(table)}
          </div>
        </div>
        <button className={styles.logoutBtn} onClick={() => {
          console.log('Exit clicked')
          onLogout()
        }}>
          Exit
        </button>
      </div>

      {/* Current Order Summary */}
      {orders.length > 0 && (
        <div className={styles.orderSummary}>
          <div className={styles.orderCount}>
            {billableOrders.length} item{billableOrders.length !== 1 ? 's' : ''} in order
          </div>
          <div className={styles.orderTotal}>
            Total: <span>${totalAmount.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Itemized Order List */}
      {orders.length > 0 && (
        <div className={styles.orderItemsList}>
          <h3>Your Order</h3>
          <div className={styles.itemsTable}>
            {orders.filter(o => o.status !== 'served' && o.status !== 'unable_to_serve' && o.status !== 'completed').map(order => (
              <div key={order.id} className={styles.orderItemRow}>
                <div className={styles.itemDetails}>
                  <div className={styles.itemName}>{order.itemName}</div>
                  <div className={styles.itemMeta}>
                    Qty: {order.quantity} × ${order.unitPrice.toFixed(2)}
                  </div>
                  <div className={styles.itemTimestamp}>
                    {formatTime(order.timestamp || order.createdAt)}
                    {order.source === 'admin' && <span className={styles.staffBadge}>Added by staff</span>}
                  </div>
                </div>
                <div className={styles.itemAmount}>
                  ${(order.quantity * order.unitPrice).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          {/* Served Items */}
          {orders.filter(o => o.status === 'served').length > 0 && (
            <div className={styles.servedSection}>
              <h4>✅ Ready to Pick Up</h4>
              <div className={styles.itemsTable}>
                {orders.filter(o => o.status === 'served').map(order => (
                  <div key={order.id} className={`${styles.orderItemRow} ${styles.served}`}>
                    <div className={styles.itemDetails}>
                      <div className={styles.itemName}>{order.itemName}</div>
                      <div className={styles.itemMeta}>
                        Qty: {order.quantity}
                      </div>
                      <div className={styles.itemTimestamp}>
                    {formatTime(order.timestamp || order.createdAt)}
                    {order.source === 'admin' && <span className={styles.staffBadge}>Added by staff</span>}
                  </div>
                    </div>
                    <div className={styles.itemAmount}>
                      ✓
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unable to Serve Items */}
          {orders.filter(o => o.status === 'unable_to_serve').length > 0 && (
            <div className={styles.unavailableSection}>
              <h4>❌ Unable to Serve</h4>
              <div className={styles.itemsTable}>
                {orders.filter(o => o.status === 'unable_to_serve').map(order => (
                  <div key={order.id} className={`${styles.orderItemRow} ${styles.unavailable}`}>
                    <div className={styles.itemDetails}>
                      <div className={styles.itemName}>{order.itemName}</div>
                      <div className={styles.itemMeta}>
                        Qty: {order.quantity}
                      </div>
                      <div className={styles.itemTimestamp}>
                    {formatTime(order.timestamp || order.createdAt)}
                    {order.source === 'admin' && <span className={styles.staffBadge}>Added by staff</span>}
                  </div>
                    </div>
                    <div className={styles.itemAmount}>
                      ✕
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed (checked out) Items */}
          {orders.filter(o => o.status === 'completed').length > 0 && (
            <div className={styles.completedSection}>
              <h4>🧾 Completed</h4>
              <div className={styles.itemsTable}>
                {orders.filter(o => o.status === 'completed').map(order => (
                  <div key={order.id} className={`${styles.orderItemRow} ${styles.completed}`}>
                    <div className={styles.itemDetails}>
                      <div className={styles.itemName}>{order.itemName}</div>
                      <div className={styles.itemMeta}>
                        Qty: {order.quantity} × ${order.unitPrice.toFixed(2)}
                      </div>
                      <div className={styles.itemTimestamp}>
                    {formatTime(order.timestamp || order.createdAt)}
                    {order.source === 'admin' && <span className={styles.staffBadge}>Added by staff</span>}
                  </div>
                    </div>
                    <div className={styles.itemAmount}>
                      ${(order.quantity * order.unitPrice).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Message */}
      {message.text && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      {/* Menu */}
      <div className={styles.menuSection}>
        <h2>Select Items</h2>
        {menuItems.length === 0 ? (
          <div className={styles.empty}>
            No items available at this time
          </div>
        ) : (
          <div className={styles.menuGrid}>
            {menuItems.map(item => (
              <div key={item.id} className={styles.menuCard}>
                {item.photo && (
                  <div className={styles.itemImage}>
                    <img src={item.photo} alt={item.name} />
                  </div>
                )}
                <div className={styles.itemInfo}>
                  <h3>{item.name}</h3>
                  {item.description && (
                    <p className={styles.description}>{item.description}</p>
                  )}
                  <div className={styles.price}>${item.cost.toFixed(2)}</div>
                </div>
                <div className={styles.itemControls}>
                  {customQtyId === item.id ? (
                    <div className={styles.customQtyInput}>
                      <input
                        type="number"
                        min="1"
                        value={customQtyValue}
                        onChange={(e) => setCustomQtyValue(e.target.value)}
                        placeholder="Qty"
                        autoFocus
                      />
                      <button onClick={handleCustomQtySubmit} className={styles.confirmBtn}>
                        OK
                      </button>
                    </div>
                  ) : (
                    <div className={styles.qtySelector}>
                      <select
                        value={selectedQuantities[item.id] || ''}
                        onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                        className={styles.qtySelect}
                      >
                        <option value="">Qty</option>
                        {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                          <option key={num} value={num}>{num}</option>
                        ))}
                        <option value="other">Other</option>
                      </select>
                      <button
                        onClick={() => handleAddToOrder(item)}
                        disabled={!selectedQuantities[item.id]}
                        className={styles.addBtn}
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

      {/* Footer Note */}
      {orders.length > 0 && (
        <div className={styles.footer}>
          <p>📞 Staff will bring your order to the table</p>
          <p>✓ You can continue adding items</p>
        </div>
      )}
    </div>
  )
}
