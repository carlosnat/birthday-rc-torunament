// src/domain/avatars.js
// Catálogo de avatares cargado automáticamente desde assets con "avatar" en el nombre.

const ROW_LABELS = ['A', 'B', 'C', 'D']
const IMAGE_EXT = /\.(png|jpe?g|webp|gif)$/i

const avatarFiles = import.meta.glob('../assets/images/*avatar*.*', {
  eager: true,
  import: 'default',
})

function fileName(path) {
  return path.split('/').pop() || path
}

function sheetIdFromPath(path) {
  return fileName(path).replace(/\.[^.]+$/, '')
}

function sortedSheets() {
  return Object.entries(avatarFiles)
    .filter(([path]) => IMAGE_EXT.test(path))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, src]) => ({
      id: sheetIdFromPath(path),
      fileName: fileName(path),
      src,
    }))
}

function buildAvatars() {
  return sortedSheets().flatMap((sheet) => {
    const entries = []
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        const cell = `${ROW_LABELS[row]}${col + 1}`
        entries.push({
          id: `${sheet.id}:${cell}`,
          sheetId: sheet.id,
          sheetSrc: sheet.src,
          fileName: sheet.fileName,
          row,
          col,
          cell,
          nombre: `${sheet.id.toUpperCase()} ${cell}`,
        })
      }
    }
    return entries
  })
}

export const AVATARS = Object.freeze(buildAvatars())
export const DEFAULT_AVATAR_ID = AVATARS[0]?.id || ''

export function getAvatar(id) {
  return AVATARS.find((avatar) => avatar.id === id) || null
}

export function avatarsDisponibles() {
  return AVATARS
}
