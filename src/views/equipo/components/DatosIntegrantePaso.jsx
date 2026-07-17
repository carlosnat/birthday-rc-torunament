import AvatarSprite from '../../../components/AvatarSprite.jsx'

function AvatarSelector({ listaAvatares, avatarId, setAvatarId }) {
  if (!listaAvatares.length) {
    return <div className="text-rojo">NO HAY AVATARES DISPONIBLES EN assets/images.</div>
  }

  return (
    <div className="stack avatar-selector" style={{ gap: 8 }}>
      <div className="text-dim">ELEGI TU AVATAR</div>
      <div className="avatar-grid-scroll">
        <div className="avatar-grid">
          {listaAvatares.map((avatar) => (
            <button
              key={avatar.id}
              type="button"
              className={`avatar-option ${avatarId === avatar.id ? 'selected' : ''}`}
              onClick={() => setAvatarId(avatar.id)}
              title={avatar.nombre}
            >
              <AvatarSprite avatarId={avatar.id} size="100%" className="avatar-option-sprite" alt={avatar.nombre} />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function DatosIntegrantePaso({
  miNombre,
  setMiNombre,
  avatarId,
  setAvatarId,
  listaAvatares,
  onConfirmar,
  loading,
  cta = 'CONFIRMAR',
}) {
  const puedeConfirmar = Boolean(miNombre?.trim())

  return (
    <>
      <input
        className="input"
        placeholder="TU NOMBRE"
        value={miNombre}
        onChange={(e) => setMiNombre(e.target.value)}
      />

      <AvatarSelector
        listaAvatares={listaAvatares}
        avatarId={avatarId}
        setAvatarId={setAvatarId}
      />

      <div className="eq-fixed-cta-spacer" aria-hidden />
      <div className="eq-fixed-cta">
        <button
          className="btn btn--primary eq-fixed-cta-btn"
          type="button"
          disabled={!puedeConfirmar || loading}
          onClick={onConfirmar}
        >
          {loading ? 'GUARDANDO...' : cta}
        </button>
      </div>
    </>
  )
}
