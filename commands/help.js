//Get variables from the settings.
var bot = process.settings.discord.user;
var symbol = process.settings.coin.symbol;
var decimals = process.settings.coin.decimals;
var fee = process.settings.coin.withdrawFee;

//Default help tect.
var help = `
**Keep Discord TIPBOT COMMAND LIST**

To run a command, either preface it with "!" ("!deposit", "!tip") or ping the bot ("<@${bot}> deposit", "<@${bot}> tip").

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
