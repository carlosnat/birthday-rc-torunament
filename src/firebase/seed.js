// src/firebase/seed.js
// Config por defecto de un torneo (circuitos + sesiones) y datos demo opcionales.
// Los equipos se registran de forma dinámica (Hito 2), no vienen hardcodeados.

import { PUNTUACION_F1, TIPO_SESION } from '../domain/constants.js'

const PRACTICA_DURACION_MS = 5 * 60 * 1000
const QUALY_DURACION_MS = 3 * 60 * 1000

// Config del torneo: circuitos con sus sesiones (tipo + vueltas objetivo).
// Por ahora es una plantilla fija; el editor de config será un hito posterior.
export const DEFAULT_CONFIG = {
  nombre: 'GP CUMPLE RC',
  modalidad: 'TORNEO',
  puntuacion: PUNTUACION_F1,
  circuitos: [
    {
      id: 'c1',
      nombre: 'CIRCUITO 1',
      tiempoMinimoVuelta: 3000,
      sesiones: [
        { id: 'c1-practica', tipo: TIPO_SESION.PRACTICA, vueltas: 0, duracionMs: PRACTICA_DURACION_MS },
        { id: 'c1-qualy', tipo: TIPO_SESION.QUALY, vueltas: 0, duracionMs: QUALY_DURACION_MS },
        { id: 'c1-carrera', tipo: TIPO_SESION.CARRERA, vueltas: 3 },
      ],
    },
    {
      id: 'c2',
      nombre: 'CIRCUITO 2',
      tiempoMinimoVuelta: 3000,
      sesiones: [{ id: 'c2-carrera', tipo: TIPO_SESION.CARRERA, vueltas: 3 }],
    },
  ],
}

// Equipos de prueba: uno por color de Post-it neón.
export const EQUIPOS_DEMO = {
  eq_amarillo: { nombre: 'ESCUDERÍA AMARILLA', color: 'amarillo', participantes: ['Ana', 'Beto'] },
  eq_naranja: { nombre: 'ESCUDERÍA NARANJA', color: 'naranja', participantes: ['Caro', 'Dani'] },
  eq_azul: { nombre: 'ESCUDERÍA AZUL', color: 'azul', participantes: ['Edu', 'Feli'] },
  eq_verde: { nombre: 'ESCUDERÍA VERDE', color: 'verde', participantes: ['Gabo', 'Hugo'] },
}
