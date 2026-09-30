import { ArrowRight } from 'lucide-react'
import type { StandardProduct } from '../../config/catalog'
import { currency } from '../../config/company'
import { formatMoney, formatQty } from '../../lib/format'
import { productPhoto } from '../../lib/productPhotos'
import { orderHref } from '../../lib/useRoute'

/** Prețul unui palet întreg; fără zecimale când e o sumă rotundă (ex. „720 EUR”). */
function palletPrice(product: StandardProduct) {
  const total = Math.round(product.price * product.piecesPerPallet * 100) / 100
  return Number.isInteger(total) ? formatQty(total) : formatMoney(total)
}

export function ProductCard({ product }: { product: StandardProduct }) {
  const photo = productPhoto(product.id)
  return (
    <article className="product-card reveal">
      <div className="product-card-art">
        {photo ? (
          <img className="product-photo" src={photo} width={1080} height={630} alt="" loading="lazy" decoding="async" />
        ) : (
          <PlankArt product={product} />
        )}
        <span className="product-card-size">{product.size} mm</span>
      </div>
      <h3>{product.name}</h3>
      <p className="product-card-price">
        <strong>{formatMoney(product.price)}</strong> {currency} / {product.unit}
      </p>
      <dl className="product-card-meta">
        <div>
          <dt>Un palet</dt>
          <dd>
            {formatQty(product.piecesPerPallet)} {product.unit} · {palletPrice(product)} {currency}
          </dd>
        </div>
        {product.perCrate && (
          <div>
            <dt>Într-o lădiță</dt>
            <dd>
              {product.perCrate} {product.unit}
            </dd>
          </div>
        )}
        {product.contents && (
          <div className="is-wide">
            <dt>Conține</dt>
            <dd>{product.contents}</dd>
          </div>
        )}
      </dl>
      <a className="btn product-card-btn btn-icon" href={orderHref(product.id)} aria-label={`Comandă: ${product.name}`}>
        Comandă
        <ArrowRight size={16} aria-hidden="true" />
      </a>
    </article>
  )
}

/** Rezervă pentru produsele fără fotografie: desen la scară, din dimensiuni (lungime × lățime × grosime, în mm). */
function PlankArt({ product }: { product: StandardProduct }) {
  const [length, width, thickness] = product.size.split('×').map((s) => parseFloat(s))

  if (product.id.startsWith('set')) return <CrateArt />

  const scale = Math.min(200 / length, 88 / width)
  const w = length * scale
  const h = Math.max(width * scale, 8)
  const depth = Math.max(Math.min(thickness * scale * 1.2, 14), 3)
  const x = (240 - w - depth) / 2
  const y = (140 - h + depth) / 2
  const grain = h > 14 ? [0.3, 0.55, 0.78] : []

  return (
    <svg className="plank-art" viewBox="0 0 240 140" aria-hidden="true">
      <polygon className="pa-top" points={`${x},${y} ${x + depth},${y - depth} ${x + w + depth},${y - depth} ${x + w},${y}`} />
      <polygon className="pa-side" points={`${x + w},${y} ${x + w + depth},${y - depth} ${x + w + depth},${y + h - depth} ${x + w},${y + h}`} />
      <rect className="pa-front" x={x} y={y} width={w} height={h} />
      {grain.map((t) => (
        <path
          key={t}
          className="pa-grain"
          d={`M${x + 8} ${y + h * t} C ${x + w * 0.35} ${y + h * t - 3}, ${x + w * 0.65} ${y + h * t + 3}, ${x + w - 8} ${y + h * t}`}
        />
      ))}
    </svg>
  )
}

function CrateArt() {
  // Lădiță văzută din unghi: față din trei scânduri, lateral în perspectivă, șipci de colț
  const slats = [48, 72, 96]
  return (
    <svg className="plank-art" viewBox="0 0 240 140" aria-hidden="true">
      <polygon className="pa-inside" points="42,48 92,22 208,22 158,48" />
      {slats.map((y) => (
        <polygon key={`s${y}`} className="pa-side" points={`158,${y} 208,${y - 26} 208,${y - 8} 158,${y + 18}`} />
      ))}
      {slats.map((y) => (
        <rect key={`f${y}`} className="pa-front" x="42" y={y} width="116" height="18" />
      ))}
      <rect className="pa-post" x="42" y="48" width="8" height="66" />
      <rect className="pa-post" x="150" y="48" width="8" height="66" />
      <polygon className="pa-post-side" points="200,26 208,22 208,88 200,92" />
    </svg>
  )
}
