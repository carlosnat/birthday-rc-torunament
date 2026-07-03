// src/firebase/seed.js
// Torneo de prueba hardcodeado para el Hito 1 (walking skeleton).
// 2 circuitos, 4 equipos (uno por color) para ejercitar los puntos 25-18-15-12.

import { PUNTUACION_F1, TIPO_SESION } from '../domain/constants.js'

export const TORNEO_ID = 'demo'

// Config del torneo: circuitos con sus sesiones (tipo + vueltas objetivo).
export const CONFIG_DEMO = {
  nombre: 'GP CUMPLE RC',
  modalidad: 'TORNEO',
  puntuacion: PUNTUACION_F1,
  circuitos: [
    {
      id: 'c1',
      nombre: 'CIRCUITO 1',
      tiempoMinimoVuelta: 3000,
      sesiones: [
        { id: 'c1-practica', tipo: TIPO_SESION.PRACTICA, vueltas: 0 },
        { id: 'c1-qualy', tipo: TIPO_SESION.QUALY, vueltas: 2 },
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
