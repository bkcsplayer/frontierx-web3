export const frxTokenAbi = [
  {
    type: "event",
    name: "TokensMinted",
    inputs: [
      { type: "address", name: "to", indexed: true },
      { type: "uint256", name: "amount", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "TokensBurned",
    inputs: [
      { type: "address", name: "from", indexed: true },
      { type: "uint256", name: "amount", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "TreasuryDeposit",
    inputs: [
      { type: "address", name: "from", indexed: true },
      { type: "uint256", name: "amount", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ type: "address", name: "account" }],
    outputs: [{ type: "uint256", name: "" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { type: "address", name: "owner" },
      { type: "address", name: "spender" },
    ],
    outputs: [{ type: "uint256", name: "" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { type: "address", name: "spender" },
      { type: "uint256", name: "amount" },
    ],
    outputs: [{ type: "bool", name: "" }],
  },
  {
    type: "function",
    name: "burn",
    stateMutability: "nonpayable",
    inputs: [{ type: "uint256", name: "amount" }],
    outputs: [],
  },
  {
    type: "function",
    name: "totalMinted",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256", name: "" }],
  },
  {
    type: "function",
    name: "totalBurned",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256", name: "" }],
  },
  {
    type: "function",
    name: "treasuryBalance",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256", name: "" }],
  },
  {
    type: "function",
    name: "circulatingSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256", name: "" }],
  },
] as const;
