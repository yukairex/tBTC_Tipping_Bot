//Get variables from the settings.
var bot = process.settings.discord.user;
var symbol = process.settings.coin.symbol;
var decimals = process.settings.coin.decimals;
var fee = process.settings.coin.withdrawFee;

//Default help tect.
var help = `
**Keep Discord TIPBOT COMMAND LIST**

This bot allows you to tip and make payment to any Discord user with tBTC on ⚡️ **zkSync L2** ⚡️ zkrollup network

To run a command, either preface it with "$" ("$deposit", "$tip").

This bot does use decimals, and has ${decimals} decimals of accuracy. You can also use "all" instead of any AMOUNT to tip/withdraw your entire balance.

🏦 -- *$balance*
Prints your balance.

💵 -- *$tip <@PERSON>*
Tips the person $5.

💵 -- *$tip <@PERSON> $<AMOUNT>*
Tips the person amount of **dollar**.

💵 -- *$tip <@PERSON> <AMOUNT>*
Tips the person that amount of **${symbol}**.

💵 -- *$tip <@PERSON> all*
Tips all your balance to this person.

🏧 --  *$withdraw <AMOUNT of tBTC> <ADDRESS>*
Withdraws AMOUNT of tBTC to ADDRESS on zkSync network. Message in DM

🏧 --  *$withdraw all <ADDRESS>*
Withdraws all your tBTC to ADDRESS on zkSync network. Message in DM

💰 --  *$deposit*
Prints your personal deposit address in DM. This deposit has been on zkSync Network https://wallet.zksync.io/account

⚡️ Note you will trust a custodial wallet to manage your tipping tbtc pool. Do not throw too much. Withdraw anytime you want. 
Contact @Crypto Investor #3523 if any question
https://github.com/yukairex/tBTC_Tipping_Bot
`;

// reply help in the current channel
module.exports = async (msg) => {
  msg.obj.reply({
    embed: {
      description: help,
    },
  });
};
