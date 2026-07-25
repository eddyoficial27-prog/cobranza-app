import React, { useState } from 'react';
import axios from 'axios';

function LoanGrid({ loan, onBack, onPaymentComplete }) {
  const [message, setMessage] = useState('');

  const handlePayment = async (dayNumber) => {
    if (!window.confirm(`¿Confirmar cobro del día ${dayNumber} por S/. ${loan.daily_payment}?`)) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:3001/api/payments', {
        loan_id: loan.id,
        day_number: dayNumber,
        amount: loan.daily_payment,
        notes: ''
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage(`✓ Día ${dayNumber} cobrado correctamente`);
      setTimeout(() => {
        setMessage('');
        onPaymentComplete();
      }, 1500);
    } catch (err) {
      alert(err.response?.data?.error || 'Error al registrar pago');
    }
  };

  const days = Array.from({ length: 24 }, (_, i) => i + 1);
  const paidDays = new Set(loan.payments?.map(p => p.day_number) || []);

  return (
    <div style={{ padding: '20px' }}>
      <button onClick={onBack}>← Volver</button>
      
      <div style={{ margin: '20px 0', padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
        <h3 style={{ margin: '0 0 10px 0' }}>{loan.client_name}</h3>
        <p style={{ margin: '5px 0' }}>📞 {loan.client_phone}</p>
        <hr style={{ margin: '10px 0', border: 'none', borderTop: '1px solid #ddd' }}/>
        <p style={{ margin: '5px 0' }}>Total: S/. {loan.total_amount} | Cuota: S/. {loan.daily_payment}</p>
        <p style={{ margin: '5px 0' }}>Progreso: {loan.paid_days}/24 días | Saldo: S/. {loan.remaining}</p>
      </div>

      {message && <p style={{ color: 'green', fontWeight: 'bold', padding: '10px', background: '#d4edda', borderRadius: '5px' }}>{message}</p>}
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', 
        gap: '10px', 
        marginTop: '20px' 
      }}>
        {days.map(day => {
          const isPaid = paidDays.has(day);
          return (
            <button
              key={day}
              disabled={isPaid}
              onClick={() => handlePayment(day)}
              style={{
                padding: '15px 5px',
                border: '2px solid #ccc',
                borderRadius: '8px',
                background: isPaid ? '#28a745' : 'white',
                color: isPaid ? 'white' : 'black',
                cursor: isPaid ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                fontSize: '14px'
              }}
            >
              Día {day}<br/>
              {isPaid ? '✓ PAGADO' : `S/.${loan.daily_payment}`}
            </button>
          );
        })}
      </div>
      
      <p style={{ marginTop: '20px', color: '#666', fontSize: '14px', padding: '10px', background: '#fff3cd', borderRadius: '5px' }}>
        ℹ️ Los días verdes ya están cobrados y no se pueden modificar. Solo el administrador puede corregir pagos.
      </p>
    </div>
  );
}

export default LoanGrid;