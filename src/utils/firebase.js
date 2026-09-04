import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, addDoc, setDoc, deleteDoc, doc, query, where, updateDoc } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyBGkvrIQ57msMQGz2Bfm7ENhC8An65Zjcc",
  authDomain: "hotpot-di-focolare.firebaseapp.com",
  projectId: "hotpot-di-focolare",
  storageBucket: "hotpot-di-focolare.firebasestorage.app",
  messagingSenderId: "729630436485",
  appId: "1:729630436485:web:3263d934218ad399870dec",
  measurementId: "G-KFNMPQLGQR"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)

// Collections
const ITEMS_COLLECTION = 'hotpot_items'
const ORDERS_COLLECTION = 'hotpot_orders'

// Menu Items
export async function getItemsFromFirebase() {
  try {
    const q = query(collection(db, ITEMS_COLLECTION))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error fetching items from Firebase:', error)
    return []
  }
}

export async function addItemToFirebase(itemData) {
  try {
    const docRef = await addDoc(collection(db, ITEMS_COLLECTION), {
      ...itemData,
      createdAt: new Date().toISOString()
    })
    return docRef.id
  } catch (error) {
    console.error('Error adding item to Firebase:', error)
    throw error
  }
}

export async function deleteItemFromFirebase(itemId) {
  try {
    await deleteDoc(doc(db, ITEMS_COLLECTION, itemId))
  } catch (error) {
    console.error('Error deleting item from Firebase:', error)
    throw error
  }
}

// Orders
export async function getOrdersFromFirebase() {
  try {
    const q = query(collection(db, ORDERS_COLLECTION))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error fetching orders from Firebase:', error)
    return []
  }
}

export async function addOrderToFirebase(orderData) {
  try {
    // Use setDoc with the order's own id so later updateDoc/deleteDoc calls
    // (which address documents by this same id) can actually find it.
    // addDoc would instead generate its own random document id, orphaning
    // every subsequent status update or delete.
    const orderRef = doc(db, ORDERS_COLLECTION, orderData.id)
    await setDoc(orderRef, {
      ...orderData,
      createdAt: new Date().toISOString()
    })
    return orderData.id
  } catch (error) {
    console.error('Error adding order to Firebase:', error)
    throw error
  }
}

export async function deleteOrderFromFirebase(orderId) {
  try {
    await deleteDoc(doc(db, ORDERS_COLLECTION, orderId))
  } catch (error) {
    console.error('Error deleting order from Firebase:', error)
    throw error
  }
}

export async function updateOrderStatusInFirebase(orderId, status) {
  try {
    console.log('🔥 FIREBASE: updateDoc called - orderId:', orderId, '| New status:', status)
    const orderRef = doc(db, ORDERS_COLLECTION, orderId)
    await updateDoc(orderRef, {
      status: status,
      statusUpdatedAt: new Date().toISOString()
    })
    console.log('🔥 FIREBASE: updateDoc successful ✓')
  } catch (error) {
    console.error('🔴 FIREBASE: Error updating order status:', error)
    throw error
  }
}
