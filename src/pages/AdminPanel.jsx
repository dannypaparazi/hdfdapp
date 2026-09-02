import { useState } from 'react'
import AdminAccounts from '../components/AdminAccounts'
import MenuManager from '../components/MenuManager'
import StorageManager from '../components/StorageManager'
import QRCodeGenerator from '../components/QRCodeGenerator'
import styles from './AdminPanel.module.css'

export default function AdminPanel({ currentUser }) {
  const [activeSection, setActiveSection] = useState('menu')

  return (
    <div className={styles.container}>
      <div className={styles.sections}>
        <button
          className={`${styles.sectionBtn} ${activeSection === 'menu' ? styles.active : ''}`}
          onClick={() => setActiveSection('menu')}
        >
          Menu
        </button>
        <button
          className={`${styles.sectionBtn} ${activeSection === 'qr' ? styles.active : ''}`}
          onClick={() => setActiveSection('qr')}
        >
          QR Codes
        </button>
        <button
          className={`${styles.sectionBtn} ${activeSection === 'accounts' ? styles.active : ''}`}
          onClick={() => setActiveSection('accounts')}
        >
          Accounts
        </button>
        <button
          className={`${styles.sectionBtn} ${activeSection === 'storage' ? styles.active : ''}`}
          onClick={() => setActiveSection('storage')}
        >
          Storage
        </button>
      </div>

      {activeSection === 'menu' && <MenuManager />}
      {activeSection === 'qr' && <QRCodeGenerator />}
      {activeSection === 'accounts' && <AdminAccounts currentUser={currentUser} />}
      {activeSection === 'storage' && <StorageManager />}
    </div>
  )
}
