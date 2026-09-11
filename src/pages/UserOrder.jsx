import { useState, useEffect } from 'react'
import { getItems, getItemsFromServer, addOrder, getOrders, getOrdersFromServer, getBannerFromServer } from '../utils/storage'
import { getFormattedTableName } from '../utils/tableCounter'
import { MENU_CATEGORIES } from '../utils/categories'
import styles from './UserOrder.module.css'

const formatTime = (isoString) => {
  if (!isoString) return ''
  return new Date(isoString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

// A customer who rescans a table's QR code after a past session was already
// paid for and closed out must never see that old order resurface as if
// still live -- table sessions live only in each device's own localStorage,
// so there's no reliable id to tell "my order, now checked out" apart from
// "a stranger's order from a past session" except which ids this device has
// actually watched go through a non-completed state. That set has to survive
// a reload -- a customer typically checks their phone again *after* walking
// back from paying, not while staring at the screen -- so it's kept in
// localStorage (keyed per table) rather than in memory, and pruned to a
// generous 24h window so it can't accumulate forever.
const KNOWN_ORDERS_KEY = 'hotpot_known_orders'
const KNOWN_ORDERS_RETENTION_MS = 24 * 60 * 60 * 1000

function readKnownOrderIds(table) {
  try {
    const map = JSON.parse(localStorage.getItem(KNOWN_ORDERS_KEY) || '{}')
    return new Set(map[table] || [])
  } catch (error) {
    console.error('Error reading known orders:', error)
    return new Set()
  }
}

function writeKnownOrderIds(table, ids) {
  try {
    const map = JSON.parse(localStorage.getItem(KNOWN_ORDERS_KEY) || '{}')
    const cutoff = Date.now() - KNOWN_ORDERS_RETENTION_MS
    map[table] = Array.from(ids).filter(id => Number(id) > cutoff)
    localStorage.setItem(KNOWN_ORDERS_KEY, JSON.stringify(map))
  } catch (error) {
    console.error('Error writing known orders:', error)
  }
}

function clearKnownOrderIds(table) {
  try {
    const map = JSON.parse(localStorage.getItem(KNOWN_ORDERS_KEY) || '{}')
    delete map[table]
    localStorage.setItem(KNOWN_ORDERS_KEY, JSON.stringify(map))
  } catch (error) {
    console.error('Error clearing known orders:', error)
  }
}

const fetchOrdersForDisplay = async (table) => {
  const allOrders = await getOrdersFromServer(table)
  const knownIds = readKnownOrderIds(table)
  allOrders.forEach(o => {
    if (o.status !== 'completed') knownIds.add(o.id)
  })
  writeKnownOrderIds(table, knownIds)
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
  const [banner, setBanner] = useState(null)
  const [quickViewItem, setQuickViewItem] = useState(null)
  const [activeCategory, setActiveCategory] = useState('All')
  const [selectedOptions, setSelectedOptions] = useState({})

  useEffect(() => {
    getBannerFromServer().then(setBanner)
  }, [])

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
        const fetchedOrders = await fetchOrdersForDisplay(table)
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

  // Each group's selection carries a quantity too (e.g. "Marinated Beef x3"),
  // defaulting to 1 the moment a choice is first picked so the quantity
  // field has something sensible to show rather than starting blank.
  const handleOptionChoice = (itemId, groupLabel, choice) => {
    setSelectedOptions(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [groupLabel]: { choice, quantity: prev[itemId]?.[groupLabel]?.quantity || 1 },
      },
    }))
  }

  const handleOptionQuantity = (itemId, groupLabel, quantity) => {
    setSelectedOptions(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [groupLabel]: { ...prev[itemId]?.[groupLabel], quantity },
      },
    }))
  }

  const isOptionsComplete = (item) => {
    if (!item.options?.length) return true
    const chosen = selectedOptions[item.id] || {}
    return item.options.every(group => chosen[group.label]?.choice && chosen[group.label]?.quantity > 0)
  }

  const handleAddToOrder = async (item) => {
    const quantity = selectedQuantities[item.id]
    if (!quantity) {
      setMessage({ type: 'error', text: 'Please select a quantity' })
      return
    }
    if (!isOptionsComplete(item)) {
      setMessage({ type: 'error', text: 'Please make a selection for each option' })
      return
    }

    try {
      await addOrder({
        itemName: item.name,
        quantity: quantity,
        description: item.description,
        unitPrice: item.cost,
        selectedOptions: item.options?.length ? selectedOptions[item.id] : null,
        timestamp: new Date().toISOString(),
      }, table)

      setSelectedQuantities(prev => {
        const updated = { ...prev }
        delete updated[item.id]
        return updated
      })
      setSelectedOptions(prev => {
        const updated = { ...prev }
        delete updated[item.id]
        return updated
      })

      // Read back from the server rather than local storage. addOrder saves
      // locally first and syncs to Firebase in the background without
      // throwing on a sync failure (by design, so a flaky connection
      // doesn't block placing the order) -- so trusting the local echo here
      // would show the customer an order that staff can never actually see.
      const updatedOrders = await fetchOrdersForDisplay(table)
      setOrders(updatedOrders)
      setQuickViewItem(null)
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
  const visibleMenuItems = activeCategory === 'All' ? menuItems : menuItems.filter(item => item.category === activeCategory)

  // Shared between the menu grid card and the photo quick-view modal so
  // picking a quantity (including "Other") behaves identically either way.
  const renderQtyControls = (item) => (
    <>
      {item.options?.length > 0 && (
        <div className={styles.optionSelectors}>
          {item.options.map(group => {
            const sel = selectedOptions[item.id]?.[group.label]
            return (
              <div key={group.label} className={styles.optionRow}>
                <select
                  value={sel?.choice || ''}
                  onChange={(e) => handleOptionChoice(item.id, group.label, e.target.value)}
                  className={styles.optionSelect}
                >
                  <option value="">{group.label}</option>
                  {group.choices.map(choice => (
                    <option key={choice} value={choice}>{choice}</option>
                  ))}
                </select>
                {sel?.choice && (
                  <input
                    type="number"
                    min="1"
                    value={sel.quantity}
                    onChange={(e) => handleOptionQuantity(item.id, group.label, parseInt(e.target.value) || '')}
                    className={styles.optionQtyInput}
                    placeholder="Qty"
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
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
            disabled={!selectedQuantities[item.id] || !isOptionsComplete(item)}
            className={styles.addBtn}
          >
            Add
          </button>
        </div>
      )}
    </>
  )

  // Orders placed before per-choice quantities existed stored a plain
  // string per group -- keep displaying those correctly too.
  const formatOrderOptions = (order) => {
    if (!order.selectedOptions) return ''
    return Object.entries(order.selectedOptions).map(([label, sel]) =>
      typeof sel === 'string' ? `${label}: ${sel}` : `${label}: ${sel.choice} x${sel.quantity}`
    ).join(', ')
  }

  return (
    <div className={styles.container}>
      {/* Banner */}
      {banner && (
        <div className={styles.bannerWrap}>
          <img src={banner} alt="" className={styles.banner} />
        </div>
      )}

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
          clearKnownOrderIds(table)
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
          <h3>Current Order</h3>
          <div className={styles.itemsTable}>
            {orders.filter(o => o.status !== 'served' && o.status !== 'unable_to_serve' && o.status !== 'completed').map(order => (
              <div key={order.id} className={styles.orderItemRow}>
                <div className={styles.itemDetails}>
                  <div className={styles.itemName}>{order.itemName}</div>
                  <div className={styles.itemMeta}>
                    Qty: {order.quantity} × ${order.unitPrice.toFixed(2)}
                  </div>
                  {order.selectedOptions && (
                    <div className={styles.itemOptions}>{formatOrderOptions(order)}</div>
                  )}
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
                      {order.selectedOptions && (
                        <div className={styles.itemOptions}>{formatOrderOptions(order)}</div>
                      )}
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
                      {order.selectedOptions && (
                        <div className={styles.itemOptions}>{formatOrderOptions(order)}</div>
                      )}
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
                      {order.selectedOptions && (
                        <div className={styles.itemOptions}>{formatOrderOptions(order)}</div>
                      )}
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
        {menuItems.length > 0 && (
          <div className={styles.categoryTabs}>
            <button
              className={`${styles.categoryTab} ${styles.categoryTabFeatured} ${activeCategory === 'Set Meal' ? styles.active : ''}`}
              onClick={() => setActiveCategory('Set Meal')}
            >
              Set Meal
            </button>
            <button
              className={`${styles.categoryTab} ${activeCategory === 'All' ? styles.active : ''}`}
              onClick={() => setActiveCategory('All')}
            >
              All
            </button>
            {MENU_CATEGORIES.filter(category => category !== 'Set Meal').map(category => (
              <button
                key={category}
                className={`${styles.categoryTab} ${activeCategory === category ? styles.active : ''}`}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        )}
        {visibleMenuItems.length === 0 ? (
          <div className={styles.empty}>
            {menuItems.length === 0 ? 'No items available at this time' : `No items in "${activeCategory}" yet`}
          </div>
        ) : (
          <div className={styles.menuGrid}>
            {visibleMenuItems.map(item => (
              <div key={item.id} className={styles.menuCard}>
                {item.photo && (
                  <button
                    type="button"
                    className={styles.itemImage}
                    onClick={() => setQuickViewItem(item)}
                    aria-label={`View ${item.name} and choose a quantity`}
                  >
                    <img src={item.photo} alt={item.name} />
                  </button>
                )}
                <div className={styles.itemInfo}>
                  <h3>{item.name}</h3>
                  {item.description && (
                    <p className={styles.description}>{item.description}</p>
                  )}
                  <div className={styles.price}>${item.cost.toFixed(2)}</div>
                </div>
                <div className={styles.itemControls}>
                  {renderQtyControls(item)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Photo Quick View */}
      {quickViewItem && (
        <div className={styles.modalOverlay} onClick={() => setQuickViewItem(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.modalClose}
              onClick={() => setQuickViewItem(null)}
              aria-label="Close"
            >
              ×
            </button>
            {quickViewItem.photo && (
              <div className={styles.modalImageWrap}>
                <img src={quickViewItem.photo} alt={quickViewItem.name} className={styles.modalImage} />
              </div>
            )}
            <div className={styles.modalInfo}>
              <h3>{quickViewItem.name}</h3>
              {quickViewItem.description && (
                <p className={styles.description}>{quickViewItem.description}</p>
              )}
              <div className={styles.price}>${quickViewItem.cost.toFixed(2)}</div>
              <div className={styles.itemControls}>
                {renderQtyControls(quickViewItem)}
              </div>
            </div>
          </div>
        </div>
      )}

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
