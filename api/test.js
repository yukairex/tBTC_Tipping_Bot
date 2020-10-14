const tbtcPrice = require('./tbtc');
const gas = require('./gas');
const BN = require('bignumber.js');

const App = async () => {
  let gwei = await gas();
  let tbtc = await tbtcPrice();

  console.log(gwei);
  console.log(BN(tbtc).toString());
};

App();
