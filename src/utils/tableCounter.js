const TABLE_COUNTER_KEY = 'hotpot_table_counters'

export function getTableCounters() {
  try {
    const counters = localStorage.getItem(TABLE_COUNTER_KEY)
    return counters ? JSON.parse(counters) : {}
  } catch (error) {
    console.error('Error getting table counters:', error)
    return {}
  }
}

export function getTableSessionNumber(tableNum) {
  try {
    const counters = getTableCounters()
    return counters[tableNum] || 1
  } catch (error) {
    console.error('Error getting session number:', error)
    return 1
  }
}

export function incrementTableCounter(tableNum) {
  try {
    const counters = getTableCounters()
    const currentSession = counters[tableNum] || 1
    counters[tableNum] = currentSession + 1
    localStorage.setItem(TABLE_COUNTER_KEY, JSON.stringify(counters))
    console.log(`📊 Table ${tableNum} counter incremented to ${counters[tableNum]}`)
    return counters[tableNum]
  } catch (error) {
    console.error('Error incrementing table counter:', error)
    return 1
  }
}

export function getFormattedTableName(tableNum) {
  const session = getTableSessionNumber(tableNum)
  return `${tableNum}-${session}`
}

export function resetTableCounter(tableNum) {
  try {
    const counters = getTableCounters()
    counters[tableNum] = 1
    localStorage.setItem(TABLE_COUNTER_KEY, JSON.stringify(counters))
    console.log(`🔄 Table ${tableNum} counter reset to 1`)
  } catch (error) {
    console.error('Error resetting table counter:', error)
  }
}

export function resetAllTableCounters() {
  try {
    localStorage.removeItem(TABLE_COUNTER_KEY)
    console.log('🔄 All table counters reset')
  } catch (error) {
    console.error('Error resetting all counters:', error)
  }
}
