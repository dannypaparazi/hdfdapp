const DB_NAME = 'HotpotDiFocolare'
const DB_VERSION = 1
const STORES = {
  ORDERS: 'archivedOrders',
  ITEMS: 'archivedItems'
}

let db = null

async function initDB() {
  if (db) return db

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      console.error('IndexedDB open error:', request.error)
      reject(request.error)
    }

    request.onsuccess = () => {
      db = request.result
      console.log('✅ IndexedDB initialized')
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = event.target.result

      if (!database.objectStoreNames.contains(STORES.ORDERS)) {
        const orderStore = database.createObjectStore(STORES.ORDERS, { keyPath: 'id' })
        orderStore.createIndex('table', 'table', { unique: false })
        orderStore.createIndex('timestamp', 'timestamp', { unique: false })
        console.log('✅ Created orders store')
      }

      if (!database.objectStoreNames.contains(STORES.ITEMS)) {
        database.createObjectStore(STORES.ITEMS, { keyPath: 'id' })
        console.log('✅ Created items store')
      }
    }
  })
}

export async function addArchivedOrder(order) {
  try {
    const database = await initDB()
    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORES.ORDERS, 'readwrite')
      const store = tx.objectStore(STORES.ORDERS)
      const request = store.add(order)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(order)
    })
  } catch (error) {
    console.error('Error adding archived order:', error)
    return null
  }
}

export async function getArchivedOrders(table = null) {
  try {
    const database = await initDB()
    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORES.ORDERS, 'readonly')
      const store = tx.objectStore(STORES.ORDERS)

      let request
      if (table !== null) {
        const index = store.index('table')
        request = index.getAll(table)
      } else {
        request = store.getAll()
      }

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        console.log(`📦 Retrieved ${request.result.length} archived orders`)
        resolve(request.result)
      }
    })
  } catch (error) {
    console.error('Error getting archived orders:', error)
    return []
  }
}

export async function deleteArchivedOrder(id) {
  try {
    const database = await initDB()
    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORES.ORDERS, 'readwrite')
      const store = tx.objectStore(STORES.ORDERS)
      const request = store.delete(id)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(true)
    })
  } catch (error) {
    console.error('Error deleting archived order:', error)
    return false
  }
}

export async function clearArchivedOrders() {
  try {
    const database = await initDB()
    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORES.ORDERS, 'readwrite')
      const store = tx.objectStore(STORES.ORDERS)
      const request = store.clear()
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        console.log('🗑️ Cleared all archived orders')
        resolve(true)
      }
    })
  } catch (error) {
    console.error('Error clearing archived orders:', error)
    return false
  }
}

export async function getArchiveStats() {
  try {
    const database = await initDB()
    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORES.ORDERS, 'readonly')
      const store = tx.objectStore(STORES.ORDERS)
      const request = store.count()
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        resolve({ count: request.result })
      }
    })
  } catch (error) {
    console.error('Error getting archive stats:', error)
    return { count: 0 }
  }
}

export async function moveOrderToArchive(order) {
  try {
    await addArchivedOrder(order)
    console.log(`📦 Moved order ${order.id} to archive`)
    return true
  } catch (error) {
    console.error('Error moving order to archive:', error)
    return false
  }
}
