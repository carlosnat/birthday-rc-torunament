// src/views/publico/Publico.jsx
// Hito 6: pantalla PÚBLICA (proyector/TV). La estrella. Refleja el estado (onValue)
// y le pone show de F1: semáforo con sonido, timing tower, bandera, podio y confeti.
// No calcula reglas de negocio: solo deriva vistas del estado.

import { useState } from 'react'
import { useTorneo } from '../../context/TournamentContext.jsx'
import QRRegistro from '../../components/QRRegistro.jsx'
import ColorBadge from '../../components/ColorBadge.jsx'
import SemaforoF1 from '../../components/SemaforoF1.jsx'
import TablaPosiciones from '../../components/TablaPosiciones.jsx'
import BanderaCuadros from '../../components/BanderaCuadros.jsx'
import Podio from '../../components/Podio.jsx'
import Confeti from '../../components/Confeti.jsx'
import TablaPuntos from '../../components/TablaPuntos.jsx'
import { clasificar, vueltaRapida } from '../../domain/classification.js'
import { puntosAcumulados, calcularGaps } from '../../domain/standings.js'
import { TORNEO, SESION } from '../../domain/constants.js'
import { urlRol } from '../../currentTorneo.js'
import { unlockAudio } from '../../utils/audio.js'
import './publico.css'

export default function Publico() {
  const { torneo, loading } = useTorneo()
  const [sonido, setSonido] = useState(false)

  if (loading) return <div className="pub pub-center">CARGANDO…</div>
  if (!torneo) return <div className="pub pub-center">TORNEO NO ENCONTRADO</div>

  const equipos = torneo.equipos || {}
  const s = torneo.sesionActiva ? torneo.sesiones?.[torneo.sesionActiva] : null
  const orden = s ? clasificar(s.carritos, s.tipo, torneo.config.puntuacion) : []
  const gaps = calcularGaps(orden)
  const vr = s ? vueltaRapida(s.carritos) : null
  const standings = puntosAcumulados(torneo)

  return (
    <div className="pub">
      {!sonido && (
        <button className="audio-unlock" onClick={() => { unlockAudio(); setSonido(true) }}>
          🔊 TOCÁ PARA ACTIVAR EL SONIDO
        </button>
      )}

      <Header torneo={torneo} s={s} orden={orden} />

      {torneo.estado === TORNEO.REGISTRO && <VistaRegistro torneo={torneo} equipos={equipos} />}

      {torneo.estado === TORNEO.EN_CURSO && s && (
        <VistaSesion s={s} orden={orden} gaps={gaps} equipos={equipos} vr={vr} standings={standings} sonido={sonido} />
      )}

      {torneo.estado === TORNEO.FINALIZADO && (
        <VistaCampeon standings={standings} equipos={equipos} />
      )}
    </div>
  )
}

function Header({ torneo, s, orden }) {
  const lider = orden[0]
  return (
    <div className="pub-header">
      <div className="pub-title">{torneo.config?.nombre}</div>
      <div className="pub-sub">
        {torneo.circuitoActivo && <span>{torneo.circuitoActivo}</span>}
        {s && <span>· {s.tipo}</span>}
        {s && s.vueltasObjetivo > 0 && lider && <span>· VUELTA {Math.min(lider.vueltas, s.vueltasObjetivo)}/{s.vueltasObjetivo}</span>}
        {s && <span className="pub-estado">{s.estado}</span>}
      </div>
    </div>
  )
}

function VistaRegistro({ torneo, equipos }) {
  const lista = Object.entries(equipos)
  return (
    <div className="pub-registro">
      <div className="pub-registro-qr stack" style={{ gap: 16 }}>
        <div>
          <div className="pub-registro-cta">ESCANEÁ Y SUMATE</div>
          <div className="pub-dim">ALTA DE EQUIPOS</div>
          <QRRegistro url={urlRol('equipo')} size={320} />
        </div>
        <div>
          <div className="pub-registro-cta">ESCANEÁ Y SUMATE</div>
          <div className="pub-dim">ALTA DE SENSORES</div>
          <QRRegistro url={urlRol('sensor')} size={320} />
        </div>
      </div>
      <div className="pub-registro-equipos">
        <div className="puntos-titulo">EQUIPOS ({lista.length})</div>
        {lista.length === 0 && <div className="pub-dim">TODAVÍA NADIE… ¡ANIMATE!</div>}
        {lista.map(([id, eq]) => (
          <div key={id} className="pub-equipo-row">
            <ColorBadge colorId={eq.color} nombre={eq.nombre} />
            <span className="pub-dim">{(eq.participantes || []).length} INT.</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function VistaSesion({ s, orden, gaps, equipos, vr, standings, sonido }) {
  const enLargada = s.estado === SESION.LARGADA || s.estado === SESION.EN_CURSO
  const finalizada = s.estado === SESION.FINALIZADA

  if (finalizada) {
    return (
      <div className="pub-final">
        <Confeti active />
        <Podio orden={s.resultados || orden} equipos={equipos} />
        <TablaPuntos standings={standings} equipos={equipos} />
      </div>
    )
  }

  return (
    <div className="pub-carrera">
      <div className="pub-carrera-main">
        {s.estado === SESION.BANDERA && <BanderaCuadros />}
        {(s.estado === SESION.LARGADA || (s.estado === SESION.EN_CURSO)) && s.estado !== SESION.BANDERA && (
          <SemaforoSiCorresponde s={s} sonido={sonido} />
        )}
        {vr && vr.ms != null && (
          <div className="vuelta-rapida">
            <span className="vr-tag">VUELTA RÁPIDA</span>
            <ColorBadge colorId={equipos[vr.eqId]?.color} nombre={equipos[vr.eqId]?.nombre} />
            <span className="vr-time">{(vr.ms / 1000).toFixed(2)}s</span>
          </div>
        )}
      </div>
      <div className="pub-carrera-tower">
        <TablaPosiciones orden={orden} gaps={gaps} equipos={equipos} vueltaRapidaEq={vr?.eqId} />
      </div>
    </div>
  )
}

// El semáforo solo tiene sentido en LARGADA y en el instante del verde (EN_CURSO).
// Una vez la carrera avanza, lo ocultamos para dar lugar a la timing tower.
function SemaforoSiCorresponde({ s, sonido }) {
  if (s.estado === SESION.LARGADA) return <SemaforoF1 estado={s.estado} sonido={sonido} />
  // En EN_CURSO mostramos el semáforo (para el flash de largada) solo si nadie completó vueltas aún.
  const alguienConVueltas = Object.values(s.carritos || {}).some((c) => (c.vueltas || 0) > 0 || c.cronoInicio)
  if (!alguienConVueltas) return <SemaforoF1 estado={s.estado} sonido={sonido} />
  return null
}

function VistaCampeon({ standings, equipos }) {
  // Construye un "podio" a partir del campeonato acumulado.
  const orden = standings.map((s, i) => ({ eqId: s.eqId, posicion: i + 1, puntos: s.puntos }))
  return (
    <div className="pub-final">
      <Confeti active />
      <div className="pub-campeon">🏆 CAMPEÓN DEL TORNEO 🏆</div>
      <Podio orden={orden} equipos={equipos} />
      <TablaPuntos standings={standings} equipos={equipos} />
    </div>
  )
}
