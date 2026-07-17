// src/domain/constants.js
// Constantes de dominio: estados de las 4 máquinas + tipos de sesión.
// Fuente única para evitar strings mágicos repartidos por la app.

export const TORNEO = Object.freeze({
  BORRADOR: 'BORRADOR',
  REGISTRO: 'REGISTRO',
  EN_CURSO: 'EN_CURSO',
  FINALIZADO: 'FINALIZADO',
})

export const CIRCUITO = Object.freeze({
  PENDIENTE: 'PENDIENTE',
  ACTIVO: 'ACTIVO',
  COMPLETADO: 'COMPLETADO',
})

export const SESION = Object.freeze({
  ESPERANDO: 'ESPERANDO',
  LARGADA: 'LARGADA',
  EN_CURSO: 'EN_CURSO',
  PAUSADA: 'PAUSADA',
  BANDERA: 'BANDERA',
  FINALIZADA: 'FINALIZADA',
})

export const CARRITO = Object.freeze({
  EN_GRILLA: 'EN_GRILLA',
  EN_CARRERA: 'EN_CARRERA',
  TERMINO: 'TERMINO',
  DNF: 'DNF',
})

export const TIPO_SESION = Object.freeze({
  PRACTICA: 'PRACTICA',
  QUALY: 'QUALY',
  CARRERA: 'CARRERA',
})

// Puntuación estilo F1 por defecto (25-18-15-12). Se guarda en config del torneo.
export const PUNTUACION_F1 = Object.freeze([25, 18, 15, 12])

export const SECTOR = Object.freeze({
  VALIDO: 'VALIDO',
  FALTANTE: 'FALTANTE',
  FUERA_SECUENCIA: 'FUERA_SECUENCIA',
})

// Sector timing: anti-rebote y tiempo mínimo
export const COOLDOWN_SECTOR = 100 // ms, anti-rebote por sensor (muy bajo para detectar cada paso)
export const TIEMPO_MINIMO_SECTOR = 1000 // ms, tiempo mínimo entre sensores
