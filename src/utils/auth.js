import { getUsersFromFirebase, addUserToFirebase, updateUserInFirebase, deleteUserFromFirebase } from './firebase'

const USERS_KEY = 'hotpot_users'
const CURRENT_USER_KEY = 'hotpot_current_user'

// One read/write pair per top-level nav tab. "Home" (table selection) is
// intentionally not gated -- it holds no data of its own and is required to
// reach Order Confirmation.
export const PERMISSION_TABS = [
  { key: 'confirm', label: 'Order Confirmation' },
  { key: 'history', label: 'Order History' },
  { key: 'quantity', label: 'Quantity History' },
  { key: 'audit', label: 'Audit Trail' },
  { key: 'admin', label: 'Admin' },
]

export function getDefaultPermissions(role) {
  const fullAccess = role === 'admin'
  const permissions = {}
  PERMISSION_TABS.forEach(({ key }) => {
    permissions[key] = { read: true, write: fullAccess || key !== 'admin' }
  })
  return permissions
}

// Older accounts (or the seeded default admin) may not have a permissions
// object yet -- normalize them to full access rather than locking anyone out.
function withPermissions(user) {
  if (user.permissions) return user
  return { ...user, permissions: getDefaultPermissions(user.role) }
}

// Firestore's default rules are wide open (same as every other collection in
// this app -- there's no backend to check credentials server-side, so the
// client has to be able to read a user record to verify a login). Hashing
// means a direct read of the collection exposes only an unusable digest,
// never the real password. This is a plain unsalted SHA-256 digest, which is
// a real improvement over plaintext but not a substitute for a proper auth
// service -- fine for a small internal admin tool, not for anything with a
// serious threat model.
async function hashPassword(password) {
  const bytes = new TextEncoder().encode(password)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
}

const isHashed = (password) => typeof password === 'string' && /^[0-9a-f]{64}$/.test(password)

function readLocalUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    return raw ? JSON.parse(raw).map(withPermissions) : []
  } catch (error) {
    console.error('Error reading cached users:', error)
    return []
  }
}

function cacheUsers(users) {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users))
  } catch (error) {
    console.error('Error caching users:', error)
  }
}

// First run after enabling Firebase sync: the collection is empty but this
// device may already have real accounts sitting in localStorage from before.
// Migrate them up (hashing any plaintext password along the way) instead of
// silently discarding them; fall back to the original admin/admin123 seed
// only if there's nothing local either.
async function seedInitialUsers() {
  const localUsers = readLocalUsers()
  const seed = localUsers.length > 0 ? localUsers : [{
    id: '1',
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    createdAt: new Date().toISOString(),
    permissions: getDefaultPermissions('admin'),
  }]

  for (const user of seed) {
    if (!isHashed(user.password)) {
      user.password = await hashPassword(user.password)
    }
    await addUserToFirebase(user)
  }
  return seed
}

export async function getUsers() {
  try {
    let users = await getUsersFromFirebase()
    if (users.length === 0) {
      users = await seedInitialUsers()
    }
    users = users.map(withPermissions)
    cacheUsers(users)
    return users
  } catch (error) {
    console.error('Error fetching users from server:', error)
    return readLocalUsers()
  }
}

export async function login(username, password) {
  try {
    const users = await getUsers()
    const hashedInput = await hashPassword(password)
    // If Firebase is unreachable, getUsers() falls back to whatever's
    // cached locally -- which, on a device that hasn't synced yet, may
    // still hold a plaintext password from before hashing existed. Accept
    // either form rather than failing every login until that device
    // reconnects.
    const user = users.find(u => u.username === username &&
      (u.password === hashedInput || (!isHashed(u.password) && u.password === password)))

    if (user) {
      const currentUser = { ...user }
      delete currentUser.password // Don't store even the hash in the session
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
    // A session logged in before permissions existed has no permissions
    // field cached here -- normalize it the same way getUsers() does, so an
    // already-open admin session doesn't silently lose write access.
    return user ? withPermissions(JSON.parse(user)) : null
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

export function isLoggedIn() {
  return getCurrentUser() !== null
}

export async function createUser(username, password, role = 'staff', permissions = null) {
  try {
    const users = await getUsers()

    // Check if username already exists
    if (users.find(u => u.username === username)) {
      return { success: false, error: 'Username already exists' }
    }

    const newUser = {
      id: Date.now().toString(),
      username,
      password: await hashPassword(password),
      role,
      createdAt: new Date().toISOString(),
      permissions: permissions || getDefaultPermissions(role),
    }

    await addUserToFirebase(newUser)
    cacheUsers([...users, newUser])
    return { success: true, user: newUser }
  } catch (error) {
    console.error('Error creating user:', error)
    return { success: false, error: 'Failed to create user' }
  }
}

export async function changePassword(userId, oldPassword, newPassword) {
  try {
    const users = await getUsers()
    const user = users.find(u => u.id === userId)
    const hashedOld = await hashPassword(oldPassword)

    if (!user || user.password !== hashedOld) {
      return { success: false, error: 'Current password is incorrect' }
    }

    user.password = await hashPassword(newPassword)
    await updateUserInFirebase(userId, { password: user.password })
    cacheUsers(users)
    return { success: true }
  } catch (error) {
    console.error('Error changing password:', error)
    return { success: false, error: 'Failed to change password' }
  }
}

export async function updateUserPermission(userId, tabKey, type, value) {
  try {
    const users = await getUsers()
    const user = users.find(u => u.id === userId)

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    user.permissions = user.permissions || getDefaultPermissions(user.role)
    user.permissions[tabKey] = { ...user.permissions[tabKey], [type]: value }
    // Read access is required for write access to mean anything.
    if (type === 'read' && !value) {
      user.permissions[tabKey].write = false
    }

    await updateUserInFirebase(userId, { permissions: user.permissions })
    cacheUsers(users)
    return { success: true }
  } catch (error) {
    console.error('Error updating user permission:', error)
    return { success: false, error: 'Failed to update permission' }
  }
}

export async function deleteUser(userId) {
  try {
    await deleteUserFromFirebase(userId)
    const users = await getUsers()
    const filtered = users.filter(u => u.id !== userId)
    cacheUsers(filtered)
    return { success: true }
  } catch (error) {
    console.error('Error deleting user:', error)
    return { success: false, error: 'Failed to delete user' }
  }
}
