// src/views/camara/useFullscreen.js
// Pantalla completa con dos capas, porque ninguna sola alcanza:
//
//   1. CSS `position: fixed` — funciona SIEMPRE, incluso en iPhone.
//   2. Fullscreen API — oculta la barra del navegador y habilita bloquear la orientación,
//      pero en iPhone Safari NO se puede aplicar a un <div>: sólo a un <video>, y ahí abre el
//      reproductor nativo que taparía el HUD.
//
// Intentamos (2) de forma oportunista sobre (1). Donde se pueda, mejora; donde no, el CSS ya
// dejó el video a pantalla completa igual. Nunca falla, sólo rinde distinto.

import { useCallback, useEffect, useState } from 'react'

const hayFullscreenReal = () => Boolean(document.fullscreenElement)

export function useFullscreen(ref) {
  const [activo, setActivo] = useState(false)

  const salir = useCallback(async () => {
    setActivo(false)
    try {
      screen.orientation?.unlock?.()
    } catch {
      // No todos los navegadores lo permiten; no importa.
    }
    if (hayFullscreenReal()) {
      try {
        await document.exitFullscreen()
      } catch {
        // Ya salimos del modo CSS, que es lo que importa.
      }
    }
  }, [])

  const entrar = useCallback(async () => {
    setActivo(true) // el modo CSS entra siempre
    const el = ref.current
    if (!el?.requestFullscreen) return // iPhone: nos quedamos con el CSS

    try {
      await el.requestFullscreen({ navigationUI: 'hide' })
      // Sólo se puede bloquear la orientación con fullscreen real. Acá es donde el toggle
      // resuelve de una el problema del celular parado, en vez de pedirlo por cartel.
      await screen.orientation?.lock?.('landscape')
    } catch {
      // Sin fullscreen real ni bloqueo: el CSS ya nos dejó a pantalla completa.
    }
  }, [ref])

  const alternar = useCallback(() => (activo ? salir() : entrar()), [activo, entrar, salir])

  // El usuario puede salir por su cuenta (ESC, gesto del sistema). Sin esto el estado
  // mentiría y el botón quedaría al revés.
  useEffect(() => {
    const alCambiar = () => {
      if (!hayFullscreenReal()) setActivo(false)
    }
    document.addEventListener('fullscreenchange', alCambiar)
    return () => document.removeEventListener('fullscreenchange', alCambiar)
  }, [])

  return { activo, alternar, salir }
}
