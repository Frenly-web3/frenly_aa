import { BalanceTest } from './../typechain-types/contracts/test-contract/BalanceTest';
import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";
import {
  arrayify,
  defaultAbiCoder,
  hexDataSlice,
  keccak256
} from 'ethers/lib/utils'
import { ecsign, toRpcSig, keccak256 as keccak256_buffer } from 'ethereumjs-util'
import { BigNumberish, } from 'ethers'
import { BytesLike } from '@ethersproject/bytes'
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import fs from 'fs'
export type address = string
export type uint256 = BigNumberish
export type uint = BigNumberish
export type uint48 = BigNumberish
export type bytes = BytesLike
export type bytes32 = BytesLike
export interface UserOperation {

  sender: address
  nonce: uint256
  initCode: bytes
  callData: bytes
  callGasLimit: uint256
  verificationGasLimit: uint256
  preVerificationGas: uint256
  maxFeePerGas: uint256
  maxPriorityFeePerGas: uint256
  paymasterAndData: bytes
  signature: bytes
}


function encode(typevalues: Array<{ type: string, val: any }>, forSignature: boolean): string {
  const types = typevalues.map(typevalue => typevalue.type === 'bytes' && forSignature ? 'bytes32' : typevalue.type)
  const values = typevalues.map((typevalue) => typevalue.type === 'bytes' && forSignature ? keccak256(typevalue.val) : typevalue.val)
  
  console.log(types, values, "AAAAAAAAAAAAAA");
  
  
  return defaultAbiCoder.encode(types, values)
}
export function packUserOp(op: UserOperation, forSignature = true): string {
 
  if (forSignature) {
    // lighter signature scheme (must match UserOperation#pack): do encode a zero-length signature, but strip afterwards the appended zero-length value
    const userOpType = {
      components: [
        { type: 'address', name: 'sender' },
        { type: 'uint256', name: 'nonce' },
        { type: 'bytes', name: 'initCode' },
        { type: 'bytes', name: 'callData' },
        { type: 'uint256', name: 'callGasLimit' },
        { type: 'uint256', name: 'verificationGasLimit' },
        { type: 'uint256', name: 'preVerificationGas' },
        { type: 'uint256', name: 'maxFeePerGas' },
        { type: 'uint256', name: 'maxPriorityFeePerGas' },
        { type: 'bytes', name: 'paymasterAndData' },
        { type: 'bytes', name: 'signature' }
      ],
      name: 'userOp',
      type: 'tuple'
    }
    console.log(Object.values({ ...op, signature: '0x' }));
    
    let encoded = defaultAbiCoder.encode([userOpType as any], [...Object.values({ ...op, signature: '0x' })])
    // remove leading word (total length) and trailing word (zero-length signature)
    encoded = '0x' + encoded.slice(66, encoded.length - 64)
    
    return encoded
  }
  const typevalues = [
    { type: 'address', val: op.sender },
    { type: 'uint256', val: op.nonce },
    { type: 'bytes', val: op.initCode },
    { type: 'bytes', val: op.callData },
    { type: 'uint256', val: op.callGasLimit },
    { type: 'uint256', val: op.verificationGasLimit },
    { type: 'uint256', val: op.preVerificationGas },
    { type: 'uint256', val: op.maxFeePerGas },
    { type: 'uint256', val: op.maxPriorityFeePerGas },
    { type: 'bytes', val: op.paymasterAndData }
  ]
  if (!forSignature) {
    // for the purpose of calculating gas cost, also hash signature
    typevalues.push({ type: 'bytes', val: op.signature })
  }
  return encode(typevalues, forSignature)
}
export async function getUserOpHash(op: UserOperation, entryPoint: string, chainId: number): Promise<string> {
  const userOpHash = keccak256(packUserOp(op, true))
  
  const enc = defaultAbiCoder.encode(
    ['bytes32', 'address', 'uint256'],
    [userOpHash, entryPoint, chainId])
  return keccak256(enc)
}
export async function signUserOp(op: UserOperation, signer: SignerWithAddress, entryPoint: string, chainId: number): Promise<UserOperation> {
  const message = await getUserOpHash(op, entryPoint, chainId)
  const signature = await signer.signMessage(arrayify(message))
 
  
  return {
    ...op,
    signature
  }
}
describe("Lock", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployOneYearLockFixture() {

    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();

    const EntryPoint = await ethers.getContractFactory("EntryPoint");
    const entryPoint = await EntryPoint.deploy();

    await entryPoint.deployed()

    const AccountFactory = await ethers.getContractFactory("SimpleAccountFactory");
    const accountFactory = await AccountFactory.deploy(entryPoint.address);

    await accountFactory.deployed()


    const BalanceTest = await ethers.getContractFactory("BalanceTest");
    const balanceTest = await BalanceTest.deploy();

    await balanceTest.deployed()

    return { entryPoint, owner, otherAccount, accountFactory, balanceTest };
  }

  describe("Deployment", function () {
    it("Should set the right unlockTime", async function () {
      const { accountFactory, owner, entryPoint, otherAccount, balanceTest } = await loadFixture(deployOneYearLockFixture);
      const computedAddress = await accountFactory.getAddress(owner.address, 2, otherAccount.address)
      const createdSmartWalletTx = await accountFactory.createAccount(owner.address, 2, otherAccount.address)
      const resp = await createdSmartWalletTx.wait()


      const createdSmartWallet = await ethers.getContractAt("SimpleAccount", computedAddress)

      const info = await createdSmartWallet.owner()

      console.log(info);

      const tx = await createdSmartWallet.addDeposit({ value: ethers.utils.parseUnits('1', 'ether') })
      const receipt = await tx.wait()
      const deposit = await entryPoint.getDepositInfo(owner.address)

      const interce = fs.readFileSync('./artifacts/contracts/SimpleAccount.sol/SimpleAccount.json', { encoding: "utf-8" })
      const SmartWalletInterface = new ethers.utils.Interface(JSON.parse(interce).abi)
      const inter2 = fs.readFileSync('./artifacts/contracts/test-contract/BalanceTest.sol/BalanceTest.json', { encoding: "utf-8" })
      const BalanceTestInterface = new ethers.utils.Interface(JSON.parse(inter2).abi)

      const callDataBal = BalanceTestInterface.encodeFunctionData("addBalance", [createdSmartWallet.address])
      console.log("SmartWallet", createdSmartWallet.address);
      console.log("Balance Test", balanceTest.address);
      console.log("Owner", owner.address);
      console.log("Entry Point", entryPoint.address);
      const callData = SmartWalletInterface.encodeFunctionData("execute", [balanceTest.address, 0, callDataBal])
      console.log("🚀 ~ file: Lock.ts:149 ~ callData:", callData)

      const addedResp = await entryPoint.addStake(2, { value: ethers.utils.parseEther('1') })
      await addedResp.wait()

      const userOp: UserOperation = {
        sender: createdSmartWallet.address,
        nonce: 0,
        initCode: '0x',
        callData,
        callGasLimit: 100000,
        verificationGasLimit: 100000, // default verification gas. will add create2 cost (3200+200*length) if initCode exists
        preVerificationGas: 21000, // should also cover calldata cost.
        maxFeePerGas: 0,
        maxPriorityFeePerGas: 1e9,
        paymasterAndData: '0x',
        signature: '0x'
      }
      const signedUserOp = await signUserOp(userOp, owner, entryPoint.address, 1337)
      console.log(signedUserOp);
      try {
        // const ret = await entryPoint.simulateHandleOp(signedUserOp, balanceTest.address, callData,)
        const ret2 = await entryPoint.handleOps([signedUserOp], owner.address)

        // const resret = await ret.wait()
        const resret2 = await ret2.wait()
        fs.writeFileSync("resp.json", JSON.stringify(resret2))
        





      } catch (er) {
        console.log(er);

      } finally {
        const check = await balanceTest.getBalance()

        console.log(check);
      }





    });


  });
})
