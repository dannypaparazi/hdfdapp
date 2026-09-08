import { useState } from 'react'
import UserLogin from './pages/UserLogin'
import UserOrder from './pages/UserOrder'

export default function AppUser() {
  const [userTable, setUserTable] = useState(null)

  const handleUserLogin = (tableNum) => {
    setUserTable(tableNum)
  }

  const handleUserLogout = () => {
    // UserLogin auto-submits whenever a ?code= param is present in the URL.
    // A customer arrives via a QR link like ?code=table_3, and that param
    // stays in the address bar after logout — without clearing it here,
    // UserLogin remounts, finds the same code still in the URL, and
    // silently logs the customer straight back into the same table.
    window.history.replaceState(null, '', window.location.pathname)
    setUserTable(null)
  }

  if (userTable !== null) {
    return <UserOrder table={userTable} onLogout={handleUserLogout} />
  }

  return <UserLogin onLogin={handleUserLogin} />
}
