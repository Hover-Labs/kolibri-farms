import { ContractOriginationResult, initConseil, loadContract, deployContract, sendOperation } from './utils'
import { initOracleLib, Utils } from '@tacoinfra/harbinger-lib'
import { KeyStore, TezosLanguageUtil, TezosNodeReader } from 'conseiljs'

// Load secret key
const privateKeyName = 'FARM_SK'
const privateKey = process.env[privateKeyName]

const logLevel = 'info'
const nodeUrl = "https://rpctest.tzbeta.net"

const deployFarm = async (
  farmContract: string,
  adminAddress: string,
  depositToken: string,
  rewardReserve: string,
  rewardToken: string,
  keystore: KeyStore,
  counter: number,
  nodeUrl: string,
): Promise<ContractOriginationResult> => {
  const storage = `(Pair (Pair (Pair (Pair "${adminAddress}" "${depositToken}") (Pair "${rewardReserve}" "${rewardToken}")) {})(Pair            (Pair              (Pair 0                    (Pair 0 0))  (Pair 0 (Pair 0 0))) 0))`
  const storageMicheline = TezosLanguageUtil.translateMichelsonToMicheline(storage)

  const deployResult = await deployContract(
    farmContract,
    storageMicheline,
    keystore,
    counter,
    nodeUrl,
    true
  )
  console.log('')

  return deployResult
}

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
    `${__dirname}/../farm-contract.json`,
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

  console.log('>>> Deploying Farm')
  counter++
  const farmResult = await deployFarm(
    farmContract,
    "tz1hoverof3f2F8NAavUyTjbFBstZXTqnUMS",
    "KT1L8zmG4ZwibgJwJxYZGJsjJeM7VA8qWEao",
    "tz1KoLibimdjUSfhrSpXwx4FhhhCq1JM5Etk",
    "KT18yyUYL7U9eGfjukKqhY9THqugmh1oW6Fh",
    keystore,
    counter,
    nodeUrl
  )
  console.log('')

}

deploy()