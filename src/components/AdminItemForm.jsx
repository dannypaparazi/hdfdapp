import { useState } from 'react'
import { compressImage } from '../utils/storage'
import styles from './AdminItemForm.module.css'

export default function AdminItemForm({ onAdd }) {
  const [formData, setFormData] = useState({
    name: '',
    cost: '',
    description: '',
    photo: null,
    photoPreview: null,
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = async (event) => {
        const compressed = await compressImage(event.target.result)
        setFormData(prev => ({
          ...prev,
          photo: compressed,
          photoPreview: compressed,
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      alert('Please enter item name')
      return
    }
    if (!formData.cost) {
      alert('Please enter cost')
      return
    }

    onAdd({
      name: formData.name,
      cost: parseFloat(formData.cost),
      description: formData.description,
      photo: formData.photo,
    })

    setFormData({
      name: '',
      cost: '',
      description: '',
      photo: null,
      photoPreview: null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.grid}>
        <div className={styles.formGroup}>
          <label htmlFor="name">Item Name *</label>
          <input
            id="name"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="e.g., Beef Slice, Tofu"
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="cost">Cost ($) *</label>
          <input
            id="cost"
            type="number"
            name="cost"
            value={formData.cost}
            onChange={handleInputChange}
            placeholder="0.00"
            step="0.01"
            min="0"
            required
          />
        </div>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          placeholder="Add item details, ingredients, etc."
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

      <div className={styles.formActions}>
        <button type="submit" className={styles.submitBtn}>
          Add Item
        </button>
      </div>
    </form>
  )
}
