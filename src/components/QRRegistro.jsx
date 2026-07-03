// src/components/QRRegistro.jsx
// Genera un QR (imagen) a partir de una URL. Usado en la pantalla pública para el alta.

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export default function QRRegistro({ url, size = 240 }) {
  const [dataUrl, setDataUrl] = useState(null)

  useEffect(() => {
    let vivo = true
    QRCode.toDataURL(url, { width: size, margin: 1, color: { dark: '#0a0a0a', light: '#ffffff' } })
      .then((d) => { if (vivo) setDataUrl(d) })
      .catch(() => { if (vivo) setDataUrl(null) })
    return () => { vivo = false }
  }, [url, size])

  return (
    <div className="qr">
      {dataUrl ? <img src={dataUrl} alt="QR de registro" width={size} height={size} /> : <div>GENERANDO QR…</div>}
      <div className="qr-url">{url}</div>
    </div>
  )
}
