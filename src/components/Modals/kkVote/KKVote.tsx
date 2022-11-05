import {
  Button,
  Input,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
} from '@chakra-ui/react'
import type { KeepKeyHDWallet } from '@shapeshiftoss/hdwallet-keepkey'
import { bnOrZero } from '@shapeshiftoss/investor-foxy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { RawText, Text } from 'components/Text'
import { useKeepKey } from 'context/WalletProvider/KeepKeyProvider'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'

import { doApproveTx, doVoteTx, getApprovedAndBalances, getFees } from './utils'

export const KKVote = ({ geckoId }: { geckoId: any }) => {
  const { getKeepkeyAsset, kkErc20Contract, kkNftContract, kkWeb3 } = useKeepKey()
  const {
    state: { wallet },
  } = useWallet()

  const projectName = useMemo(() => getKeepkeyAsset(geckoId)?.name, [geckoId, getKeepkeyAsset])

  const { kkVote } = useModal()
  const { close, isOpen } = kkVote

  // has clicked button.  not necessarily broadcast or mined yet
  const [approveClicked, setApproveClicked] = useState(false)
  const [voteClicked, setVoteClicked] = useState(false)

  // have a txid. not necessarily mined yet
  const [approveTxid, setApproveTxid] = useState('')
  const [voteTxid, setVoteTxid] = useState('')

  // 1 or more confirmations
  const [voteConfirmed, setVoteConfirmed] = useState(false)
  const [approveConfirmed, setApproveConfirmed] = useState(false)

  // burn amount input field
  const [burnAmount, setBurnAmount] = useState('0')

  // fee data (limit, price, & eth) for vote and approve
  const [feeData, setFeeData] = useState({
    voteEth: '0',
    approvalEth: '0',
    voteGas: '0',
    approvalGas: '0',
    gasPrice: '0',
  })

  // users approved amount, keepkey token balance, and eth balance
  const [approvedAndBalances, setApprovedAndBalances] = useState({
    ethBalance: '0',
    kkBalance: '0',
    approved: '0', // 0 or huge
  })

  // user needs to approve
  const needsApproval = !approveConfirmed && bnOrZero(approvedAndBalances?.approved).eq(0)

  // user has enough eth for approval transaction
  const hasEthForApproval = bnOrZero(approvedAndBalances.ethBalance).gte(
    bnOrZero(feeData?.approvalEth),
  )

  // user has enough eth to vote
  const hasEthForVote = bnOrZero(approvedAndBalances.ethBalance).gte(bnOrZero(feeData?.voteEth))

  // user has some tokens to vote with
  const hasTokenForVote = bnOrZero(approvedAndBalances?.kkBalance).gt(bnOrZero(burnAmount))

  // vote button is clickable
  const voteValidationPassed =
    !needsApproval && hasEthForVote && hasTokenForVote && burnAmount?.length > 0

  // approve button is clickable
  const approvalValidationPassed = hasEthForApproval

  const errorMessage = !hasEthForApproval
    ? 'Not enough eth for approval transaction'
    : !hasEthForVote
    ? 'Not enough eth for vote transaction'
    : !hasTokenForVote
    ? 'Not enough tokens'
    : ''

  useEffect(() => {
    if (kkWeb3) getFees(kkWeb3).then((fees: any) => setFeeData(fees))
    if (kkWeb3 && wallet)
      getApprovedAndBalances(
        kkWeb3,
        wallet as KeepKeyHDWallet,
        kkErc20Contract,
        kkNftContract,
      ).then((result: any) => setApprovedAndBalances(result))
  }, [geckoId, kkErc20Contract, kkNftContract, kkWeb3, wallet])

  const onVoteClick = useCallback(async () => {
    if (!kkWeb3) throw new Error('No Web3')
    setVoteClicked(true)
    const txid = await doVoteTx(
      kkNftContract,
      kkWeb3,
      wallet as KeepKeyHDWallet,
      setVoteConfirmed,
      burnAmount,
      geckoId,
    )
    setVoteTxid(txid)
  }, [burnAmount, geckoId, kkNftContract, kkWeb3, wallet])

  const onApproveClick = useCallback(async () => {
    if (!kkWeb3) throw new Error('No Web3')
    setApproveClicked(true)
    const txid = await doApproveTx(
      kkErc20Contract,
      kkNftContract,
      kkWeb3,
      wallet as KeepKeyHDWallet,
      setApproveConfirmed,
    )
    setApproveTxid(txid)
  }, [kkErc20Contract, kkNftContract, kkWeb3, wallet])

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        close()
      }}
      isCentered
      closeOnOverlayClick={false}
      closeOnEsc={false}
    >
      <ModalOverlay />
      <ModalContent justifyContent='center' px={3} pt={3} pb={6}>
        <ModalCloseButton ml='auto' borderRadius='full' position='static' />
        <ModalBody>
          <div>
            <ModalHeader>
              <Text translation={`Burn tokens to vote on ${projectName}`} />
            </ModalHeader>
          </div>
          <div>
            <RawText color='gray.500'>Token Balance {`${approvedAndBalances?.kkBalance}`}</RawText>
          </div>
          <div>
            <RawText color='gray.500'>Eth Balance {`${approvedAndBalances?.ethBalance}`}</RawText>
          </div>
          <div>
            {needsApproval && (
              <RawText color='gray.500'>Eth Fee {`${feeData?.approvalEth}`}</RawText>
            )}
          </div>
          <div>
            <RawText color='gray.500'>Eth Fee {`${feeData?.voteEth}`}</RawText>
          </div>
          <div>
            {needsApproval && (
              <Button
                isDisabled={!approvalValidationPassed}
                isLoading={approveClicked}
                onClick={onApproveClick}
              >
                Approve
              </Button>
            )}
          </div>
          <div>
            {!!approveTxid && (
              <Link
                color='blue.400'
                isExternal
                href={`https://goerli.etherscan.io/tx/${approveTxid}`}
              >
                View approval on etherscan
              </Link>
            )}
          </div>
          <div>
            {!voteClicked && (
              <Input
                my='10px'
                isDisabled={needsApproval}
                placeholder='Token Amount'
                onChange={(input: any) => setBurnAmount(input.target.value)}
              />
            )}
          </div>
          <div>
            {!voteConfirmed && (
              <Button
                isDisabled={!voteValidationPassed}
                isLoading={voteClicked}
                onClick={onVoteClick}
              >
                Vote
              </Button>
            )}
          </div>
          <div>
            {voteTxid && (
              <Link
                color='blue.400'
                isExternal
                href={`https://goerli.etherscan.io/tx/${voteTxid}`}
              >{`View vote on etherscan`}</Link>
            )}
          </div>
          <div>
            <RawText color='red.500'>{errorMessage}</RawText>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}