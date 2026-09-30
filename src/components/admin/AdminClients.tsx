import { currency } from '../../config/company'
import { formatMoney } from '../../lib/format'
import { dateOf } from '../account/util'
import type { AdminData } from './AdminPanel'

export function AdminClients({ data }: { data: AdminData }) {
  const { clients, orders, loading } = data
  if (clients.length === 0) {
    return <p className="muted">{loading ? 'Se încarcă…' : 'Încă nu s-a înregistrat nicio firmă.'}</p>
  }
  return (
    <section className="admin-section">
      <div className="table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Firma</th>
              <th>Contact</th>
              <th>Înregistrată</th>
              <th className="num">Comenzi</th>
              <th className="num">Total, {currency}</th>
            </tr>
          </thead>
          <tbody>
            {clients.map(({ userId, profile: p, createdAt }) => {
              const own = orders.filter((o) => o.userId === userId && o.status !== 'anulata')
              return (
                <tr key={userId}>
                  <td>
                    <strong>{p.name || '—'}</strong>
                    <small>
                      CUI {p.cui || '—'}
                      {p.regCom && ` · ${p.regCom}`}
                    </small>
                  </td>
                  <td>
                    {p.contactPerson || '—'}
                    <small>
                      {p.phone} · <a href={`mailto:${p.email}`}>{p.email}</a>
                    </small>
                  </td>
                  <td>{dateOf(createdAt)}</td>
                  <td className="num">{own.length}</td>
                  <td className="num">{formatMoney(own.reduce((s, o) => s + o.quote.total, 0))}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
