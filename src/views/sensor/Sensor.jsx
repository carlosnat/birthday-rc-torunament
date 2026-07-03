// src/views/sensor/Sensor.jsx
// Hito 3: sensor de meta. Cámara + detección multi-color + overlay de debug.
//  - Sin ?t: modo CALIBRACIÓN (standalone, no escribe RTDB).
//  - Con ?t: se registra por QR y ENVÍA pasadas (solo el sensor en orden 0 = meta cuenta
//    vueltas) + heartbeat cada 5 s.

import { useState, useCallback, useEffect, useRef } from 'react'
import { useDetector } from '../../hooks/useDetector.js'
import { useTorneo } from '../../context/TournamentContext.jsx'
import { COLORES_LISTA, getColor } from '../../domain/colors.js'
import { TORNEO_ID } from '../../currentTorneo.js'
import * as R from '../../firebase/registroActions.js'
import { pasadaPorColor } from '../../firebase/raceActions.js'
import RegistroSensor from './RegistroSensor.jsx'
import './sensor.css'

const MAX_LOG = 20
const LS_KEY = TORNEO_ID ? `sensor:${TORNEO_ID}` : null

export default function Sensor() {
  const { torneo } = useTorneo()
  const [threshold, setThreshold] = useState(800)
  const [log, setLog] = useState([])
  const [sensorId, setSensorId] = useState(() => (LS_KEY ? localStorage.getItem(LS_KEY) : null))
  const [bateria, setBateria] = useState(null)

  const sensorInfo = sensorId ? torneo?.sensores?.[sensorId] : null
  const registrado = !!sensorInfo
  const esMeta = sensorInfo?.orden === 0

  // Refs para que el hot-loop y el heartbeat lean el último estado sin recrear el detector.
  const torneoRef = useRef(torneo)
  const metaRef = useRef(esMeta)
  const bateriaRef = useRef(bateria)
  const fpsRef = useRef(0)
  useEffect(() => { torneoRef.current = torneo }, [torneo])
  useEffect(() => { metaRef.current = esMeta }, [esMeta])
  useEffect(() => { bateriaRef.current = bateria }, [bateria])

  const onDetection = useCallback((d) => {
    let enviado = false
    if (TORNEO_ID && metaRef.current && torneoRef.current) {
      enviado = true
      pasadaPorColor(torneoRef.current, d.colorId, Date.now())
    }
    setLog((prev) => [{ ...d, hora: new Date().toLocaleTimeString(), enviado }, ...prev].slice(0, MAX_LOG))
  }, [])

  const { videoRef, canvasRef, start, stop, running, error, stats } = useDetector({ threshold, onDetection })
  useEffect(() => { fpsRef.current = stats.fps }, [stats.fps])

  // Batería (si el navegador lo soporta).
  useEffect(() => {
    navigator.getBattery?.().then((b) => {
      const upd = () => setBateria(Math.round(b.level * 100))
      upd()
      b.addEventListener('levelchange', upd)
    })
  }, [])

  // Heartbeat cada 5 s mientras la cámara corre y el sensor está registrado.
  useEffect(() => {
    if (!TORNEO_ID || !sensorId || !running) return
    const tick = () => R.heartbeat(sensorId, { fps: fpsRef.current, bateria: bateriaRef.current })
    tick()
    const id = setInterval(tick, 5000)
    return () => clearInterval(id)
  }, [sensorId, running])

  const maxPix = Math.max(threshold * 1.5, ...COLORES_LISTA.map((c) => stats.pixels[c.id] || 0))
  const sesionActiva = torneo?.sesionActiva ? torneo.sesiones?.[torneo.sesionActiva] : null

  return (
    <div className="app sensor stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>SENSOR {TORNEO_ID ? '' : '(CALIBRACIÓN)'}</h1>
        <span className="chip-estado">{stats.fps} FPS</span>
      </div>

      {TORNEO_ID && !registrado && (
        <RegistroSensor onListo={(id) => {
          if (LS_KEY) localStorage.setItem(LS_KEY, id)
          setSensorId(id)
        }} />
      )}

      {registrado && (
        <div className="panel row" style={{ justifyContent: 'space-between' }}>
          <span><b>{sensorInfo.nombre}</b> · ORDEN {sensorInfo.orden}</span>
          <span className={esMeta ? 'text-verde' : 'text-dim'}>{esMeta ? '🏁 META (CUENTA VUELTAS)' : 'SECTOR (INFO)'}</span>
        </div>
      )}

      {registrado && !sesionActiva && (
        <div className="panel text-dim">NO HAY SESIÓN ACTIVA: LAS DETECCIONES NO CUENTAN AÚN.</div>
      )}

      <div className="video-wrap">
        <video ref={videoRef} playsInline muted className="video" />
        <div className="meta-strip" />
        <canvas ref={canvasRef} className="hidden-canvas" />
      </div>

      <div className="row">
        {!running ? (
          <button className="btn btn--primary" onClick={start}>ENCENDER CÁMARA</button>
        ) : (
          <button className="btn" onClick={stop}>APAGAR</button>
        )}
        {bateria != null && <span className="chip-estado">🔋 {bateria}%</span>}
      </div>

      {error && <div className="panel text-rojo">ERROR: {error}</div>}

      {!window.isSecureContext && (
        <div className="panel">
          <h2>DIAGNÓSTICO</h2>
          <div>ORIGIN: <b>{window.location.origin}</b></div>
          <div>CONTEXTO SEGURO: <b className="text-rojo">NO</b></div>
          <div className="text-dim" style={{ marginTop: 8 }}>
            COPIÁ EL ORIGIN EN chrome://flags/#unsafely-treat-insecure-origin-as-secure, PONELO EN ENABLED Y REINICIÁ CHROME.
          </div>
        </div>
      )}

      <div className="panel stack">
        <h2>UMBRAL: {threshold} PX</h2>
        <input type="range" min="200" max="3000" step="50" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />
        <div className="bars">
          {COLORES_LISTA.map((c) => {
            const px = stats.pixels[c.id] || 0
            const activo = px >= threshold
            return (
              <div key={c.id} className="bar-row">
                <span className="dot" style={{ background: c.hex }} />
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${Math.min(100, (px / maxPix) * 100)}%`, background: c.hex }} />
                  <div className="bar-threshold" style={{ left: `${Math.min(100, (threshold / maxPix) * 100)}%` }} />
                </div>
                <span className={`bar-val ${activo ? 'text-verde' : 'text-dim'}`}>{px}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="panel">
        <h2>DETECCIONES</h2>
        <div className="log">
          {log.length === 0 && <span className="text-dim">SIN DETECCIONES AÚN…</span>}
          {log.map((d, i) => (
            <div key={i} className="log-item">
              <span className="log-time">{d.hora}</span>{' '}
              <span className="dot" style={{ background: getColor(d.colorId)?.hex }} />{' '}
              <b>{d.colorId.toUpperCase()}</b> · {d.pixels} PX{' '}
              {TORNEO_ID && (d.enviado ? <span className="text-verde">→ RTDB</span> : <span className="text-dim">(no cuenta)</span>)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
