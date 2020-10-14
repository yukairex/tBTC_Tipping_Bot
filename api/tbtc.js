// fetch tbtc price from coingekko

const axios = require('axios');
const tbtcCoingecko =
  'https://api.coingecko.com/api/v3/simple/price?ids=tbtc&vs_currencies=usd';

module.exports = async () => {
  try {
    const response = await axios.get(tbtcCoingecko);
    return response.data.tbtc.usd;
  } catch (error) {
    console.error(error);
  }
};
