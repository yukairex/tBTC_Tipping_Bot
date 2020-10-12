//fs standard lib.
var fs = require('fs');

//Async sleep lib.
var sleep = require('await-sleep');

//BigNumber lib.
var BN = require('bignumber.js');

//EthereumJS-Wallet lib.
var ethjsWallet = require('ethereumjs-wallet');

// gas api
var getGas = require('../api/gas');

//Web3 lib.
var web3 = require('web3');

// load zkSync and ether.js
const zksync = require('zksync');
const ethers = require('ethers');

//Decimals in the ERC20.
var decimals;
var decimalsBN;

//Master address wallet on mainnet and zkSync.
var master, zkSyncMaster;

// ethereum network and zkSyncprovider
var provider, zksProvider; // make it global

//RAM cache of the addresses and TXs.
var addresses = [];
var txs = {};

//Checks an amount for validity.
async function checkAmount(amount) {
  //If the amount is invalid...
  amount = BN(amount);
  if (amount.isNaN()) {
    return false;
  }

  //If the amount is less than or equal to 0...
  if (amount.lte(0)) {
    return false;
  }

  //Else, return true.
  return true;
}

// create an address by user Id, return the address
async function createAddress(user) {
  // fetch id
  let id = await process.core.users.getUserId(user);
  //Create a new Wallet.
  var newWallet = new ethers.Wallet.fromMnemonic(
    process.settings.zksync.mnemonic,
    process.settings.zksync.pathPrefix + id
  ).connect(provider);

  var address = newWallet.address;

  // push address into addresses
  addresses.push(address);

  //Return it.
  return address;
}

async function ownAddress(address) {
  return addresses.indexOf(address.toLowerCase()) !== -1;
}

async function getTransactions(address) {
  return txs[address];
}

async function getSyncWallet(senderId) {
  // load the wallet
  let wallet = new ethers.Wallet.fromMnemonic(
    process.settings.zksync.mnemonic,
    process.settings.zksync.pathPrefix + senderId
  ).connect(provider);

  let syncWallet = await zksync.Wallet.fromEthSigner(
    wallet,
    process.core.coin.zksProvider
  );
  return syncWallet;
}

async function sendTo(senderId, toAddress, amount, fee) {
  // send from fromWallet to master account amount of token

  // senderId is an integer number to derive the private key
  // toAddress is an 0x address
  // amount and fee are BN
  if (!checkAmount(amount)) return false;
  if (!checkAmount(fee)) return false;

  // check if amount is smaller than fee, do not transfer
  if (amount.lt(fee)) {
    return false;
  }

  let fromWallet = await getSyncWallet(senderId);
  console.log('sender wallet:', fromWallet.address());
  let balance = zksProvider.tokenSet.formatToken(
    process.settings.zksync.tokenSymbol,
    await fromWallet.getBalance(process.settings.zksync.tokenSymbol)
  );

  balance = BN(balance);

  console.log(balance.toString());
  console.log(amount.toString());
  console.log(fee.toString());

  if (balance.lt(amount.plus(fee))) {
    console.log('insufficient balance');
    return;
  }

  if (!(await fromWallet.isSigningKeySet())) {
    console.log('setting signing key...');
    // checking if public key has been assigned
    if ((await fromWallet.getAccountId()) == undefined) {
      throw new Error('Unknwon account');
    }

    // setup a public key
    let changePubkey = await fromWallet.setSigningKey({
      feeToken: process.settings.zksync.feeToken,
    });

    let receipt = await changePubkey.awaitReceipt();
  }

  console.log('sending tx...');

  // send back to master wallet
  let transferTransaction = await fromWallet.syncTransfer({
    to: toAddress,
    token: process.settings.zksync.tokenSymbol,
    amount: zksync.utils.closestPackableTransactionAmount(
      zksProvider.tokenSet.parseToken(
        process.settings.zksync.tokenSymbol,
        amount.toString()
      )
    ),
    fee: zksync.utils.closestPackableTransactionFee(
      zksProvider.tokenSet.parseToken(
        process.settings.zksync.tokenSymbol,
        fee.toString()
      )
    ),
  });
  let receipt = await transferTransaction.awaitReceipt();
  return {
    receipt,
    txHash: transferTransaction.txHash,
  };
}

module.exports = async () => {
  // initiate provider

  provider = ethers.getDefaultProvider(process.settings.zksync.network, {
    infura: process.settings.zksync.infuraKey,
  });

  // setup mainwallet for gl
  master = new ethers.Wallet.fromMnemonic(
    process.settings.zksync.mnemonic,
    process.settings.zksync.pathPrefix + 0
  ).connect(provider);

  // setup zksync wallet

  zksProvider = await zksync.getDefaultProvider(
    process.settings.zksync.network
  );
  zkSyncMaster = await zksync.Wallet.fromEthSigner(master, zksProvider);

  // for this version of SDK, needs manually associate accountId
  zkSyncMaster.accountId = await zkSyncMaster.getAccountId();

  // unlock the wallet
  if (!(await zkSyncMaster.isSigningKeySet())) {
    throw new Error('master account needs to set pubkey');
  }

  //Return the functions.
  return {
    createAddress: createAddress,
    ownAddress: ownAddress,
    getTransactions: getTransactions,
    provider: provider,
    zksProvider: zksProvider,
    sendTo: sendTo,
    zkSyncMaster: zkSyncMaster,
  };
};
