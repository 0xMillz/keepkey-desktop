import { Alert, AlertIcon, Box, Stack } from '@chakra-ui/react'
import { toAssetId } from '@keepkey/caip'
import { supportsETH } from '@keepkey/hdwallet-core'
import { Confirm as ReusableConfirm } from 'features/defi/components/Confirm/Confirm'
import { Summary } from 'features/defi/components/Summary'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { getIdleInvestor } from 'features/defi/contexts/IdleProvider/idleInvestorSingleton'
import { useCallback, useContext, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { serializeUserStakingId, toOpportunityId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectBIP44ParamsByAccountId,
  selectEarnUserStakingOpportunity,
  selectHighestBalanceAccountIdByStakingId,
  selectMarketDataById,
  selectPortfolioCryptoHumanBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { IdleWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

const moduleLogger = logger.child({
  namespace: ['Defi', 'Providers', 'Idle', 'IdleManager', 'Withdraw', 'Confirm'],
})

type ConfirmProps = { accountId: AccountId | undefined } & StepComponentProps

export const Confirm: React.FC<ConfirmProps> = ({ accountId, onNext }) => {
  const idleInvestor = useMemo(() => getIdleInvestor(), [])
  const { state, dispatch } = useContext(WithdrawContext)
  const translate = useTranslate()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, contractAddress, assetReference } = query
  const opportunity = state?.opportunity
  const chainAdapter = getChainAdapterManager().get(chainId)

  // Asset info
  const feeAssetId = chainAdapter?.getFeeAssetId()

  const opportunityId = useMemo(
    () => toOpportunityId({ chainId, assetNamespace: 'erc20', assetReference: contractAddress }),
    [chainId, contractAddress],
  )
  const highestBalanceAccountIdFilter = useMemo(
    () => ({ stakingId: opportunityId }),
    [opportunityId],
  )

  const highestBalanceAccountId = useAppSelector(state =>
    selectHighestBalanceAccountIdByStakingId(state, highestBalanceAccountIdFilter),
  )
  const opportunityDataFilter = useMemo(
    () => ({
      userStakingId: serializeUserStakingId(
        (accountId ?? highestBalanceAccountId)!,
        toOpportunityId({
          chainId,
          assetNamespace: 'erc20',
          assetReference: contractAddress,
        }),
      ),
    }),
    [accountId, chainId, contractAddress, highestBalanceAccountId],
  )

  const opportunityData = useAppSelector(state =>
    selectEarnUserStakingOpportunity(state, opportunityDataFilter),
  )
  const underlyingAssetId = useMemo(
    () => opportunityData?.underlyingAssetIds[0] ?? '',
    [opportunityData?.underlyingAssetIds],
  )
  const underlyingAsset: Asset | undefined = useAppSelector(state =>
    selectAssetById(state, underlyingAssetId),
  )

  const asset: Asset | undefined = useAppSelector(state =>
    selectAssetById(state, opportunityData?.assetId ?? ''),
  )

  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId ?? ''))
  const feeMarketData = useAppSelector(state => selectMarketDataById(state, feeAssetId ?? ''))

  const accountFilter = useMemo(() => ({ accountId }), [accountId])
  const bip44Params = useAppSelector(state => selectBIP44ParamsByAccountId(state, accountFilter))
  const userAddress = useMemo(() => accountId && fromAccountId(accountId).account, [accountId])

  // user info
  const { state: walletState } = useWallet()

  const feeAssetBalanceFilter = useMemo(
    () => ({ assetId: feeAsset?.assetId, accountId: accountId ?? '' }),
    [accountId, feeAsset?.assetId],
  )
  const feeAssetBalance = useAppSelector(s =>
    selectPortfolioCryptoHumanBalanceByFilter(s, feeAssetBalanceFilter),
  )

  const handleConfirm = useCallback(async () => {
    if (!dispatch || !bip44Params) return
    try {
      if (
        !(
          userAddress &&
          walletState?.wallet &&
          assetReference &&
          supportsETH(walletState.wallet) &&
          opportunity &&
          chainAdapter &&
          opportunityData?.assetId &&
          asset &&
          underlyingAsset
        )
      )
        return
      dispatch({ type: IdleWithdrawActionType.SET_LOADING, payload: true })
      const idleOpportunity = await idleInvestor.findByOpportunityId(opportunityData?.assetId)
      if (!idleOpportunity) throw new Error('No opportunity')
      const tx = await idleOpportunity.prepareWithdrawal({
        address: userAddress,
        amount: bnOrZero(state.withdraw.cryptoAmount).times(`1e+${asset.precision}`).integerValue(),
      })
      const txid = await idleOpportunity.signAndBroadcast({
        wallet: walletState.wallet,
        tx,
        // TODO: allow user to choose fee priority
        feePriority: undefined,
        bip44Params,
      })
      dispatch({ type: IdleWithdrawActionType.SET_TXID, payload: txid })
      onNext(DefiStep.Status)
    } catch (error) {
      moduleLogger.error(error, { fn: 'handleConfirm' }, 'handleConfirm error')
    } finally {
      dispatch({ type: IdleWithdrawActionType.SET_LOADING, payload: false })
    }
  }, [
    dispatch,
    bip44Params,
    userAddress,
    walletState.wallet,
    assetReference,
    opportunity,
    chainAdapter,
    opportunityData?.assetId,
    asset,
    underlyingAsset,
    idleInvestor,
    state?.withdraw.cryptoAmount,
    onNext,
  ])

  const handleCancel = useCallback(() => {
    onNext(DefiStep.Info)
  }, [onNext])

  const hasEnoughBalanceForGas = useMemo(
    () =>
      bnOrZero(feeAssetBalance)
        .minus(bnOrZero(state?.withdraw.estimatedGasCrypto).div(`1e+${feeAsset.precision}`))
        .gte(0),
    [feeAssetBalance, state?.withdraw.estimatedGasCrypto, feeAsset?.precision],
  )

  if (!state || !dispatch) return null

  return (
    <ReusableConfirm
      onCancel={handleCancel}
      headerText='modals.confirm.withdraw.header'
      isDisabled={!hasEnoughBalanceForGas}
      loading={state.loading}
      loadingText={translate('common.confirm')}
      onConfirm={handleConfirm}
    >
      <Summary>
        <Row variant='vertical' p={4}>
          <Row.Label>
            <Text translation='modals.confirm.amountToWithdraw' />
          </Row.Label>
          <Row px={0} fontWeight='medium'>
            <Stack direction='row' alignItems='center'>
              <AssetIcon size='xs' src={underlyingAsset.icon} />
              <RawText>{underlyingAsset.name}</RawText>
            </Stack>
            <Row.Value>
              <Amount.Crypto value={state.withdraw.cryptoAmount} symbol={underlyingAsset.symbol} />
            </Row.Value>
          </Row>
        </Row>
        <Row p={4}>
          <Row.Label>
            <Text translation='modals.confirm.estimatedGas' />
          </Row.Label>
          <Row.Value>
            <Box textAlign='right'>
              <Amount.Fiat
                fontWeight='bold'
                value={bnOrZero(state.withdraw.estimatedGasCrypto)
                  .div(`1e+${feeAsset.precision}`)
                  .times(feeMarketData.price)
                  .toFixed(2)}
              />
              <Amount.Crypto
                color='gray.500'
                value={bnOrZero(state.withdraw.estimatedGasCrypto)
                  .div(`1e+${feeAsset.precision}`)
                  .toFixed(5)}
                symbol={feeAsset.symbol}
              />
            </Box>
          </Row.Value>
        </Row>
        {!hasEnoughBalanceForGas && (
          <Alert status='error' borderRadius='lg'>
            <AlertIcon />
            <Text translation={['modals.confirm.notEnoughGas', { assetSymbol: feeAsset.symbol }]} />
          </Alert>
        )}
      </Summary>
    </ReusableConfirm>
  )
}
