import { useState, useEffect, useRef } from 'react'
import { addOrder, getOrders, deleteOrder, getItems, getOrdersFromServer, getItemsFromServer, updateOrderStatus } from '../utils/storage'
import { getFormattedTableName, incrementTableCounter } from '../utils/tableCounter'
import { MENU_CATEGORIES } from '../utils/categories'
import styles from './OrderConfirmation.module.css'

const formatTime = (isoString) => {
  if (!isoString) return ''
  return new Date(isoString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export default function OrderConfirmation({ table, canWrite = true }) {
  const [menuItems, setMenuItems] = useState([])
  const [orders, setOrders] = useState([])
  const [selectedQuantities, setSelectedQuantities] = useState({})
  const [customQuantityId, setCustomQuantityId] = useState(null)
  const [customQuantityValue, setCustomQuantityValue] = useState('')
  const [selectedOptions, setSelectedOptions] = useState({})
  const [confirmedGroups, setConfirmedGroups] = useState({})
  const [optionDrafts, setOptionDrafts] = useState({})
  const [activeCategory, setActiveCategory] = useState('All')
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

  // A group's selection is a list of {choice, quantity} entries (e.g.
  // "Beef x2, Pork x2") rather than a single pick, since a group's max qty
  // (e.g. 4 for Choice of Meat) can be filled by several different choices.
  // optionDrafts holds the in-progress pick for a group before it's added to
  // that list, mirroring the pattern selectedQuantities/customQuantityValue
  // already use elsewhere for "value being typed but not yet committed".
  const groupEntries = (itemId, groupLabel) => selectedOptions[itemId]?.[groupLabel] || []
  const groupUsedQty = (itemId, groupLabel) => groupEntries(itemId, groupLabel).reduce((sum, e) => sum + e.quantity, 0)

  const setOptionDraftChoice = (itemId, groupLabel, choice) => {
    setOptionDrafts(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], [groupLabel]: { choice, quantity: 1 } },
    }))
  }

  const setOptionDraftQuantity = (itemId, groupLabel, quantity, remaining) => {
    const capped = quantity && remaining ? Math.min(quantity, remaining) : quantity
    setOptionDrafts(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], [groupLabel]: { ...prev[itemId]?.[groupLabel], quantity: capped } },
    }))
  }

  // Adding an entry that repeats an already-picked choice merges into it
  // (bumping its quantity) instead of creating a duplicate line -- needed
  // since a group can have fewer distinct choices than its max qty (e.g. 3
  // meats but "up to 4"), so the only way to reach 4 is picking one twice.
  // Once the group's quota is filled, it confirms itself automatically
  // rather than waiting for a separate click.
  const addOptionEntry = (itemId, groupLabel, groupMax) => {
    const draft = optionDrafts[itemId]?.[groupLabel]
    if (!draft?.choice || !draft.quantity) return

    const existing = groupEntries(itemId, groupLabel)
    const existingIndex = existing.findIndex(e => e.choice === draft.choice)
    const updated = existingIndex >= 0
      ? existing.map((e, i) => i === existingIndex ? { ...e, quantity: e.quantity + draft.quantity } : e)
      : [...existing, draft]
    const total = updated.reduce((sum, e) => sum + e.quantity, 0)

    setSelectedOptions(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], [groupLabel]: updated },
    }))
    setOptionDrafts(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], [groupLabel]: null },
    }))

    if (total >= groupMax) {
      confirmGroup(itemId, groupLabel)
    }
  }

  const removeOptionEntry = (itemId, groupLabel, entryIndex) => {
    setSelectedOptions(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [groupLabel]: groupEntries(itemId, groupLabel).filter((_, i) => i !== entryIndex),
      },
    }))
  }

  // Groups are confirmed one at a time, in the order the item defines them,
  // so the next group's selector only appears once the one before it has
  // been locked in -- rather than showing every selector at once.
  const confirmGroup = (itemId, groupLabel) => {
    setConfirmedGroups(prev => ({
      ...prev,
      [itemId]: [...(prev[itemId] || []), groupLabel],
    }))
  }

  const changeGroup = (itemId, fromIndex) => {
    setConfirmedGroups(prev => ({
      ...prev,
      [itemId]: (prev[itemId] || []).slice(0, fromIndex),
    }))
  }

  const isOptionsComplete = (item) => {
    if (!item.options?.length) return true
    const confirmed = confirmedGroups[item.id] || []
    return item.options.every(group => confirmed.includes(group.label))
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
        selectedOptions: item.options?.length ? selectedOptions[item.id] : null,
        timestamp: new Date().toISOString(),
        source: 'admin',
      }, table)

      console.log('🟢 ORDER ADDED')

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
      setConfirmedGroups(prev => {
        const updated = { ...prev }
        delete updated[item.id]
        return updated
      })
      setOptionDrafts(prev => {
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

  // Current Order -> served / partially served / unable to serve. Asks how
  // much of the ordered quantity can actually be served: the full amount
  // just serves normally, zero is the old full-reject behavior, and
  // anything in between splits the single order into two separate order
  // documents (one 'served' for what's available, one 'unable_to_serve' for
  // the shortfall) rather than trying to represent a split within one
  // order. UserOrder.jsx already keys its served/unable-to-serve sections
  // and customer notifications off status per order id, so two fresh ids
  // showing up in those statuses is all it needs to display and notify
  // correctly -- no separate customer-side handling required for the split.
  const handlePartialServe = async (order) => {
    const input = window.prompt(
      `"${order.itemName}" — customer ordered ${order.quantity}. How many can you serve?`,
      String(order.quantity)
    )
    if (input === null) return

    const servable = parseInt(input)
    if (isNaN(servable) || servable < 0) {
      setMessage({ type: 'error', text: 'Please enter a valid quantity' })
      return
    }

    try {
      if (servable >= order.quantity) {
        await updateOrderStatus(order.id, 'served')
        await refreshOrders()
        setMessage({ type: 'success', text: `"${order.itemName}" marked served` })
        setTimeout(() => setMessage({ type: '', text: '' }), 3000)
        return
      }

      if (servable === 0) {
        await updateOrderStatus(order.id, 'unable_to_serve')
        await refreshOrders()
        setMessage({ type: 'success', text: `"${order.itemName}" marked unable to serve — customer notified` })
        setTimeout(() => setMessage({ type: '', text: '' }), 3000)
        return
      }

      const shortfall = order.quantity - servable
      await deleteOrder(order.id)

      const servedOrder = await addOrder({ ...order, quantity: servable }, table)
      await updateOrderStatus(servedOrder.id, 'served')

      const shortOrder = await addOrder({ ...order, quantity: shortfall }, table)
      await updateOrderStatus(shortOrder.id, 'unable_to_serve')

      await refreshOrders()
      setMessage({ type: 'success', text: `${servable} served, ${shortfall} unable to serve — customer notified` })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (error) {
      console.error('🔴 ADMIN: Error updating served quantity:', error)
      setMessage({ type: 'error', text: 'Failed to update order' })
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

  // Orders placed before multi-entry groups existed stored either a plain
  // string or a single {choice, quantity} per group -- keep displaying
  // those correctly alongside the current array-of-entries format.
  const formatOrderOptions = (order) => {
    if (!order.selectedOptions) return ''
    return Object.entries(order.selectedOptions).map(([label, sel]) => {
      if (typeof sel === 'string') return `${label}: ${sel}`
      if (Array.isArray(sel)) return `${label}: ${sel.map(e => `${e.choice} x${e.quantity}`).join(', ')}`
      return `${label}: ${sel.choice} x${sel.quantity}`
    }).join(', ')
  }

  const currentOrderItems = orders.filter(order => !order.status || order.status === 'pending')
  const servedOrderItems = orders.filter(order => order.status === 'served')
  const totalAmount = currentOrderItems.reduce((sum, order) => sum + (order.unitPrice * order.quantity), 0)
  const servedTotal = servedOrderItems.reduce((sum, order) => sum + (order.unitPrice * order.quantity), 0)
  const visibleMenuItems = activeCategory === 'All' ? menuItems : menuItems.filter(item => item.category === activeCategory)

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
                  {order.selectedOptions && (
                    <div className={styles.itemOptions}>{formatOrderOptions(order)}</div>
                  )}
                  {order.unitPrice > 0 && (
                    <div className={styles.itemPrice}>
                      ${order.unitPrice.toFixed(2)} x {order.quantity} = ${(order.unitPrice * order.quantity).toFixed(2)}
                    </div>
                  )}
                  <div className={styles.itemTimestamp}>{formatTime(order.timestamp || order.createdAt)}</div>
                </div>
                {canWrite && (
                  <>
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
                      onClick={() => handlePartialServe(order)}
                      title="Enter how much can be served"
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
                  </>
                )}
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
                  {order.selectedOptions && (
                    <div className={styles.itemOptions}>{formatOrderOptions(order)}</div>
                  )}
                  {order.unitPrice > 0 && (
                    <div className={styles.itemPrice}>
                      ${order.unitPrice.toFixed(2)} x {order.quantity} = ${(order.unitPrice * order.quantity).toFixed(2)}
                    </div>
                  )}
                  <div className={styles.itemTimestamp}>{formatTime(order.timestamp || order.createdAt)}</div>
                </div>
                {canWrite && (
                  <>
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
                  </>
                )}
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
          {canWrite && (
            <button className={styles.checkoutBtn} onClick={handleCheckout}>
              Checkout
            </button>
          )}
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
            {menuItems.length === 0 ? 'No menu items available. Admin needs to create menu items first.' : `No items in "${activeCategory}" yet.`}
          </div>
        ) : (
          <div className={styles.menuList}>
            {visibleMenuItems.map(item => (
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
                  {canWrite && item.options?.length > 0 && (
                    <div className={styles.lineOptionSelectors}>
                      {item.options.map((group, index) => {
                        const confirmed = confirmedGroups[item.id] || []
                        const isConfirmed = confirmed.includes(group.label)
                        const isActive = confirmed.length === index
                        if (!isConfirmed && !isActive) return null

                        const entries = groupEntries(item.id, group.label)
                        const max = group.max || 1

                        if (isConfirmed) {
                          return (
                            <div key={group.label} className={styles.lineOptionConfirmed}>
                              <span>{group.label}: {entries.map(e => `${e.choice} x${e.quantity}`).join(', ')}</span>
                              <button
                                type="button"
                                onClick={() => changeGroup(item.id, index)}
                                className={styles.optionChangeBtn}
                              >
                                Change
                              </button>
                            </div>
                          )
                        }

                        const usedQty = groupUsedQty(item.id, group.label)
                        const remaining = max - usedQty
                        const draft = optionDrafts[item.id]?.[group.label]

                        return (
                          <div key={group.label} className={styles.lineOptionActiveGroup}>
                            {entries.length > 0 && (
                              <div className={styles.lineOptionEntriesList}>
                                {entries.map((entry, entryIndex) => (
                                  <div key={entryIndex} className={styles.lineOptionEntryChip}>
                                    <span>{entry.choice} x{entry.quantity}</span>
                                    <button
                                      type="button"
                                      onClick={() => removeOptionEntry(item.id, group.label, entryIndex)}
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            {remaining > 0 && (
                              <div className={styles.lineOptionRow}>
                                <select
                                  value={draft?.choice || ''}
                                  onChange={(e) => setOptionDraftChoice(item.id, group.label, e.target.value)}
                                  className={styles.lineQuantitySelect}
                                >
                                  <option value="">{group.label} ({usedQty}/{max})</option>
                                  {group.choices.map(choice => (
                                    <option key={choice} value={choice}>{choice}</option>
                                  ))}
                                </select>
                                {draft?.choice && (
                                  <>
                                    <input
                                      type="number"
                                      min="1"
                                      max={remaining}
                                      value={draft.quantity}
                                      onChange={(e) => setOptionDraftQuantity(item.id, group.label, parseInt(e.target.value) || '', remaining)}
                                      className={styles.lineOptionQtyInput}
                                      placeholder="Qty"
                                    />
                                    <button
                                      type="button"
                                      disabled={!draft.quantity || draft.quantity < 1}
                                      onClick={() => addOptionEntry(item.id, group.label, max)}
                                      className={styles.optionConfirmBtn}
                                    >
                                      Add
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {!canWrite || !isOptionsComplete(item) ? null : customQuantityId === item.id ? (
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
                        disabled={!selectedQuantities[item.id] || !isOptionsComplete(item)}
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
