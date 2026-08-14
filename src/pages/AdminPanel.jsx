import { useState } from 'react'
import AdminAccounts from '../components/AdminAccounts'
import MenuManager from '../components/MenuManager'
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
          className={`${styles.sectionBtn} ${activeSection === 'accounts' ? styles.active : ''}`}
          onClick={() => setActiveSection('accounts')}
        >
          Accounts
        </button>
      </div>

      {activeSection === 'menu' && <MenuManager />}
      {activeSection === 'accounts' && <AdminAccounts currentUser={currentUser} />}
    </div>
  )
}
