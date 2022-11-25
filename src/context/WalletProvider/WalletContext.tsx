import type React from 'react'
import { createContext } from 'react'

import type { ActionTypes } from './actions'
import type { DeviceState, InitialState } from './WalletProvider'

export interface IWalletContext {
  state: InitialState
  dispatch: React.Dispatch<ActionTypes>
  connect: (adapter: KeyManager) => Promise<void>
  create: (adapter: KeyManager) => Promise<void>
  disconnect: () => void
  setDeviceState: (deviceState: Partial<DeviceState>) => void
  isUpdatingKeepkey: boolean
  setIsUpdatingKeepkey: any
  pairAndConnect: any
  deviceBusy: boolean
}

export const WalletContext = createContext<IWalletContext | null>(null)
