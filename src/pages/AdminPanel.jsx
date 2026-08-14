import { useState, useEffect } from 'react'
import { getItems, addItem, deleteItem } from '../utils/storage'
import AdminLogin from '../components/AdminLogin'
import AdminItemsList from '../components/AdminItemsList'
import AdminItemForm from '../components/AdminItemForm'
import styles from './AdminPanel.module.css'

const ADMIN_PASSWORD = 'admin123'

export default function AdminPanel({ isLoggedIn, onLogin, onLogout }) {
  const [items, setItems] = useState([])
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    if (isLoggedIn) {
      setItems(getItems())
    }
  }, [isLoggedIn])

  const handleLogin = (password) => {
    if (password === ADMIN_PASSWORD) {
      onLogin()
      return true
    }
    return false
  }

  const handleAddItem = (itemData) => {
    addItem(itemData)
    setItems(getItems())
    setShowForm(false)
  }

  const handleDeleteItem = (id) => {
    if (confirm('Delete this item?')) {
      deleteItem(id)
      setItems(getItems())
    }
  }

  if (!isLoggedIn) {
    return <AdminLogin onLogin={handleLogin} />
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Admin Panel</h2>
        <button className={styles.logoutBtn} onClick={onLogout}>
          Logout
        </button>
      </div>

      <div className={styles.itemsSection}>
        <div className={styles.sectionHeader}>
          <h3>Menu Items</h3>
          <button
            className={styles.addBtn}
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Cancel' : '+ Add Item'}
          </button>
        </div>

        {showForm && (
          <AdminItemForm onAdd={handleAddItem} />
        )}

        <AdminItemsList
          items={items}
          onDelete={handleDeleteItem}
        />
      </div>
    </div>
  )
}
