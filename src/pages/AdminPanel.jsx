import AdminAccounts from '../components/AdminAccounts'
import styles from './AdminPanel.module.css'

export default function AdminPanel({ currentUser }) {
  return (
    <div className={styles.container}>
      <AdminAccounts currentUser={currentUser} />
    </div>
  )
}
