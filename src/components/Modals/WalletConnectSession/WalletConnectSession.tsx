import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Stack,
} from '@chakra-ui/react'
import { ipcRenderer } from 'electron'
import { useEffect, useState } from 'react'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'

export type PairingProps = {
  serviceName: string
  serviceImageUrl: string
  nonce: string
}

export const WalletConnectSessionModal = () => {
  const [error] = useState<string | null>(null)
  // const [loading] = useState(false)
  const [uri, setUri] = useState('uri:.....')
  const { walletConnect } = useModal()
  const { close, isOpen } = walletConnect

  const HandleSubmit = async () => {
    ipcRenderer.send(`@walletconnect/session`, uri)
  }

  const handleInputChange = (e: { target: { value: any } }) => setUri(e.target.value)

  useEffect(() => {
    // @ts-ignore
    navigator.permissions.query({ name: 'clipboard-read' }).then(async result => {
      // If permission to read the clipboard is granted or if the user will
      // be prompted to allow it, we proceed.

      if (result.state === 'granted' || result.state === 'prompt') {
        navigator.clipboard.read().then(async data => {
          const link = await data[0].getType('text/plain')
          link.text().then(setUri)
        })
      }
    })
  }, [])

  // const HandleReject = async () => {
  //   ipcRenderer.send(`@bridge/reject-service-${input.nonce}`, input)
  //   close()
  // }

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
            <Text translation={'modals.pair.header'} />
          </ModalHeader>
          <ModalBody>
            <Stack spacing={4} mb={4}>
              <Box display='inline-flex' justifyContent='center' alignItems='center'></Box>
              {error && (
                <Alert status='error'>
                  <AlertIcon />
                  <AlertDescription>
                    <Text translation={error} />
                  </AlertDescription>
                </Alert>
              )}
              <FormControl>
                <FormLabel htmlFor='uri'>URI</FormLabel>
                <Input id='uri' value={uri} onChange={handleInputChange} />
                <FormHelperText>Enter Wallet Connect URI</FormHelperText>
                <Button mt={4} colorScheme='teal' type='submit' onClick={HandleSubmit}>
                  Submit
                </Button>
              </FormControl>
            </Stack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </SlideTransition>
  )
}
