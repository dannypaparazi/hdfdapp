import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, query, where, updateDoc, setDoc } from 'firebase/firestore'

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
export async function getOrdersFromFirebase(table = null) {
  try {
    let q
    if (table !== null && table !== undefined) {
      q = query(collection(db, ORDERS_COLLECTION), where('table', '==', table))
    } else {
      q = query(collection(db, ORDERS_COLLECTION))
    }
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
    const docRef = await addDoc(collection(db, ORDERS_COLLECTION), {
      ...orderData,
      createdAt: new Date().toISOString()
    })
    return docRef.id
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
    const orderRef = doc(db, ORDERS_COLLECTION, orderId)
    await setDoc(orderRef, {
      status: status,
      statusUpdatedAt: new Date().toISOString()
    }, { merge: true })
  } catch (error) {
    console.error('Error updating order status in Firebase:', error)
    throw error
  }
}
