//MySQL and BN libs.
var mysql = require('promise-mysql');
var BN = require('bignumber.js');
var axios = require('axios');
var decimals = process.settings.coin.decimals;
BN.config({
  ROUNDING_MODE: BN.ROUND_DOWN,
  EXPONENTIAL_AT: decimals + 1,
});

// load zkSync and ether.js
const zksync = require('zksync');
const ethers = require('ethers');

//MySQL connection and table vars.
var connection, table;

var tokenSymbol = process.settings.zksync.tokenSymbol;
var network = process.settings.zksync.network;
var URLprefix =
  network == 'mainnet'
    ? 'https://api.zksync.io/'
    : `https://${network}-api.zksync.io/`;

//RAM cache of users.
var users = [];

//Checks an amount for validity.
async function checkAmount(amount) {
  //If the amount is invalid...
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

//Creates a new user.
async function create(user) {
  //If the user already exists, return.
  if (users[user]) {
    return false;
  }

  //Create the new user, with a blank address, balance of 0, and the notify flag on.
  try {
    await connection.query('INSERT INTO ' + table + ' VALUES(?,?, ?, ?, ?,?)', [
      Object.keys(users).length + 1,
      user,
      '',
      '0',
      0,
      '0,0',
    ]);
    //Create the new user in the RAM cache, with a status of no address, balance of 0, and the notify flag off.
    users[user] = {
      id: Object.keys(users).length + 1,
      address: false,
      balance: BN(0),
      notify: false, // get rid of notify flag
      txid: '0,0',
    };
    //Return true on success.
    return true;
  } catch (err) {
    console.log(err);
  }
}

//Sets an user's address.
async function setAddress(user, address) {
  //If they already have an address, return.
  if (typeof users[user].address === 'string') {
    return;
  }

  //Update the table with the address.
  try {
    await connection.query(
      'UPDATE ' + table + ' SET address = ? WHERE name = ?',
      [address, user]
    );
    //Update the RAM cache.
    users[user].address = address;
  } catch (err) {
    console.log(err);
  }
}

//Adds to an user's balance.
async function addBalance(user, amount) {
  //Return false if the amount is invalid.
  amount = BN(amount);

  if (!(await checkAmount(amount))) {
    return false;
  }

  //Add the amount to the balance.
  var balance = users[user].balance.plus(amount);

  //Convert the balance to the coin's smallest unit.
  balance = balance.toFixed(decimals);

  //Update the table with the new balance, as a string.
  try {
    await connection.query(
      'UPDATE ' + table + ' SET balance = ? WHERE name = ?',
      [balance, user]
    );
    //Update the RAM cache with a BN.
    users[user].balance = BN(balance);
    return true;
  } catch (err) {
    console.log(err);
  }
}

//Subtracts from an user's balance.
async function subtractBalance(user, amount) {
  //Return false if the amount is invalid.
  if (!(await checkAmount(amount))) {
    return false;
  }

  //Subtracts the amount from the balance.
  var balance = users[user].balance.minus(amount);
  //Return false if the user doesn't have enough funds to support subtracting the amount.
  if (balance.lt(0)) {
    return false;
  }

  //Convert the balance to the coin's smallest unit.
  balance = balance.toFixed(decimals);

  //Update the table with the new balance, as a string.
  try {
    await connection.query(
      'UPDATE ' + table + ' SET balance = ? WHERE name = ?',
      [balance, user]
    );
    //Update the RAM cache with a BN.
    users[user].balance = BN(balance);
    return true;
  } catch (err) {
    console.log(err);
  }
}

async function updateUserTxId(user, txid) {
  // check if the tx id is valid or not
  let result = txid.split(',');
  if (result.length == 1) {
    // fix the api issue
    txid = txid + ',0';
  }

  try {
    await connection.query('UPDATE ' + table + ' SET txid = ? WHERE name = ?', [
      txid,
      user,
    ]);
    users[user].txid = txid;
  } catch (err) {
    console.log(err);
  }
}

//Returns an user's address.
function getAddress(user) {
  return users[user].address;
}

//Returns an user's balance
function getBalance(user) {
  return users[user].balance;
}

function getUserId(user) {
  return users[user].id;
}

function getTxId(user) {
  return users[user].txid;
}

// listen for transaction happened on L2
async function queryAccount(address, txid) {
  // return the transactions from restapi
  let url = `${URLprefix}api/v0.1/account/${address}/history/newer_than?tx_id=${txid}`;
  //console.log(url);
  try {
    let { data } = await axios.get(url);
    return data;
  } catch (err) {
    console.log(err);
  }
}

module.exports = async () => {
  //Connects to MySQL.
  connection = await mysql.createConnection({
    host: process.settings.mysql.host,
    database: process.settings.mysql.db,
    user: process.settings.mysql.user,
    password: process.settings.mysql.pass,
  });
  //Set the table from the settings.
  table = process.settings.mysql.tips;

  //Init the RAM cache.
  users = {};
  //Init the handled array.
  handled = [];
  //Gets every row in the table.
  var rows = await connection.query('SELECT * FROM ' + table);
  //Iterate over each row, creating an user object for each.
  var i;
  for (i in rows) {
    users[rows[i].name] = {
      id: rows[i].id,
      //If the address is an empty string, set the value to false.
      //This is because we test if the address is a string to see if it's already set.
      address: rows[i].address !== '' ? rows[i].address : false,
      //Set the balance as a BN.
      balance: BN(rows[i].balance),
      //Set the notify flag based on if the DB has a value of 0 or 1 (> 0 for safety).
      notify: rows[i].notify > 0,
      // set the txid of user for REST API referesh
      txid: rows[i].txid,
    };
  }

  //Return all the functions.
  return {
    create: create,
    setAddress: setAddress,
    addBalance: addBalance,
    subtractBalance: subtractBalance,
    getAddress: getAddress,
    getBalance: getBalance,
    getUserId: getUserId,
  };
};

//Every thirty seconds, check the TXs of users
setInterval(async () => {
  console.log(' ================== checking deposits ==================');
  for (var user in users) {
    //If that user doesn't have an address, continue.

    if (users[user].address === false) {
      continue;
    }

    console.log('checking user', users[user].id);
    // query tx from zkSync rest api, need to add 1 from repetitive result
    var txs = await queryAccount(getAddress(user), getTxId(user));

    // total deposit of this account from last check
    if (txs.length > 0) {
      for (var tx of txs) {
        // update user txid to the first one that is committed
        if (tx.commited == true) {
          await updateUserTxId(user, tx.tx_id);
          break;
        }
      }
    } else {
      continue;
    }

    // update deposited
    var deposited = new BN(0);

    //Iterate over the TXs.
    for (var tx of txs) {
      // calculate total amount from L1 deposit
      if (tx.tx.type == 'Deposit' && tx.commited === true) {
        if (tx.tx.priority_op.token == tokenSymbol) {
          let amount = process.core.coin.zksProvider.tokenSet.formatToken(
            tokenSymbol,
            tx.tx.priority_op.amount
          );
          deposited = deposited.plus(BN(amount));
        }
      }

      // calculate total amount from L2 transfer
      if (tx.tx.type == 'Transfer' && tx.commited === true) {
        if (
          tx.tx.to.toLowerCase() == getAddress(user).toLowerCase() &&
          tx.tx.token == tokenSymbol
        ) {
          let amount = process.core.coin.zksProvider.tokenSet.formatToken(
            tokenSymbol,
            tx.tx.amount
          );
          deposited = deposited.plus(BN(amount));
        }
      }
    }

    deposited = deposited.toFixed(decimals);

    //update balance
    if (deposited.toString() > 0) {
      console.log('found a tx');
      console.log('updating user', users[user].id, 'total deposit', deposited);
    }

    await addBalance(user, deposited);
  }
}, 60 * 1000);

// set interval for balance looping back

setInterval(async () => {
  for (var user in users) {
    if (users[user].address === false) {
      continue;
    }

    // loop back balance
    let state = await process.core.coin.zksProvider.getState(
      users[user].address
    );

    let balance = state.committed.balances[tokenSymbol];
    if (balance !== undefined) {
      balance = process.core.coin.zksProvider.tokenSet.formatToken(
        tokenSymbol,
        balance
      );
      // set balance in BN
      balance = BN(balance);
    } else {
      balance = BN(0);
    }

    let fee = await process.core.coin.queryFee(
      'Transfer',
      process.core.coin.zkSyncMaster.address()
    );

    balance = BN(balance);
    if (balance.minus(fee).gt(fee)) {
      console.log('transfer deposit from user ', users[user].id, ' to master');
      // do not transfer if amount is smaller than fee
      // transfer back the token to master account
      await process.core.coin.sendTo(
        users[user].id,
        process.core.coin.zkSyncMaster.address(), // send to master address
        balance
      );
    }
  }
}, 60 * 1000);
