import { getArchivedOrders } from './indexeddb'
import { getOrders } from './storage'

export async function exportArchivedOrdersToExcel(monthFilter = null) {
  try {
    // Get both archived and active orders
    const archivedOrders = await getArchivedOrders()
    const activeOrders = getOrders(undefined, true) // Get all active orders including completed
    let allOrders = [...activeOrders, ...archivedOrders]

    // Filter by month if specified (format: YYYY-MM)
    if (monthFilter) {
      allOrders = allOrders.filter(order => {
        const orderDate = order.timestamp.substring(0, 7) // Get YYYY-MM part
        return orderDate === monthFilter
      })
    }

    if (allOrders.length === 0) {
      alert('No orders found for the selected month')
      return false
    }

    const filterLabel = monthFilter ? ` for ${monthFilter}` : ''
    console.log(`📊 Exporting ${allOrders.length} orders${filterLabel}`)

    // Prepare data with headers
    const headers = ['Date', 'Time', 'Table', 'Item Name', 'Description', 'Quantity', 'Unit Price', 'Total']

    // Format orders for export
    const rows = allOrders.map(order => {
      const date = new Date(order.timestamp)
      const dateStr = date.toLocaleDateString('en-US')
      const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      const total = (order.unitPrice * order.quantity).toFixed(2)

      return [
        dateStr,
        timeStr,
        order.table || 'N/A',
        order.itemName,
        order.description || '',
        order.quantity,
        order.unitPrice.toFixed(2),
        total
      ]
    })

    // Generate CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row =>
        row.map(cell => {
          // Escape commas and quotes in cell values
          const str = String(cell)
          return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str
        }).join(',')
      )
    ].join('\n')

    // Add summary at the end
    const totalQty = rows.reduce((sum, row) => sum + parseInt(row[5]), 0)
    const totalSales = rows.reduce((sum, row) => sum + parseFloat(row[7]), 0)

    const csvWithSummary = csvContent + `\n\nTotal Orders,${allOrders.length}\nTotal Items,${totalQty}\nTotal Sales,$${totalSales.toFixed(2)}`

    // Create blob and download
    const blob = new Blob([csvWithSummary], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    const filename = monthFilter
      ? `orders_${monthFilter}.csv`
      : `orders_export_${new Date().toISOString().split('T')[0]}.csv`
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    console.log(`✅ Exported ${allOrders.length} orders to ${filename}`)
    return true
  } catch (error) {
    console.error('Error exporting orders:', error)
    alert('Error exporting orders: ' + error.message)
    return false
  }
}

export function generateExcelSummary(orders) {
  const summary = {
    totalOrders: orders.length,
    totalQuantity: orders.reduce((sum, o) => sum + o.quantity, 0),
    totalSales: orders.reduce((sum, o) => sum + (o.unitPrice * o.quantity), 0),
    byItem: {},
    byTable: {},
    byDate: {}
  }

  orders.forEach(order => {
    const date = order.timestamp.split('T')[0]
    const item = order.itemName
    const table = order.table

    // By item
    if (!summary.byItem[item]) {
      summary.byItem[item] = { qty: 0, sales: 0 }
    }
    summary.byItem[item].qty += order.quantity
    summary.byItem[item].sales += order.unitPrice * order.quantity

    // By table
    if (!summary.byTable[table]) {
      summary.byTable[table] = { qty: 0, sales: 0 }
    }
    summary.byTable[table].qty += order.quantity
    summary.byTable[table].sales += order.unitPrice * order.quantity

    // By date
    if (!summary.byDate[date]) {
      summary.byDate[date] = { qty: 0, sales: 0 }
    }
    summary.byDate[date].qty += order.quantity
    summary.byDate[date].sales += order.unitPrice * order.quantity
  })

  return summary
}
