import { ContractOriginationResult, initConseil, loadContract, deployContract, sendOperation } from './utils'
import { initOracleLib, Utils } from '@tacoinfra/harbinger-lib'
import { KeyStore, TezosLanguageUtil, TezosNodeReader } from 'conseiljs'
import { BigNumber } from 'bignumber.js'

// Load secret key
const privateKeyName = 'FARM_SK'
const privateKey = process.env[privateKeyName]

// Configuration
const logLevel = 'info'
const nodeUrl = "https://rpctest.tzbeta.net"

const governorAddress = 'tz1KoLibimdjUSfhrSpXwx4FhhhCq1JM5Etk'
const depositToken = 'KT1KTAsdBYiRJiNivASPVcnpbTuNtCeXA5SQ'
const rewardToken = 'KT18yyUYL7U9eGfjukKqhY9THqugmh1oW6Fh'
const rewardAmount = new BigNumber('123456789')
const rewardPerBlock = new BigNumber('10')
const totalBlocks = new BigNumber('10000')
const revokeAddress = 'KT1Xs55s9K13LAwaQKcieEQWy2TjzZPw8idc'

const deploy = async (): Promise<void> => {
  console.log('------------------------------------------------------')
  console.log('> Deploying Farming Infrastructure')
  console.log('>> Running Pre Flight Checks...')
  console.log('------------------------------------------------------')

  console.log('>>> [1/6] Loading Deployer Key')
  if (privateKey === undefined) {
    console.log('Fatal: No deployer private key defined.')
    console.log(`Set a ${privateKeyName} environment variable..`)
    return
  }
  console.log('Loaded.')
  console.log('')

  console.log('>>> [2/6] Input params:')
  console.log(`Tezos Node: ${nodeUrl}`)
  console.log('')

  console.log(
    `>>> [3/6] Initializing Conseil with logging level: ${logLevel}`,
  )
  initConseil(logLevel)
  initOracleLib(logLevel)
  console.log('Conseil initialized.')
  console.log('')

  console.log('>>> [4/6] Initializing Deployer')
  const keystore = await Utils.keyStoreFromPrivateKey(privateKey)
  await Utils.revealAccountIfNeeded(
    nodeUrl,
    keystore,
    await Utils.signerFromKeyStore(keystore),
  )
  console.log(`Initialized deployer: ${keystore.publicKeyHash}`)
  console.log('')

  console.log('>>> [5/6] Loading contracts...')
  const farmContract = loadContract(
    `${__dirname}/../../smart_contracts/farm-contract.json`,
  )
  const reserveContract = loadContract(
    `${__dirname}/../../smart_contracts/farm-reward-reserve.tz`,
  )

  console.log('Contracts loaded.')
  console.log('')

  console.log('>>> [6/6] Getting Account Counter')
  let counter = await TezosNodeReader.getCounterForAccount(
    nodeUrl,
    keystore.publicKeyHash,
  )
  console.log(`Got counter: ${counter}`)
  console.log('')

  console.log('------------------------------------------------------')
  console.log('>> Preflight Checks Passed!')
  console.log('>> Deploying Contracts...')
  console.log('------------------------------------------------------')
  console.log('')

  console.log('>>> [1/2] Deploying Reserve')
  counter++
  const reserveStorage = `(Pair (Pair "${keystore.publicKeyHash}" "${keystore.publicKeyHash}") (Pair False (Pair "${revokeAddress}" "${rewardToken}")))`
  const reserveDeployResult = await deployContract(
    reserveContract,
    reserveStorage,
    keystore,
    counter,
    nodeUrl,
  )
  console.log('')

  console.log('>>> [2/2] Deploying Farm')
  counter++
  const farmStorage = `(Pair (Pair (Pair (Pair "${keystore.publicKeyHash}" "${depositToken}") (Pair "${reserveDeployResult.contractAddress}" "${rewardToken}")) {})(Pair            (Pair              (Pair 0                    (Pair 0 0))  (Pair 0 (Pair 0 0))) 0))`
  const farmStorageMicheline = TezosLanguageUtil.translateMichelsonToMicheline(farmStorage)
  const farmDeployResult = await deployContract(
    farmContract,
    farmStorageMicheline,
    keystore,
    counter,
    nodeUrl,
    true
  )
  console.log('')

  console.log('------------------------------------------------------')
  console.log('>> Contracts Deployed!')
  console.log('>> Wiring...')
  console.log('------------------------------------------------------')
  console.log('')

  console.log('>>> [1/6] Initializing Farm Reward Reserve')
  counter++
  await sendOperation(reserveDeployResult.contractAddress, 'initialize', `"${farmDeployResult.contractAddress}"`, keystore, counter, nodeUrl)
  console.log('')

  console.log('>>> [2/6] Transferring tokens to reserve')
  counter++
  await sendOperation(rewardToken, 'transfer', `Pair "${keystore.publicKeyHash}" (Pair "${reserveDeployResult.contractAddress}" ${rewardAmount})`, keystore, counter, nodeUrl)
  console.log('')

  console.log('>>> [3/6] Asking reserve to give farm an allowance')
  counter++
  await sendOperation(reserveDeployResult.contractAddress, 'giveRewardAllowance', `${rewardAmount.toFixed()}`, keystore, counter, nodeUrl)
  console.log('')

  console.log('>>> [4/6] Setting reward plan on farm')
  counter++
  await sendOperation(farmDeployResult.contractAddress, 'updatePlan', `Pair ${rewardPerBlock.toFixed()} ${totalBlocks.toFixed()}`, keystore, counter, nodeUrl)
  console.log('')

  console.log('>>> [5/6] Setting Governor on Reserve')
  counter++
  await sendOperation(reserveDeployResult.contractAddress, 'setGovernorContract', `"${governorAddress}"`, keystore, counter, nodeUrl)
  console.log('')

  console.log('>>> [6/6] Setting Governor on Farm')
  counter++
  await sendOperation(farmDeployResult.contractAddress, 'setAdmin', `"${governorAddress}"`, keystore, counter, nodeUrl)
  console.log('')

  console.log('------------------------------------------------------')
  console.log('>> Wiring Complete!')
  console.log('>> Finished!')
  console.log('------------------------------------------------------')
  console.log('')

  console.log(`Farm: ${farmDeployResult.contractAddress} / ${farmDeployResult.operationHash}`)
  console.log(`Farm: ${reserveDeployResult.contractAddress} / ${reserveDeployResult.operationHash}`)
  console.log(``)

}


deploy()