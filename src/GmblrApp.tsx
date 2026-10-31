import { useCallback, useMemo, useState } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import type { Address } from 'viem'
import { formatEther } from 'viem'
import { BuyForm } from './components/BuyForm'
import { GmblrTicketGrid } from './components/GmblrTicketGrid'
import { PrizePool } from './components/PrizePool'
import { contract, friendlyError, isContractConfigured, TICKET_COUNT, useLuckyDraw, useLuckyDrawWrite } from './hooks/useGmblrDraw'

const short = (value?: Address) => value ? `${value.slice(0, 6)}…${value.slice(-4)}` : 'Loading…'

export default function GmblrApp() {
  const { address, isConnected } = useAccount(); const chainId = useChainId(); const { switchChain } = useSwitchChain(); const [selected, setSelected] = useState<number>()
  const lottery = useLuckyDraw(address); const refresh = useCallback(() => { lottery.refetchAll(); setSelected(undefined) }, [lottery]); const writes = useLuckyDrawWrite(refresh)
  const wrongNetwork = isConnected && chainId !== sepolia.id
  const owners = useMemo(() => (lottery.ticketOwners.data ?? []).map((item: any) => item.status === 'success' ? item.result as Address : undefined), [lottery.ticketOwners.data])
  const soldOut = lottery.ticketsSold.data === BigInt(TICKET_COUNT); const drawing = Boolean(lottery.draw.data) && lottery.winnerTicket.data === 0n; const winnerPicked = lottery.winnerTicket.data !== undefined && lottery.winnerTicket.data !== 0n; const finished = Boolean(lottery.claimed.data)
  const isOwner = Boolean(address && lottery.owner.data && address.toLowerCase() === lottery.owner.data.toLowerCase())
  const receiptPending = writes.purchaseReceipt.isLoading || writes.drawReceipt.isLoading || writes.claimReceipt.isLoading
  const claim = () => writes.claim.writeContract({ ...contract, functionName: 'claimPrize' })
  const requestDraw = () => writes.drawWinner.writeContract({ ...contract, functionName: 'drawWinner' })
  return <main>
    <header><a className="brand" href="/">Gmblr.</a><ConnectButton /></header>
    <section className="hero"><p className="eyebrow">SEPOLIA TESTNET LOTTERY</p><h1>Pick a number.<br /><em>Try your luck.</em></h1><p className="intro">Five tickets. One ticket per wallet. Chainlink VRF chooses the winner.</p></section>
    {!isContractConfigured && <p className="notice">Add the deployed contract address to <code>.env</code> before using the app.</p>}
    {wrongNetwork && <div className="network-notice"><span>Your wallet is not connected to Sepolia.</span><button onClick={() => switchChain({ chainId: sepolia.id })}>Switch to Sepolia</button></div>}
    <PrizePool value={lottery.pool.data?.value} loading={lottery.pool.isLoading} />
    <section className="content">
      <section className="panel tickets-panel"><div className="section-title"><div><p className="eyebrow">TICKETS</p><h2>Choose your ticket</h2></div><span>{formatEther(lottery.ticketPrice)} ETH</span></div><GmblrTicketGrid tickets={lottery.ticketNumbers} owners={owners} loading={lottery.tickets.isLoading || lottery.ticketOwners.isLoading} selected={selected} onSelect={setSelected} disabled={Boolean(lottery.hasBought.data) || wrongNetwork || soldOut} wallet={address} /></section>
      {!isConnected && <section className="panel buy-panel"><h2>Connect your wallet to enter</h2><p>Use the button above, then choose a ticket.</p></section>}
      {isConnected && !soldOut && <BuyForm selected={selected} price={lottery.ticketPrice} hasBought={Boolean(lottery.hasBought.data)} wrongNetwork={wrongNetwork} write={writes.purchase.writeContract} isPending={writes.purchase.isPending} error={writes.purchase.error} txHash={writes.purchase.data} />}
      {lottery.price.isError && <p className="notice">The deployed contract does not expose <code>price()</code>; using its documented fixed ticket price of 0.001 ETH.</p>}
      {soldOut && !lottery.draw.data && <section className="panel buy-panel"><p className="eyebrow">SOLD OUT</p><h2>Waiting for draw</h2><p>All five tickets are sold. Only the lottery owner can request Chainlink VRF.</p>{isOwner && <button className="primary action-button" disabled={wrongNetwork || writes.drawWinner.isPending} onClick={requestDraw}>{writes.drawWinner.isPending ? 'Waiting for wallet…' : 'Draw Winner'}</button>}{writes.drawWinner.error && <p className="error">{friendlyError(writes.drawWinner.error)}</p>}</section>}
      {drawing && <section className="panel scratch-section"><p className="eyebrow">DRAW IN PROGRESS</p><h2>Waiting for Chainlink VRF <span className="spinner" aria-label="Loading" /></h2><p>Randomness usually arrives in 1–2 minutes. This page checks every 10 seconds.</p></section>}
      {winnerPicked && !finished && <section className="panel claim"><p className="eyebrow">WINNER PICKED</p><h2>Ticket {lottery.winnerTicket.data?.toString()}</h2><p>Owned by {short(lottery.winningOwner.data as Address | undefined)}.</p>{Boolean(lottery.isWinner.data) && <button className="primary action-button" disabled={wrongNetwork || writes.claim.isPending} onClick={claim}>{writes.claim.isPending ? 'Waiting for wallet…' : 'Claim Prize'}</button>}{writes.claim.error && <p className="error">{friendlyError(writes.claim.error)}</p>}</section>}
      {finished && <section className="panel"><p className="eyebrow">ROUND FINISHED</p><h2>Prize claimed</h2><p>Winner: {short(lottery.winningOwner.data as Address | undefined)}.</p></section>}
    </section>
    {receiptPending && <p className="confirmation">Confirming on Sepolia…</p>}
  </main>
}
