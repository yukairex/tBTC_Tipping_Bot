//Async sleep lib.
var sleep = require('await-sleep');

//BigNumber lib.
var BN = require('bignumber.js');

// load zkSync and ether.js
const zksync = require('zksync');
const ethers = require('ethers');

//Master address wallet on mainnet and zkSync.
var master, zkSyncMaster;

// ethereum network and zkSyncprovider
var provider, zksProvider; // make it global

//RAM cache of the addresses and TXs.
var addresses = [];
var txs = {};

// load setting variables
var network = process.settings.zksync.network;
var infuraKey = process.settings.zksync.infuraKey;
var feeToken = process.settings.zksync.feeToken;
var tokenSymbol = process.settings.zksync.tokenSymbol;

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

async function sendTo(senderId, toAddress, amount) {
  // send from fromWallet to master account amount of token
  // fee and value will be deducted from the account

  // senderId is an integer number to derive the private key
  // toAddress is an 0x address
  // amount is total amount to send with tx fee

  if (!checkAmount(amount)) return false;

  // query fee, return BN
  let fee = await queryFee('Transfer', toAddress);

  // load wallet
  let fromWallet = await getSyncWallet(senderId);

  // check if signing fee is paid
  var signFee = BN(0);
  if (!(await fromWallet.isSigningKeySet())) {
    signFee = await queryPublicKeyChangeFee(toAddress);
  }

  if (amount.lt(fee.plus(signFee))) {
    // check if amount is smaller than fee, do not transfer
    console.log('not enough balance');
    return false;
  } else {
    amount = amount.minus(fee).minus(signFee); // update real amount to send
  }

  console.log(
    'constructing tx from',
    fromWallet.address(),
    ' to',
    toAddress,
    ',amount:',
    amount.toString()
  );

  let balance = zksProvider.tokenSet.formatToken(
    tokenSymbol,
    await fromWallet.getBalance(tokenSymbol)
  );

  balance = BN(balance);

  console.log('user balance:', balance.toString());
  console.log('send amount:', amount.toString());
  console.log('total fee amount:', fee.plus(signFee).toString());

  if (balance.lt(amount.plus(fee).plus(signFee))) {
    console.log('insufficient balance');
    return;
  }

  // setting up public key if not set before
  await setupPublicKey(fromWallet);

  // send back to master wallet
  let transferTransaction = await fromWallet.syncTransfer({
    to: toAddress,
    token: tokenSymbol,
    amount: zksync.utils.closestPackableTransactionAmount(
      zksProvider.tokenSet.parseToken(tokenSymbol, amount.toString())
    ),
    fee: zksync.utils.closestPackableTransactionFee(
      zksProvider.tokenSet.parseToken(tokenSymbol, fee.toString())
    ),
  });

  let receipt = await transferTransaction.awaitReceipt();
  console.log('tx receipt:', receipt.success);
  return {
    receipt,
    txHash: transferTransaction.txHash,
  };
}

async function queryFee(operation, address) {
  try {
    let txFee = await zksProvider.getTransactionFee(
      operation,
      address,
      feeToken
    );
    return BN(
      zksProvider.tokenSet.formatToken(feeToken, txFee.totalFee.toString())
    );
  } catch (err) {
    console.log(err);
  }
}

async function setupPublicKey(wallet) {
  // return sign fee

  // first time needs to setup public key
  if (!(await wallet.isSigningKeySet())) {
    console.log('setting signing key...');
    // checking if public key has been assigned
    if ((await wallet.getAccountId()) == undefined) {
      throw new Error('Unknwon account');
    }

    console.log(wallet.address());
    // query fee
    let changePublicKeyFee = await queryPublicKeyChangeFee(wallet.address());
    const changePubkey = await wallet.setSigningKey({
      feeToken: feeToken,
      fee: ethers.utils.parseEther(changePublicKeyFee.toString()),
    });

    let receipt = await changePubkey.awaitReceipt();
    console.log('setting up publick key:', receipt.success);
    return changePublicKeyFee;
  }
  return BN(0);
}

async function queryPublicKeyChangeFee(address) {
  let txType = {
    ChangePubKey: {
      feeToken: tokenSymbol,
      onchainPubkeyAuth: false,
    },
  };

  try {
    let txFee = await zksProvider.getTransactionFee(txType, address, feeToken);
    return BN(
      zksProvider.tokenSet.formatToken(feeToken, txFee.totalFee.toString())
    );
  } catch (err) {
    console.log(err);
  }
}

module.exports = async () => {
  // initiate provider

  provider = ethers.getDefaultProvider(network, {
    infura: infuraKey,
  });

  // setup mainwallet for gl
  master = new ethers.Wallet.fromMnemonic(
    process.settings.zksync.mnemonic,
    process.settings.zksync.pathPrefix + 0
  ).connect(provider);

  // setup zksync wallet

  zksProvider = await zksync.getDefaultProvider(network);
  zkSyncMaster = await zksync.Wallet.fromEthSigner(master, zksProvider);

  // for this version of SDK, needs manually associate accountId
  zkSyncMaster.accountId = await zkSyncMaster.getAccountId();

  await setupPublicKey(zkSyncMaster);

  //Return the functions.
  return {
    createAddress: createAddress,
    ownAddress: ownAddress,
    getTransactions: getTransactions,
    provider: provider,
    zksProvider: zksProvider,
    sendTo: sendTo,
    zkSyncMaster: zkSyncMaster,
    queryFee: queryFee,
  };
};
