// src/hooks/useEventos.js
// Suscripción al log de eventos (caja negra) limitada a los últimos N, orden más reciente primero.

import { useEffect, useState } from 'react'
import { ref, query, limitToLast, onValue } from 'firebase/database'
import { db } from '../firebase/firebase.js'
import * as P from '../firebase/paths.js'
import { TORNEO_ID } from '../firebase/seed.js'

export function useEventos(n = 40) {
  const [eventos, setEventos] = useState([])

  useEffect(() => {
    const r = query(ref(db, P.eventos(TORNEO_ID)), limitToLast(n))
    const unsub = onValue(r, (snap) => {
      const val = snap.val() || {}
      const lista = Object.entries(val).map(([id, e]) => ({ id, ...e }))
      lista.sort((a, b) => (b.ts || 0) - (a.ts || 0))
      setEventos(lista)
    })
    return () => unsub()
  }, [n])

  return eventos
}
