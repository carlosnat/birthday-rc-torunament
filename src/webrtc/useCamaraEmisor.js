// src/webrtc/useCamaraEmisor.js
// El lado que TRANSMITE. Un solo listener sobre viewers/ que hace fan-out: una
// RTCPeerConnection por cada espectador que aparece.
//
// El viewer ofrece y esta cámara contesta (shape de WHEP). Si mañana el mesh no alcanza
// (aguanta ~3-5 viewers en un teléfono), migrar a un SFU no toca el rol del viewer.

import { useCallback, useEffect, useRef, useState } from 'react'
import { TORNEO_ID } from '../currentTorneo.js'
import { RTC_CONFIG, CAMARA_CONSTRAINTS, MAX_BITRATE, DEGRADACION, preferirH264 } from './rtcConfig.js'
import {
  escucharViewers,
  escucharViewerIdo,
  publicarAnswer,
  publicarCandidato,
  escucharCandidatos,
} from './signaling.js'

/** Techo de bitrate y política de degradación. Va después del setLocalDescription. */
async function ajustarEnvio(pc) {
  const sender = pc.getSenders().find((s) => s.track?.kind === 'video')
  if (!sender?.getParameters) return
  try {
    const params = sender.getParameters()
    // En algunos navegadores encodings viene vacío hasta la primera negociación.
    if (!params.encodings?.length) params.encodings = [{}]
    params.encodings[0].maxBitrate = MAX_BITRATE
    // Va en el nivel de arriba, no adentro de encodings.
    params.degradationPreference = DEGRADACION
    await sender.setParameters(params)
  } catch {
    // Si no se puede ajustar, el estimador de congestión sigue haciendo su trabajo solo.
  }
}

export function useCamaraEmisor(camId) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const pcsRef = useRef(new Map()) // viewerId -> { pc, limpiezas }
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)
  const [viewers, setViewers] = useState(0)
  const [stats, setStats] = useState(null)

  const stop = useCallback(() => {
    pcsRef.current.forEach(({ pc, limpiezas }) => {
      limpiezas.forEach((un) => un())
      pc.close()
    })
    pcsRef.current.clear()
    setViewers(0)

    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setRunning(false)
  }, [])

  const start = useCallback(async () => {
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('SIN ACCESO A LA CÁMARA: EL SITIO DEBE SER HTTPS.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia(CAMARA_CONSTRAINTS)
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setRunning(true)
    } catch (e) {
      setError(e?.message || 'No se pudo acceder a la cámara')
    }
  }, [])

  useEffect(() => () => stop(), [stop])

  // Fan-out: por cada viewer nuevo, una PC que le contesta con nuestro track.
  useEffect(() => {
    if (!TORNEO_ID || !camId || !running) return
    let vivo = true

    const soltar = (viewerId) => {
      const entrada = pcsRef.current.get(viewerId)
      if (!entrada) return
      entrada.limpiezas.forEach((un) => un())
      entrada.pc.close()
      pcsRef.current.delete(viewerId)
      setViewers(pcsRef.current.size)
    }

    const unsubAlta = escucharViewers(TORNEO_ID, camId, async (viewerId, offer) => {
      if (!vivo || pcsRef.current.has(viewerId)) return

      const pc = new RTCPeerConnection(RTC_CONFIG)
      const limpiezas = []
      pcsRef.current.set(viewerId, { pc, limpiezas })
      setViewers(pcsRef.current.size)

      pc.onconnectionstatechange = () => {
        if (['failed', 'closed'].includes(pc.connectionState)) soltar(viewerId)
      }

      pc.onicecandidate = (e) => {
        if (e.candidate) publicarCandidato(TORNEO_ID, camId, viewerId, 'camara', e.candidate)
      }

      try {
        streamRef.current?.getTracks().forEach((t) => pc.addTrack(t, streamRef.current))
        await pc.setRemoteDescription(new RTCSessionDescription(offer))
        // Acá y no antes: los transceivers recién existen después del setRemoteDescription,
        // y la preferencia sólo entra en la SDP si se fija antes del createAnswer.
        preferirH264(pc)
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        await publicarAnswer(TORNEO_ID, camId, viewerId, answer)
        await ajustarEnvio(pc)

        limpiezas.push(
          escucharCandidatos(TORNEO_ID, camId, viewerId, 'viewer', async (cand) => {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand))
            } catch {
              // Candidato fuera de orden: se descarta sin romper la conexión.
            }
          }),
        )
      } catch {
        soltar(viewerId)
      }
    })

    // El viewer cerró la pestaña (lo borra el onDisconnect del servidor) o está reintentando
    // con una sala nueva: sin esto la PC vieja quedaría abierta consumiendo CPU del teléfono.
    const unsubBaja = escucharViewerIdo(TORNEO_ID, camId, (viewerId) => soltar(viewerId))

    return () => {
      vivo = false
      unsubAlta()
      unsubBaja()
    }
  }, [camId, running])

  // Sólo lectura: getStats() no toca la transmisión. Es la única forma de confirmar sin un
  // dump de webrtc-internals que el encoder es el de hardware, y de ver en el momento por qué
  // se degrada la imagen (`limite`: cpu | bandwidth | none).
  useEffect(() => {
    if (!running) return
    let vivo = true

    const leer = async () => {
      const primera = pcsRef.current.values().next().value
      if (!primera) return
      const reporte = await primera.pc.getStats()
      if (!vivo) return

      let salida = null
      let fuente = null
      const codecs = {}
      reporte.forEach((s) => {
        if (s.type === 'outbound-rtp' && s.kind === 'video') salida = s
        if (s.type === 'media-source' && s.kind === 'video') fuente = s
        if (s.type === 'codec') codecs[s.id] = s
      })
      if (!salida) return

      setStats({
        codec: codecs[salida.codecId]?.mimeType?.replace('video/', '') || '—',
        // libvpx / openh264 = software. Un nombre de vendor o MediaCodec = hardware.
        impl: salida.encoderImplementation || '—',
        hw: salida.powerEfficientEncoder === true,
        limite: salida.qualityLimitationReason || 'none',
        w: salida.frameWidth,
        h: salida.frameHeight,
        fps: Math.round(salida.framesPerSecond ?? 0),
        // Lo que la CÁMARA entrega, antes de encodear. Comparado con el de arriba dice de qué
        // lado está el problema: si captura poco, es la cámara/el sistema; si captura bien
        // pero sale poco, es el encoder.
        capW: fuente?.width,
        capH: fuente?.height,
        capFps: Math.round(fuente?.framesPerSecond ?? 0),
        // El receptor pide un keyframe cuando perdió datos: cada PLI es un tirón visible.
        pli: salida.pliCount ?? 0,
        nack: salida.nackCount ?? 0,
      })
    }

    leer()
    const id = setInterval(leer, 2000)
    return () => {
      vivo = false
      clearInterval(id)
    }
  }, [running])

  // 🔴 Sin esto el teléfono se bloquea a los ~30s, la página se suspende y el track muere.
  // Es la falla #1 en la vida real. Hay que RE-pedirlo al volver: el lock se libera solo
  // cuando la página se oculta.
  useEffect(() => {
    if (!running || !navigator.wakeLock) return
    let lock = null
    let cancelado = false

    const pedir = async () => {
      try {
        lock = await navigator.wakeLock.request('screen')
      } catch {
        // Sin wake lock se sigue transmitiendo; sólo hay que no bloquear la pantalla a mano.
      }
    }
    pedir()

    const alVolver = () => {
      if (document.visibilityState === 'visible' && !cancelado) pedir()
    }
    document.addEventListener('visibilitychange', alVolver)

    return () => {
      cancelado = true
      document.removeEventListener('visibilitychange', alVolver)
      lock?.release().catch(() => {})
    }
  }, [running])

  return { videoRef, start, stop, running, error, viewers, stats }
}
