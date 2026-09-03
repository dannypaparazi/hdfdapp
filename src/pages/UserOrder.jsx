import { useState, useEffect } from 'react'
import { getItems, getItemsFromServer, addOrder, getOrders, getOrdersFromServer } from '../utils/storage'
import { getFormattedTableName } from '../utils/tableCounter'
import styles from './UserOrder.module.css'

export default function UserOrder({ table, onLogout }) {
  const [menuItems, setMenuItems] = useState([])
  const [orders, setOrders] = useState([])
  const [selectedQuantities, setSelectedQuantities] = useState({})
  const [message, setMessage] = useState({ type: '', text: '' })
  const [servedNotifications, setServedNotifications] = useState(new Set())
  const [customQtyId, setCustomQtyId] = useState(null)
  const [customQtyValue, setCustomQtyValue] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const items = await getItemsFromServer()
        setMenuItems(items)
      } catch (error) {
        console.error('Failed to fetch menu from server:', error)
        setMenuItems(getItems())
      }

      try {
        const fetchedOrders = await getOrdersFromServer(table)

        // Check for status changes and show notifications
        fetchedOrders.forEach(order => {
          if (order.status === 'served' && !servedNotifications.has(order.id)) {
            setMessage({ type: 'success', text: `✅ ${order.itemName} is ready!` })
            setServedNotifications(prev => new Set(prev).add(order.id))
            setTimeout(() => setMessage({ type: '', text: '' }), 4000)
          } else if (order.status === 'unable_to_serve' && !servedNotifications.has(order.id)) {
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

  const handleAddToOrder = (item) => {
    const quantity = selectedQuantities[item.id]
    if (!quantity) {
      setMessage({ type: 'error', text: 'Please select a quantity' })
      return
    }

    addOrder({
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

    setOrders(getOrders(table))
    setMessage({ type: 'success', text: `${item.name} x${quantity} added!` })
    setTimeout(() => setMessage({ type: '', text: '' }), 2000)
  }

  const totalAmount = orders.reduce((sum, order) => sum + (order.unitPrice * order.quantity), 0)

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
            {orders.length} item{orders.length !== 1 ? 's' : ''} in order
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
            {orders.filter(o => o.status !== 'served').map(order => (
              <div key={order.id} className={`${styles.orderItemRow} ${order.status === 'unable_to_serve' ? styles.unavailable : ''}`}>
                <div className={styles.itemDetails}>
                  <div className={styles.itemName}>{order.itemName}</div>
                  <div className={styles.itemMeta}>
                    Qty: {order.quantity} × ${order.unitPrice.toFixed(2)}
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
                    </div>
                    <div className={styles.itemAmount}>
                      ✓
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
