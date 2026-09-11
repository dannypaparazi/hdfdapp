import { useState, useEffect } from 'react'
import { getItems, addItem, updateItem, deleteItem, compressImage } from '../utils/storage'
import { MENU_CATEGORIES } from '../utils/categories'
import styles from './MenuManager.module.css'

export default function MenuManager({ canWrite = true }) {
  const [items, setItems] = useState([])
  const [activeCategory, setActiveCategory] = useState('All')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    cost: '',
    description: '',
    category: MENU_CATEGORIES[0],
    options: [],
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
      reader.onload = async (event) => {
        // Compress before storing — Firestore rejects any single field over
        // ~1MB, and an uncompressed photo (especially a screenshot) easily
        // exceeds that.
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

  const addOptionGroup = () => {
    setFormData(prev => ({ ...prev, options: [...prev.options, { label: '', choices: [''] }] }))
  }

  const removeOptionGroup = (groupIndex) => {
    setFormData(prev => ({ ...prev, options: prev.options.filter((_, i) => i !== groupIndex) }))
  }

  const updateOptionGroupLabel = (groupIndex, label) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((group, i) => i === groupIndex ? { ...group, label } : group),
    }))
  }

  const addChoice = (groupIndex) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((group, i) => i === groupIndex ? { ...group, choices: [...group.choices, ''] } : group),
    }))
  }

  const updateChoice = (groupIndex, choiceIndex, value) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((group, i) => i === groupIndex
        ? { ...group, choices: group.choices.map((c, ci) => ci === choiceIndex ? value : c) }
        : group),
    }))
  }

  const removeChoice = (groupIndex, choiceIndex) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((group, i) => i === groupIndex
        ? { ...group, choices: group.choices.filter((_, ci) => ci !== choiceIndex) }
        : group),
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage({ type: '', text: '' })

    if (!formData.name.trim() || !formData.cost) {
      setMessage({ type: 'error', text: 'Please fill name and cost' })
      return
    }

    try {
      // Drop incomplete groups (no label, or every choice left blank) rather
      // than blocking submission -- a half-filled row is more likely someone
      // changed their mind than a mistake worth erroring over.
      const cleanedOptions = formData.options
        .map(group => ({ label: group.label.trim(), choices: group.choices.map(c => c.trim()).filter(Boolean) }))
        .filter(group => group.label && group.choices.length > 0)

      const itemData = {
        name: formData.name,
        cost: parseFloat(formData.cost),
        description: formData.description,
        category: formData.category,
        options: cleanedOptions,
        photo: formData.photo,
      }

      if (editingId) {
        await updateItem(editingId, itemData)
        setMessage({ type: 'success', text: `Item "${formData.name}" updated successfully` })
      } else {
        await addItem(itemData)
        setMessage({ type: 'success', text: `Item "${formData.name}" added successfully` })
      }

      setItems(getItems())
      setFormData({
        name: '',
        cost: '',
        description: '',
        category: activeCategory !== 'All' ? activeCategory : MENU_CATEGORIES[0],
        options: [],
        photo: null,
        photoPreview: null,
      })
      setShowForm(false)
      setEditingId(null)
    } catch (error) {
      const action = editingId ? 'update' : 'add'
      const isTooLarge = error?.message?.includes('longer than')
      setMessage({
        type: 'error',
        text: isTooLarge
          ? `Failed to ${action} item: photo is too large. Try a smaller image.`
          : `Failed to ${action} item`,
      })
      console.error(error)
    }
  }

  const handleEdit = (item) => {
    setFormData({
      name: item.name,
      cost: item.cost.toString(),
      description: item.description,
      category: item.category || MENU_CATEGORIES[0],
      options: item.options?.length ? item.options.map(g => ({ label: g.label, choices: [...g.choices] })) : [],
      photo: item.photo,
      photoPreview: item.photo,
    })
    setEditingId(item.id)
    setShowForm(true)
  }

  const handleDelete = async (id, name) => {
    if (confirm(`Delete "${name}"?`)) {
      try {
        await deleteItem(id)
        setItems(getItems())
        setMessage({ type: 'success', text: `Item deleted` })
      } catch (error) {
        setMessage({ type: 'error', text: 'Failed to delete item' })
        console.error(error)
      }
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({
      name: '',
      cost: '',
      description: '',
      category: activeCategory !== 'All' ? activeCategory : MENU_CATEGORIES[0],
      options: [],
      photo: null,
      photoPreview: null,
    })
  }

  const totalCost = items.reduce((sum, item) => sum + item.cost, 0)
  const visibleItems = activeCategory === 'All' ? items : items.filter(item => item.category === activeCategory)

  return (
    <div className={styles.container}>
      <h2>Menu Management</h2>

      {message.text && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      <div className={styles.categoryTabs}>
        <button
          className={`${styles.categoryTab} ${activeCategory === 'All' ? styles.active : ''}`}
          onClick={() => setActiveCategory('All')}
        >
          All
        </button>
        {MENU_CATEGORIES.map(category => (
          <button
            key={category}
            className={`${styles.categoryTab} ${activeCategory === category ? styles.active : ''}`}
            onClick={() => setActiveCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      {canWrite && (
        <button
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : '+ Add Item'}
        </button>
      )}

      {canWrite && showForm && (
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
            <label>Category *</label>
            <select name="category" value={formData.category} onChange={handleInputChange}>
              {MENU_CATEGORIES.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
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
            <label>Options (e.g. Choice of Meat, Choice of Soup Base)</label>
            <div className={styles.optionGroups}>
              {formData.options.map((group, groupIndex) => (
                <div key={groupIndex} className={styles.optionGroup}>
                  <div className={styles.optionGroupHeader}>
                    <input
                      type="text"
                      value={group.label}
                      onChange={(e) => updateOptionGroupLabel(groupIndex, e.target.value)}
                      placeholder="Group name, e.g. Choice of Meat"
                    />
                    <button type="button" className={styles.removeGroupBtn} onClick={() => removeOptionGroup(groupIndex)}>
                      Remove Group
                    </button>
                  </div>
                  <div className={styles.choicesList}>
                    {group.choices.map((choice, choiceIndex) => (
                      <div key={choiceIndex} className={styles.choiceRow}>
                        <input
                          type="text"
                          value={choice}
                          onChange={(e) => updateChoice(groupIndex, choiceIndex, e.target.value)}
                          placeholder={`Choice ${choiceIndex + 1}, e.g. Beef`}
                        />
                        {group.choices.length > 1 && (
                          <button type="button" className={styles.removeChoiceBtn} onClick={() => removeChoice(groupIndex, choiceIndex)}>
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    <button type="button" className={styles.addChoiceBtn} onClick={() => addChoice(groupIndex)}>
                      + Add Choice
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className={styles.addGroupBtn} onClick={addOptionGroup}>
              + Add Option Group
            </button>
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
        {visibleItems.length === 0 ? (
          <div className={styles.empty}>
            {items.length === 0 ? 'No menu items yet. Add your first item above.' : `No items in "${activeCategory}" yet.`}
          </div>
        ) : (
          <>
            <div className={styles.grid}>
              {visibleItems.map(item => (
                <div key={item.id} className={styles.itemCard}>
                  {item.photo && (
                    <div className={styles.photoContainer}>
                      <img src={item.photo} alt={item.name} />
                    </div>
                  )}
                  <div className={styles.cardContent}>
                    {item.category && <span className={styles.categoryBadge}>{item.category}</span>}
                    <h4>{item.name}</h4>
                    <p className={styles.cost}>${item.cost.toFixed(2)}</p>
                    {item.description && (
                      <p className={styles.description}>{item.description}</p>
                    )}
                    {item.options?.length > 0 && (
                      <p className={styles.optionsSummary}>
                        {item.options.map(g => `${g.label}: ${g.choices.join(', ')}`).join(' • ')}
                      </p>
                    )}
                    {canWrite && (
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
                    )}
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
