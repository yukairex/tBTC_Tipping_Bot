tbtcPrice = require('./tbtc');
gas = require('./gas');

const App = async () => {
  let gwei = await gas();
  let tbtc = await tbtcPrice();

  console.log(gwei);
  console.log(tbtc);
};

App();
