// src/views/camara/Camara.jsx
// Vista del invitado que filma. Espeja Sensor.jsx: el id se guarda en localStorage pero la
// verdad está en RTDB (si el lease se perdió, vuelve a mostrarse el alta).
//
// Este teléfono NO debe ser uno de los sensores: el sensor corre un hot-loop de
// drawImage+getImageData a 30fps y el encoder de video le pelearía la CPU.

import { useEffect, useRef, useState } from 'react'
import { useTorneo } from '../../context/TournamentContext.jsx'
import { useCamaraEmisor } from '../../webrtc/useCamaraEmisor.js'
import { heartbeatCamara, soltarCamara, titularVivo } from '../../webrtc/camaraActions.js'
import { HEARTBEAT_MS } from '../../webrtc/rtcConfig.js'
import { TORNEO_ID } from '../../currentTorneo.js'
import RegistroCamara from './RegistroCamara.jsx'
import { useFullscreen } from './useFullscreen.js'
import './camara.css'

const HUD_MS = 3000

const LS_KEY = TORNEO_ID ? `camara:${TORNEO_ID}` : null

export default function Camara() {
  const { torneo, loading } = useTorneo()
  const [camId, setCamId] = useState(() => (LS_KEY ? localStorage.getItem(LS_KEY) : null))
  const [bateria, setBateria] = useState(null)

  // La verdad está en RTDB, no en localStorage.
  //
  // "Tengo el lease" NO es `estado === 'CONECTADA'`: el onDisconnect marca DESCONECTADA ante
  // cualquier corte de socket, y con esa condición un parpadeo de wifi echaría al invitado.
  // Es: existe mi nodo y ningún OTRO titular está vivo. Así el latido re-afirma el lease solo
  // al reconectar, pero si alguien ya lo tomó (porque estuve caído >15s), cedo.
  const info = camId ? torneo?.camaras?.[camId] : null
  const titular = titularVivo(torneo?.camaras)
  const ocupadaPorOtro = !!titular && titular.id !== camId
  const registrado = !!info && !ocupadaPorOtro

  const { videoRef, start, stop, running, error, viewers, stats } = useCamaraEmisor(registrado ? camId : null)

  const pantallaRef = useRef(null)
  const { activo: fullscreen, alternar, salir } = useFullscreen(pantallaRef)
  const [hud, setHud] = useState(true)

  // El HUD se desvanece solo y vuelve al tocar: en pantalla completa el video es lo que
  // importa, los datos son de consulta.
  useEffect(() => {
    if (!fullscreen || !hud) return
    const id = setTimeout(() => setHud(false), HUD_MS)
    return () => clearTimeout(id)
  }, [fullscreen, hud])

  // Ref para que el latido lea la batería sin recrear el interval en cada cambio (mismo
  // truco que Sensor.jsx).
  const bateriaRef = useRef(null)
  useEffect(() => { bateriaRef.current = bateria }, [bateria])

  useEffect(() => {
    navigator.getBattery?.().then((b) => {
      const upd = () => setBateria(Math.round(b.level * 100))
      upd()
      b.addEventListener('levelchange', upd)
    })
  }, [])

  // Late mientras tengamos el lease, aunque la cámara esté en pausa: el lease se reclamó y es
  // nuestro hasta que lo soltemos o nos caigamos. Si el latido se corta, se libera solo.
  useEffect(() => {
    if (!camId || !registrado) return
    const tick = () => heartbeatCamara(camId, { bateria: bateriaRef.current })
    tick()
    const id = setInterval(tick, HEARTBEAT_MS)
    return () => clearInterval(id)
  }, [camId, registrado])

  if (loading) return <div className="app cam">CARGANDO…</div>
  if (!TORNEO_ID || !torneo) return <div className="app cam">TORNEO NO ENCONTRADO</div>

  function soltar() {
    stop()
    if (camId) soltarCamara(camId)
    if (LS_KEY) localStorage.removeItem(LS_KEY)
    setCamId(null)
  }

  return (
    <div className="app cam stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>CÁMARA</h1>
        {running && <span className="chip-estado cam-vivo">● EN VIVO · {viewers}</span>}
      </div>

      {!registrado && (
        <RegistroCamara
          idPrevio={camId}
          onListo={(id) => {
            if (LS_KEY) localStorage.setItem(LS_KEY, id)
            setCamId(id)
          }}
        />
      )}

      {registrado && (
        <div className="panel row" style={{ justifyContent: 'space-between' }}>
          <span><b>{info.nombre}</b></span>
          <button className="btn btn--ghost" onClick={soltar}>DEJAR DE TRANSMITIR</button>
        </div>
      )}

      <div
        ref={pantallaRef}
        className={`cam-video-wrap ${fullscreen ? 'is-full' : ''}`}
        onClick={() => fullscreen && setHud(true)}
      >
        <video ref={videoRef} playsInline muted className="cam-video" />
        {!running && <div className="cam-video-off">CÁMARA APAGADA</div>}

        {running && !fullscreen && (
          <button className="cam-full-btn" onClick={alternar} title="Pantalla completa">⛶</button>
        )}

        {fullscreen && (
          <Hud
            visible={hud}
            viewers={viewers}
            bateria={bateria}
            stats={stats}
            onSalir={salir}
          />
        )}
      </div>

      {registrado && (
        <div className="row">
          {!running ? (
            <button className="btn btn--primary" onClick={start}>EMPEZAR A TRANSMITIR</button>
          ) : (
            <button className="btn" onClick={stop}>PAUSAR</button>
          )}
          {bateria != null && <span className="chip-estado">🔋 {bateria}%</span>}
        </div>
      )}

      {error && <div className="panel text-rojo">ERROR: {error}</div>}

      {stats && <Diagnostico stats={stats} />}

      {running && (
        <div className="panel cam-tips">
          <div>📱 PONÉ EL CELULAR <b>HORIZONTAL</b></div>
          <div>🔌 ENCHUFALO: TRANSMITIR GASTA MUCHA BATERÍA</div>
          <div>🔒 NO BLOQUEES LA PANTALLA NI CAMBIES DE APP</div>
        </div>
      )}
    </div>
  )
}

const LIMITE_TEXTO = {
  cpu: 'EL CELULAR NO DA ABASTO',
  bandwidth: 'RED INSUFICIENTE',
  other: 'LIMITADA',
  none: 'SIN LÍMITES',
}

/**
 * En pantalla completa sólo lo accionable: si alguien mira, cuánta batería queda, y las
 * advertencias SÓLO cuando aplican. El diagnóstico completo se queda en el modo normal.
 */
function Hud({ visible, viewers, bateria, stats, onSalir }) {
  const parado = stats && stats.capW > 0 && stats.capH > stats.capW
  const limitada = stats && stats.limite !== 'none'

  return (
    <div className={`cam-hud ${visible ? '' : 'is-oculto'}`}>
      <div className="cam-hud-fila">
        <span className="cam-hud-vivo">● EN VIVO · {viewers}</span>
        {bateria != null && <span className="cam-hud-chip">🔋 {bateria}%</span>}
      </div>

      <div className="cam-hud-fila">
        <span className="cam-hud-alertas">
          {parado && <b className="cam-hud-alerta">↻ GIRÁ EL CELULAR</b>}
          {limitada && <b className="cam-hud-alerta">{LIMITE_TEXTO[stats.limite]}</b>}
        </span>
        <button className="cam-hud-salir" onClick={onSalir}>✕ SALIR</button>
      </div>
    </div>
  )
}

/**
 * Confirma de un vistazo si el encode salió de la CPU. `hw: false` con `impl: libvpx` es el
 * caso malo: software, se calienta y termina congelando la imagen.
 */
function Diagnostico({ stats }) {
  const problema = stats.limite !== 'none'
  // Sin dimensiones no hay orientación que juzgar: no cantamos ni bien ni mal.
  const sabemosOrientacion = stats.capW > 0 && stats.capH > 0
  const parado = sabemosOrientacion && stats.capH > stats.capW
  const horizontal = sabemosOrientacion && !parado
  // El encoder tira frames que la cámara sí entregó.
  const pierdeFrames = stats.capFps > 0 && stats.fps < stats.capFps - 3

  return (
    <div className="panel cam-diag">
      <div className="cam-diag-fila">
        <span>ENCODER</span>
        <b className={stats.hw ? 'text-verde' : 'text-rojo'}>
          {stats.codec} · {stats.impl} {stats.hw ? '· HARDWARE' : '· SOFTWARE ⚠'}
        </b>
      </div>
      <div className="cam-diag-fila">
        <span>CAPTURA</span>
        <b className={parado ? 'text-amarillo' : horizontal ? 'text-verde' : ''}>
          {stats.capW}×{stats.capH} · {stats.capFps} FPS
          {parado && ' · VERTICAL ⚠'}
          {horizontal && ' · HORIZONTAL ✓'}
        </b>
      </div>
      <div className="cam-diag-fila">
        <span>SALIDA</span>
        <b className={pierdeFrames ? 'text-amarillo' : ''}>{stats.w}×{stats.h} · {stats.fps} FPS</b>
      </div>
      <div className="cam-diag-fila">
        <span>CALIDAD</span>
        <b className={problema ? 'text-amarillo' : 'text-verde'}>
          {LIMITE_TEXTO[stats.limite] || stats.limite}
        </b>
      </div>
      <div className="cam-diag-fila">
        <span>TIRONES</span>
        <b className={stats.pli > 0 ? 'text-amarillo' : 'text-verde'}>
          {stats.pli} PLI · {stats.nack} NACK
        </b>
      </div>
      {parado && <div className="text-amarillo">↻ GIRÁ EL CELULAR: EN VERTICAL SE RECORTA LA PISTA</div>}
    </div>
  )
}
