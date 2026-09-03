import { addArchivedOrder, getArchivedOrders, clearArchivedOrders, getArchiveStats } from './indexeddb'
import { getFormattedTableName } from './tableCounter'
import { getItemsFromFirebase, addItemToFirebase, deleteItemFromFirebase } from './firebase'

const ORDERS_KEY = 'hotpot_orders'
const ITEMS_KEY = 'hotpot_items'

// Storage optimization utilities
export function getStorageUsage() {
  try {
    let total = 0
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length
      }
    }
    return {
      used: Math.round(total / 1024), // KB
      percent: Math.round((total / (5 * 1024 * 1024)) * 100), // Assuming 5MB limit
      details: {
        orders: localStorage.getItem(ORDERS_KEY)?.length || 0,
        items: localStorage.getItem(ITEMS_KEY)?.length || 0,
      }
    }
  } catch (error) {
    console.error('Error calculating storage:', error)
    return { used: 0, percent: 0, details: {} }
  }
}

export async function archiveOldOrders(daysOld = 30) {
  try {
    console.log('📋 Getting orders from localStorage...')
    const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]')
    console.log(`📋 Found ${orders.length} total orders`)

    const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000)

    const recent = orders.filter(o => new Date(o.timestamp) > cutoff)
    const old = orders.filter(o => new Date(o.timestamp) <= cutoff)

    console.log(`📦 Moving ${old.length} orders to IndexedDB...`)

    // Move old orders to IndexedDB
    for (const order of old) {
      const result = await addArchivedOrder(order)
      if (!result) {
        throw new Error(`Failed to archive order ${order.id}`)
      }
    }

    // Keep only recent in localStorage
    localStorage.setItem(ORDERS_KEY, JSON.stringify(recent))

    console.log(`✅ Archived ${old.length} orders older than ${daysOld} days to IndexedDB`)
    return { archived: old.length, remaining: recent.length }
  } catch (error) {
    console.error('❌ Error archiving orders:', error)
    throw error
  }
}

export function compressImage(base64String, maxWidth = 300, quality = 0.6) {
  return new Promise((resolve) => {
    try {
      const img = new Image()
      img.src = base64String
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = () => resolve(base64String)
    } catch (error) {
      console.error('Error compressing image:', error)
      resolve(base64String)
    }
  })
}

// Orders functions
export function getOrders(table, includeCompleted = false) {
  try {
    const orders = localStorage.getItem(ORDERS_KEY)
    const allOrders = orders ? JSON.parse(orders) : []
    let filtered = allOrders

    console.log('📋 GET_ORDERS - Raw count:', allOrders.length, 'Table filter:', table, 'IncludeCompleted:', includeCompleted)

    if (table !== undefined) {
      filtered = allOrders.filter(order => order.table === table)
      console.log('📋 GET_ORDERS - After table filter:', filtered.length)
    }

    if (!includeCompleted) {
      filtered = filtered.filter(order => order.status !== 'completed')
      console.log('📋 GET_ORDERS - After status filter:', filtered.length)
    }

    console.log('📋 GET_ORDERS - Final result:', filtered)
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
      tableSession: getFormattedTableName(table),
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

// Items functions (Firebase-backed menu management)
let itemsCache = null
let cacheTimestamp = 0
const CACHE_DURATION = 5000 // 5 seconds

export function getItems() {
  try {
    // Return cached items if fresh
    if (itemsCache && Date.now() - cacheTimestamp < CACHE_DURATION) {
      return itemsCache
    }
    // Fallback to localStorage if cache is stale (while fetching from Firebase)
    const items = localStorage.getItem(ITEMS_KEY)
    return items ? JSON.parse(items) : []
  } catch (error) {
    console.error('Error reading items:', error)
    return []
  }
}

export async function getItemsFromServer() {
  try {
    const items = await getItemsFromFirebase()
    itemsCache = items
    cacheTimestamp = Date.now()
    // Update localStorage backup
    localStorage.setItem(ITEMS_KEY, JSON.stringify(items))
    return items
  } catch (error) {
    console.error('Error fetching items from server:', error)
    // Fallback to cached items
    return getItems()
  }
}

export async function addItem(item) {
  try {
    const newItem = {
      ...item,
      createdAt: new Date().toISOString(),
    }
    const id = await addItemToFirebase(newItem)
    const completeItem = { id, ...newItem }

    // Update cache
    itemsCache = itemsCache ? [...itemsCache, completeItem] : [completeItem]
    cacheTimestamp = Date.now()
    localStorage.setItem(ITEMS_KEY, JSON.stringify(itemsCache))

    return completeItem
  } catch (error) {
    console.error('Error adding item:', error)
    throw error
  }
}

export async function deleteItem(id) {
  try {
    await deleteItemFromFirebase(id)

    // Update cache
    if (itemsCache) {
      itemsCache = itemsCache.filter(item => item.id !== id)
      cacheTimestamp = Date.now()
      localStorage.setItem(ITEMS_KEY, JSON.stringify(itemsCache))
    }
  } catch (error) {
    console.error('Error deleting item:', error)
    throw error
  }
}

// Initialize cache on load
getItemsFromServer().catch(error => {
  console.log('Initial Firebase sync failed, using localStorage:', error)
})

export function cleanupCompletedOrders() {
  try {
    const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]')
    const RETENTION_DAYS = 7
    const now = new Date()
    const cutoffDate = new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000)

    const filtered = orders.filter(order => {
      if (order.status !== 'completed') return true
      const orderDate = new Date(order.timestamp)
      return orderDate > cutoffDate
    })

    localStorage.setItem(ORDERS_KEY, JSON.stringify(filtered))
    return orders.length - filtered.length
  } catch (error) {
    console.error('Error cleaning up orders:', error)
    return 0
  }
}
