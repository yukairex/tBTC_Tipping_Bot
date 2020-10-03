// fetch data from gas now for mainnet gas price

const axios = require('axios');

const gasNowURL =
  'https://www.gasnow.org/api/v3/gas/price?utm_source=:Keep_Tipping_Bot';

module.exports = async () => {
  try {
    const response = await axios.get(gasNowURL);
    return response.data.data.rapid;
  } catch (error) {
    console.error(error);
  }
};
