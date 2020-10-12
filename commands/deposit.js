module.exports = async (msg) => {
  if (!(await process.core.users.getAddress(msg.sender))) {
    msg.obj.author.send(
      'Generating your deposit address! This might take quite a while...need to setup on chain'
    ); // generate deposit address

    await process.core.users.setAddress(
      msg.sender,
      await process.core.coin.createAddress(msg.sender)
    );
  }

  msg.obj.author.send(
    'Your reusable address is ' +
      (await process.core.users.getAddress(msg.sender))
  );
};
