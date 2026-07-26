import React, { useState, useEffect } from 'react';
import axios from 'axios';

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('loans');
  const [loans, setLoans] = useState([]);
  const [clients, setClients] = useState([]);
  const [collectors, setCollectors] = useState([]);
  const [report, setReport] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    
    const [loansRes, clientsRes, collectorsRes] = await Promise.all([
      axios.get('https://cobranza-app-production-91b6.up.railway.app/api/loans', { headers }),
      axios.get('https://cobranza-app-production-91b6.up.railway.app/api/clients', { headers }),
      axios.get('https://cobranza-app-production-91b6.up.railway.app/api/collectors', { headers })
    ]);
    
    setLoans(loansRes.data);
    setClients(clientsRes.data);
    setCollectors(collectorsRes.data);
  };

  const fetchWeeklyReport = async () => {
    const today = new Date();
    const monday = new Date(today.setDate(today.getDate() - today.getDay() + 1));
    const sunday = new Date(today.setDate(monday.getDate() + 6));
    
    const start = monday.toISOString().split('T')[0];
    const end = sunday.toISOString().split('T')[0];
    
    const token = localStorage.getItem('token');
    const response = await axios.get(`https://cobranza-app-production-91b6.up.railway.app/api/reports/weekly?start_date=${start}&end_date=${end}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setReport(response.data);
    setActiveTab('report');
  };

  const reassignClient = async (clientId, newCollectorId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`https://cobranza-app-production-91b6.up.railway.app/api/clients/${clientId}/reassign`, 
        { new_collector_id: newCollectorId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Cliente reasignado');
      fetchData();
    } catch (err) {
      alert('Error reasignando');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px', borderBottom: '2px solid #ccc', paddingBottom: '10px' }}>
        <button onClick={() => setActiveTab('loans')} style={{ marginRight: '10px', padding: '10px' }}>💰 Préstamos</button>
        <button onClick={() => setActiveTab('clients')} style={{ marginRight: '10px', padding: '10px' }}>👥 Clientes</button>
        <button onClick={fetchWeeklyReport} style={{ padding: '10px' }}>📊 Reporte Semanal</button>
      </div>

      {activeTab === 'loans' && (
        <div>
          <h3>Todos los Préstamos Activos ({loans.length})</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f0f0f0' }}>
                <th style={thStyle}>Cliente</th>
                <th style={thStyle}>Teléfono</th>
                <th style={thStyle}>Monto</th>
                <th style={thStyle}>Total</th>
                <th style={thStyle}>Cobrador</th>
                <th style={thStyle}>Progreso</th>
                <th style={thStyle}>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {loans.map(loan => (
                <tr key={loan.id}>
                  <td style={tdStyle}>{loan.client_name}</td>
                  <td style={tdStyle}>{loan.client_phone}</td>
                  <td style={tdStyle}>S/. {loan.principal_amount}</td>
                  <td style={tdStyle}>S/. {loan.total_amount}</td>
                  <td style={tdStyle}>{loan.collector_name}</td>
                  <td style={tdStyle}>{loan.paid_days}/24</td>
                  <td style={tdStyle}>S/. {loan.remaining}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'clients' && (
        <div>
          <h3>Todos los Clientes ({clients.length})</h3>
          <p style={{ color: '#666', fontSize: '14px' }}>Como administrador puedes reasignar clientes entre cobradores</p>
          
          <div style={{ display: 'grid', gap: '10px', marginTop: '20px' }}>
            {clients.map(client => (
              <div key={client.id} style={{ 
                padding: '15px', 
                border: '1px solid #ddd', 
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <h4 style={{ margin: '0 0 5px 0' }}>{client.name}</h4>
                  <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
                    📞 {client.phone || 'Sin teléfono'} | 📍 {client.address || 'Sin dirección'}
                  </p>
                  <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#007bff' }}>
                    Cobrador: <strong>{client.collector_name}</strong>
                  </p>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: '#666', marginRight: '5px' }}>Reasignar:</label>
                  <select 
                    onChange={(e) => reassignClient(client.id, e.target.value)}
                    defaultValue=""
                    style={{ padding: '5px' }}
                  >
                    <option value="" disabled>Seleccionar...</option>
                    {collectors.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'report' && (
        <div>
          <h3>Reporte Semanal de Cobranza</h3>
          {report.length === 0 ? (
            <p>No hay datos esta semana</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f0f0f0' }}>
                  <th style={thStyle}>Cobrador</th>
                  <th style={thStyle}>Total Semana</th>
                </tr>
              </thead>
              <tbody>
                {report.map((r, i) => (
                  <tr key={i}>
                    <td style={tdStyle}>{r.name}</td>
                    <td style={tdStyle}>S/. {r.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

const thStyle = { border: '1px solid #ccc', padding: '10px', textAlign: 'left' };
const tdStyle = { border: '1px solid #ccc', padding: '10px' };

export default AdminDashboard;
