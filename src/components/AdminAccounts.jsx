import { useState, useEffect } from 'react'
import { getUsers, createUser, changePassword, updateUserAccess, deleteUser } from '../utils/auth'
import styles from './AdminAccounts.module.css'

export default function AdminAccounts({ currentUser }) {
  const [users, setUsers] = useState([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showChangePasswordForm, setShowChangePasswordForm] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'staff',
  })
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    setUsers(getUsers())
  }, [])

  const handleCreateUser = (e) => {
    e.preventDefault()
    setMessage({ type: '', text: '' })

    if (!formData.username.trim() || !formData.password) {
      setMessage({ type: 'error', text: 'Please fill all fields' })
      return
    }

    const result = createUser(formData.username, formData.password, formData.role)
    if (result.success) {
      setMessage({ type: 'success', text: `User "${formData.username}" created successfully` })
      setUsers(getUsers())
      setFormData({ username: '', password: '', role: 'staff' })
      setShowCreateForm(false)
    } else {
      setMessage({ type: 'error', text: result.error })
    }
  }

  const handleChangePassword = (e) => {
    e.preventDefault()
    setMessage({ type: '', text: '' })

    if (!passwordData.oldPassword || !passwordData.newPassword) {
      setMessage({ type: 'error', text: 'Please fill all password fields' })
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' })
      return
    }

    if (passwordData.newPassword.length < 3) {
      setMessage({ type: 'error', text: 'Password must be at least 3 characters' })
      return
    }

    const result = changePassword(currentUser.id, passwordData.oldPassword, passwordData.newPassword)
    if (result.success) {
      setMessage({ type: 'success', text: 'Password changed successfully' })
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' })
      setShowChangePasswordForm(false)
    } else {
      setMessage({ type: 'error', text: result.error })
    }
  }

  const handleToggleAccess = (userId, type) => {
    const user = users.find(u => u.id === userId)
    if (!user) return

    const newCanRead = type === 'read' ? !user.canRead : user.canRead
    const newCanWrite = type === 'write' ? !user.canWrite : user.canWrite

    updateUserAccess(userId, newCanRead, newCanWrite)
    setUsers(getUsers())
    setMessage({ type: 'success', text: 'Access updated' })
  }

  const handleDeleteUser = (userId) => {
    if (userId === currentUser.id) {
      setMessage({ type: 'error', text: 'Cannot delete your own account' })
      return
    }

    if (confirm('Are you sure you want to delete this user?')) {
      deleteUser(userId)
      setUsers(getUsers())
      setMessage({ type: 'success', text: 'User deleted' })
    }
  }

  return (
    <div className={styles.container}>
      <h2>Account Management</h2>

      {message.text && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      <div className={styles.actions}>
        <button
          className={styles.btn}
          onClick={() => setShowChangePasswordForm(!showChangePasswordForm)}
        >
          {showChangePasswordForm ? 'Cancel' : 'Change Password'}
        </button>
        <button
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : '+ Create User'}
        </button>
      </div>

      {showChangePasswordForm && (
        <form onSubmit={handleChangePassword} className={styles.form}>
          <h3>Change Your Password</h3>
          <div className={styles.formGroup}>
            <label>Current Password</label>
            <input
              type="password"
              value={passwordData.oldPassword}
              onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
              placeholder="Enter current password"
            />
          </div>
          <div className={styles.formGroup}>
            <label>New Password</label>
            <input
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              placeholder="Enter new password"
            />
          </div>
          <div className={styles.formGroup}>
            <label>Confirm Password</label>
            <input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              placeholder="Confirm new password"
            />
          </div>
          <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
            Update Password
          </button>
        </form>
      )}

      {showCreateForm && (
        <form onSubmit={handleCreateUser} className={styles.form}>
          <h3>Create New User</h3>
          <div className={styles.formGroup}>
            <label>Username</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="Enter username"
            />
          </div>
          <div className={styles.formGroup}>
            <label>Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Enter password"
            />
          </div>
          <div className={styles.formGroup}>
            <label>Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
            Create User
          </button>
        </form>
      )}

      <div className={styles.usersList}>
        <h3>Users ({users.length})</h3>
        <div className={styles.table}>
          {users.map(user => (
            <div key={user.id} className={styles.userRow}>
              <div className={styles.userInfo}>
                <p className={styles.username}>
                  {user.username}
                  {user.id === currentUser.id && <span className={styles.badge}>You</span>}
                </p>
                <p className={styles.role}>{user.role}</p>
              </div>
              <div className={styles.access}>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={user.canRead}
                    onChange={() => handleToggleAccess(user.id, 'read')}
                    disabled={user.id === currentUser.id}
                  />
                  Read
                </label>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={user.canWrite}
                    onChange={() => handleToggleAccess(user.id, 'write')}
                    disabled={user.id === currentUser.id}
                  />
                  Write
                </label>
              </div>
              {user.id !== currentUser.id && (
                <button
                  className={styles.deleteBtn}
                  onClick={() => handleDeleteUser(user.id)}
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
