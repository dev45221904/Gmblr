import '@rainbow-me/rainbowkit/styles.css'
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import App from './App'
import './styles.css'

const config = getDefaultConfig({ appName: 'Gmblr', projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '00000000000000000000000000000000', chains: [sepolia], ssr: false })
const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(<StrictMode><WagmiProvider config={config}><QueryClientProvider client={queryClient}><RainbowKitProvider><App /></RainbowKitProvider></QueryClientProvider></WagmiProvider></StrictMode>)
