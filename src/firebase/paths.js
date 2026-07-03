// src/firebase/paths.js
// Constantes de paths de la RTDB. Evita strings mágicos repartidos por la app.
// Estructura:
//   torneos/{torneoId}/
//     config, estado, circuitoActivo, sesionActiva
//     circuitos/{cid} { estado }
//     equipos/{eqId} { nombre, color, participantes }
//     sesiones/{sid} { estado, tipo, vueltasObjetivo, circuitoId, tiempoMinimoVuelta,
//                      pilotos{eqId}, carritos/{eqId}{...}, resultados[] }
//     eventos/{pushId} { ts, tipo, detalle }

export const torneo = (t) => `torneos/${t}`
export const config = (t) => `torneos/${t}/config`
export const estado = (t) => `torneos/${t}/estado`
export const circuitoActivo = (t) => `torneos/${t}/circuitoActivo`
export const sesionActiva = (t) => `torneos/${t}/sesionActiva`

export const circuitos = (t) => `torneos/${t}/circuitos`
export const circuito = (t, cid) => `torneos/${t}/circuitos/${cid}`
export const circuitoEstado = (t, cid) => `torneos/${t}/circuitos/${cid}/estado`

export const equipos = (t) => `torneos/${t}/equipos`
export const equipo = (t, eq) => `torneos/${t}/equipos/${eq}`

export const sensores = (t) => `torneos/${t}/sensores`
export const sensor = (t, sid) => `torneos/${t}/sensores/${sid}`

export const sesiones = (t) => `torneos/${t}/sesiones`
export const sesion = (t, s) => `torneos/${t}/sesiones/${s}`
export const sesionEstado = (t, s) => `torneos/${t}/sesiones/${s}/estado`
export const pilotos = (t, s) => `torneos/${t}/sesiones/${s}/pilotos`
export const piloto = (t, s, eq) => `torneos/${t}/sesiones/${s}/pilotos/${eq}`
export const carritos = (t, s) => `torneos/${t}/sesiones/${s}/carritos`
export const carrito = (t, s, eq) => `torneos/${t}/sesiones/${s}/carritos/${eq}`
export const resultados = (t, s) => `torneos/${t}/sesiones/${s}/resultados`

export const eventos = (t) => `torneos/${t}/eventos`
