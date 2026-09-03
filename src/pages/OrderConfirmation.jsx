import { useState, useEffect } from 'react'
import { addOrder, getOrders, deleteOrder, getItems, completeOrders, getOrdersFromServer, getItemsFromServer } from '../utils/storage'
import { getFormattedTableName, incrementTableCounter } from '../utils/tableCounter'
import styles from './OrderConfirmation.module.css'

export default function OrderConfirmation({ table }) {
  const [menuItems, setMenuItems] = useState([])
  const [orders, setOrders] = useState([])
  const [servedItems, setServedItems] = useState(new Set())
  const [selectedQuantities, setSelectedQuantities] = useState({})
  const [customQuantityId, setCustomQuantityId] = useState(null)
  const [customQuantityValue, setCustomQuantityValue] = useState('')
  const [message, setMessage] = useState({ type: '', text: '' })

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
        const orders = await getOrdersFromServer(table)
        setOrders(orders)
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

      const updatedOrders = await getOrdersFromServer(table)
      console.log('🟡 FETCHING ORDERS - Table:', table, 'Found:', updatedOrders.length, 'orders')

      setOrders(updatedOrders)
      console.log('🟣 STATE SET - Orders length:', updatedOrders.length)

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
        const updatedOrders = await getOrdersFromServer(table)
        setOrders(updatedOrders)
      }
    } catch (error) {
      console.error('Error updating order quantity:', error)
      setMessage({ type: 'error', text: 'Failed to update order' })
    }
  }

  const handleDeleteOrder = async (orderId) => {
    try {
      await deleteOrder(orderId)
      const updatedOrders = await getOrdersFromServer(table)
      setOrders(updatedOrders)
      setServedItems(prev => {
        const updated = new Set(prev)
        updated.delete(orderId)
        return updated
      })
    } catch (error) {
      console.error('Error deleting order:', error)
      setMessage({ type: 'error', text: 'Failed to delete order' })
    }
  }

  const handleMarkServed = (orderId) => {
    setServedItems(prev => {
      const updated = new Set(prev)
      if (updated.has(orderId)) {
        updated.delete(orderId)
      } else {
        updated.add(orderId)
      }
      return updated
    })
  }

  const handleCheckout = () => {
    if (orders.length === 0) {
      setMessage({ type: 'error', text: 'No items to checkout' })
      return
    }
    completeOrders(table)
    incrementTableCounter(table)
    setOrders([])
    setMessage({ type: 'success', text: 'Order checked out successfully! Items moved to Order History.' })
    setTimeout(() => setMessage({ type: '', text: '' }), 3000)
  }

  const currentOrderItems = orders.filter(order => !servedItems.has(order.id))
  const servedOrderItems = orders.filter(order => servedItems.has(order.id))
  const totalAmount = orders.reduce((sum, order) => sum + (order.unitPrice * order.quantity), 0)

  return (
    <div className={styles.container}>
      {table && (
        <div className={styles.tableHeader}>
          <h3>Table {getFormattedTableName(table)}</h3>
        </div>
      )}

      {/* Current Order */}
      {orders.length > 0 && (
        <div className={styles.ordersSection}>
          <h2>Current Order</h2>
          <div className={styles.ordersList}>
            {orders.filter(order => !servedItems.has(order.id)).map(order => (
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
                  onClick={() => handleMarkServed(order.id)}
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
          <div className={styles.totalSection}>
            <h3>Order Total</h3>
            <p className={styles.totalAmount}>${totalAmount.toFixed(2)}</p>
            <button className={styles.checkoutBtn} onClick={handleCheckout}>
              Checkout
            </button>
          </div>
        </div>
      )}

      {/* Served Items */}
      {servedOrderItems.length > 0 && (
        <div className={styles.servedSection}>
          <h2>Served Items</h2>
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
                </div>
                <button
                  className={styles.servedBtn}
                  onClick={() => handleMarkServed(order.id)}
                  title="Mark as not served"
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
