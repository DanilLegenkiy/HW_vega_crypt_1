require("@nomicfoundation/hardhat-toolbox");
require('solidity-coverage');
require('dotenv').config();

/** @type import('hardhat/config').HardhatUserConfig */

// Replace this private key with your Goerli account private key
// To export your private key from Metamask, open Metamask and
// go to Account Details > Export Private Key
// Beware: NEVER put real Ether into testing accounts
const { API_URL, PRIVATE_KEY } = process.env;
module.exports = {
  solidity: "0.8.17",
 // defaultNetwork: "goerli",
  networks: {
     hardhat: {},
     goerli: {
        url: API_URL,
        accounts: [`0x${PRIVATE_KEY}`],
        gas: 3000000,
        gasPrice: 40*(10**8),
     }
  },
}