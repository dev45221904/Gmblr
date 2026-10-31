import { formatEther } from 'viem'

type Props = {
  value?: bigint
  loading: boolean
}

export function PrizePool({ value, loading }: Props) {
  return <section className="pool" aria-live="polite">
    <span>Current prize pool</span>
    <strong>{loading ? 'Loading…' : `${formatEther(value ?? 0n)} ETH`}</strong>
    <small>Sepolia testnet</small>
  </section>
}
