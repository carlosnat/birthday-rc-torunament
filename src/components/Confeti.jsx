// src/components/Confeti.jsx
// Confeti liviano en canvas (sin dependencias). Se activa con `active`.

import { useEffect, useRef } from 'react'

const COLORES = ['#eaff00', '#ff6a00', '#00b7ff', '#7cff2a', '#e10600', '#ffffff']

export default function Confeti({ active }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(0)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const N = 160
    const parts = Array.from({ length: N }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      r: 4 + Math.random() * 6,
      c: COLORES[(Math.random() * COLORES.length) | 0],
      vy: 2 + Math.random() * 4,
      vx: -1.5 + Math.random() * 3,
      rot: Math.random() * Math.PI,
      vr: -0.2 + Math.random() * 0.4,
    }))

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const p of parts) {
        p.x += p.vx
        p.y += p.vy
        p.rot += p.vr
        if (p.y > canvas.height + 20) {
          p.y = -20
          p.x = Math.random() * canvas.width
        }
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.c
        ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6)
        ctx.restore()
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [active])

  if (!active) return null
  return <canvas ref={canvasRef} className="confeti-canvas" />
}
