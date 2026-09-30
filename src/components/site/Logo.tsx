// Semn provizoriu (trei scânduri stivuite) — de înlocuit cu logo-ul real al firmei (fișier SVG/PNG).
export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className={light ? 'brand is-light' : 'brand'}>
      <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="currentColor" />
        <rect x="7" y="8.5" width="18" height="4" rx="1.5" fill="#d9a86c" />
        <rect x="7" y="14" width="18" height="4" rx="1.5" fill="#e8c38f" />
        <rect x="7" y="19.5" width="18" height="4" rx="1.5" fill="#d9a86c" />
      </svg>
      <span className="brand-name">EUROVYPCUC</span>
    </span>
  )
}
