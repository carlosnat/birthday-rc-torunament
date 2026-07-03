// src/hooks/useTournament.js
// Suscripción raíz al torneo. Encapsula onValue + cleanup: los componentes no tocan Firebase.

import { useEffect, useState } from 'react'
import { ref, onValue } from 'firebase/database'
import { db } from '../firebase/firebase.js'
import * as P from '../firebase/paths.js'
import { TORNEO_ID } from '../currentTorneo.js'

export function useTournament() {
  const [torneo, setTorneo] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!TORNEO_ID) {
      setLoading(false)
      return
    }
    const r = ref(db, P.torneo(TORNEO_ID))
    const unsub = onValue(r, (snap) => {
      setTorneo(snap.val())
      setLoading(false)
    })
    return () => unsub()
  }, [])

  return { torneo, loading }
}
