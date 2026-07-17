const ITEMS = [
  { id: 'inicio', label: 'INICIO' },
  { id: 'tiempos', label: 'TIEMPOS' },
  { id: 'piloto', label: 'PILOTO' },
  { id: 'equipo', label: 'EQUIPO' },
]

export default function EquipoFooterMenu({ activeTab, onChange }) {
  return (
    <nav className="eq-footer-menu" aria-label="SECCIONES DE EQUIPO">
      <div className="eq-footer-menu-track">
        {ITEMS.map((item) => {
          const active = activeTab === item.id
          return (
            <button
              key={item.id}
              type="button"
              className={`eq-footer-tab ${active ? 'is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
              onClick={() => onChange(item.id)}
            >
              <span className="eq-footer-tab-label">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
