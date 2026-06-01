# FrontierX Protocol Documentation

This folder contains the detailed build plan for FrontierX Protocol.

For any AI agent or developer, start from the repository root:

1. `../AGENTS.md` - operating rules and safety constraints.
2. `../DESIGN.md` - canonical UI design system.
3. `06-STEP-BY-STEP-EXECUTION.md` - implementation order and checkpoints.
4. `00-MASTER-PLAN.md` - architecture and product overview.
5. The domain-specific document for the current step.

## Document Map

| Doc | File | Purpose |
| --- | --- | --- |
| 00 | `00-MASTER-PLAN.md` | Project identity, architecture, token economics, page map |
| 01 | `01-SMART-CONTRACTS.md` | Solidity contracts, deployment order, tests |
| 02 | `02-NFT-ART-METADATA.md` | NFT art generation, metadata schema, IPFS workflow |
| 03 | `03-FRONTEND-DESIGN.md` | Frontend structure, page behavior, wallet UX, i18n |
| 04 | `04-BACKEND-API.md` | AI API routes, burn verification, provider fallback |
| 05 | `05-DEPLOYMENT.md` | Vercel, chains, IPFS, final QA |
| 06 | `06-STEP-BY-STEP-EXECUTION.md` | Step-by-step execution playbook |
| 07 | `07-DOCKER-WINDOWS.md` | Docker Desktop on Windows port rules and local workflow |

## Naming Note

`00-MASTER-PLAN.md` is the product and architecture overview, not the design source of truth.

The design source of truth is now the root `DESIGN.md`.
