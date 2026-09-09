import { useState, useEffect } from 'react'
import { getUsers, createUser, changePassword, updateUserPermission, deleteUser, getDefaultPermissions, PERMISSION_TABS } from '../utils/auth'
import styles from './AdminAccounts.module.css'

export default function AdminAccounts({ currentUser, canWrite = true }) {
  const [users, setUsers] = useState([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showChangePasswordForm, setShowChangePasswordForm] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'staff',
    permissions: getDefaultPermissions('staff'),
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

    const result = createUser(formData.username, formData.password, formData.role, formData.permissions)
    if (result.success) {
      setMessage({ type: 'success', text: `User "${formData.username}" created successfully` })
      setUsers(getUsers())
      setFormData({ username: '', password: '', role: 'staff', permissions: getDefaultPermissions('staff') })
      setShowCreateForm(false)
    } else {
      setMessage({ type: 'error', text: result.error })
    }
  }

  const handleRoleChange = (role) => {
    setFormData(prev => ({ ...prev, role, permissions: getDefaultPermissions(role) }))
  }

  const handleFormPermissionToggle = (tabKey, type) => {
    setFormData(prev => {
      const current = prev.permissions[tabKey]
      const value = !current[type]
      const updated = { ...current, [type]: value }
      if (type === 'read' && !value) updated.write = false
      return { ...prev, permissions: { ...prev.permissions, [tabKey]: updated } }
    })
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

  const handleToggleAccess = (userId, tabKey, type) => {
    const user = users.find(u => u.id === userId)
    if (!user) return

    const newValue = !user.permissions[tabKey][type]
    updateUserPermission(userId, tabKey, type, newValue)
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
        {canWrite && (
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? 'Cancel' : '+ Create User'}
          </button>
        )}
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

      {canWrite && showCreateForm && (
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
              onChange={(e) => handleRoleChange(e.target.value)}
            >
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Tab Access</label>
            <div className={styles.permissionsGrid}>
              <div className={styles.permissionsHeader}>
                <span>Tab</span>
                <span>Read</span>
                <span>Write</span>
              </div>
              {PERMISSION_TABS.map(({ key, label }) => (
                <div key={key} className={styles.permissionsRow}>
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    checked={formData.permissions[key].read}
                    onChange={() => handleFormPermissionToggle(key, 'read')}
                  />
                  <input
                    type="checkbox"
                    checked={formData.permissions[key].write}
                    disabled={!formData.permissions[key].read}
                    onChange={() => handleFormPermissionToggle(key, 'write')}
                  />
                </div>
              ))}
            </div>
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
              <div className={styles.permissionsGrid}>
                <div className={styles.permissionsHeader}>
                  <span>Tab</span>
                  <span>Read</span>
                  <span>Write</span>
                </div>
                {PERMISSION_TABS.map(({ key, label }) => (
                  <div key={key} className={styles.permissionsRow}>
                    <span>{label}</span>
                    <input
                      type="checkbox"
                      checked={user.permissions[key].read}
                      onChange={() => handleToggleAccess(user.id, key, 'read')}
                      disabled={!canWrite || user.id === currentUser.id}
                    />
                    <input
                      type="checkbox"
                      checked={user.permissions[key].write}
                      disabled={!canWrite || user.id === currentUser.id || !user.permissions[key].read}
                      onChange={() => handleToggleAccess(user.id, key, 'write')}
                    />
                  </div>
                ))}
              </div>
              {canWrite && user.id !== currentUser.id && (
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
