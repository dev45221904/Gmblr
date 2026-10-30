import GmblrApp from './GmblrApp'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { BuyForm } from './components/BuyForm'
import { ClaimPrize } from './components/ClaimPrize'
import { PrizePool } from './components/PrizePool'
import { ScratchCard } from './components/ScratchCard'
import { TicketGrid } from './components/TicketGrid'
import { contract, isContractConfigured, useLuckyDraw, useLuckyDrawWrite } from './hooks/useLuckyDraw'

function LegacyApp() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const [selected, setSelected] = useState<number>()
  const [hasScratched, setHasScratched] = useState(false)
  const draw = useLuckyDraw(address)
  const refresh = useCallback(() => { draw.refetchAll(); setSelected(undefined) }, [draw])
  const writes = useLuckyDrawWrite(refresh)
  const wrongNetwork = isConnected && chainId !== sepolia.id
  const ticketNumbers = useMemo(() => (draw.tickets.data ?? []).map((result) => result.status === 'success' ? result.result as bigint : undefined), [draw.tickets.data])
  // A new wallet or newly purchased ticket must be scratched independently.
  useEffect(() => { setHasScratched(false) }, [address, draw.boughtTicket.data])

  return <main>
    <header><a className="brand" href="/">Gmblr.</a><ConnectButton /></header>
    <section className="hero"><p className="eyebrow">SEPOLIA TESTNET LOTTERY</p><h1>Pick a number.<br /><em>Try your  luck.</em></h1><p className="intro">One ticket per wallet. The prize pool goes to the winning ticket.</p></section>
    {!isContractConfigured && <p className="notice">Add your deployed contract address to <code>.env</code> before using the app.</p>}
    {wrongNetwork && <div className="network-notice"><span>Your wallet is not connected to Sepolia.</span><button onClick={() => switchChain({ chainId: sepolia.id })}>Switch to Sepolia</button></div>}
    <PrizePool value={draw.pool.data?.value} loading={draw.pool.isLoading} />
    <section className="content"><section className="panel tickets-panel"><div className="section-title"><div><p className="eyebrow">AVAILABLE NUMBERS</p><h2>Choose your ticket</h2></div><span>0.001 ETH</span></div><TicketGrid tickets={ticketNumbers} loading={draw.tickets.isLoading} selected={selected} onSelect={setSelected} disabled={Boolean(draw.hasBought.data) || wrongNetwork} /></section>
      {isConnected ? <BuyForm selected={selected} price={draw.price.data} hasBought={Boolean(draw.hasBought.data)} wrongNetwork={wrongNetwork} write={writes.purchase.writeContract} isPending={writes.purchase.isPending} error={writes.purchase.error} txHash={writes.purchase.data} /> : <section className="panel buy-panel"><h2>Connect your wallet to enter</h2><p>Use the button above, then choose a ticket.</p></section>}
      {Boolean(draw.hasBought.data) && <ScratchCard ticket={draw.boughtTicket.data as bigint | undefined} winner={Boolean(draw.isWinner.data)} loading={draw.isWinner.isLoading} onReveal={() => setHasScratched(true)} />}
      {isConnected && hasScratched && Boolean(draw.isWinner.data) && <ClaimPrize winner={Boolean(draw.isWinner.data)} claimed={Boolean(draw.claimed.data)} wrongNetwork={wrongNetwork} write={(args) => writes.claim.writeContract({ ...contract, ...args })} pending={writes.claim.isPending} error={writes.claim.error} hash={writes.claim.data} />}
    </section>
    {(writes.purchaseReceipt.isLoading || writes.claimReceipt.isLoading) && <p className="confirmation">Confirming on Sepolia…</p>}
    {(writes.purchaseReceipt.isSuccess || writes.claimReceipt.isSuccess) && <p className="success">Confirmed on Sepolia. The draw has been refreshed.</p>}
  </main>
}

export default GmblrApp
