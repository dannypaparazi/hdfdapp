import { useState, useEffect } from 'react'
import { getStorageUsage, archiveOldOrders } from '../utils/storage'
import { getArchiveStats, clearArchivedOrders } from '../utils/indexeddb'
import { exportArchivedOrdersToExcel } from '../utils/exportUtils'
import styles from './StorageManager.module.css'

export default function StorageManager() {
  const [storage, setStorage] = useState({ used: 0, percent: 0, details: {} })
  const [archiveStats, setArchiveStats] = useState({ count: 0 })
  const [archivedCount, setArchivedCount] = useState(0)
  const [message, setMessage] = useState('')
  const [showMonthSelector, setShowMonthSelector] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState('')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  useEffect(() => {
    updateStorage()
    updateArchiveStats()
  }, [])

  const updateArchiveStats = async () => {
    const stats = await getArchiveStats()
    setArchiveStats(stats)
  }

  const updateStorage = () => {
    const usage = getStorageUsage()
    setStorage(usage)
  }

  const handleArchive = async () => {
    console.log('🔵 Archive button clicked')
    if (!confirm('Archive orders older than 30 days? This will free up storage space.')) {
      console.log('User cancelled')
      return
    }

    try {
      console.log('🔵 Starting archive...')
      const result = await archiveOldOrders(30)
      console.log('🟢 Archive result:', result)

      if (result.archived > 0) {
        setArchivedCount(result.archived)
        setMessage(`✅ Archived ${result.archived} orders to IndexedDB. Remaining: ${result.remaining} active orders.`)
      } else {
        setMessage('No old orders to archive.')
      }

      setTimeout(() => {
        updateStorage()
        updateArchiveStats()
      }, 500)
      setTimeout(() => setMessage(''), 5000)
    } catch (error) {
      console.error('❌ Archive error:', error)
      setMessage(`❌ Error: ${error.message}`)
      setTimeout(() => setMessage(''), 5000)
    }
  }

  const handleClearArchive = async () => {
    if (confirm('Clear all archived orders from IndexedDB? This cannot be undone.')) {
      try {
        await clearArchivedOrders()
        setMessage('IndexedDB archive cleared.')
        setTimeout(() => updateArchiveStats(), 500)
        setTimeout(() => setMessage(''), 4000)
      } catch (error) {
        setMessage('Error clearing archive.')
      }
    }
  }

  const handleExport = () => {
    setShowMonthSelector(true)
  }

  const handleExportConfirm = async () => {
    try {
      const success = await exportArchivedOrdersToExcel(selectedMonth ? `${selectedYear}-${selectedMonth}` : null)
      if (success) {
        const monthName = selectedMonth
          ? new Date(`${selectedYear}-${selectedMonth}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
          : 'All'
        setMessage(`✅ Orders for ${monthName} exported to Excel successfully!`)
        setTimeout(() => setMessage(''), 4000)
      }
      setShowMonthSelector(false)
      setSelectedMonth('')
      setSelectedYear(new Date().getFullYear())
    } catch (error) {
      setMessage(`❌ Export error: ${error.message}`)
      setTimeout(() => setMessage(''), 4000)
    }
  }

  return (
    <div className={styles.container}>
      <h2>Storage Management</h2>

      {/* Storage Usage Meter */}
      <div className={styles.usageCard}>
        <h3>Storage Usage</h3>
        <div className={styles.meter}>
          <div
            className={styles.meterFill}
            style={{
              width: `${Math.min(storage.percent, 100)}%`,
              backgroundColor: storage.percent > 80 ? '#e74c3c' : storage.percent > 50 ? '#f39c12' : '#27ae60'
            }}
          />
        </div>
        <div className={styles.usageText}>
          <span>{storage.used} KB / ~5 MB</span>
          <span>{storage.percent}% full</span>
        </div>
      </div>

      {/* Storage Breakdown */}
      <div className={styles.breakdownCard}>
        <h3>Storage Breakdown</h3>
        <div className={styles.breakdown}>
          <div className={styles.item}>
            <span>Orders (localStorage):</span>
            <span>{Math.round((storage.details.orders || 0) / 1024)} KB</span>
          </div>
          <div className={styles.item}>
            <span>Menu Items:</span>
            <span>{Math.round((storage.details.items || 0) / 1024)} KB</span>
          </div>
          <div className={styles.item}>
            <span>IndexedDB Archive:</span>
            <span>{archiveStats.count} orders</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className={styles.actionsCard}>
        <h3>Storage Actions</h3>
        <div className={styles.actions}>
          <button className={styles.archiveBtn} onClick={handleArchive} title="Archive orders older than 30 days">
            📦 Archive Old Orders (30+ days)
          </button>
          <button className={styles.exportBtn} onClick={handleExport} title='Export all orders (active + archived) to Excel'>
            📊 Export to Excel
          </button>
          <button className={styles.clearBtn} onClick={handleClearArchive}>
            🗑️ Clear Archive
          </button>
          <button className={styles.refreshBtn} onClick={updateStorage}>
            🔄 Refresh Stats
          </button>
        </div>
      </div>

      {/* Tips */}
      <div className={styles.tipsCard}>
        <h3>💡 Optimization Tips</h3>
        <ul>
          <li>Images are automatically compressed when uploaded</li>
          <li>Photos are stored once in the menu, not duplicated in orders</li>
          <li>Active orders stay in localStorage (fast access)</li>
          <li>Archive old orders to IndexedDB (50MB+ capacity)</li>
          <li>IndexedDB preserves archived data with no size limit</li>
          <li>Clear the IndexedDB archive when no longer needed</li>
        </ul>
      </div>

      {/* Message */}
      {message && (
        <div className={styles.message}>
          {message}
        </div>
      )}

      {/* Month Selector Modal */}
      {showMonthSelector && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Select Month to Export</h3>

            <div className={styles.selectorGroup}>
              <label>Year:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className={styles.select}
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div className={styles.selectorGroup}>
              <label>Month:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className={styles.select}
              >
                <option value="">All Months</option>
                {Array.from({ length: 12 }, (_, i) => ({
                  num: String(i + 1).padStart(2, '0'),
                  name: new Date(2024, i, 1).toLocaleDateString('en-US', { month: 'long' })
                })).map(m => (
                  <option key={m.num} value={m.num}>{m.name}</option>
                ))}
              </select>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowMonthSelector(false)}>
                Cancel
              </button>
              <button className={styles.confirmBtn} onClick={handleExportConfirm}>
                Export
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
