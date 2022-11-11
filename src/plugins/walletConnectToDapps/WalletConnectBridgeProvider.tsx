import { useToast } from '@chakra-ui/react'
import type { ETHWallet } from '@shapeshiftoss/hdwallet-core'
import { WCService } from 'kkdesktop/walletconnect'
import type { WalletConnectCallRequest } from 'kkdesktop/walletconnect/types'
import type { FC, PropsWithChildren } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { useWallet } from 'hooks/useWallet/useWallet'

import { CallRequestModal } from './components/modal/callRequest/CallRequestModal'
import { WalletConnectBridgeContext } from './WalletConnectBridgeContext'

export const WalletConnectBridgeProvider: FC<PropsWithChildren> = ({ children }) => {
  const wallet = useWallet().state.wallet
  const [bridge, setBridge] = useState<WCService>()

  const [requests, setRequests] = useState<WalletConnectCallRequest[]>([])
  const addRequest = useCallback(
    (req: WalletConnectCallRequest) => setRequests(requests.concat(req)),
    [requests],
  )
  const removeRequest = useCallback(
    (id: number) => {
      const newRequests = requests.filter(request => request.id !== id)
      delete newRequests[id]
      setRequests(newRequests)
    },
    [requests],
  )

  const [, setTick] = useState(0)
  const rerender = useCallback(() => setTick(prev => prev + 1), [])

  const toast = useToast()

  const connect = useCallback(
    async (uri: string) => {
      const newBridge = WCService.fromURI(uri, wallet as ETHWallet, { onCallRequest: addRequest })
      newBridge.connector.on('connect', rerender)
      newBridge.connector.on('disconnect', rerender)
      newBridge.connector.on('wallet_switchEthereumChain', () => {
        toast({
          title: 'Wallet Connect',
          description: `Switched to chainId ${bridge?.connector.chainId}`,
          isClosable: true,
        })
        rerender()
      })
      await newBridge.connect()
      setBridge(newBridge)
    },
    [wallet, addRequest, rerender, toast, bridge?.connector.chainId],
  )

  // attempt to automatically connect to the last session on start
  const tryLastConnection = useCallback(async () => {
    if (!!bridge) return

    const wcSessionJsonString = localStorage.getItem('walletconnect')
    if (!wcSessionJsonString) {
      return
    }

    const session = JSON.parse(wcSessionJsonString)
    const existingBridge = WCService.fromSession(session, wallet as ETHWallet, {
      onCallRequest: addRequest,
    })
    existingBridge.connector.on('connect', rerender)
    existingBridge.connector.on('disconnect', rerender)
    existingBridge.connector.on('wallet_switchEthereumChain', (_, payload) => {
      toast({
        title: 'Wallet Connect',
        description: `Switched to chainId ${payload.params[0].chainId}`,
        isClosable: true,
      })
      rerender()
    })
    await existingBridge.connect()
    setBridge(existingBridge)
  }, [bridge, wallet, addRequest, rerender, toast])

  useEffect(() => {
    tryLastConnection()
  }, [tryLastConnection])

  const dapp = bridge?.connector.peerMeta ?? undefined

  return (
    <WalletConnectBridgeContext.Provider value={{ bridge, dapp, connect, removeRequest, requests }}>
      {children}
      {requests.length > 0 && <CallRequestModal />}
    </WalletConnectBridgeContext.Provider>
  )
}
