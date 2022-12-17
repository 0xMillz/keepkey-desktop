import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Divider,
  Flex,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Stack,
} from '@chakra-ui/react'
// import { SessionTypes } from '@walletconnect/types'
import { ipcRenderer } from 'electron-shim'
import { useCallback, useEffect, useState } from 'react'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'
import { useForm, useWatch } from 'react-hook-form'
import { SearchIcon } from '@chakra-ui/icons'
import { getPioneerClient } from 'lib/getPioneerCleint'
import type { MergedServiceType } from './mergeServices'
import { mergeServices } from './mergeServices'
import { pingAndMergeServices } from './mergeServices'
import { useWalletConnect } from 'plugins/walletConnectToDapps/WalletConnectBridgeContext'
import { useDebounce } from 'hooks/useDebounce/useDebounce'
import { web3ByServiceType } from 'context/WalletProvider/web3byChainId'

export const ChainSelectorModal = () => {
  const [loading, setLoading] = useState(false)
  const { chainSelector } = useModal()
  const { close, isOpen } = chainSelector

  const [chains, setChains] = useState<MergedServiceType[]>()
  const { legacyBridge, isLegacy, setLegacyWeb3 } = useWalletConnect()

  const { register, control, setValue } = useForm<{ search: string }>({
    mode: 'onChange',
    defaultValues: { search: '' },
  })

  const search = useWatch({ control, name: 'search' })

  const fetchChains = async () => {
    setLoading(true)
    const pioneer = await getPioneerClient()
    let test = await pioneer.AtlasNetwork({ start: 1, stop: 10, limit: 5 })
    setLoading(false)
    const mergedservices = mergeServices(test.data)
    setChains(mergedservices)
    pingAndMergeServices(mergedservices).then(setChains)
  }

  useEffect(() => {
    fetchChains()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const debouncedSearch = useDebounce(search, 500)

  useEffect(() => {
    if (debouncedSearch === '' || !debouncedSearch) {
      fetchChains()
      return
    }
    setLoading(true)
    getPioneerClient().then(pioneer => {
      pioneer.SearchByNetworkName(debouncedSearch).then((info: { data: any }) => {
        setLoading(false)
        const mergedservices = mergeServices(info.data)
        setChains(mergedservices)
        pingAndMergeServices(mergedservices).then(setChains)
      })
    })
  }, [debouncedSearch])

  console.log(chains)

  const switchChain = useCallback(
    (service: MergedServiceType, serviceId = 0) => {
      if (!isLegacy) return
      const web3 = web3ByServiceType(service, serviceId)
      legacyBridge?.doSwitchChain({
        chain: web3,
      })
      setLegacyWeb3(web3)
      setValue('search', '')
      close()
    },
    [close, isLegacy, legacyBridge, setLegacyWeb3, setValue],
  )

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
            <Text translation={'Select chain'} />
          </ModalHeader>
          <ModalBody>
            <Stack spacing={4} mb={4}>
              <Box>
                <InputGroup>
                  <InputLeftElement pointerEvents='none'>
                    <SearchIcon color='gray.700' />
                  </InputLeftElement>
                  <Input
                    {...register('search')}
                    autoComplete='off'
                    type='text'
                    placeholder='Search'
                    pl={10}
                    variant='filled'
                  />
                </InputGroup>
              </Box>
              {loading && (
                <Flex alignContent='center' w='full' h='full' justifyItems='center'>
                  <Spinner />
                </Flex>
              )}
              <Accordion allowMultiple>
                {!loading &&
                  chains &&
                  chains.map(chain => {
                    return (
                      <AccordionItem w='full'>
                        <HStack gap={4}>
                          <Box w='full' as='button' onClick={() => switchChain(chain)}>
                            {chain.name} ({chain.services[0].latency}ms)
                          </Box>
                          <AccordionButton w='fit-content'>
                            <AccordionIcon />
                          </AccordionButton>
                        </HStack>
                        <AccordionPanel>
                          {chain.services.map((service, idx) => (
                            <Box fontSize='sm' as='button' onClick={() => switchChain(chain, idx)}>
                              {service.url} ({service.latency}ms)
                              <Divider />
                            </Box>
                          ))}
                        </AccordionPanel>
                      </AccordionItem>
                    )
                  })}
              </Accordion>
            </Stack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </SlideTransition>
  )
}