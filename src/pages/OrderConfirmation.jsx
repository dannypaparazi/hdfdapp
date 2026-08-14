import { useState, useEffect } from 'react'
import { addOrder, getOrders, deleteOrder } from '../utils/storage'
import styles from './OrderConfirmation.module.css'

export default function OrderConfirmation() {
  const [formData, setFormData] = useState({
    itemName: '',
    quantity: 1,
    description: '',
    photo: null,
    photoPreview: null,
  })
  const [orders, setOrders] = useState([])
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    setOrders(getOrders())
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' ? parseInt(value) || 1 : value,
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
    if (!formData.itemName.trim()) {
      alert('Please enter an item name')
      return
    }

    addOrder({
      itemName: formData.itemName,
      quantity: formData.quantity,
      description: formData.description,
      photo: formData.photo,
      timestamp: new Date().toISOString(),
    })

    setFormData({
      itemName: '',
      quantity: 1,
      description: '',
      photo: null,
      photoPreview: null,
    })
    setOrders(getOrders())
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 3000)
  }

  const handleQuantityChange = (orderId, newQuantity) => {
    const order = orders.find(o => o.id === orderId)
    if (order) {
      deleteOrder(orderId)
      addOrder({
        ...order,
        quantity: parseInt(newQuantity),
      })
      setOrders(getOrders())
    }
  }

  const handleDeleteOrder = (orderId) => {
    deleteOrder(orderId)
    setOrders(getOrders())
  }

  return (
    <div className={styles.container}>
      <h2>Add New Item</h2>

      {submitted && (
        <div className={styles.successMessage}>
          ✓ Item added successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="itemName">Item Name *</label>
          <input
            id="itemName"
            type="text"
            name="itemName"
            value={formData.itemName}
            onChange={handleInputChange}
            placeholder="e.g., Beef Slice, Tofu, Noodles"
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="quantity">Quantity *</label>
          <input
            id="quantity"
            type="number"
            name="quantity"
            value={formData.quantity}
            onChange={handleInputChange}
            min="1"
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Add any notes or special instructions"
            rows="3"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="photo">Upload Photo</label>
          <input
            id="photo"
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

        <button type="submit" className={styles.submitBtn}>
          Add Item
        </button>
      </form>

      {orders.length > 0 && (
        <div className={styles.ordersSection}>
          <h3>Added Items</h3>
          <div className={styles.ordersList}>
            {orders.map(order => (
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
                </div>
                <div className={styles.quantitySection}>
                  <label>Qty:</label>
                  <select
                    value={order.quantity}
                    onChange={(e) => handleQuantityChange(order.id, e.target.value)}
                    className={styles.quantitySelect}
                  >
                    {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>
                </div>
                <button
                  className={styles.deleteBtn}
                  onClick={() => handleDeleteOrder(order.id)}
                  title="Delete item"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
