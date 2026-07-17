import { useMemo } from 'react'

export default function CrearEquipoPaso({
  nombreEquipo,
  setNombreEquipo,
  colorId,
  setColorId,
  coloresDisponibles,
  onCrear,
  loading,
}) {
  const puedeCrear = useMemo(
    () => Boolean(nombreEquipo?.trim() && colorId),
    [nombreEquipo, colorId],
  )

  if (!coloresDisponibles.length) {
    return <div className="text-rojo">NO QUEDAN COLORES LIBRES. UNITE A UN EQUIPO EXISTENTE.</div>
  }

  return (
    <>
      <input
        className="input"
        placeholder="NOMBRE DEL EQUIPO"
        value={nombreEquipo}
        onChange={(e) => setNombreEquipo(e.target.value)}
      />

      <div className="row">
        {coloresDisponibles.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`color-pick ${colorId === c.id ? 'sel' : ''}`}
            style={{ background: c.hex }}
            onClick={() => setColorId(c.id)}
            title={c.nombre}
          />
        ))}
      </div>

      <div className="eq-fixed-cta-spacer" aria-hidden />
      <div className="eq-fixed-cta">
        <button
          className="btn btn--primary eq-fixed-cta-btn"
          type="button"
          disabled={!puedeCrear || loading}
          onClick={onCrear}
        >
          {loading ? 'CREANDO...' : 'CREAR EQUIPO'}
        </button>
      </div>
    </>
  )
}
