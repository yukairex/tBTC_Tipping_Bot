// this script is to initialize master account
const zksync = require('zksync');
const ethers = require('ethers');

async function init() {
  console.log(' initializing master account');
  process.settings = require('./settings.json');

  const provider = ethers.getDefaultProvider(process.settings.zksync.network, {
    infura: process.settings.zksync.infuraKey,
  });

  const master = new ethers.Wallet.fromMnemonic(
    process.settings.zksync.mnemonic,
    process.settings.zksync.pathPrefix + 100000
  ).connect(provider);
  console.log('master address at', master.address);

  const zksProvider = await zksync.getDefaultProvider(
    process.settings.zksync.network
  );
  const zkSyncMaster = await zksync.Wallet.fromEthSigner(master, zksProvider);

  // check the master account Id on L2:
  if ((await zkSyncMaster.getAccountId()) == undefined) {
    // do a one time deposit to activate account
    console.log('deposit some ether to L2');

    let balance = await provider.getBalance(master.address);
    //check L1 balance
    if (ethers.utils.formatEther(balance) <= 0.1) {
      throw new Error('Not enough ether balance');
    }

    console.log('deposit some ether from L1 to L2');
    const deposit = await zkSyncMaster.depositToSyncFromEthereum({
      depositTo: zkSyncMaster.address(),
      token: 'ETH',
      amount: ethers.utils.parseEther('0.05'),
    });

    const depositReceipt = await deposit.awaitReceipt();
    console.log(depositReceipt);
    console.log('account id:', await zkSyncMaster.getAccountId());
  } else {
    console.log('account id:', await zkSyncMaster.getAccountId());
  }

  // associate accountId to zkwallet object, otherwise signingKeySet method will fail
  zkSyncMaster.accountId = await zkSyncMaster.getAccountId();
  console.log(zkSyncMaster);
  // set signer key the wallet
  if (!(await zkSyncMaster.isSigningKeySet())) {
    console.log('change pub key');
    const changePubkey = await zkSyncMaster.setSigningKey({
      feeToken: 'ETH',
    });
    // Wait till transaction is committed
    const receipt = await changePubkey.awaitReceipt();
  } else {
    console.log('public key has bee set to the master address');
  }
}

init();
