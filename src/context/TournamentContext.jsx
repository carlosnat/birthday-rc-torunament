// src/context/TournamentContext.jsx
// Contexto raíz: expone el torneo (suscripción única) a toda la app.

import { createContext, useContext } from 'react'
import { useTournament } from '../hooks/useTournament.js'

const Ctx = createContext(null)

export function TournamentProvider({ children }) {
  const value = useTournament()
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useTorneo() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTorneo debe usarse dentro de <TournamentProvider>')
  return ctx
}
