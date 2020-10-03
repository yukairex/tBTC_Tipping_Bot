//Get variables from the settings.
var bot = process.settings.discord.user;
var symbol = process.settings.coin.symbol;
var decimals = process.settings.coin.decimals;
var fee = process.settings.coin.withdrawFee;

//Default help tect.
var help = `
**It is running on Rinkeby Testnet right now!! Do not deposit real tBTC into it**
**Using Rinkeby DAI as a dummy token. You can find faucet from Compound interface**

**Keep Discord TIPBOT COMMAND LIST**

This bot allows you to tip and make payment to any Discord user with tBTC on Ethereum mainnet

To run a command, either preface it with "$" ("$deposit", "$tip").

This bot does use decimals, and has ${decimals} decimals of accuracy. You can also use "all" instead of any AMOUNT to tip/withdraw your entire balance.

-- *$balance*
Prints your balance.

-- *$tip <@PERSON> <AMOUNT>*
Tips the person that amount of ${symbol}.

-- *$withdraw <AMOUNT> <ADDRESS>*
Withdraws AMOUNT to ADDRESS, charging a ${fee} ${symbol} fee.

-- *$deposit*
Prints your personal deposit address.

`;

module.exports = async (msg) => {
  msg.obj.author.send({
    embed: {
      description: help,
    },
  });
};
