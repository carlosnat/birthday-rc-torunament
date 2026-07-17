// src/webrtc/useCamaraViewer.js
// El lado que MIRA. Ofrece recvonly y la cámara contesta con su track.
//
// Va montado en Publico.jsx, no en el panel de video: el Escenario monta/desmonta según el
// estado de la sesión, y si la RTCPeerConnection viviera ahí la conexión se caería y se
// reharía en cada transición (semáforo -> bandera -> libre), justo en medio de la carrera.
//
// A diferencia de useDetector, este hook SÍ expone el stream: su consumidor está en otro
// subárbol y no puede alcanzarlo por el videoRef.

import { useEffect, useRef, useState } from 'react'
import { TORNEO_ID } from '../currentTorneo.js'
import { RTC_CONFIG, ESPERA_ANTES_DE_REINTENTAR_MS, BUFFER_RECEPTOR_MS } from './rtcConfig.js'
import { camaraActiva } from './camaraActions.js'
import {
  abrirSala,
  cerrarSala,
  escucharAnswer,
  escucharCandidatos,
  publicarCandidato,
} from './signaling.js'

export const VIEWER = Object.freeze({
  SIN_CAMARA: 'SIN_CAMARA',
  CONECTANDO: 'CONECTANDO',
  EN_VIVO: 'EN_VIVO',
  CAIDA: 'CAIDA',
})

/**
 * Colchón antes de mostrar: le da tiempo a las retransmisiones (NACK) de llegar, así el
 * receptor no tiene que pedir un keyframe (PLI) y no se ve el tirón.
 *
 * Ojo con las unidades, es fácil equivocarse por 1000x: `jitterBufferTarget` va en
 * milisegundos y `playoutDelayHint` (el anterior) en segundos.
 */
function darColchon(receiver) {
  if (!receiver) return
  try {
    if ('jitterBufferTarget' in receiver) receiver.jitterBufferTarget = BUFFER_RECEPTOR_MS
    else if ('playoutDelayHint' in receiver) receiver.playoutDelayHint = BUFFER_RECEPTOR_MS / 1000
  } catch {
    // Navegador sin soporte: sigue con el búfer adaptativo por defecto.
  }
}

export function useCamaraViewer(torneo) {
  const [stream, setStream] = useState(null)
  const [estado, setEstado] = useState(VIEWER.SIN_CAMARA)
  const [error, setError] = useState(null)
  // Reintentar = rehacer la sala entera, no renegociar sobre la existente. restartIce()
  // dispararía onnegotiationneeded para producir una offer nueva, pero la cámara escucha con
  // onChildAdded y no volvería a dispararse sobre una sala que ya existe: nunca la vería.
  // Sala nueva = viewerId nuevo = onChildAdded en la cámara = PC nueva de los dos lados.
  const [intento, setIntento] = useState(0)

  // ⚠️ La dep del effect DEBE ser este string, no el objeto cámara: `torneo` es una
  // referencia nueva en cada snapshot, así que el objeto cambia de identidad con CADA
  // heartbeat (5s) y la conexión se destruiría y recrearía en silencio cada 5 segundos.
  const camId = camaraActiva(torneo)?.id ?? null

  useEffect(() => {
    if (!TORNEO_ID || !camId) {
      setEstado(VIEWER.SIN_CAMARA)
      setStream(null)
      return
    }

    const viewerId = crypto.randomUUID() // efímero: un reload debe dar sala nueva
    const pc = new RTCPeerConnection(RTC_CONFIG)
    const limpiezas = []
    let vivo = true
    let timerReintento = null

    setEstado(VIEWER.CONECTANDO)
    setError(null)

    // No mandamos media, sólo recibimos.
    pc.addTransceiver('video', { direction: 'recvonly' })

    pc.ontrack = (e) => {
      if (vivo) setStream(e.streams[0])
      darColchon(e.receiver)
    }

    const reintentar = () => {
      if (vivo) setIntento((i) => i + 1)
    }

    pc.onconnectionstatechange = () => {
      if (!vivo) return
      if (pc.connectionState === 'connected') setEstado(VIEWER.EN_VIVO)
      if (pc.connectionState === 'failed') {
        setEstado(VIEWER.CAIDA)
        reintentar()
      }
    }

    pc.oniceconnectionstatechange = () => {
      if (!vivo) return
      const st = pc.iceConnectionState
      if (st === 'disconnected') {
        // Se recupera solo la mayoría de las veces; rehacer la sala de una cortaría un stream
        // que estaba por volver.
        clearTimeout(timerReintento)
        timerReintento = setTimeout(() => {
          if (vivo && pc.iceConnectionState === 'disconnected') reintentar()
        }, ESPERA_ANTES_DE_REINTENTAR_MS)
      } else if (st === 'connected' || st === 'completed') {
        clearTimeout(timerReintento)
      }
    }

    // Los candidatos empiezan a salir apenas hay localDescription, posiblemente antes de que
    // la offer termine de escribirse. Se bufferean para que la sala nunca exista sin offer.
    let salaLista = false
    const pendientes = []
    pc.onicecandidate = (e) => {
      if (!e.candidate) return
      if (salaLista) publicarCandidato(TORNEO_ID, camId, viewerId, 'viewer', e.candidate)
      else pendientes.push(e.candidate)
    }

    async function negociar() {
      try {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        await abrirSala(TORNEO_ID, camId, viewerId, offer)
        if (!vivo) return

        salaLista = true
        pendientes.splice(0).forEach((c) => publicarCandidato(TORNEO_ID, camId, viewerId, 'viewer', c))

        limpiezas.push(
          escucharAnswer(TORNEO_ID, camId, viewerId, async (answer) => {
            // onValue puede repetir; sólo aceptamos la answer si seguimos esperándola.
            if (!vivo || pc.signalingState !== 'have-local-offer') return
            await pc.setRemoteDescription(new RTCSessionDescription(answer))
          }),
        )

        limpiezas.push(
          escucharCandidatos(TORNEO_ID, camId, viewerId, 'camara', async (cand) => {
            if (!vivo) return
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand))
            } catch {
              // Un candidato puede llegar antes que la answer; se descarta sin romper.
            }
          }),
        )
      } catch (e) {
        if (vivo) {
          setError(e?.message || 'No se pudo conectar con la cámara')
          setEstado(VIEWER.CAIDA)
        }
      }
    }

    negociar()

    return () => {
      vivo = false
      clearTimeout(timerReintento)
      limpiezas.forEach((un) => un())
      pc.close()
      cerrarSala(TORNEO_ID, camId, viewerId)
      setStream(null)
    }
  }, [camId, intento])

  return { stream, estado, error }
}
