import styles from './Home.module.css'

export default function Home({ onTableSelect }) {
  const tables = Array.from({ length: 20 }, (_, i) => i + 1)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.logo}>🍲</div>
        <h1>Hotpot Di Focolare</h1>
        <p className={styles.subtitle}>Order Management System</p>
      </div>

      <div className={styles.content}>
        <h2>Select Table</h2>
        <div className={styles.tablesGrid}>
          {tables.map(tableNum => (
            <button
              key={tableNum}
              className={styles.tableButton}
              onClick={() => onTableSelect(tableNum)}
              title={`Table ${tableNum}`}
            >
              <span className={styles.tableIcon}>🪑</span>
              <span className={styles.tableNumber}>{tableNum}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
