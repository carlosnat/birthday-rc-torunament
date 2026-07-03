// src/components/SensorHealth.jsx
// Monitor de salud de un sensor: antigüedad del heartbeat, fps, batería, orden y META.

const STALE_MS = 15000 // sin latido > 15 s => se considera caído

export default function SensorHealth({ sensor, now, esMeta, onSubir, onBajar }) {
  const edad = sensor.lastHeartbeat ? now - sensor.lastHeartbeat : null
  const caido = edad == null || edad > STALE_MS
  return (
    <div className="sensor-health">
      <div className="row" style={{ gap: 8 }}>
        <span className={`dot ${caido ? 'dot-rojo' : 'dot-verde'}`} />
        <b>{sensor.orden}· {sensor.nombre}</b>
        {esMeta && <span className="chip-estado">🏁 META</span>}
      </div>
      <div className="row text-dim" style={{ gap: 12 }}>
        <span>{caido ? 'SIN SEÑAL' : `${Math.round(edad / 1000)}s`}</span>
        <span>{sensor.fps != null ? `${sensor.fps} FPS` : '—'}</span>
        <span>{sensor.bateria != null ? `🔋 ${sensor.bateria}%` : '—'}</span>
      </div>
      <div className="row">
        <button className="btn btn--ghost" onClick={onSubir}>▲</button>
        <button className="btn btn--ghost" onClick={onBajar}>▼</button>
      </div>
    </div>
  )
}
