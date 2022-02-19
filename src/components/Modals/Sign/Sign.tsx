import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  Collapse,
  Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Textarea
} from '@chakra-ui/react'
import { ipcRenderer } from 'electron'
import React, { useState } from 'react'
import KeepKey from 'assets/hold-and-release.svg'
import { Text } from 'components/Text'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'

import { MiddleEllipsis } from '../../MiddleEllipsis/MiddleEllipsis'
import { Row } from '../../Row/Row'

export const SignModal = (input: any) => {
  const { pioneer } = useWallet()
  const [error] = useState<string | null>(null)
  const [loading] = useState(false)
  const [show, setShow] = React.useState(false)
  const [isApproved, setIsApproved] = React.useState(false)
  const { sign } = useModal()
  const { close, isOpen } = sign
  const HDwalletPayload = input.invocation.unsignedTx.HDwalletPayload

  let isSwap: boolean = false
  if (input?.invocation?.unsignedTx?.type === 'swap') isSwap = true

  const HandleSubmit = async () => {
    setIsApproved(true)
    //show sign
    let signedTx = await pioneer.signTx(input.invocation.unsignedTx)
    ipcRenderer.send('onSignedTx', signedTx)
    //onCloseModal
    ipcRenderer.send('onCloseModal', {})
    close()
  }

  const HandleReject = async () => {
    //show sign
    ipcRenderer.send('unlockWindow', {})
    //onCloseModal
    ipcRenderer.send('onCloseModal', {})
    close()
  }

  const handleToggle = () => setShow(!show)

  // @ts-ignore
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        ipcRenderer.send('unlockWindow', {})
        ipcRenderer.send('onCloseModal', {})
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
          <Text translation={'modals.sign.header'} />
        </ModalHeader>
        <ModalBody>
          {isApproved ? (
            <div>
              <Image src={KeepKey} alt='Approve Transaction On Device!' />
            </div>
          ) : (
            <div>
              <Row>
                <Row.Label>
                  <Text translation={'modals.sign.network'} />
                </Row.Label>
                <Row.Value>{input?.invocation?.unsignedTx?.network}</Row.Value>
              </Row>
              <Row>
                <Row.Label>
                  <Text translation={'modals.sign.summary'} />
                </Row.Label>
                <Row.Value>{input?.invocation?.unsignedTx?.verbal}</Row.Value>
              </Row>
              <Box w='100%' p={4} color='white'>
                <div>
                  {/*<Text translation={'modals.sign.extendedValidation'}/>: <Badge>FAIL</Badge>*/}
                </div>
              </Box>

              <Row>
                <Row.Label>
                  <Text translation={'modals.sign.from'} />
                </Row.Label>
                <Row.Value>
                  <MiddleEllipsis
                    rounded='lg'
                    fontSize='sm'
                    p='1'
                    pl='2'
                    pr='2'
                    bgColor='gray.800'
                    address={input?.invocation?.unsignedTx?.transaction?.addressFrom}
                  />
                </Row.Value>
              </Row>

              {isSwap ? (
                <div>
                  <Row>
                    <Row.Label>
                      <Text translation={'modals.sign.protocol'} />
                    </Row.Label>
                    <Row.Value>{input?.invocation?.unsignedTx?.transaction?.protocol}</Row.Value>
                  </Row>
                  <Row>
                    <Row.Label>
                      <Text translation={'modals.sign.router'} />
                    </Row.Label>
                    <Row.Value>
                      {input?.invocation?.unsignedTx?.transaction?.router}
                      <Badge>VALID</Badge>
                    </Row.Value>
                  </Row>
                  <Row>
                    <Row.Label>
                      <Text translation={'modals.sign.memo'} />
                    </Row.Label>
                    <Row.Value isTruncated>
                      <small>{input?.invocation?.unsignedTx?.transaction?.memo}</small>
                    </Row.Value>
                  </Row>
                </div>
              ) : (
                <div></div>
              )}

              {isSwap ? (
                <div></div>
              ) : (
                <div>
                  <Row>
                    <Row.Label>
                      <Text translation={'modals.sign.to'} />
                    </Row.Label>
                    <Row.Value>
                      <MiddleEllipsis
                        rounded='lg'
                        fontSize='sm'
                        p='1'
                        pl='2'
                        pr='2'
                        bgColor='gray.800'
                        address={input?.invocation?.unsignedTx?.transaction?.recipient}
                      />
                    </Row.Value>
                  </Row>
                </div>
              )}

              <Row>
                <Row.Label>
                  <Text translation={'modals.sign.amount'} />
                </Row.Label>
                <Row.Value isTruncated>
                  <small>
                    {input?.invocation?.unsignedTx?.transaction?.amount} (
                    {input?.invocation?.unsignedTx?.transaction?.asset})
                  </small>
                </Row.Value>
              </Row>

              {/*<Row>*/}
              {/*  <Row.Label>*/}
              {/*    <Text translation={'modals.sign.fee'} />*/}
              {/*  </Row.Label>*/}
              {/*  <Row.Value isTruncated>*/}
              {/*    <small>{input?.invocation?.unsignedTx?.transaction?.fee}</small>*/}
              {/*  </Row.Value>*/}
              {/*</Row>*/}

              <Collapse in={show}>
                <div>
                  HDwalletPayload:
                  <Textarea
                    value={JSON.stringify(HDwalletPayload, undefined, 4)}
                    size='md'
                    resize='vertical'
                  />
                </div>
              </Collapse>
              <Row>
                <Button size='sm' onClick={handleToggle} mt='1rem'>
                  {show ? 'hide' : 'Show Advanced Tx info'}
                </Button>
              </Row>
              <br />
              <Row>
                {error && (
                  <Alert status='error'>
                    <AlertIcon />
                    <AlertDescription>
                      <Text translation={error} />
                    </AlertDescription>
                  </Alert>
                )}
                <Button
                  isFullWidth
                  size='lg'
                  colorScheme='blue'
                  onClick={HandleSubmit}
                  disabled={loading}
                >
                  <Text translation={'modals.sign.sign'} />
                </Button>
              </Row>
              <br />
              <Row>
                <Button size='sm' colorScheme='red' onClick={HandleReject}>
                  <Text translation={'modals.sign.reject'} />
                </Button>
              </Row>
            </div>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
