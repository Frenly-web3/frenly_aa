import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {

  solidity: {
    compilers: [{
      version: '0.8.17',
      settings: {
        optimizer: { enabled: true, runs: 1000000 }
      }
    }],
  },
};

export default config;
