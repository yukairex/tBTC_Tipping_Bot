module.exports = async (msg) => {
  if (!(await process.core.users.getAddress(msg.sender))) {
    await process.core.users.setAddress(
      msg.sender,
      await process.core.coin.createAddress(msg.sender)
    );
  }

  msg.obj.author.send(
    '💰 Your reusable address is ' +
      (await process.core.users.getAddress(msg.sender))
  );
  msg.obj.author.send(
    '⚠️ Note you have to deposit to this address via **zkSync network** <https://wallet.zksync.io>. Do NOT deposit on ethereum L1 mainnet directly'
  );
};
