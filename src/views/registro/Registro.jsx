// src/views/registro/Registro.jsx
// Alta autoservicio por QR (Hito 2). Se abre en el celular: ?t=uuid&rol=registro
// Permite crear equipo, unirse a uno existente o registrar un sensor de pista.

import { useState } from 'react'
import { useTorneo } from '../../context/TournamentContext.jsx'
import ColorBadge from '../../components/ColorBadge.jsx'
import { coloresDisponibles } from '../../domain/colors.js'
import { TORNEO } from '../../domain/constants.js'
import * as R from '../../firebase/registroActions.js'
import './registro.css'

export default function Registro() {
  const { torneo, loading } = useTorneo()
  const [tab, setTab] = useState('equipo')

  if (loading) return <div className="app">CARGANDO…</div>
  if (!torneo) return <div className="app">TORNEO NO ENCONTRADO</div>
  if (torneo.estado !== TORNEO.REGISTRO) {
    return (
      <div className="app stack">
        <h1>{torneo.config?.nombre}</h1>
        <div className="panel">EL REGISTRO ESTÁ CERRADO ({torneo.estado}).</div>
      </div>
    )
  }

  return (
    <div className="app stack">
      <h1>{torneo.config?.nombre}</h1>
      <div className="row">
        <button className={`btn ${tab === 'equipo' ? 'btn--primary' : ''}`} onClick={() => setTab('equipo')}>SOY EQUIPO</button>
        <button className={`btn ${tab === 'sensor' ? 'btn--primary' : ''}`} onClick={() => setTab('sensor')}>SOY SENSOR</button>
      </div>
      {tab === 'equipo' ? <RegistroEquipo torneo={torneo} /> : <RegistroSensor />}
    </div>
  )
}

function RegistroEquipo({ torneo }) {
  const disponibles = coloresDisponibles(torneo.equipos)
  const equipos = Object.entries(torneo.equipos || {})
  const [modo, setModo] = useState('crear') // crear | unirse
  const [nombreEquipo, setNombreEquipo] = useState('')
  const [colorId, setColorId] = useState(disponibles[0]?.id || '')
  const [miNombre, setMiNombre] = useState('')
  const [eqId, setEqId] = useState(equipos[0]?.[0] || '')
  const [msg, setMsg] = useState(null)

  async function crear() {
    const res = await R.crearEquipo(torneo, { nombre: nombreEquipo, colorId, participante: miNombre })
    setMsg(res.ok ? { ok: true, txt: '¡EQUIPO CREADO! YA PODÉS CERRAR.' } : { ok: false, txt: res.motivo })
    if (res.ok) { setNombreEquipo(''); setMiNombre('') }
  }

  async function unirse() {
    const res = await R.unirseEquipo(torneo, eqId, miNombre)
    setMsg(res.ok ? { ok: true, txt: '¡TE UNISTE AL EQUIPO!' } : { ok: false, txt: res.motivo })
    if (res.ok) setMiNombre('')
  }

  return (
    <div className="stack">
      <div className="row">
        <button className={`btn btn--ghost ${modo === 'crear' ? 'sel' : ''}`} onClick={() => setModo('crear')}>CREAR EQUIPO</button>
        <button className={`btn btn--ghost ${modo === 'unirse' ? 'sel' : ''}`} disabled={equipos.length === 0} onClick={() => setModo('unirse')}>UNIRME A UNO</button>
      </div>

      {modo === 'crear' ? (
        <div className="panel stack">
          <h2>NUEVO EQUIPO</h2>
          {disponibles.length === 0 ? (
            <div className="text-rojo">NO QUEDAN COLORES LIBRES. UNITE A UN EQUIPO EXISTENTE.</div>
          ) : (
            <>
              <input className="input" placeholder="NOMBRE DEL EQUIPO" value={nombreEquipo} onChange={(e) => setNombreEquipo(e.target.value)} />
              <div className="row">
                {disponibles.map((c) => (
                  <button
                    key={c.id}
                    className={`color-pick ${colorId === c.id ? 'sel' : ''}`}
                    style={{ background: c.hex }}
                    onClick={() => setColorId(c.id)}
                    title={c.nombre}
                  />
                ))}
              </div>
              <input className="input" placeholder="TU NOMBRE" value={miNombre} onChange={(e) => setMiNombre(e.target.value)} />
              <button className="btn btn--primary" disabled={!nombreEquipo || !miNombre || !colorId} onClick={crear}>CREAR</button>
            </>
          )}
        </div>
      ) : (
        <div className="panel stack">
          <h2>UNIRME A UN EQUIPO</h2>
          <div className="stack" style={{ gap: 6 }}>
            {equipos.map(([id, eq]) => (
              <button key={id} className={`equipo-pick ${eqId === id ? 'sel' : ''}`} onClick={() => setEqId(id)}>
                <ColorBadge colorId={eq.color} nombre={eq.nombre} />
                <span className="text-dim">{(eq.participantes || []).length} INT.</span>
              </button>
            ))}
          </div>
          <input className="input" placeholder="TU NOMBRE" value={miNombre} onChange={(e) => setMiNombre(e.target.value)} />
          <button className="btn btn--primary" disabled={!eqId || !miNombre} onClick={unirse}>UNIRME</button>
        </div>
      )}

      {msg && <div className={`panel ${msg.ok ? 'ok' : 'text-rojo'}`}>{msg.txt}</div>}
    </div>
  )
}

function RegistroSensor() {
  const [nombre, setNombre] = useState('')
  const [msg, setMsg] = useState(null)

  async function registrar() {
    const res = await R.registrarSensor(nombre)
    setMsg(res.ok ? '¡SENSOR REGISTRADO! EL COMISARIO LO ORDENARÁ EN PISTA.' : res.motivo)
    if (res.ok) setNombre('')
  }

  return (
    <div className="panel stack">
      <h2>REGISTRAR SENSOR</h2>
      <input className="input" placeholder='NOMBRE (EJ: "META (JUAN)")' value={nombre} onChange={(e) => setNombre(e.target.value)} />
      <button className="btn btn--primary" disabled={!nombre} onClick={registrar}>REGISTRAR</button>
      {msg && <div className="text-dim">{msg}</div>}
    </div>
  )
}
