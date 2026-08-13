import { useState } from 'react'
import { addOrder } from '../utils/storage'
import styles from './OrderConfirmation.module.css'

export default function OrderConfirmation() {
  const [formData, setFormData] = useState({
    itemName: '',
    quantity: 1,
    description: '',
    photo: null,
    photoPreview: null,
  })
  const [submitted, setSubmitted] = useState(false)

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
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 3000)
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
    </div>
  )
}
