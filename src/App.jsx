import { useState } from 'react';
import Login from './pages/Login';
import Home from './pages/Home';

const LOGIN_FLAG = 'driver-scheduler-logged-in';

export default function App() {
  const [loggedIn, setLoggedIn] = useState(() => sessionStorage.getItem(LOGIN_FLAG) === 'true');
  function handleLogin() { sessionStorage.setItem(LOGIN_FLAG, 'true'); setLoggedIn(true); }
  function handleLogout() { sessionStorage.removeItem(LOGIN_FLAG); setLoggedIn(false); }
  return loggedIn ? <Home onLogout={handleLogout} /> : <Login onLogin={handleLogin} />;
}
