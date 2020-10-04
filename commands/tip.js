//BN lib.
var BN = require('bignumber.js');
BN.config({
  ROUNDING_MODE: BN.ROUND_DOWN,
  EXPONENTIAL_AT: process.settings.coin.decimals + 1,
});

var getPrice = require('../api/tbtc.js');

//Vars from the settings.
var pools = process.settings.pools;
var symbol = process.settings.coin.symbol;

module.exports = async (msg) => {
  //Tip details.
  var pool, from, to, amount, tipInDollar;

  //Tip from an user.
  if (msg.text.length === 2) {
    // tip by default
    //Set the tip's details.
    pool = false;
    from = msg.sender;
    to = msg.text[1].replace('!', ''); //Turn <!@ into <@.
    tipInDollar = 5;
    let price = await getPrice();
    amount = tipInDollar / price;
  } else if (msg.text.length === 3) {
    //Set the tip's details.
    pool = false;
    from = msg.sender;
    to = msg.text[1].replace('!', ''); //Turn <!@ into <@.

    // check if has a dollar sign
    if (msg.text[2].substr(0, 1) === '$') {
      tipInDollar = parseFloat(msg.text[2].substring(1, msg.text[2].length));
      if (isNaN(tipInDollar)) {
        msg.obj.reply('You are tipping amount is incorrect');
        return;
      }
      let price = await getPrice();
      amount = tipInDollar / price;
    } else {
      amount = msg.text[2]; // tip tBTC directly
    }
  } else {
    msg.obj.reply('You used the wrong amount of arguments.');
    return;
  }

  //If the amount is all...
  if (amount === 'all') {
    //Set the amount to the user's balance.
    amount = await process.core.users.getBalance(from);
    //Else...
  } else {
    //Parse amount into a BN, yet make sure we aren't dealing with < 1 satoshi.
    amount = BN(BN(amount).toFixed(process.settings.coin.decimals));
  }

  //If this is not a valid user, or a pool we're sending to...
  if (
    (to.substr(0, 2) !== '<@' ||
      to.substr(to.length - 1) !== '>' ||
      Number.isNaN(parseInt(to.substring(2, to.length - 1)))) &&
    Object.keys(pools).indexOf(to) === -1
  ) {
    msg.obj.reply(
      'You are not tipping to a valid person. Please put @ in front of their name and click the popup Discord provides.'
    );
    return;
  }
  //Strip the characters around the user ID.
  if (to.indexOf('<@') > -1) {
    to = to.substring(2, to.length - 1);
  }

  //Stop pointless self sends.
  if (from === to) {
    msg.obj.reply('You cannot send to yourself.');
    return;
  }

  //Subtract the balance from the user.
  if (!(await process.core.users.subtractBalance(from, amount))) {
    //If that failed...
    msg.obj.reply(
      "Your number is either invalid, negative, or you don't have enough."
    );
    return;
  }

  //Create an account for the user if they don't have one.
  await process.core.users.create(to);
  //Add the amount to the target.
  await process.core.users.addBalance(to, amount);

  if (tipInDollar == 'undefined') {
    msg.obj.reply(
      'Sent ' +
        amount +
        ' ' +
        symbol +
        ' to ' +
        (Number.isNaN(parseInt(to)) ? pools[to].printName : '<@' + to + '>') +
        (pool ? ' via the ' + pools[from].printName + ' pool' : '') +
        '.'
    );
  } else {
    msg.obj.reply(
      'Sent $' +
        tipInDollar +
        ' to ' +
        (Number.isNaN(parseInt(to)) ? pools[to].printName : '<@' + to + '>') +
        (pool ? ' via the ' + pools[from].printName + ' pool' : '') +
        '.'
    );
  }

  if (pool) {
    for (var i in pools[from].admins) {
      process.client.users
        .get(pools[from].admins[i])
        .send(
          pools[from].printName +
            ' pool update: <@' +
            msg.sender +
            '> sent ' +
            amount +
            ' ' +
            symbol +
            ' to <@' +
            to +
            '>.'
        );
    }
  }
};
