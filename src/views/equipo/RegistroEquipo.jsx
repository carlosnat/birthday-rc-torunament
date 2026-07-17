// src/views/equipo/RegistroEquipo.jsx
// Alta de equipo desde la pantalla de equipo: crear nuevo equipo o sumarse a uno existente.

import { useEffect, useState } from 'react'
import ColorBadge from '../../components/ColorBadge.jsx'
import { coloresDisponibles } from '../../domain/colors.js'
import { avatarsDisponibles, DEFAULT_AVATAR_ID } from '../../domain/avatars.js'
import { avatarDeEquipo } from '../../domain/participants.js'
import CrearEquipoPaso from './components/CrearEquipoPaso.jsx'
import DatosIntegrantePaso from './components/DatosIntegrantePaso.jsx'
import * as R from '../../firebase/registroActions.js'
import './equipo.css'

export default function RegistroEquipo({ torneo, onListo }) {
  const disponibles = coloresDisponibles(torneo.equipos)
  const listaAvatares = avatarsDisponibles()
  const equipos = Object.entries(torneo.equipos || {})
  const [modo, setModo] = useState('crear')
  const [nombreEquipo, setNombreEquipo] = useState('')
  const [colorId, setColorId] = useState(disponibles[0]?.id || '')
  const [miNombre, setMiNombre] = useState('')
  const [avatarId, setAvatarId] = useState(DEFAULT_AVATAR_ID)
  const [eqId, setEqId] = useState(equipos[0]?.[0] || '')
  const [eqCreadoId, setEqCreadoId] = useState(null)
  const [creandoPaso, setCreandoPaso] = useState('equipo')
  const [loadingAccion, setLoadingAccion] = useState(false)
  const [msg, setMsg] = useState(null)
  const pasoActual = creandoPaso === 'equipo' ? 1 : 2

  useEffect(() => {
    if (!colorId && disponibles[0]?.id) setColorId(disponibles[0].id)
    if (!avatarId && listaAvatares[0]?.id) setAvatarId(listaAvatares[0].id)
    if (!eqId && equipos[0]?.[0]) setEqId(equipos[0][0])
  }, [disponibles, equipos, colorId, avatarId, eqId, listaAvatares])

  function resetFlujoCrear() {
    setEqCreadoId(null)
    setCreandoPaso('equipo')
    setNombreEquipo('')
    setMiNombre('')
    setAvatarId(DEFAULT_AVATAR_ID)
  }

  async function crearEquipoBase() {
    setLoadingAccion(true)
    const res = await R.crearEquipoBase(torneo, { nombre: nombreEquipo, colorId })
    setLoadingAccion(false)

    setMsg(res.ok ? { ok: true, txt: 'EQUIPO CREADO. AHORA CARGA TU PERFIL.' } : { ok: false, txt: res.motivo })
    if (res.ok) {
      setEqCreadoId(res.eqId)
      setCreandoPaso('integrante')
    }
  }

  async function completarCreacion() {
    if (!eqCreadoId) return

    setLoadingAccion(true)
    const res = await R.unirseEquipo(torneo, eqCreadoId, miNombre, avatarId)
    setLoadingAccion(false)

    setMsg(res.ok ? { ok: true, txt: '¡EQUIPO LISTO! YA PODES ENTRAR.' } : { ok: false, txt: res.motivo })
    if (res.ok) {
      onListo?.(res.eqId)
      resetFlujoCrear()
    }
  }

  async function unirse() {
    setLoadingAccion(true)
    const res = await R.unirseEquipo(torneo, eqId, miNombre, avatarId)
    setLoadingAccion(false)
    setMsg(res.ok ? { ok: true, txt: '¡TE UNISTE AL EQUIPO!' } : { ok: false, txt: res.motivo })
    if (res.ok) {
      setMiNombre('')
      onListo?.(res.eqId)
    }
  }

  return (
    <div className="app eq eq-registro stack">
      <h1>REGISTRO DE EQUIPO</h1>
      <div className="row">
        <button
          className={`btn btn--ghost ${modo === 'crear' ? 'sel' : ''}`}
          onClick={() => {
            setModo('crear')
            setMsg(null)
          }}
        >
          CREAR EQUIPO
        </button>
        <button
          className={`btn btn--ghost ${modo === 'unirse' ? 'sel' : ''}`}
          disabled={equipos.length === 0}
          onClick={() => {
            setModo('unirse')
            setMsg(null)
            resetFlujoCrear()
          }}
        >
          UNIRME A UNO
        </button>
      </div>

      {modo === 'crear' ? (
        <div className="panel stack">
          <WizardCrearEquipo pasoActual={pasoActual} />
          <h2>{creandoPaso === 'equipo' ? 'PASO 1 · NUEVO EQUIPO' : 'PASO 2 · TU PERFIL'}</h2>
          {creandoPaso === 'equipo' ? (
            <CrearEquipoPaso
              nombreEquipo={nombreEquipo}
              setNombreEquipo={setNombreEquipo}
              colorId={colorId}
              setColorId={setColorId}
              coloresDisponibles={disponibles}
              onCrear={crearEquipoBase}
              loading={loadingAccion}
            />
          ) : (
            <>
              <div className="eq-setup-hint text-dim">EQUIPO: {nombreEquipo || 'SIN NOMBRE'}</div>
              <DatosIntegrantePaso
                miNombre={miNombre}
                setMiNombre={setMiNombre}
                avatarId={avatarId}
                setAvatarId={setAvatarId}
                listaAvatares={listaAvatares}
                onConfirmar={completarCreacion}
                loading={loadingAccion}
                cta="ENTRAR"
              />
              <div className="row">
                <button
                  className="btn btn--ghost"
                  type="button"
                  onClick={() => {
                    setCreandoPaso('equipo')
                    setEqCreadoId(null)
                  }}
                >
                  VOLVER
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="panel stack">
          <h2>UNIRME A UN EQUIPO</h2>
          <div className="stack" style={{ gap: 6 }}>
            {equipos.map(([id, eq]) => (
              <button key={id} className={`equipo-pick ${eqId === id ? 'sel' : ''}`} onClick={() => setEqId(id)}>
                <ColorBadge colorId={eq.color} nombre={eq.nombre} avatarId={avatarDeEquipo(eq)} />
                <span className="text-dim">{(eq.participantes || []).length} INT.</span>
              </button>
            ))}
          </div>
          <DatosIntegrantePaso
            miNombre={miNombre}
            setMiNombre={setMiNombre}
            avatarId={avatarId}
            setAvatarId={setAvatarId}
            listaAvatares={listaAvatares}
            onConfirmar={unirse}
            loading={loadingAccion}
            cta="UNIRME"
          />
        </div>
      )}

      {msg && <div className={`panel ${msg.ok ? 'ok' : 'text-rojo'}`}>{msg.txt}</div>}
    </div>
  )
}

function WizardCrearEquipo({ pasoActual }) {
  const progreso = pasoActual === 1 ? '0%' : '100%'

  return (
    <div className="eq-wizard" aria-label="PROGRESO DE REGISTRO">
      <div className="eq-wizard-track" aria-hidden>
        <div className="eq-wizard-progress" style={{ width: progreso }} />
      </div>

      <div className="eq-wizard-steps">
        <StepWizard
          numero="1"
          total="2"
          titulo="CREAR EQUIPO"
          estado={pasoActual >= 1 ? (pasoActual > 1 ? 'done' : 'active') : 'idle'}
        />
        <StepWizard
          numero="2"
          total="2"
          titulo="TU PERFIL"
          estado={pasoActual >= 2 ? 'active' : 'idle'}
        />
      </div>
    </div>
  )
}

function StepWizard({ numero, total, titulo, estado }) {
  return (
    <div className={`eq-wizard-step is-${estado}`}>
      <div className="eq-wizard-badge">{numero}/{total}</div>
      <div className="eq-wizard-title">{titulo}</div>
    </div>
  )
}