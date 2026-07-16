// src/views/publico/Publico.jsx
// Hito 6: pantalla PÚBLICA (proyector/TV). La estrella. Refleja el estado (onValue)
// y le pone show de F1: semáforo con sonido, timing tower, bandera, podio y confeti.
// No calcula reglas de negocio: solo deriva vistas del estado.

import { useState } from 'react'
import { useTorneo } from '../../context/TournamentContext.jsx'
import { useNow } from '../../hooks/useNow.js'
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
import { avatarDeEquipo } from '../../domain/participants.js'
import { esSesionTemporizada, formatCountdown, tiempoRestanteEn } from '../../domain/sessionTimer.js'
import { urlRol } from '../../currentTorneo.js'
import { unlockAudio } from '../../utils/audio.js'
import './publico.css'

export default function Publico() {
  const { torneo, loading } = useTorneo()
  const [sonido, setSonido] = useState(false)
  const now = useNow(1000)

  if (loading) return <div className="pub pub-center">CARGANDO…</div>
  if (!torneo) return <div className="pub pub-center">TORNEO NO ENCONTRADO</div>

  const equipos = torneo.equipos || {}
  const s = torneo.sesionActiva ? torneo.sesiones?.[torneo.sesionActiva] : null
  const orden = s ? clasificar(s.carritos, s.tipo, torneo.config.puntuacion) : []
  const gaps = calcularGaps(orden)
  const vr = s ? vueltaRapida(s.carritos) : null
  const standings = puntosAcumulados(torneo)
  const sesionFinalizada = s?.estado === SESION.FINALIZADA
  const mostrarConfeti = torneo.estado === TORNEO.FINALIZADO || sesionFinalizada

  return (
    <div className="pub">
      {mostrarConfeti && <Confeti active />}

      {!sonido && (
        <button className="audio-unlock" onClick={() => { unlockAudio(); setSonido(true) }}>
          🔊 TOCÁ PARA ACTIVAR EL SONIDO
        </button>
      )}

      <Header torneo={torneo} s={s} orden={orden} now={now} />

      <div className="pub-row-2">
        <div className="pub-col-main">
          <BestLapPanel vr={vr} equipos={equipos} pilotosSesion={s?.pilotos} />
          {torneo.estado === TORNEO.REGISTRO && <RegistroQRPanel />}

          {torneo.estado === TORNEO.EN_CURSO && s && (
            <SesionVisualPanel s={s} orden={orden} equipos={equipos} standings={standings} sonido={sonido} />
          )}

          {torneo.estado === TORNEO.FINALIZADO && (
            <CampeonVisualPanel standings={standings} equipos={equipos} />
          )}
        </div>

        <div className="pub-col-times">
          <TimesPanel torneo={torneo} s={s} orden={orden} gaps={gaps} standings={standings} equipos={equipos} vr={vr} />
        </div>
      </div>

      <FilaTresPlaceholder />
    </div>
  )
}

function Header({ torneo, s, orden, now }) {
  const lider = orden[0]
  const temporizada = esSesionTemporizada(s)
  const restanteMs = temporizada ? tiempoRestanteEn(s, now) : null

  return (
    <div className="pub-header">
      <div className="pub-title">{torneo.config?.nombre}</div>
      <div className="pub-sub">
        {torneo.circuitoActivo && <span>{torneo.circuitoActivo}</span>}
        {s && <span>· {s.tipo}</span>}
        {s && s.vueltasObjetivo > 0 && lider && <span>· VUELTA {Math.min(lider.vueltas, s.vueltasObjetivo)}/{s.vueltasObjetivo}</span>}
        {temporizada && <span>· TIEMPO RESTANTE {formatCountdown(restanteMs)}</span>}
        {s && <span className="pub-estado">{s.estado}</span>}
      </div>
    </div>
  )
}

function BestLapPanel({ vr, equipos, pilotosSesion }) {
  const avatarId = vr ? avatarDeEquipo(equipos[vr.eqId], pilotosSesion?.[vr.eqId]) : null
  return (
    <div className="pub-panel">
      <div className="pub-panel-title">BEST LAP</div>
      {vr && vr.ms != null ? (
        <div className="vuelta-rapida">
          <span className="vr-tag">VUELTA RÁPIDA</span>
          <ColorBadge colorId={equipos[vr.eqId]?.color} nombre={equipos[vr.eqId]?.nombre} avatarId={avatarId} />
          <span className="vr-time">{(vr.ms / 1000).toFixed(2)}s</span>
        </div>
      ) : (
        <div className="pub-dim">SIN VUELTA RÁPIDA AÚN</div>
      )}
    </div>
  )
}

function RegistroQRPanel() {
  return (
    <div className="pub-panel pub-qr-grid">
      <div>
        <div className="pub-registro-cta">ESCANEÁ Y SUMATE</div>
        <div className="pub-dim">ALTA DE EQUIPOS</div>
        <QRRegistro url={urlRol('equipo')} size={220} />
      </div>
      <div>
        <div className="pub-registro-cta">ESCANEÁ Y SUMATE</div>
        <div className="pub-dim">ALTA DE SENSORES</div>
        <QRRegistro url={urlRol('sensor')} size={220} />
      </div>
    </div>
  )
}

function SesionVisualPanel({ s, orden, equipos, standings, sonido }) {
  const finalizada = s.estado === SESION.FINALIZADA

  if (finalizada) return <PodioPanel orden={s.resultados || orden} equipos={equipos} standings={standings} pilotosSesion={s.pilotos} />

  return (
    <div className="pub-panel pub-visual-panel">
      {s.estado === SESION.BANDERA && <BanderaCuadros />}
      {(s.estado === SESION.LARGADA || s.estado === SESION.EN_CURSO) && s.estado !== SESION.BANDERA && (
        <SemaforoSiCorresponde s={s} sonido={sonido} />
      )}
    </div>
  )
}

function PodioPanel({ orden, equipos, standings, pilotosSesion }) {
  return (
    <div className="pub-panel pub-visual-panel">
      <Podio orden={orden} equipos={equipos} pilotosSesion={pilotosSesion} />
      {standings?.length > 0 && <TablaPuntos standings={standings} equipos={equipos} pilotosSesion={pilotosSesion} />}
    </div>
  )
}

function CampeonVisualPanel({ standings, equipos }) {
  const orden = standings.map((row, i) => ({ eqId: row.eqId, posicion: i + 1, puntos: row.puntos }))
  return (
    <div className="pub-panel pub-visual-panel">
      <div className="pub-campeon">🏆 CAMPEÓN DEL TORNEO 🏆</div>
      <Podio orden={orden} equipos={equipos} />
    </div>
  )
}

function TimesPanel({ torneo, s, orden, gaps, standings, equipos, vr }) {
  if (torneo.estado === TORNEO.REGISTRO) {
    const lista = Object.entries(equipos)
    return (
      <div className="pub-panel">
        <div className="pub-panel-title">INSCRIPTOS ({lista.length})</div>
        {lista.length === 0 && <div className="pub-dim">TODAVÍA NADIE… ¡ANIMATE!</div>}
        {lista.map(([id, eq]) => (
          <div key={id} className="pub-equipo-row">
            <ColorBadge colorId={eq.color} nombre={eq.nombre} avatarId={avatarDeEquipo(eq)} />
            <span className="pub-dim">{(eq.participantes || []).length} INT.</span>
          </div>
        ))}
      </div>
    )
  }

  if (torneo.estado === TORNEO.EN_CURSO && s) {
    return (
      <div className="pub-panel pub-times-live">
        <div className="pub-panel-title">TIEMPOS EN VIVO</div>
        <TablaPosiciones orden={orden} gaps={gaps} equipos={equipos} vueltaRapidaEq={vr?.eqId} pilotosSesion={s.pilotos} />
      </div>
    )
  }

  if (torneo.estado === TORNEO.FINALIZADO) {
    return (
      <div className="pub-panel pub-times-live">
        <div className="pub-panel-title">TABLA FINAL</div>
        <TablaPuntos standings={standings} equipos={equipos} pilotosSesion={s?.pilotos} />
      </div>
    )
  }

  return <div className="pub-panel pub-dim">SIN DATOS</div>
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

function FilaTresPlaceholder() {
  return (
    <div className="pub-row-3">
      <div className="pub-panel pub-placeholder">
        <div className="pub-panel-title">FILA 3 · NUEVO COMPONENTE</div>
        <div className="pub-dim">ESPACIO RESERVADO PARA EL PRÓXIMO MÓDULO</div>
      </div>
    </div>
  )
}
