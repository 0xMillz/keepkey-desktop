import { DownloadIcon } from '@chakra-ui/icons'
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Progress,
  Spinner,
  Stack,
  Switch,
} from '@chakra-ui/react'
import { ipcRenderer } from 'electron'
import { UpdateCheckResult, UpdateInfo } from 'electron-updater'
import { useCallback, useEffect, useState } from 'react'
import { FaCheck } from 'react-icons/fa'
import { HiRefresh } from 'react-icons/hi'
import { useSelector } from 'react-redux'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'
import { ReduxState } from 'state/reducer'
import { selectFeatureFlag } from 'state/slices/preferencesSlice/selectors'

export type AppSettings = {
  shouldAutoLunch: boolean
  shouldAutoStartBridge: boolean
  shouldMinimizeToTray: boolean
  shouldAutoUpdate: boolean
  allowPreRelease: boolean
  bridgeApiPort: number
}

export enum UpdateState {
  UNCHECKED,
  CHECKING,
  LATEST,
  AVAILABLE,
  DOWNLOADING,
  DOWNLOADED,
}

export const AppSettingsModal = () => {
  const { appSettings } = useModal()
  const { close, isOpen } = appSettings

  const electronChannelsFlag = useSelector((state: ReduxState) =>
    selectFeatureFlag(state, 'ElectronChannels'),
  )

  const [settings, setSettings] = useState<AppSettings>({
    shouldAutoLunch: true,
    shouldAutoStartBridge: true,
    shouldMinimizeToTray: true,
    shouldAutoUpdate: true,
    allowPreRelease: false,
    bridgeApiPort: 1646,
  })

  const [currentAppVer, setCurrentAppVer] = useState<Array<string>>([])
  const [updateState, setUpdateState] = useState(UpdateState.UNCHECKED)
  const [updateData, setUpdateData] = useState<UpdateInfo>()
  const [updateProgress, setUpdateProgress] = useState(0)

  const compareVersions = useCallback(
    (update: UpdateInfo) => {
      const updateVer = update.version.replace('-beta', '').split('.')

      console.info(currentAppVer, updateVer)

      if (
        Number(updateVer[0]) === Number(currentAppVer[0]) &&
        Number(updateVer[1]) === Number(currentAppVer[1]) &&
        Number(updateVer[2]) === Number(currentAppVer[2])
      )
        setUpdateState(UpdateState.LATEST)
      else setUpdateState(UpdateState.AVAILABLE)
    },
    [currentAppVer],
  )

  const saveSettings = useCallback(() => {
    ipcRenderer.send('@app/update-settings', settings)
    close()
  }, [settings, close])

  const checkUpdates = () => {
    ipcRenderer.send('@app/update')
    setUpdateState(UpdateState.CHECKING)
  }

  const downloadUpdates = () => {
    ipcRenderer.send('@app/download-updates')
    setUpdateState(UpdateState.DOWNLOADING)
  }

  const installUpdates = () => {
    ipcRenderer.send('@app/install-updates')
  }

  useEffect(() => {
    if (!isOpen) setUpdateState(UpdateState.UNCHECKED)
    else ipcRenderer.send('@app/settings')
  }, [isOpen])

  useEffect(() => {
    ipcRenderer.on('@app/settings', (event, data) => {
      setSettings(data)
    })

    ipcRenderer.send('@app/version')
    ipcRenderer.on('@app/version', (event, version) => {
      setCurrentAppVer(version.split('.'))
    })

    ipcRenderer.on('@app/download-updates', (event, data) => {
      setUpdateState(UpdateState.DOWNLOADED)
    })

    ipcRenderer.on('@update/percentage', (event, progress) => {
      setUpdateProgress(progress)
    })

    return () => setUpdateState(UpdateState.UNCHECKED)
  }, [])

  useEffect(() => {
    ipcRenderer.on('@app/update', (event, data: UpdateCheckResult) => {
      console.info('@app/update', data)
      setUpdateData(data.updateInfo)
      compareVersions(data.updateInfo)
    })
  }, [compareVersions])

  useEffect(() => {
    console.info('updateState', updateState)
    console.info('updateData', updateData)
  }, [updateData, updateState])

  if (!settings) return <Spinner />

  return (
    <SlideTransition>
      <Modal
        isOpen={isOpen}
        onClose={() => {
          ipcRenderer.send('unlockWindow', {})
          close()
        }}
        isCentered
        closeOnOverlayClick={false}
        closeOnEsc={false}
      >
        <ModalOverlay />
        <ModalContent justifyContent='center' px={3} pt={3} pb={6}>
          <ModalCloseButton ml='auto' borderRadius='full' position='static' />
          <ModalHeader>
            <Text translation={'modals.appSettings.header'} />
          </ModalHeader>
          <ModalBody>
            <Stack spacing={4} mb={4}>
              <Row>
                <Text translation={'modals.appSettings.autoLaunch'} />
                <Switch
                  isChecked={settings.shouldAutoLunch}
                  onChange={() => {
                    setSettings(currentSettings => {
                      return {
                        ...currentSettings,
                        shouldAutoLunch: !currentSettings.shouldAutoLunch,
                      }
                    })
                  }}
                />
              </Row>
              <Row>
                <Text translation={'modals.appSettings.autoStartBridge'} />
                <Switch
                  isChecked={settings.shouldAutoStartBridge}
                  onChange={() => {
                    setSettings(currentSettings => {
                      return {
                        ...currentSettings,
                        shouldAutoStartBridge: !currentSettings.shouldAutoStartBridge,
                      }
                    })
                  }}
                />
              </Row>
              <Row>
                <Text translation={'modals.appSettings.minimizeToTray'} />
                <Switch
                  isChecked={settings.shouldMinimizeToTray}
                  onChange={() => {
                    setSettings(currentSettings => {
                      return {
                        ...currentSettings,
                        shouldMinimizeToTray: !currentSettings.shouldMinimizeToTray,
                      }
                    })
                  }}
                />
              </Row>
              <Row>
                <Text translation={'modals.appSettings.autoUpdate'} />
                <Switch
                  isChecked={settings.shouldAutoUpdate}
                  onChange={() => {
                    setSettings(currentSettings => {
                      return {
                        ...currentSettings,
                        shouldAutoUpdate: !currentSettings.shouldAutoUpdate,
                      }
                    })
                  }}
                />
              </Row>
              {electronChannelsFlag && (
                <Row>
                  <Text translation={'modals.appSettings.downloadPreRelease'} />
                  <Switch
                    isChecked={settings.allowPreRelease}
                    onChange={() => {
                      setSettings(currentSettings => {
                        return {
                          ...currentSettings,
                          allowPreRelease: !currentSettings.allowPreRelease,
                        }
                      })
                    }}
                  />
                </Row>
              )}
              <Row>
                <Text translation={'modals.appSettings.bridgeApiPort'} />
                <Input
                  value={settings.bridgeApiPort}
                  size='sm'
                  width='25%'
                  rounded='lg'
                  disabled
                  onChange={e => {
                    setSettings(currentSettings => {
                      return {
                        ...currentSettings,
                        bridgeApiPort: Number(e.target.value),
                      }
                    })
                  }}
                />
              </Row>
              <Button
                onClick={
                  updateState === UpdateState.UNCHECKED
                    ? checkUpdates
                    : updateState === UpdateState.AVAILABLE
                    ? downloadUpdates
                    : updateState === UpdateState.DOWNLOADED
                    ? installUpdates
                    : checkUpdates
                }
                isDisabled={
                  updateState === UpdateState.LATEST || updateState === UpdateState.DOWNLOADING
                }
                colorScheme={
                  updateState === UpdateState.UNCHECKED
                    ? 'gray'
                    : updateState === UpdateState.AVAILABLE
                    ? 'blue'
                    : updateState === UpdateState.DOWNLOADED
                    ? 'red'
                    : updateState === UpdateState.LATEST
                    ? 'green'
                    : 'gray'
                }
                isLoading={updateState === UpdateState.CHECKING}
                leftIcon={
                  updateState === UpdateState.UNCHECKED ? (
                    <HiRefresh />
                  ) : updateState === UpdateState.LATEST ? (
                    <FaCheck />
                  ) : (
                    <DownloadIcon />
                  )
                }
              >
                {updateState === UpdateState.UNCHECKED && (
                  <Text translation={'modals.appSettings.cta.update.check'} />
                )}
                {updateState === UpdateState.AVAILABLE && (
                  <Text
                    translation={[
                      'modals.appSettings.cta.update.available',
                      { version: updateData?.version },
                    ]}
                  />
                )}
                {updateState === UpdateState.DOWNLOADED && (
                  <Text translation={'modals.appSettings.cta.update.downloaded'} />
                )}
                {updateState === UpdateState.LATEST && (
                  <Text translation={'modals.appSettings.cta.update.latest'} />
                )}
                {updateState === UpdateState.DOWNLOADING && (
                  <Progress
                    colorScheme='gray'
                    size='sm'
                    width='100%'
                    rounded='lg'
                    value={updateProgress}
                  />
                )}
              </Button>
              <Button onClick={saveSettings} colorScheme='blue'>
                <Text translation={'modals.appSettings.cta.saveSettings'} />
              </Button>
            </Stack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </SlideTransition>
  )
}
