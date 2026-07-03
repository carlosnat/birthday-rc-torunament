// src/domain/colors.js
// Los 4 colores de Post-it neón. El COLOR = identidad del equipo durante todo el torneo.
// Rangos HSV (escala OpenCV 0-180) reservados para el sensor (Hito 3); en Hito 1 se usa hex.

export const COLORES = Object.freeze({
  amarillo: {
    id: 'amarillo',
    nombre: 'AMARILLO NEÓN',
    hex: '#eaff00',
    // rango HSV placeholder, se calibra en Hito 3
    hsv: { hMin: 22, hMax: 38, sMin: 100, vMin: 100 },
  },
  naranja: {
    id: 'naranja',
    nombre: 'NARANJA NEÓN',
    hex: '#ff6a00',
    hsv: { hMin: 5, hMax: 20, sMin: 120, vMin: 120 },
  },
  azul: {
    id: 'azul',
    nombre: 'AZUL CELESTE',
    hex: '#00b7ff',
    hsv: { hMin: 90, hMax: 110, sMin: 100, vMin: 100 },
  },
  verde: {
    id: 'verde',
    nombre: 'VERDE LIMA',
    hex: '#7cff2a',
    // validado experimentalmente en la POC
    hsv: { hMin: 38, hMax: 80, sMin: 100, vMin: 100 },
  },
})

export const COLORES_LISTA = Object.freeze(Object.values(COLORES))

export function getColor(id) {
  return COLORES[id] || null
}

/** Colores todavía libres: los que ningún equipo tomó como identidad. */
export function coloresDisponibles(equiposMap) {
  const tomados = new Set(Object.values(equiposMap || {}).map((e) => e.color))
  return COLORES_LISTA.filter((c) => !tomados.has(c.id))
}
