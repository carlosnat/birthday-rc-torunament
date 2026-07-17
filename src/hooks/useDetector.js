// src/hooks/useDetector.js
// Hot-loop de detección de color aislado del render de React.
// getUserMedia (cámara trasera) + análisis de una franja central (zona de meta) +
// conversión RGB->HSV por software + conteo simultáneo de los colores de Post-it.
//
// El bucle corre en requestAnimationFrame y acumula en refs; el estado de React
// (fps, píxeles por color) se refresca ~5 veces/seg para no pagar re-render por frame.

import { useCallback, useEffect, useRef, useState } from 'react'
import { COLORES_LISTA } from '../domain/colors.js'

const STRIP_RATIO = 0.2 // 20% del alto = zona de meta
const UI_REFRESH_MS = 200 // refresco del overlay

/** Convierte un pixel RGB a HSV en escala OpenCV (H 0-180, S/V 0-255). */
function rgbToHsv(r, g, b) {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  let h = 0
  if (delta !== 0) {
    if (max === r) h = 60 * (((g - b) / delta) % 6)
    else if (max === g) h = 60 * ((b - r) / delta + 2)
    else h = 60 * ((r - g) / delta + 4)
    if (h < 0) h += 360
  }
  const s = max === 0 ? 0 : (delta / max) * 255
  return { h: h / 2, s, v: max }
}

export function useDetector({ threshold = 800, cooldownMs = 1000, onDetection } = {}) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const rafRef = useRef(0)
  const streamRef = useRef(null)

  const lastDetRef = useRef({}) // { colorId: ts última detección }
  const framesRef = useRef(0)
  const lastFpsTsRef = useRef(0)
  const lastUiTsRef = useRef(0)
  const pixelsRef = useRef({})

  const onDetRef = useRef(onDetection)
  const thresholdRef = useRef(threshold)
  const cooldownRef = useRef(cooldownMs)
  useEffect(() => { onDetRef.current = onDetection }, [onDetection])
  useEffect(() => { thresholdRef.current = threshold }, [threshold])
  useEffect(() => { cooldownRef.current = cooldownMs }, [cooldownMs])

  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({ fps: 0, pixels: {} })

  const procesarFrame = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(procesarFrame)
      return
    }

    const vw = video.videoWidth
    const vh = video.videoHeight
    const sh = Math.max(1, Math.round(vh * STRIP_RATIO))
    const sy = Math.round((vh - sh) / 2)

    if (canvas.width !== vw || canvas.height !== sh) {
      canvas.width = vw
      canvas.height = sh
    }
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(video, 0, sy, vw, sh, 0, 0, vw, sh)

    const { data } = ctx.getImageData(0, 0, vw, sh)
    const counts = {}
    for (const c of COLORES_LISTA) counts[c.id] = 0

    for (let i = 0; i < data.length; i += 4) {
      const { h, s, v } = rgbToHsv(data[i], data[i + 1], data[i + 2])
      for (const c of COLORES_LISTA) {
        const r = c.hsv
        if (h >= r.hMin && h <= r.hMax && s >= r.sMin && v >= r.vMin) {
          counts[c.id]++
          break // un pixel pertenece a un solo color
        }
      }
    }
    pixelsRef.current = counts

    // Detección + cooldown por color.
    const now = performance.now()
    for (const c of COLORES_LISTA) {
      if (counts[c.id] >= thresholdRef.current) {
        const last = lastDetRef.current[c.id] || 0
        if (now - last >= cooldownRef.current) {
          lastDetRef.current[c.id] = now
          onDetRef.current?.({ colorId: c.id, ts: now, pixels: counts[c.id] })
        }
      }
    }

    // FPS.
    framesRef.current++
    if (now - lastFpsTsRef.current >= 1000) {
      const fps = framesRef.current
      framesRef.current = 0
      lastFpsTsRef.current = now
      setStats((s0) => ({ ...s0, fps }))
    }
    // Refresco del overlay de píxeles.
    if (now - lastUiTsRef.current >= UI_REFRESH_MS) {
      lastUiTsRef.current = now
      setStats((s0) => ({ ...s0, pixels: { ...pixelsRef.current } }))
    }

    rafRef.current = requestAnimationFrame(procesarFrame)
  }, [])

  const start = useCallback(async () => {
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        'Cámara no disponible: la página no está en contexto seguro. ' +
        'En el celular abrí chrome://flags/#unsafely-treat-insecure-origin-as-secure, ' +
        'poné el flag en ENABLED con esta URL exacta (mismo host y puerto), y REINICIÁ Chrome.',
      )
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } },
        audio: false,
      })
      streamRef.current = stream
      const video = videoRef.current
      video.srcObject = stream
      await video.play()
      setRunning(true)
      lastFpsTsRef.current = performance.now()
      lastUiTsRef.current = performance.now()
      rafRef.current = requestAnimationFrame(procesarFrame)
    } catch (e) {
      setError(e?.message || 'No se pudo acceder a la cámara')
    }
  }, [procesarFrame])

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    const stream = streamRef.current
    if (stream) stream.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setRunning(false)
  }, [])

  useEffect(() => () => stop(), [stop])

  return { videoRef, canvasRef, start, stop, running, error, stats }
}
