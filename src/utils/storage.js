const ORDERS_KEY = 'hotpot_orders'
const ITEMS_KEY = 'hotpot_items'

// Orders functions
export function getOrders(table, includeCompleted = false) {
  try {
    const orders = localStorage.getItem(ORDERS_KEY)
    const allOrders = orders ? JSON.parse(orders) : []
    let filtered = allOrders

    if (table !== undefined) {
      filtered = allOrders.filter(order => order.table === table)
    }

    if (!includeCompleted) {
      filtered = filtered.filter(order => order.status !== 'completed')
    }

    return filtered
  } catch (error) {
    console.error('Error reading orders:', error)
    return []
  }
}

export function addOrder(order, table) {
  try {
    const orders = getOrders(undefined, true)
    const newOrder = {
      ...order,
      table: table,
      id: Date.now().toString(),
    }
    orders.push(newOrder)
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders))
    return newOrder
  } catch (error) {
    console.error('Error adding order:', error)
    return null
  }
}

export function deleteOrder(id) {
  try {
    const orders = getOrders(undefined, true)
    const filtered = orders.filter(order => order.id !== id)
    localStorage.setItem(ORDERS_KEY, JSON.stringify(filtered))
  } catch (error) {
    console.error('Error deleting order:', error)
  }
}

export function clearAllOrders() {
  try {
    localStorage.setItem(ORDERS_KEY, JSON.stringify([]))
  } catch (error) {
    console.error('Error clearing orders:', error)
  }
}

export function completeOrders(table) {
  try {
    const orders = getOrders(undefined, true)
    const updated = orders.map(order =>
      order.table === table ? { ...order, status: 'completed' } : order
    )
    localStorage.setItem(ORDERS_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error('Error completing orders:', error)
  }
}

// Items functions (for admin menu management)
export function getItems() {
  try {
    const items = localStorage.getItem(ITEMS_KEY)
    return items ? JSON.parse(items) : []
  } catch (error) {
    console.error('Error reading items:', error)
    return []
  }
}

export function addItem(item) {
  try {
    const items = getItems()
    const newItem = {
      ...item,
      id: Date.now().toString(),
    }
    items.push(newItem)
    localStorage.setItem(ITEMS_KEY, JSON.stringify(items))
    return newItem
  } catch (error) {
    console.error('Error adding item:', error)
    return null
  }
}

export function deleteItem(id) {
  try {
    const items = getItems()
    const filtered = items.filter(item => item.id !== id)
    localStorage.setItem(ITEMS_KEY, JSON.stringify(filtered))
  } catch (error) {
    console.error('Error deleting item:', error)
  }
}
