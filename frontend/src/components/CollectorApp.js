import React, { useState, useEffect } from 'react';
import axios from 'axios';
import LoanGrid from './LoanGrid';
import ClientForm from './ClientForm';
import NewLoanForm from './NewLoanForm';

function CollectorApp({ collectorId }) {
  const [view, setView] = useState('menu');
  const [clients, setClients] = useState([]);
  const [loans, setLoans] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [editingClient, setEditingClient] = useState(null);

  const fetchClients = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('https://cobranza-app-production-91b6.up.railway.app/api/clients', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClients(response.data);
    } catch (err) {
      alert('Error cargando clientes');
    }
  };

  const fetchLoans = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('https://cobranza-app-production-91b6.up.railway.app/api/loans', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLoans(response.data);
    } catch (err) {
      alert('Error cargando préstamos');
    }
  };

  const handleClientSaved = () => {
    fetchClients();
    setView('clients');
    setEditingClient(null);
  };

  const handleLoanCreated = () => {
    fetchLoans();
    setView('loans');
  };

  const handlePaymentComplete = () => {
    fetchLoans();
    setView('loans');
  };

  const startEditClient = (client) => {
    setEditingClient(client);
    setView('editClient');
  };

  const renderMenu = () => (
    <div style={{ padding: '20px' }}>
      <h3>Panel del Cobrador</h3>
      <div style={{ display: 'grid', gap: '15px', maxWidth: '400px' }}>
        <button onClick={() => { fetchClients(); setView('clients'); }} 
          style={buttonStyle}>👥 Mis Clientes ({clients.length})</button>
        <button onClick={() => { fetchLoans(); setView('loans'); }} 
          style={buttonStyle}>💰 Préstamos Activos ({loans.length})</button>
        <button onClick={() => setView('newClient')} 
          style={{...buttonStyle, background: '#28a745'}}>➕ Registrar Nuevo Cliente</button>
      </div>
    </div>
  );

  const renderClients = () => (
    <div style={{ padding: '20px' }}>
      <button onClick={() => setView('menu')} style={{ marginBottom: '20px' }}>← Volver</button>
      <h3>Mis Clientes</h3>
      <button onClick={() => setView('newClient')} style={{...buttonStyle, marginBottom: '20px'}}>
        ➕ Agregar Cliente
      </button>
      
      <div style={{ display: 'grid', gap: '10px' }}>
        {clients.map(client => (
          <div key={client.id} style={{ 
            padding: '15px', 
            border: '1px solid #ddd', 
            borderRadius: '8px',
            background: '#f8f9fa'
          }}>
            <div style={{ marginBottom: '10px' }}>
              <h4 style={{ margin: '0 0 5px 0' }}>{client.name}</h4>
              <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
                📞 {client.phone || 'Sin teléfono'} | 📍 {client.address || 'Sin dirección'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => startEditClient(client)} 
                style={{...buttonStyle, background: '#ffc107', flex: 1, padding: '10px'}}>
                ✏️ Editar
              </button>
              <button onClick={() => { setSelectedClient(client); setView('newLoan'); }} 
                style={{...buttonStyle, background: '#17a2b8', flex: 1, padding: '10px'}}>
                💵 Nuevo Préstamo
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderLoans = () => (
    <div style={{ padding: '20px' }}>
      <button onClick={() => setView('menu')} style={{ marginBottom: '20px' }}>← Volver</button>
      <h3>Préstamos Activos</h3>
      <div style={{ display: 'grid', gap: '10px' }}>
        {loans.map(loan => (
          <div key={loan.id} style={{ 
            padding: '15px', 
            border: '1px solid #ddd', 
            borderRadius: '8px',
            cursor: 'pointer',
            background: loan.paid_days >= 24 ? '#d4edda' : 'white'
          }} onClick={() => { setSelectedLoan(loan); setView('payments'); }}>
            <h4 style={{ margin: '0 0 5px 0' }}>{loan.client_name}</h4>
            <p style={{ margin: '0', fontSize: '14px' }}>📞 {loan.client_phone}</p>
            <hr style={{ margin: '10px 0', border: 'none', borderTop: '1px solid #eee' }}/>
            <p style={{ margin: '5px 0' }}>Préstamo: <strong>S/. {loan.principal_amount}</strong> → Paga: S/. {loan.total_amount}</p>
            <p style={{ margin: '5px 0' }}>Cuota: S/. {loan.daily_payment} | Progreso: {loan.paid_days}/24 días</p>
            <p style={{ margin: '5px 0' }}>Saldo: <strong>S/. {loan.remaining}</strong></p>
            {loan.paid_days >= 24 && <span style={{ color: 'green', fontWeight: 'bold' }}>✓ COMPLETADO</span>}
          </div>
        ))}
      </div>
    </div>
  );

  if (view === 'menu') return renderMenu();
  if (view === 'clients') return renderClients();
  if (view === 'loans') return renderLoans();
  if (view === 'newClient') return <ClientForm onSave={handleClientSaved} onCancel={() => setView('clients')} />;
  if (view === 'editClient') return <ClientForm client={editingClient} onSave={handleClientSaved} onCancel={() => { setEditingClient(null); setView('clients'); }} />;
  if (view === 'newLoan') return <NewLoanForm client={selectedClient} onSave={handleLoanCreated} onCancel={() => setView('clients')} />;
  if (view === 'payments') return <LoanGrid loan={selectedLoan} onBack={() => { setSelectedLoan(null); setView('loans'); }} onPaymentComplete={handlePaymentComplete} />;

  return renderMenu();
}

const buttonStyle = {
  padding: '15px 20px',
  fontSize: '16px',
  border: 'none',
  borderRadius: '8px',
  background: '#007bff',
  color: 'white',
  cursor: 'pointer'
};

export default CollectorApp;
