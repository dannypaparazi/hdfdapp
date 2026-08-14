import styles from './AdminItemsList.module.css'

export default function AdminItemsList({ items, onDelete }) {
  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        No items yet. Add your first menu item above.
      </div>
    )
  }

  return (
    <div className={styles.container}>
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
              <button
                className={styles.deleteBtn}
                onClick={() => onDelete(item.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
