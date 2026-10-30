import { useEffect, useRef } from 'react'
import { useBalance, useReadContract, useReadContracts, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import type { Address } from 'viem'
import { luckyDrawAbi } from '../abi/luckyDraw'

export const contractAddress = (import.meta.env.VITE_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000') as Address
export const isContractConfigured = contractAddress !== '0x0000000000000000000000000000000000000000'

const contract = { address: contractAddress, abi: luckyDrawAbi } as const

export function friendlyError(error: Error | null | undefined) {
  const message = error?.message ?? ''
  if (/User rejected|rejected the request/i.test(message)) return 'Transaction cancelled in your wallet.'
  if (/Already Bought 1/i.test(message)) return 'You have already purchased a ticket.'
  if (/SOLD/i.test(message)) return 'That ticket was just sold. Please choose another.'
  if (/insufficient funds/i.test(message)) return 'Your wallet does not have enough Sepolia ETH.'
  if (/valid amount/i.test(message)) return 'The ticket price changed. Please try again.'
  return message ? 'Transaction failed. Please check your wallet and try again.' : null
}

export function useLuckyDraw(address?: Address) {
  const tickets = useReadContracts({
    contracts: [0, 1, 2, 3, 4].map((index) => ({ ...contract, functionName: 'tickets', args: [BigInt(index)] })) as any,
    query: { enabled: isContractConfigured },
  })
  const price = useReadContract({ ...contract, functionName: 'price', query: { enabled: isContractConfigured } })
  const claimed = useReadContract({ ...contract, functionName: 'claimed', query: { enabled: isContractConfigured } })
  const hasBought = useReadContract({ ...contract, functionName: 'HasBought', args: address ? [address] : undefined, query: { enabled: Boolean(address) && isContractConfigured } })
  const boughtTicket = useReadContract({ ...contract, functionName: 'BoughtTicket', args: address ? [address] : undefined, query: { enabled: Boolean(address) && isContractConfigured } } as any)
  const isWinner = useReadContract({ ...contract, functionName: 'isWinner', args: address ? [address] : undefined, query: { enabled: Boolean(address) && isContractConfigured } })
  const pool = useBalance({ address: contractAddress, query: { enabled: isContractConfigured } })
  const refetchAll = () => {
    void tickets.refetch(); void price.refetch(); void claimed.refetch(); void hasBought.refetch(); void boughtTicket.refetch(); void isWinner.refetch(); void pool.refetch()
  }
  return { tickets, price, claimed, hasBought, boughtTicket, isWinner, pool, refetchAll }
}

export function useLuckyDrawWrite(onConfirmed: () => void) {
  const purchase = useWriteContract()
  const claim = useWriteContract()
  const purchaseReceipt = useWaitForTransactionReceipt({ hash: purchase.data })
  const claimReceipt = useWaitForTransactionReceipt({ hash: claim.data })
  // Keep the latest refresh function without re-running a confirmed transaction effect on every render.
  const onConfirmedRef = useRef(onConfirmed)
  useEffect(() => { onConfirmedRef.current = onConfirmed }, [onConfirmed])
  useEffect(() => { if (purchaseReceipt.isSuccess || claimReceipt.isSuccess) onConfirmedRef.current() }, [purchaseReceipt.isSuccess, claimReceipt.isSuccess])
  return { purchase, claim, purchaseReceipt, claimReceipt }
}

export { contract }
