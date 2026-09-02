import { useState } from 'react'
import { generateTableQRCode, generateQRCodeImageUrl } from '../utils/qrcode'
import styles from './QRCodeGenerator.module.css'

export default function QRCodeGenerator() {
  const [selectedTables, setSelectedTables] = useState(new Set())
  const [qrCodes, setQRCodes] = useState({})

  const toggleTable = (tableNum) => {
    const updated = new Set(selectedTables)
    if (updated.has(tableNum)) {
      updated.delete(tableNum)
      const newQRCodes = { ...qrCodes }
      delete newQRCodes[tableNum]
      setQRCodes(newQRCodes)
    } else {
      updated.add(tableNum)
      const qrText = generateTableQRCode(tableNum)
      const qrImageUrl = generateQRCodeImageUrl(qrText, 400)
      setQRCodes(prev => ({
        ...prev,
        [tableNum]: { text: qrText, imageUrl: qrImageUrl }
      }))
    }
    setSelectedTables(updated)
  }

  const selectAllTables = () => {
    const allQRCodes = {}
    const allTables = new Set()
    for (let i = 1; i <= 20; i++) {
      allTables.add(i)
      const qrText = generateTableQRCode(i)
      allQRCodes[i] = {
        text: qrText,
        imageUrl: generateQRCodeImageUrl(qrText, 400)
      }
    }
    setSelectedTables(allTables)
    setQRCodes(allQRCodes)
  }

  const clearAll = () => {
    setSelectedTables(new Set())
    setQRCodes({})
  }

  const downloadQRCode = (tableNum) => {
    const imageUrl = qrCodes[tableNum].imageUrl
    const link = document.createElement('a')
    link.href = imageUrl
    link.download = `table_${tableNum}_qr.png`
    link.click()
  }

  const printQRCodes = () => {
    const printWindow = window.open('', '_blank')
    let html = `
      <html>
      <head>
        <title>Table QR Codes</title>
        <style>
          body { font-family: Arial, sans-serif; }
          .qr-page { page-break-inside: avoid; margin-bottom: 2rem; text-align: center; }
          .qr-code { width: 300px; height: 300px; margin: 1rem auto; }
          h3 { margin: 0.5rem 0; }
        </style>
      </head>
      <body>
    `

    Array.from(selectedTables)
      .sort((a, b) => a - b)
      .forEach(tableNum => {
        const qrCode = qrCodes[tableNum]
        if (qrCode) {
          html += `
            <div class="qr-page">
              <h3>Table ${tableNum}</h3>
              <p>${qrCode.text}</p>
              <img src="${qrCode.imageUrl}" class="qr-code" alt="Table ${tableNum} QR Code" />
            </div>
          `
        }
      })

    html += '</body></html>'
    printWindow.document.write(html)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 500)
  }

  return (
    <div className={styles.container}>
      <h2>QR Code Generator for Tables</h2>

      <div className={styles.instructions}>
        <p>📱 Generate QR codes for customers to scan and place orders</p>
        <p>🔗 Selected tables: {selectedTables.size} / 20</p>
      </div>

      <div className={styles.controls}>
        <button onClick={selectAllTables} className={styles.btnPrimary}>
          Select All Tables
        </button>
        <button onClick={clearAll} className={styles.btnSecondary}>
          Clear Selection
        </button>
        {selectedTables.size > 0 && (
          <button onClick={printQRCodes} className={styles.btnPrimary}>
            Print QR Codes ({selectedTables.size})
          </button>
        )}
      </div>

      <div className={styles.tablesGrid}>
        {Array.from({ length: 20 }, (_, i) => i + 1).map(tableNum => (
          <button
            key={tableNum}
            onClick={() => toggleTable(tableNum)}
            className={`${styles.tableBtn} ${selectedTables.has(tableNum) ? styles.selected : ''}`}
          >
            <div className={styles.tableNumber}>Table {tableNum}</div>
            {selectedTables.has(tableNum) && (
              <div className={styles.checkmark}>✓</div>
            )}
          </button>
        ))}
      </div>

      {selectedTables.size > 0 && (
        <div className={styles.qrPreview}>
          <h3>QR Codes Preview ({selectedTables.size})</h3>
          <div className={styles.qrGrid}>
            {Array.from(selectedTables)
              .sort((a, b) => a - b)
              .map(tableNum => (
                <div key={tableNum} className={styles.qrCard}>
                  <h4>Table {tableNum}</h4>
                  <img
                    src={qrCodes[tableNum].imageUrl}
                    alt={`Table ${tableNum} QR Code`}
                    className={styles.qrImage}
                  />
                  <p className={styles.qrText}>{qrCodes[tableNum].text}</p>
                  <button
                    onClick={() => downloadQRCode(tableNum)}
                    className={styles.downloadBtn}
                  >
                    ⬇ Download
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
