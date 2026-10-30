import type { Address } from 'viem'
import { zeroAddress } from 'viem'

type Props = { tickets: readonly bigint[]; owners: readonly (Address | undefined)[]; loading: boolean; selected?: number; onSelect: (index: number) => void; disabled: boolean; wallet?: Address }
const shorten = (value: Address) => `${value.slice(0, 6)}…${value.slice(-4)}`

export function GmblrTicketGrid({ tickets, owners, loading, selected, onSelect, disabled, wallet }: Props) {
  if (loading) return <div className="ticket-grid">{Array.from({ length: 5 }, (_, i) => <div className="ticket skeleton" key={i} />)}</div>
  return <div className="ticket-grid" aria-label="Lottery tickets">{tickets.map((number, index) => {
    const buyer = owners[index]; const sold = Boolean(buyer && buyer !== zeroAddress); const mine = Boolean(wallet && buyer?.toLowerCase() === wallet.toLowerCase())
    return <button key={index} className={`ticket ${sold ? 'sold' : ''} ${mine ? 'mine' : ''} ${selected === index ? 'selected' : ''}`} disabled={sold || disabled} onClick={() => onSelect(index)} aria-pressed={selected === index}>
      <span className="ticket-label">{sold ? (mine ? 'Your ticket' : 'Sold') : `Slot ${index + 1}`}</span><strong>{number ? number.toString() : '—'}</strong><small>{sold && buyer ? shorten(buyer) : 'Available'}</small>
    </button>
  })}</div>
}
