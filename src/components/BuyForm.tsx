import { formatEther } from 'viem'
import type { Address } from 'viem'
import { contract, friendlyError } from '../hooks/useGmblrDraw'

type Props = { selected?: number; price?: bigint; hasBought: boolean; wrongNetwork: boolean; write: (args: any) => void; isPending: boolean; error?: Error | null; txHash?: string }
export function BuyForm({ selected, price, hasBought, wrongNetwork, write, isPending, error, txHash }: Props) {
  const canBuy = !hasBought && selected !== undefined && price !== undefined && !wrongNetwork && !isPending
  const buy = () => { if (canBuy) write({ ...contract, functionName: 'purchase', args: [BigInt(selected!)], value: price }) }
  if (hasBought) return <section className="panel buy-panel"><p className="eyebrow">YOUR ENTRY</p><h2>You already hold a ticket.</h2><p>Only one ticket may be purchased per wallet.</p></section>
  return <section className="panel buy-panel"><p className="eyebrow">ENTER THE DRAW</p><h2>Choose a ticket, then make it yours.</h2><button className="primary" type="button" disabled={!canBuy} onClick={buy}>{isPending ? 'Waiting for wallet…' : price ? `Buy for ${formatEther(price)} ETH` : 'Loading price…'}</button>{selected === undefined && <p className="hint">Select an available ticket above.</p>}{error && <p className="error" role="alert">{friendlyError(error)}</p>}{txHash && <p className="status">Transaction submitted: <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noreferrer">View on Etherscan ↗</a></p>}</section>
}
