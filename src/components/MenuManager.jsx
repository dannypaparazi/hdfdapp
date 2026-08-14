import { useState, useEffect } from 'react'
import { getItems, addItem, deleteItem } from '../utils/storage'
import styles from './MenuManager.module.css'

export default function MenuManager() {
  const [items, setItems] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    cost: '',
    description: '',
    photo: null,
    photoPreview: null,
  })
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    setItems(getItems())
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setFormData(prev => ({
          ...prev,
          photo: event.target.result,
          photoPreview: event.target.result,
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setMessage({ type: '', text: '' })

    if (!formData.name.trim() || !formData.cost) {
      setMessage({ type: 'error', text: 'Please fill name and cost' })
      return
    }

    addItem({
      name: formData.name,
      cost: parseFloat(formData.cost),
      description: formData.description,
      photo: formData.photo,
    })

    setMessage({ type: 'success', text: `Item "${formData.name}" ${editingId ? 'updated' : 'added'} successfully` })
    setItems(getItems())
    setFormData({
      name: '',
      cost: '',
      description: '',
      photo: null,
      photoPreview: null,
    })
    setShowForm(false)
    setEditingId(null)
  }

  const handleEdit = (item) => {
    setFormData({
      name: item.name,
      cost: item.cost.toString(),
      description: item.description,
      photo: item.photo,
      photoPreview: item.photo,
    })
    setEditingId(item.id)
    setShowForm(true)
  }

  const handleDelete = (id, name) => {
    if (confirm(`Delete "${name}"?`)) {
      deleteItem(id)
      setItems(getItems())
      setMessage({ type: 'success', text: `Item deleted` })
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({
      name: '',
      cost: '',
      description: '',
      photo: null,
      photoPreview: null,
    })
  }

  const totalCost = items.reduce((sum, item) => sum + item.cost, 0)

  return (
    <div className={styles.container}>
      <h2>Menu Management</h2>

      {message.text && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      <button
        className={`${styles.btn} ${styles.btnPrimary}`}
        onClick={() => setShowForm(!showForm)}
      >
        {showForm ? 'Cancel' : '+ Add Item'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.grid}>
            <div className={styles.formGroup}>
              <label>Item Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Beef Slice"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Unit Cost ($) *</label>
              <input
                type="number"
                name="cost"
                value={formData.cost}
                onChange={handleInputChange}
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Item details, ingredients, etc."
              rows="2"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Photo</label>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
            />
            {formData.photoPreview && (
              <div className={styles.photoPreview}>
                <img src={formData.photoPreview} alt="Preview" />
              </div>
            )}
          </div>

          <div className={styles.formActions}>
            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
              {editingId ? 'Update Item' : 'Add Item'}
            </button>
            <button type="button" className={styles.btn} onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className={styles.itemsSection}>
        {items.length === 0 ? (
          <div className={styles.empty}>No menu items yet. Add your first item above.</div>
        ) : (
          <>
            <div className={styles.grid}>
              {items.map(item => (
                <div key={item.id} className={styles.itemCard}>
                  {item.photo && (
                    <div className={styles.photoContainer}>
                      <img src={item.photo} alt={item.name} />
                    </div>
                  )}
                  <div className={styles.cardContent}>
                    <h4>{item.name}</h4>
                    <p className={styles.cost}>${item.cost.toFixed(2)}</p>
                    {item.description && (
                      <p className={styles.description}>{item.description}</p>
                    )}
                    <div className={styles.actions}>
                      <button
                        className={`${styles.btnSmall} ${styles.btnEdit}`}
                        onClick={() => handleEdit(item)}
                      >
                        Edit
                      </button>
                      <button
                        className={`${styles.btnSmall} ${styles.btnDelete}`}
                        onClick={() => handleDelete(item.id, item.name)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.totalSection}>
              <h3>Total Menu Value</h3>
              <p className={styles.totalAmount}>${totalCost.toFixed(2)}</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
