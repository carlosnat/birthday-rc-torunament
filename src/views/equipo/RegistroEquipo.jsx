// src/views/equipo/RegistroEquipo.jsx
// Alta de equipo desde la pantalla de equipo: crear nuevo equipo o sumarse a uno existente.

import { useEffect, useState } from 'react'
import ColorBadge from '../../components/ColorBadge.jsx'
import AvatarSprite from '../../components/AvatarSprite.jsx'
import { coloresDisponibles } from '../../domain/colors.js'
import { avatarsDisponibles, DEFAULT_AVATAR_ID } from '../../domain/avatars.js'
import { avatarDeEquipo } from '../../domain/participants.js'
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
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    if (!colorId && disponibles[0]?.id) setColorId(disponibles[0].id)
    if (!avatarId && listaAvatares[0]?.id) setAvatarId(listaAvatares[0].id)
    if (!eqId && equipos[0]?.[0]) setEqId(equipos[0][0])
  }, [disponibles, equipos, colorId, avatarId, eqId, listaAvatares])

  async function crear() {
    const res = await R.crearEquipo(torneo, { nombre: nombreEquipo, colorId, participante: miNombre, avatarId })
    setMsg(res.ok ? { ok: true, txt: '¡EQUIPO CREADO! YA PODÉS ENTRAR.' } : { ok: false, txt: res.motivo })
    if (res.ok) {
      setNombreEquipo('')
      setMiNombre('')
      onListo?.(res.eqId)
    }
  }

  async function unirse() {
    const res = await R.unirseEquipo(torneo, eqId, miNombre, avatarId)
    setMsg(res.ok ? { ok: true, txt: '¡TE UNISTE AL EQUIPO!' } : { ok: false, txt: res.motivo })
    if (res.ok) {
      setMiNombre('')
      onListo?.(res.eqId)
    }
  }

  return (
    <div className="app eq stack">
      <h1>REGISTRO DE EQUIPO</h1>
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
              <AvatarSelector listaAvatares={listaAvatares} avatarId={avatarId} setAvatarId={setAvatarId} />
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
                <ColorBadge colorId={eq.color} nombre={eq.nombre} avatarId={avatarDeEquipo(eq)} />
                <span className="text-dim">{(eq.participantes || []).length} INT.</span>
              </button>
            ))}
          </div>
          <AvatarSelector listaAvatares={listaAvatares} avatarId={avatarId} setAvatarId={setAvatarId} />
          <input className="input" placeholder="TU NOMBRE" value={miNombre} onChange={(e) => setMiNombre(e.target.value)} />
          <button className="btn btn--primary" disabled={!eqId || !miNombre} onClick={unirse}>UNIRME</button>
        </div>
      )}

      {msg && <div className={`panel ${msg.ok ? 'ok' : 'text-rojo'}`}>{msg.txt}</div>}
    </div>
  )
}

function AvatarSelector({ listaAvatares, avatarId, setAvatarId }) {
  if (!listaAvatares.length) {
    return <div className="text-rojo">NO HAY AVATARES DISPONIBLES EN assets/images.</div>
  }

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="text-dim">ELEGÍ TU AVATAR</div>
      <div className="avatar-grid">
        {listaAvatares.map((avatar) => (
          <button
            key={avatar.id}
            type="button"
            className={`avatar-option ${avatarId === avatar.id ? 'selected' : ''}`}
            onClick={() => setAvatarId(avatar.id)}
            title={avatar.nombre}
          >
            <AvatarSprite avatarId={avatar.id} size={72} alt={avatar.nombre} />
          </button>
        ))}
      </div>
    </div>
  )
}