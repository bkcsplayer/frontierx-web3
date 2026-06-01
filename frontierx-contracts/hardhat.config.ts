import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });
dotenv.config();

const accounts = process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [];
const networkArgIndex = process.argv.indexOf("--network");
const networkEqualsArg = process.argv.find((arg) => arg.startsWith("--network="));
const requestedNetwork =
  networkEqualsArg?.split("=")[1] || (networkArgIndex >= 0 ? process.argv[networkArgIndex + 1] : "");
const isMainnet = requestedNetwork === "polygon" || requestedNetwork === "base";
const mainnetAccounts = isMainnet && process.env.ALLOW_MAINNET_DEPLOY !== "true" ? [] : accounts;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: process.env.LOCAL_RPC_URL || "http://127.0.0.1:9831",
      chainId: 31337,
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts,
    },
    polygon: {
      url: process.env.POLYGON_RPC_URL || "",
      accounts: mainnetAccounts,
    },
    base: {
      url: process.env.BASE_RPC_URL || "",
      accounts: mainnetAccounts,
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || "",
      polygon: process.env.POLYGONSCAN_API_KEY || "",
      base: process.env.BASESCAN_API_KEY || "",
    },
  },
};

export default config;
