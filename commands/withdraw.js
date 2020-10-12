//BN lib.
var BN = require('bignumber.js');
BN.config({
  ROUNDING_MODE: BN.ROUND_DOWN,
  EXPONENTIAL_AT: process.settings.coin.decimals + 1,
});

var symbol = process.settings.coin.symbol;

module.exports = async (msg) => {
  // check DM
  if (msg.obj.channel.type !== 'dm') {
    msg.obj.reply('check your DM!');
  }

  //Check the argument count.
  if (msg.text.length !== 3) {
    msg.obj.author.send(
      'You used the wrong amount of arguments. -- *$withdraw <AMOUNT of tBTC> <ADDRESS>*'
    );
    return;
  }

  //Get the amount from the command.
  var amount = msg.text[1];
  //Amount with the withdrawl fee.
  var amountWFee;
  // transfer fee
  var transferFee = process.settings.zksync.transferFee;

  //If the amount is all...$
  if (amount === 'all') {
    //The amount with the fee is the user's balance.
    amountWFee = await process.core.users.getBalance(msg.sender);
    //The amount is the balance minus the fee.
    amount = amountWFee.minus(BN(transferFee));
    //Else...
  } else {
    //Parse the amount (limited to the satoshi), and add the withdraw fee.
    amount = BN(BN(amount).toFixed(process.settings.coin.decimals));
    amountWFee = amount.plus(BN(transferFee));
  }

  //Get the address by filtering the message again, but not calling toLowerCase this time since addresses are case sensitive.
  var address = msg.obj.content
    .split(' ')
    .filter((item) => {
      return item !== '';
    })
    .join(' ')
    .substring(1, msg.obj.content.length)
    .replace(new RegExp('\r', 'g'), '')
    .replace(new RegExp('\n', 'g'), '')
    .split(' ')[2];

  //If we own that address...
  // if (await process.core.coin.ownAddress(address)) {
  //   msg.obj.author.send("You cannot withdraw to me. It's just network spam...");
  //   return;
  // }

  //If we were unable to subtract the proper amount...
  if (!(await process.core.users.subtractBalance(msg.sender, amountWFee))) {
    msg.obj.author.send(
      "Your number is either invalid, negative, or you don't have enough. Remember, you must also have extra " +
        symbol +
        ' to pay the fee.'
    );
    return;
  }

  //If we made it past the checks, send the funds.
  let fee = process.settings.zksync.transferFee;
  let result = await process.core.coin.sendTo(0, address, amount, fee);

  if (result.receipt.success !== true) {
    msg.obj.author.send(
      'Our node failed to create a TX! Is your address invalid?'
    );
    await process.core.users.addBalance(msg.sender, amount);
    return;
  }

  msg.obj.author.send('Success! Your TX hash on zkSync is ' + result.txHash);
};
