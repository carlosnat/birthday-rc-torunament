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
  TIME_ATTACK: 'TIME_ATTACK',
})

// Reglas por tipo, centralizadas. Antes cada consumidor comparaba el tipo a mano
// (=== TIPO_SESION.CARRERA), dispersando la lógica. Estos predicados son la fuente única.

/** Gana la vuelta más rápida (a diferencia de la carrera, que gana por más vueltas). */
export const ordenaPorMejorVuelta = (tipo) =>
  tipo === TIPO_SESION.QUALY || tipo === TIPO_SESION.TIME_ATTACK

/** Reparte puntos F1 al campeonato del torneo. */
export const tipoPuntua = (tipo) =>
  tipo === TIPO_SESION.CARRERA || tipo === TIPO_SESION.TIME_ATTACK

/** Corre contra reloj. esSesionTemporizada() exige ADEMÁS duracionMs > 0. */
export const tipoTemporizado = (tipo) =>
  tipo === TIPO_SESION.PRACTICA ||
  tipo === TIPO_SESION.QUALY ||
  tipo === TIPO_SESION.TIME_ATTACK

/** Para mostrar: "TIME_ATTACK" -> "TIME ATTACK". */
export const nombreTipo = (tipo) => String(tipo || '').replace(/_/g, ' ')

// Modalidad del torneo. CLASICO conserva el string 'TORNEO' que ya escribían los torneos
// existentes, para no invalidar los que están en la base.
export const MODALIDAD = Object.freeze({
  CLASICO: 'TORNEO',
  TIME_ATTACK: 'TIME_ATTACK',
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
