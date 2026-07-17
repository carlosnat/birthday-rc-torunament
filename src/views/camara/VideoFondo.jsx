// src/views/camara/VideoFondo.jsx
// El video como fondo de toda la pantalla pública, igual que la transmisión de F1: la imagen
// es la pantalla y los datos flotan encima. Va detrás de la grilla (z-index 0) y ocupa el
// viewport completo, así el semáforo, la bandera y el podio se superponen en vez de taparlo.

import { useEffect, useRef } from 'react'
import { VIEWER } from '../../webrtc/useCamaraViewer.js'
import './video-fondo.css'

export default function VideoFondo({ stream, estado }) {
  const videoRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !stream) return
    video.srcObject = stream
    video.play().catch(() => {}) // con muted no debería rechazar
    return () => {
      video.srcObject = null
    }
  }, [stream])

  if (!stream) return null

  return (
    <div className="pub-fondo" aria-hidden="true">
      {/* muted es requisito, no preferencia: con audio el autoplay queda bloqueado. */}
      <video ref={videoRef} className="pub-fondo-video" autoPlay playsInline muted />
      {/* Oscurece la imagen para que los paneles de arriba se lean sobre cualquier toma. */}
      <div className="pub-fondo-velo" />
      {estado === VIEWER.EN_VIVO && <span className="pub-fondo-vivo">● EN VIVO</span>}
    </div>
  )
}
