import React, { useState } from 'react';
import axios from 'axios';

function NewLoanForm({ client, onSave, onCancel }) {
  const [amount, setAmount] = useState('');
  const [calculated, setCalculated] = useState(null);

  const calculate = (val) => {
    const principal = parseFloat(val);
    if (!principal) return null;
    
    const total = principal * 1.20;
    const daily = total / 24;
    
    return {
      principal,
      total: total.toFixed(2),
      daily: daily.toFixed(2)
    };
  };

  const handleAmountChange = (e) => {
    const val = e.target.value;
    setAmount(val);
    setCalculated(calculate(val));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!calculated) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:3001/api/loans', {
        client_id: client.id,
        principal_amount: calculated.principal
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert(`Préstamo creado:\nTotal: S/. ${calculated.total}\n24 cuotas de S/. ${calculated.daily}`);
      onSave();
    } catch (err) {
      alert('Error creando préstamo');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px' }}>
      <button onClick={onCancel} style={{ marginBottom: '20px' }}>← Volver</button>
      <h3>Nuevo Préstamo</h3>
      
      <div style={{ padding: '15px', background: '#f8f9fa', borderRadius: '8px', marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 10px 0' }}>Cliente: {client.name}</h4>
        <p style={{ margin: '0', color: '#666' }}>📞 {client.phone || 'Sin teléfono'}</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px' }}>
          <label>Monto a prestar (S/.): *</label>
          <input
            type="number"
            value={amount}
            onChange={handleAmountChange}
            style={{ width: '100%', padding: '15px', fontSize: '18px', borderRadius: '5px', border: '1px solid #ccc' }}
            placeholder="Ej: 400"
            required
            min="1"
          />
        </div>

        {calculated && (
          <div style={{ padding: '20px', background: '#d4edda', borderRadius: '8px', marginBottom: '20px' }}>
            <h4 style={{ marginTop: 0 }}>Resumen del Préstamo:</h4>
            <p style={{ margin: '8px 0' }}><strong>Préstamo:</strong> S/. {calculated.principal}</p>
            <p style={{ margin: '8px 0' }}><strong>Interés (20%):</strong> S/. {(calculated.principal * 0.20).toFixed(2)}</p>
            <p style={{ margin: '8px 0', fontSize: '18px' }}><strong>Total a pagar:</strong> S/. {calculated.total}</p>
            <p style={{ margin: '8px 0', color: '#155724' }}><strong>24 cuotas de:</strong> S/. {calculated.daily}</p>
          </div>
        )}

        <button type="submit" disabled={!calculated} style={{ 
          width: '100%', 
          padding: '15px', 
          background: calculated ? '#28a745' : '#ccc', 
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          fontSize: '16px',
          cursor: calculated ? 'pointer' : 'not-allowed'
        }}>
          ✅ Crear Préstamo
        </button>
      </form>
    </div>
  );
}

export default NewLoanForm;