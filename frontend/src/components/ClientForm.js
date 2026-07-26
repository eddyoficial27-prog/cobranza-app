import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import CollectorApp from './components/CollectorApp';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('user');
    if (saved) setUser(JSON.parse(saved));
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <div>
      <header style={{ padding: '10px', background: '#333', color: 'white' }}>
        <span>Hola, {user.name} ({user.role === 'admin' ? 'Administrador' : 'Cobrador'})</span>
        <button onClick={handleLogout} style={{ float: 'right' }}>Cerrar Sesión</button>
      </header>
      
      {user.role === 'admin' ? (
        <AdminDashboard />
      ) : (
        <CollectorApp collectorId={user.id} />
      )}
    </div>
  );
}

export default App;
