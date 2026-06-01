# FrontierX Docker Windows Development

This project supports Docker Desktop on Windows.

Use Docker for local development when you want one command to start the frontend and local blockchain.

## Port Rules

All host-exposed Docker ports must use the `983x` series.

| Host Port | Container Port | Service | Purpose |
| --- | --- | --- | --- |
| `9830` | `3000` | `web` | Next.js dev server |
| `9831` | `8545` | `hardhat` | Local Hardhat JSON-RPC |
| `9832` | reserved | future | Design preview / docs preview |
| `9833` | reserved | future | Indexer / event worker |
| `9834` | reserved | future | Local API helper |
| `9835-9839` | reserved | future | Additional local services |

Do not expose Docker services on `3000`, `8545`, `5432`, `6379`, or other common host ports. Keep host ports in the `983x` range to avoid conflicts.

## Windows Notes

- Use Docker Desktop with the WSL2 backend.
- MetaMask runs in the Windows browser, not inside Docker.
- Add a MetaMask custom network pointing to `http://127.0.0.1:9831`.
- The chain ID comes from the running Hardhat node.
- The frontend runs at `http://localhost:9830`.

## Commands

From the repository root:

```bash
docker compose up --build
```

Then open:

- Web app: `http://localhost:9830`
- Hardhat RPC: `http://127.0.0.1:9831`

To stop:

```bash
docker compose down
```

To reset container dependencies:

```bash
docker compose down -v
```

## Environment File

Docker Compose reads the root `.env` file.

Fill these before advanced flows:

- `PRIVATE_KEY` - deployer wallet private key. Use a new burner wallet only.
- `TREASURY_WALLET` - public wallet address for treasury funds.
- `NEXT_PUBLIC_WC_PROJECT_ID` - WalletConnect Cloud project ID.
- `SEPOLIA_RPC_URL` - Sepolia RPC provider URL.
- `DEEPSEEK_API_KEY` / `MINIMAX_API_KEY` - AI provider keys.
- `PINATA_API_KEY` / `PINATA_SECRET_KEY` / `PINATA_JWT` - IPFS upload keys.

Never put a real funded main wallet private key in `.env`.

## Development Model

The containers use bind mounts:

- Local files remain editable in Cursor.
- Container `node_modules` stay in Docker volumes.
- Next.js hot reload should work, though Windows drive mounts can be slower than WSL filesystem mounts.

If hot reload is slow, move the repo into the WSL filesystem and open it from Cursor through WSL.

## Mainnet Safety

Docker development sets `ALLOW_MAINNET_DEPLOY=false`.

Polygon and Base mainnet deployments require explicit environment configuration and must not be run accidentally from the local Docker stack.
