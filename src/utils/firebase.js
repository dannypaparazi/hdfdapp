import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, getDoc, addDoc, setDoc, deleteDoc, doc, query, where, updateDoc } from 'firebase/firestore'

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
const USERS_COLLECTION = 'hotpot_users'
const SETTINGS_COLLECTION = 'hotpot_settings'
const BANNER_DOC_ID = 'banner'

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

export async function updateItemInFirebase(itemId, itemData) {
  try {
    await updateDoc(doc(db, ITEMS_COLLECTION, itemId), itemData)
  } catch (error) {
    console.error('Error updating item in Firebase:', error)
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

// Admin accounts
export async function getUsersFromFirebase() {
  try {
    const q = query(collection(db, USERS_COLLECTION))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error fetching users from Firebase:', error)
    return []
  }
}

export async function addUserToFirebase(userData) {
  try {
    // Use setDoc with the user's own id so later updateDoc/deleteDoc calls
    // (which address documents by this same id) can actually find it.
    const userRef = doc(db, USERS_COLLECTION, userData.id)
    await setDoc(userRef, userData)
    return userData.id
  } catch (error) {
    console.error('Error adding user to Firebase:', error)
    throw error
  }
}

export async function updateUserInFirebase(userId, updates) {
  try {
    await updateDoc(doc(db, USERS_COLLECTION, userId), updates)
  } catch (error) {
    console.error('Error updating user in Firebase:', error)
    throw error
  }
}

export async function deleteUserFromFirebase(userId) {
  try {
    await deleteDoc(doc(db, USERS_COLLECTION, userId))
  } catch (error) {
    console.error('Error deleting user from Firebase:', error)
    throw error
  }
}

// User app banner
export async function getBannerFromFirebase() {
  try {
    const snap = await getDoc(doc(db, SETTINGS_COLLECTION, BANNER_DOC_ID))
    return snap.exists() ? snap.data() : null
  } catch (error) {
    console.error('Error fetching banner from Firebase:', error)
    return null
  }
}

export async function setBannerInFirebase(photo) {
  try {
    await setDoc(doc(db, SETTINGS_COLLECTION, BANNER_DOC_ID), {
      photo,
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error setting banner in Firebase:', error)
    throw error
  }
}

export async function deleteBannerFromFirebase() {
  try {
    await deleteDoc(doc(db, SETTINGS_COLLECTION, BANNER_DOC_ID))
  } catch (error) {
    console.error('Error deleting banner from Firebase:', error)
    throw error
  }
}
