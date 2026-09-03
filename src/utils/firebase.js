import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, query, where } from 'firebase/firestore'

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

// Menu items collection
const ITEMS_COLLECTION = 'hotpot_items'

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
