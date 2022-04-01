import { Button, Image, Spinner } from '@chakra-ui/react'
import { ipcRenderer } from 'electron'
import { useEffect, useState } from 'react'
import KeepKeyConnect from 'assets/hold-and-connect.svg'
import KeepKeyRelease from 'assets/hold-and-release.svg'
import { Text } from 'components/Text'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { getAssetUrl } from 'lib/getAssetUrl'

import { Row } from '../../../Row/Row'

export const BootloaderModal = () => {
  const { keepkey } = useWallet()
  const [loading, setLoading] = useState(false)

  const [kkConnect, setKKConnect] = useState(KeepKeyConnect)
  const [kkRelease, setKKRelease] = useState(KeepKeyRelease)

  useEffect(() => {
    getAssetUrl(KeepKeyConnect).then(setKKConnect)
    getAssetUrl(KeepKeyRelease).then(setKKRelease)
  }, [])

  const HandleUpdateBootloader = async () => {
    setLoading(true)
    ipcRenderer.send('@keepkey/update-bootloader', {})
  }

  return (
    <div id='meowmeow'>
      {loading ? (
        <div>
          <Spinner />
        </div>
      ) : (
        <div>
          {keepkey.isInUpdaterMode ? (
            <div>
              <h2>Updating Bootloader</h2>
              <small>click to perform action</small>
              <Button
                isFullWidth
                size='lg'
                colorScheme='blue'
                onClick={HandleUpdateBootloader}
                disabled={loading}
              >
                <Text translation={'modals.bootloader.continue'} />
              </Button>
              <Image src={kkRelease} alt='Approve Transaction On Device!' />
            </div>
          ) : (
            <div>
              <h3>
                <Text translation={'modals.bootloader.cta'} />
              </h3>
              <Row>
                <Row.Label>
                  <Text translation={'modals.bootloader.bootloader'} />
                </Row.Label>
                <Row.Value>{keepkey?.bootloaderVersion}</Row.Value>
              </Row>
              <Row>
                <Row.Label>
                  <Text translation={'modals.firmware.firmware'} />
                </Row.Label>
                <Row.Value>{keepkey?.firmwareVersion}</Row.Value>
              </Row>
              <Image src={kkConnect} alt='Approve Transaction On Device!' />
              <small>
                Please disconnect, hold down button, and reconnect device to enter bootloader mode
                to continue.
              </small>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
