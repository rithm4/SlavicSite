import logoMark from '../../assets/logo-mark.png'

// Logo provizoriu al firmei (roți dințate și săgeți), până la varianta finală.
// Pe fundal închis (`light`) semnul stă pe un pătrat alb, ca să se vadă culorile.
export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className={light ? 'brand is-light' : 'brand'}>
      <span className="brand-mark">
        <img src={logoMark} width={190} height={160} alt="" decoding="async" />
      </span>
      <span className="brand-name">EUROVYPCUC</span>
    </span>
  )
}
