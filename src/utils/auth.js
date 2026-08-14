const USERS_KEY = 'hotpot_users'
const CURRENT_USER_KEY = 'hotpot_current_user'

// Initialize with default admin account if no users exist
function initializeUsers() {
  try {
    const users = localStorage.getItem(USERS_KEY)
    if (!users) {
      const defaultUsers = [
        {
          id: '1',
          username: 'admin',
          password: 'admin123',
          role: 'admin',
          createdAt: new Date().toISOString(),
          canRead: true,
          canWrite: true,
        }
      ]
      localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers))
      return defaultUsers
    }
    return JSON.parse(users)
  } catch (error) {
    console.error('Error initializing users:', error)
    return []
  }
}

export function getUsers() {
  try {
    const users = localStorage.getItem(USERS_KEY)
    return users ? JSON.parse(users) : initializeUsers()
  } catch (error) {
    console.error('Error reading users:', error)
    return []
  }
}

export function login(username, password) {
  try {
    const users = getUsers()
    const user = users.find(u => u.username === username && u.password === password)

    if (user) {
      const currentUser = { ...user }
      delete currentUser.password // Don't store password in session
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser))
      return currentUser
    }
    return null
  } catch (error) {
    console.error('Error logging in:', error)
    return null
  }
}

export function logout() {
  try {
    localStorage.removeItem(CURRENT_USER_KEY)
  } catch (error) {
    console.error('Error logging out:', error)
  }
}

export function getCurrentUser() {
  try {
    const user = localStorage.getItem(CURRENT_USER_KEY)
    return user ? JSON.parse(user) : null
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

export function isLoggedIn() {
  return getCurrentUser() !== null
}

export function createUser(username, password, role = 'staff') {
  try {
    const users = getUsers()

    // Check if username already exists
    if (users.find(u => u.username === username)) {
      return { success: false, error: 'Username already exists' }
    }

    const newUser = {
      id: Date.now().toString(),
      username,
      password,
      role,
      createdAt: new Date().toISOString(),
      canRead: true,
      canWrite: role === 'admin' || role === 'staff',
    }

    users.push(newUser)
    localStorage.setItem(USERS_KEY, JSON.stringify(users))
    return { success: true, user: newUser }
  } catch (error) {
    console.error('Error creating user:', error)
    return { success: false, error: 'Failed to create user' }
  }
}

export function changePassword(userId, oldPassword, newPassword) {
  try {
    const users = getUsers()
    const user = users.find(u => u.id === userId)

    if (!user || user.password !== oldPassword) {
      return { success: false, error: 'Current password is incorrect' }
    }

    user.password = newPassword
    localStorage.setItem(USERS_KEY, JSON.stringify(users))
    return { success: true }
  } catch (error) {
    console.error('Error changing password:', error)
    return { success: false, error: 'Failed to change password' }
  }
}

export function updateUserAccess(userId, canRead, canWrite) {
  try {
    const users = getUsers()
    const user = users.find(u => u.id === userId)

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    user.canRead = canRead
    user.canWrite = canWrite
    localStorage.setItem(USERS_KEY, JSON.stringify(users))
    return { success: true }
  } catch (error) {
    console.error('Error updating user access:', error)
    return { success: false, error: 'Failed to update access' }
  }
}

export function deleteUser(userId) {
  try {
    const users = getUsers()
    const filtered = users.filter(u => u.id !== userId)
    localStorage.setItem(USERS_KEY, JSON.stringify(filtered))
    return { success: true }
  } catch (error) {
    console.error('Error deleting user:', error)
    return { success: false, error: 'Failed to delete user' }
  }
}
