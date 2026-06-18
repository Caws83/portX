import { useEffect, useMemo, useState } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import {
  useAccount,
  useBalance,
  useChainId,
  useReadContracts,
  useSwitchChain,
  useWriteContract,
} from 'wagmi'
import { formatEther, parseEventLogs, type Address, zeroAddress } from 'viem'
import { waitForTransactionReceipt } from 'wagmi/actions'

import { portxGenesisNftAbi } from '@/config/abis/portxGenesisNft'
import { IPFS_GATEWAY, NFT_ADDRESS, NFT_CHAIN } from '@/config/chains'
import { wagmiConfig } from '@/config/wagmi'

function ipfsToHttp(uri: string) {
  if (!uri) return ''
  if (uri.startsWith('ipfs://')) return `${IPFS_GATEWAY}${uri.replace('ipfs://', '')}`
  return uri
}

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function NftMint() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()

  const [mintAmount, setMintAmount] = useState(1)
  const [isMinting, setIsMinting] = useState(false)
  const [feedback, setFeedback] = useState('Connect your wallet to mint.')
  const [previewImage, setPreviewImage] = useState('')
  const [mintedIds, setMintedIds] = useState<number[]>([])

  const properChain = chainId === NFT_CHAIN.id
  const account = address ?? zeroAddress

  const hasContract = Boolean(NFT_ADDRESS && NFT_ADDRESS.startsWith('0x') && NFT_ADDRESS.length === 42)

  const { data: balanceData } = useBalance({
    address,
    chainId: NFT_CHAIN.id,
  })

const { data, refetch } = useReadContracts({
  contracts: hasContract
    ? [
        { address: NFT_ADDRESS, abi: portxGenesisNftAbi, functionName: 'name', chainId: NFT_CHAIN.id },
        { address: NFT_ADDRESS, abi: portxGenesisNftAbi, functionName: 'totalSupply', chainId: NFT_CHAIN.id },
        { address: NFT_ADDRESS, abi: portxGenesisNftAbi, functionName: 'maxSupply', chainId: NFT_CHAIN.id },
        { address: NFT_ADDRESS, abi: portxGenesisNftAbi, functionName: 'mintPrice', chainId: NFT_CHAIN.id },
        { address: NFT_ADDRESS, abi: portxGenesisNftAbi, functionName: 'goPublic', chainId: NFT_CHAIN.id },
        { address: NFT_ADDRESS, abi: portxGenesisNftAbi, functionName: 'owner', chainId: NFT_CHAIN.id },
        { address: NFT_ADDRESS, abi: portxGenesisNftAbi, functionName: 'whitelisted', args: [account], chainId: NFT_CHAIN.id },
        { address: NFT_ADDRESS, abi: portxGenesisNftAbi, functionName: 'howMany', args: [account], chainId: NFT_CHAIN.id },
        { address: NFT_ADDRESS, abi: portxGenesisNftAbi, functionName: 'metadataURI', chainId: NFT_CHAIN.id, },
      ]
    : [],
  query: {
    enabled: hasContract,
    refetchInterval: hasContract ? 30_000 : false,
  },
})

const info = useMemo(() => {
  if (!hasContract) {
    return {
      name: 'PortX Genesis NFT',
      totalSupply: 0,
      maxSupply: 1000,
      mintPrice: 0n,
      goPublic: false,
      owner: zeroAddress as Address,
      whitelisted: false,
      whitelistSpots: 0,
      metadataUri : '',
    }
  }

  return {
    name: String(data?.[0]?.result ?? 'PortX Genesis NFT'),
    totalSupply: Number(data?.[1]?.result ?? 0n),
    maxSupply: Number(data?.[2]?.result ?? 0n),
    mintPrice: data?.[3]?.result ?? 0n,
    goPublic: Boolean(data?.[4]?.result ?? false),
    owner: (data?.[5]?.result ?? zeroAddress) as Address,
    whitelisted: Boolean(data?.[6]?.result ?? false),
    whitelistSpots: Number(data?.[7]?.result ?? 0n),
    metadataUri : String(data?.[8]?.result ?? ''),
  }
}, [data, hasContract])

  const isOwner = address?.toLowerCase() === info.owner.toLowerCase()
  const remaining = Math.max(info.maxSupply - info.totalSupply, 0)
  const soldOut = info.maxSupply > 0 && remaining === 0

  const maxMintAllowed = isOwner ? remaining : Math.min(remaining, 5)
  const totalCost = info.mintPrice * BigInt(mintAmount)

  useEffect(() => {
    if (!isConnected) setFeedback('Connect your wallet to mint.')
    else if (!properChain) setFeedback(`Switch to ${NFT_CHAIN.name}.`)
    else if (soldOut) setFeedback('Mint is sold out.')
    else if (info.whitelisted) setFeedback(`You have ${info.whitelistSpots} free whitelist mint(s).`)
    else if (!info.goPublic && !isOwner) setFeedback('Public mint is not live yet.')
    else setFeedback('Ready to mint.')
  }, [isConnected, properChain, soldOut, info.whitelisted, info.whitelistSpots, info.goPublic, isOwner])

useEffect(() => {
  async function loadMetadata() {
    if (!info.metadataUri) return

    try {
      const response = await fetch(ipfsToHttp(info.metadataUri))
      const metadata = await response.json()

      if (metadata.image) {
        setPreviewImage(ipfsToHttp(metadata.image))
      }
    } catch (err) {
      console.error(err)
    }
  }

  loadMetadata()
}, [info.metadataUri])

  async function handleMint() {
    if (!address || isMinting) return

    if (!properChain) {
      switchChain({ chainId: NFT_CHAIN.id })
      return
    }

    if (!hasContract) {
        setFeedback('Demo mode: deploy the NFT contract and add the address to enable minting.')
        return
    }

    setIsMinting(true)
    setMintedIds([])
    setFeedback('Minting... confirm the transaction in your wallet.')

    try {
      const hash = isOwner
        ? await writeContractAsync({
            address: NFT_ADDRESS,
            abi: portxGenesisNftAbi,
            functionName: 'ownerMint',
            args: [address, BigInt(mintAmount)],
            chainId: NFT_CHAIN.id,
          })
        : info.whitelisted
          ? await writeContractAsync({
              address: NFT_ADDRESS,
              abi: portxGenesisNftAbi,
              functionName: 'whiteMint',
              chainId: NFT_CHAIN.id,
            })
          : await writeContractAsync({
              address: NFT_ADDRESS,
              abi: portxGenesisNftAbi,
              functionName: 'mintNFT',
              args: [address, BigInt(mintAmount)],
              value: totalCost,
              chainId: NFT_CHAIN.id,
            })

      setFeedback('Transaction submitted. Waiting for confirmation...')

      const receipt = await waitForTransactionReceipt(wagmiConfig, { hash })

      if (receipt.status !== 'success') {
        setFeedback('Transaction failed.')
        return
      }

      const logs = parseEventLogs({
        abi: portxGenesisNftAbi,
        eventName: 'NFTMinted',
        logs: receipt.logs,
      })

      const ids = logs.map((log) => Number(log.args.tokenId))
      setMintedIds(ids)

      setFeedback(ids.length > 1 ? `Minted NFTs #${ids.join(', #')}` : `Minted NFT #${ids[0]}`)
      await refetch()
    } catch (error) {
      console.error(error)
      setFeedback('Mint cancelled or failed.')
    } finally {
      setIsMinting(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <section className="mb-14">
        <div className="card-glow relative overflow-hidden p-8 md:p-12">
          <div
            className="absolute inset-0 opacity-40 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 70% 60% at 20% 0%, rgba(0,255,136,0.12), transparent 55%), radial-gradient(ellipse 50% 40% at 90% 20%, rgba(0,212,255,0.1), transparent 50%)',
            }}
          />

          <div className="relative z-10 grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide border border-portx-green/30 bg-portx-green/10 text-portx-green mb-5">
                Genesis NFT Mint
              </span>

              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
                Mint your <span className="gradient-text">{info.name}</span>
              </h1>

              <p className="mt-5 text-lg md:text-xl text-white/80 leading-relaxed">
                One collection. One image. Early PortX access and future ecosystem utility.
              </p>

              <div className="mt-8 flex flex-wrap gap-3 items-center">
                <ConnectButton />
              </div>
            </div>

            <div className="card bg-portx-surface/70 border-portx-border p-4">
              <div className="aspect-square rounded-2xl overflow-hidden border border-white/10 bg-black/30 flex items-center justify-center">
                {previewImage ? (
                  <img src={previewImage} alt="PortX Genesis NFT" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center px-6">
                    <p className="text-5xl mb-3">🟢</p>
                    <p className="text-portx-muted text-sm">NFT preview image</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid lg:grid-cols-[1fr_420px] gap-6 mb-14">
        <div className="card-glow p-6 md:p-8">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold">Mint status</h2>
              <p className="text-portx-muted text-sm mt-1">
                Contract: {hasContract ? truncateAddress(NFT_ADDRESS) : 'Demo mode - no contract yet'}
              </p>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                soldOut
                  ? 'border-red-400/30 bg-red-400/10 text-red-300'
                  : info.goPublic
                    ? 'border-portx-green/30 bg-portx-green/10 text-portx-green'
                    : 'border-yellow-400/30 bg-yellow-400/10 text-yellow-300'
              }`}
            >
              {soldOut ? 'Sold out' : info.goPublic ? 'Live' : 'Not live'}
            </span>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-portx-border bg-portx-surface p-4">
              <p className="text-xs text-portx-muted uppercase tracking-widest">Minted</p>
              <p className="mt-2 text-2xl font-bold font-mono">
                {info.totalSupply} / {info.maxSupply}
              </p>
            </div>

            <div className="rounded-2xl border border-portx-border bg-portx-surface p-4">
              <p className="text-xs text-portx-muted uppercase tracking-widest">Price</p>
              <p className="mt-2 text-2xl font-bold font-mono">
                {formatEther(info.mintPrice)} {NFT_CHAIN.nativeCurrency.symbol}
              </p>
            </div>

            <div className="rounded-2xl border border-portx-border bg-portx-surface p-4">
              <p className="text-xs text-portx-muted uppercase tracking-widest">Wallet balance</p>
              <p className="mt-2 text-2xl font-bold font-mono">
                {balanceData ? Number(formatEther(balanceData.value)).toFixed(3) : '0.000'}
              </p>
            </div>
          </div>

          <div className="mt-6 h-3 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-portx-green"
              style={{
                width: info.maxSupply ? `${Math.min((info.totalSupply / info.maxSupply) * 100, 100)}%` : '0%',
              }}
            />
          </div>

          {mintedIds.length > 0 && (
            <div className="mt-6 rounded-2xl border border-portx-green/30 bg-portx-green/10 p-4">
              <p className="text-sm text-portx-green font-semibold">Mint confirmed</p>
              <p className="text-sm text-white/80 mt-1">
                Token ID{mintedIds.length > 1 ? 's' : ''}: #{mintedIds.join(', #')}
              </p>
            </div>
          )}
        </div>

        <div className="card-glow p-6 md:p-8">
          <h2 className="text-xl md:text-2xl font-bold mb-2">Mint</h2>
          <p className="text-portx-muted text-sm mb-6">{feedback}</p>

          <div className="rounded-2xl border border-portx-border bg-portx-surface p-4 mb-5">
            <p className="text-xs text-portx-muted uppercase tracking-widest mb-3">Quantity</p>

            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setMintAmount((v) => Math.max(1, v - 1))}
                className="h-11 w-11 rounded-xl border border-portx-border bg-black/20 text-xl hover:border-portx-green/40"
                disabled={isMinting}
              >
                -
              </button>

              <span className="text-3xl font-bold font-mono">{mintAmount}</span>

              <button
                type="button"
                onClick={() => setMintAmount((v) => Math.min(maxMintAllowed || 1, v + 1))}
                className="h-11 w-11 rounded-xl border border-portx-border bg-black/20 text-xl hover:border-portx-green/40"
                disabled={isMinting || mintAmount >= maxMintAllowed}
              >
                +
              </button>
            </div>

            <p className="text-xs text-portx-muted mt-3">
              {info.whitelisted && !isOwner
                ? 'Whitelist mint is free and mints 1 NFT per transaction.'
                : `Total: ${formatEther(totalCost)} ${NFT_CHAIN.nativeCurrency.symbol}`}
            </p>
          </div>

          {!isConnected ? (
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          ) : !properChain ? (
            <button
              type="button"
              onClick={() => switchChain({ chainId: NFT_CHAIN.id })}
              className="btn-primary w-full"
            >
              Switch to {NFT_CHAIN.name}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleMint}
              disabled={
                isMinting ||
                soldOut ||
                (!info.goPublic && !info.whitelisted && !isOwner) ||
                (!info.whitelisted && !isOwner && balanceData !== undefined && balanceData.value < totalCost)
              }
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isMinting
                ? 'Minting...'
                : isOwner
                  ? 'Owner Mint'
                  : info.whitelisted
                    ? 'Free Whitelist Mint'
                    : info.goPublic
                      ? 'Mint NFT'
                      : 'Not Live'}
            </button>
          )}

          <p className="text-xs text-portx-muted mt-5 leading-relaxed">
            Transactions are irreversible. Confirm the contract address before minting.
          </p>
        </div>
      </section>
    </div>
  )
}

export default NftMint