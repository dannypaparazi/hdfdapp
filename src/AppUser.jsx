import { useState } from 'react'
import UserLogin from './pages/UserLogin'
import UserOrder from './pages/UserOrder'

export default function AppUser() {
  const [userTable, setUserTable] = useState(null)

  const handleUserLogin = (tableNum) => {
    setUserTable(tableNum)
  }

  const handleUserLogout = () => {
    setUserTable(null)
  }

  if (userTable !== null) {
    return <UserOrder table={userTable} onLogout={handleUserLogout} />
  }

  return <UserLogin onLogin={handleUserLogin} />
}
