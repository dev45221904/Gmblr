import { useCallback, useEffect, useRef } from 'react'
import { useBalance, useReadContract, useReadContracts, useWaitForTransactionReceipt, useWatchContractEvent, useWriteContract } from 'wagmi'
import type { Address } from 'viem'
import { zeroAddress } from 'viem'
import { luckyDrawAbi } from '../abi/luckyDraw'

export const TICKET_COUNT = 5
// The deployed Gmblr address currently enforces 0.001 ETH but reverts on price().
// Prefer the getter whenever its implementation is available.
export const DEPLOYED_TICKET_PRICE = 1_000_000_000_000_000n
export const contractAddress = (import.meta.env.VITE_CONTRACT_ADDRESS || zeroAddress) as Address
export const isContractConfigured = contractAddress !== zeroAddress
export const contract = { address: contractAddress, abi: luckyDrawAbi } as const

export function friendlyError(error: Error | null | undefined) {
  const message = error?.message ?? ''
  if (/User rejected|rejected the request|user denied/i.test(message)) return 'Transaction cancelled.'
  if (/Already Bought 1, Cannot buy more/i.test(message)) return 'You already hold a ticket.'
  if (/please enter the valid amount/i.test(message)) return 'Wrong ETH amount.'
  if (/mention valid ticket Sequence/i.test(message)) return 'Invalid ticket.'
  if (/Ticket already sold/i.test(message)) return 'Someone just took it. Refreshing the grid…'
  if (/Not all tickets sold/i.test(message)) return 'All tickets must be sold before drawing.'
  if (/Draw already requested/i.test(message)) return 'The draw has already been requested.'
  if (/Prize already claimed/i.test(message)) return 'The prize has already been claimed.'
  if (/Not the winner/i.test(message)) return 'Only the winning ticket owner can claim the prize.'
  if (/Transfer failed/i.test(message)) return 'Prize transfer failed. Please try again.'
  if (/insufficient funds/i.test(message)) return 'Your wallet does not have enough Sepolia ETH.'
  return message ? 'Transaction failed. Please check your wallet and try again.' : null
}

export function useLuckyDraw(address?: Address) {
  const tickets = useReadContracts({ contracts: Array.from({ length: TICKET_COUNT }, (_, index) => ({ ...contract, functionName: 'tickets', args: [BigInt(index)] })) as any, query: { enabled: isContractConfigured } })
  const ticketNumbers = (tickets.data ?? []).map((result: any) => result.status === 'success' ? result.result as bigint : 0n)
  const ticketOwners = useReadContracts({ contracts: ticketNumbers.map((ticket: bigint) => ({ ...contract, functionName: 'TickOwner', args: [ticket] })) as any, query: { enabled: isContractConfigured && ticketNumbers.length === TICKET_COUNT } })
  const price = useReadContract({ ...contract, functionName: 'price', query: { enabled: isContractConfigured } })
  const owner = useReadContract({ ...contract, functionName: 'owner', query: { enabled: isContractConfigured } })
  const ticketsSold = useReadContract({ ...contract, functionName: 'ticketsSold', query: { enabled: isContractConfigured } })
  const draw = useReadContract({ ...contract, functionName: 'draw', query: { enabled: isContractConfigured } })
  const winnerTicket = useReadContract({ ...contract, functionName: 'WinnerTicket', query: { enabled: isContractConfigured } })
  const claimed = useReadContract({ ...contract, functionName: 'claimed', query: { enabled: isContractConfigured } })
  const hasBought = useReadContract({ ...contract, functionName: 'HasBought', args: address ? [address] : undefined, query: { enabled: Boolean(address) && isContractConfigured } })
  const isWinner = useReadContract({ ...contract, functionName: 'isWinner', args: address ? [address] : undefined, query: { enabled: Boolean(address) && isContractConfigured } })
  const winningOwner = useReadContract({ ...contract, functionName: 'TickOwner', args: winnerTicket.data && winnerTicket.data !== 0n ? [winnerTicket.data] : undefined, query: { enabled: Boolean(winnerTicket.data) && winnerTicket.data !== 0n && isContractConfigured } })
  const pool = useBalance({ address: contractAddress, query: { enabled: isContractConfigured } })
  const refetchAll = useCallback(() => { void tickets.refetch(); void ticketOwners.refetch(); void price.refetch(); void owner.refetch(); void ticketsSold.refetch(); void draw.refetch(); void winnerTicket.refetch(); void claimed.refetch(); void hasBought.refetch(); void isWinner.refetch(); void winningOwner.refetch(); void pool.refetch() }, [tickets, ticketOwners, price, owner, ticketsSold, draw, winnerTicket, claimed, hasBought, isWinner, winningOwner, pool])
  const refreshRef = useRef(refetchAll)
  useEffect(() => { refreshRef.current = refetchAll }, [refetchAll])
  const onEvent = useCallback(() => refreshRef.current(), [])
  useWatchContractEvent({ ...contract, eventName: 'TicketPurchased', onLogs: onEvent, enabled: isContractConfigured })
  useWatchContractEvent({ ...contract, eventName: 'DrawRequested', onLogs: onEvent, enabled: isContractConfigured })
  useWatchContractEvent({ ...contract, eventName: 'WinnerPicked', onLogs: onEvent, enabled: isContractConfigured })
  useWatchContractEvent({ ...contract, eventName: 'PrizeClaimed', onLogs: onEvent, enabled: isContractConfigured })
  useEffect(() => { if (!draw.data || winnerTicket.data !== 0n) return; const timer = window.setInterval(() => refreshRef.current(), 10_000); return () => window.clearInterval(timer) }, [draw.data, winnerTicket.data])
  const ticketPrice = price.data ?? DEPLOYED_TICKET_PRICE
  return { tickets, ticketNumbers, ticketOwners, price, ticketPrice, owner, ticketsSold, draw, winnerTicket, claimed, hasBought, isWinner, winningOwner, pool, refetchAll }
}

export function useLuckyDrawWrite(onConfirmed: () => void) {
  const purchase = useWriteContract(); const drawWinner = useWriteContract(); const claim = useWriteContract()
  const purchaseReceipt = useWaitForTransactionReceipt({ hash: purchase.data }); const drawReceipt = useWaitForTransactionReceipt({ hash: drawWinner.data }); const claimReceipt = useWaitForTransactionReceipt({ hash: claim.data })
  const confirmed = useRef(onConfirmed); useEffect(() => { confirmed.current = onConfirmed }, [onConfirmed])
  useEffect(() => { if (purchaseReceipt.isSuccess || drawReceipt.isSuccess || claimReceipt.isSuccess) confirmed.current() }, [purchaseReceipt.isSuccess, drawReceipt.isSuccess, claimReceipt.isSuccess])
  return { purchase, drawWinner, claim, purchaseReceipt, drawReceipt, claimReceipt }
}
