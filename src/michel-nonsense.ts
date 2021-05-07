import { TezosLanguageUtil } from "conseiljs"

const adminAddress = 'tz1abmz7jiCV2GH2u81LRrGgAFFgvQgiDiaf'
const depositToken = 'tz1abmz7jiCV2GH2u81LRrGgAFFgvQgiDiaf'
const rewardReserve = 'tz1abmz7jiCV2GH2u81LRrGgAFFgvQgiDiaf'
const rewardToken = 'tz1abmz7jiCV2GH2u81LRrGgAFFgvQgiDiaf'
// const param = `(Pair (Pair (Pair (Pair "${adminAddress}" "${depositToken}") (Pair "${rewardReserve}" "${rewardToken}")) {}) (Pair (Pair             (Pair 0                    (Pair 0 0))     (Pair 0                    (Pair 0 0)))0)`
const param = `(Pair (Pair (Pair (Pair "${adminAddress}" "${adminAddress}") (Pair "${adminAddress}" "${adminAddress}")) {})(Pair            (Pair              (Pair 0                    (Pair 0 0))  (Pair 0 (Pair 0 0))) 0))`
const micheline = TezosLanguageUtil.translateMichelsonToMicheline(param)

console.log("Micheline")
console.log(micheline)