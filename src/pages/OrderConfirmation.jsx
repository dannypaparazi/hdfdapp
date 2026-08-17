import { useState, useEffect } from 'react'
import { addOrder, getOrders, deleteOrder, getItems, completeOrders } from '../utils/storage'
import styles from './OrderConfirmation.module.css'

export default function OrderConfirmation({ table }) {
  const [menuItems, setMenuItems] = useState([])
  const [orders, setOrders] = useState([])
  const [selectedQuantities, setSelectedQuantities] = useState({})
  const [customQuantityId, setCustomQuantityId] = useState(null)
  const [customQuantityValue, setCustomQuantityValue] = useState('')
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    setMenuItems(getItems())
    setOrders(getOrders(table))
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
      photo: item.photo,
      unitPrice: item.cost,
      timestamp: new Date().toISOString(),
    }, table)

    setSelectedQuantities(prev => {
      const updated = { ...prev }
      delete updated[item.id]
      return updated
    })
    setOrders(getOrders(table))
    setMessage({ type: 'success', text: `${item.name} x${quantity} added to order` })
    setTimeout(() => setMessage({ type: '', text: '' }), 2000)
  }

  const handleQuantityChangeOrder = (orderId, newQuantity) => {
    const order = orders.find(o => o.id === orderId)
    if (order) {
      deleteOrder(orderId)
      addOrder({
        ...order,
        quantity: parseInt(newQuantity),
      }, table)
      setOrders(getOrders(table))
    }
  }

  const handleDeleteOrder = (orderId) => {
    deleteOrder(orderId)
    setOrders(getOrders(table))
  }

  const handleCheckout = () => {
    if (orders.length === 0) {
      setMessage({ type: 'error', text: 'No items to checkout' })
      return
    }
    completeOrders(table)
    setOrders([])
    setMessage({ type: 'success', text: 'Order checked out successfully! Items moved to Order History.' })
    setTimeout(() => setMessage({ type: '', text: '' }), 3000)
  }

  const totalAmount = orders.reduce((sum, order) => sum + (order.unitPrice * order.quantity), 0)

  return (
    <div className={styles.container}>
      {table && (
        <div className={styles.tableHeader}>
          <h3>Table {table}</h3>
        </div>
      )}

      {/* Current Order */}
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
                  <label>Qty:</label>
                  <select
                    value={order.quantity}
                    onChange={(e) => handleQuantityChangeOrder(order.id, e.target.value)}
                    className={styles.quantitySelect}
                  >
                    {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                    <option value="">Other</option>
                  </select>
                </div>
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
