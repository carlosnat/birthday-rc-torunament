// src/components/BanderaCuadros.jsx
// Bandera a cuadros animada para el final de carrera.
import './bandera.css'

export default function BanderaCuadros({ texto = 'BANDERA A CUADROS' }) {
  return (
    <div className="bandera-wrap">
      <div className="bandera" />
      <div className="bandera-texto">🏁 {texto} 🏁</div>
    </div>
  )
}

