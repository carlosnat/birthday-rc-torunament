// src/webrtc/rtcConfig.js
// Configuración de la conexión y de la captura. Constantes en un solo lugar.

// STUN gratis de Google. Sin TURN a propósito: teléfono y TV están en la misma wifi, así que
// los candidatos "host" conectan directo y STUN casi ni participa. TURN recién haría falta si
// los peers quedaran en redes distintas, o si la wifi del salón tuviera aislamiento de
// clientes (ahí STUN tampoco salva; el plan B es un hotspot).
export const RTC_CONFIG = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
}

// 540p y no 720p: medido en pista, a 720p el estimador de congestión reportaba
// `qualityLimitationReason: bandwidth` y oscilaba — bajaba la calidad, se recuperaba, volvía a
// bajar. Eso se ve como imagen congelada de a ratos. Pidiendo menos entra con margen y el
// estimador deja de pelear. En un proyector la diferencia entre 540p y 720p no se nota; los
// tirones sí.
//
// audio: false — el teléfono y los parlantes están en la misma sala (larsen), competiría con
// los efectos del semáforo, y un <video> con audio lo bloquea la política de autoplay.
export const CAMARA_CONSTRAINTS = {
  video: {
    facingMode: 'environment',
    width: { ideal: 960 },
    height: { ideal: 540 },
    frameRate: { ideal: 20 },
  },
  audio: false,
}

/**
 * Techo de bitrate. Sin esto el encoder empuja hasta que la red se queja, y "quejarse"
 * significa perder paquetes: el receptor pide un keyframe y ves el tirón. Con un techo por
 * debajo de lo que la wifi aguanta, nunca llega a ese punto.
 * 1.2 Mbps es holgado para 540p20 en VP8.
 */
export const MAX_BITRATE = 1_200_000

/**
 * Qué sacrificar cuando no alcanza. 'maintain-framerate' baja la resolución y sostiene los
 * fps; 'maintain-resolution' hace lo contrario y se ve como fotos fijas.
 * Acá filmamos autos moviéndose: 540p fluido se ve mucho mejor que 720p a tirones.
 */
export const DEGRADACION = 'maintain-framerate'

/**
 * Colchón del receptor antes de mostrar cada frame. Es el truco del búfer de Twitch, pero en
 * milisegundos en vez de segundos.
 *
 * Cuando se pierde un paquete, el receptor lo pide de nuevo (NACK). Sin colchón la
 * retransmisión llega tarde para el frame que ya tocaba mostrar, el receptor pide un keyframe
 * (PLI) y ahí está el tirón. Con 300ms la retransmisión llega a tiempo y el tirón no ocurre.
 *
 * 300ms es el techo de lo tolerable acá: la pública muestra el crono en milésimas y los
 * sectores encendiéndose, así que el video no puede atrasarse respecto de los tiempos. Un
 * búfer tipo HLS (5s) daría imagen perfecta y totalmente desincronizada del cronometraje.
 */
export const BUFFER_RECEPTOR_MS = 300

/**
 * Pone H.264 primero en la lista de códecs del emisor.
 *
 * Chrome negocia VP8 por defecto, y VP8 casi no tiene encoder por hardware en celulares: el
 * teléfono termina encodeando por software (`encoderImplementation: libvpx`,
 * `powerEfficientEncoder: false`), quema CPU, se calienta y a los minutos throttlea — la
 * imagen se congela de a ratos. H.264 sí tiene hardware en prácticamente todos.
 *
 * Hay que llamarlo con los transceivers ya creados y ANTES de createAnswer.
 * Si el dispositivo no puede emitir H.264 no toca nada y se sigue con lo que había.
 *
 * @returns {boolean} si se pudo preferir H.264
 */
export function preferirH264(pc) {
  const caps = RTCRtpSender.getCapabilities?.('video')
  if (!caps?.codecs) return false

  const esH264 = (c) => c.mimeType.toLowerCase() === 'video/h264'
  const h264 = caps.codecs.filter(esH264)
  if (h264.length === 0) return false

  // El resto va detrás, no se descarta: ahí viven RTX/RED/ULPFEC, que hacen falta igual, y
  // VP8 queda de respaldo si el otro lado no tiene H.264.
  const resto = caps.codecs.filter((c) => !esH264(c))

  let aplicado = false
  for (const tx of pc.getTransceivers()) {
    if (tx.sender?.track?.kind !== 'video' || !tx.setCodecPreferences) continue
    try {
      tx.setCodecPreferences([...h264, ...resto])
      aplicado = true
    } catch {
      // Navegador viejo o lista inválida: seguimos con la negociación por defecto.
    }
  }
  return aplicado
}

/** Sin latido por más de esto, la cámara se considera caída y otro puede tomarla. */
export const STALE_MS = 15000

/** Igual que los sensores. STALE_MS es 3x esto. */
export const HEARTBEAT_MS = 5000

/** ICE 'disconnected' se recupera solo casi siempre; reiniciar antes corta un stream sano. */
export const ESPERA_ANTES_DE_REINTENTAR_MS = 5000
