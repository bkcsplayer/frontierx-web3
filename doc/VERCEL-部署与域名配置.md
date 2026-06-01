# FrontierX — Vercel 部署与环境变量（frontierweb3.khtain.com）

本文说明如何把 **前端** 部署到 Vercel、如何填写环境变量，以及如何在 **GoDaddy** 为 `khtain.com` 配置子域名 `frontierweb3.khtain.com`。

> 智能合约仍在链上（Sepolia），不在 Vercel。Vercel 只托管 Next.js 网站与 `/api/ai/*` 接口。

---

## 一、架构说明

| 位置 | 内容 |
|------|------|
| GitHub `bkcsplayer/frontierx-web3` | 源代码 |
| Vercel | 构建并托管 `frontierx-web/` |
| 你的 `.env`（本地，不进 Git） | 密钥与 RPC |
| Sepolia | 已部署的 5 个合约 |

每次 `git push` 到 `main`，Vercel 可自动重新部署（需在 Dashboard 连接 GitHub）。

---

## 二、在 Vercel 创建项目（推荐：连 GitHub）

### 方式 A — 网页（最适合第一次）

1. 打开 [https://vercel.com/new](https://vercel.com/new) ，用 GitHub 登录。
2. **Import** 仓库 `bkcsplayer/frontierx-web3`。
3. **Root Directory** 点 **Edit**，填：`frontierx-web`（非常重要，否则找不到 Next.js）。
4. Framework Preset 应为 **Next.js**。
5. 先不要点 Deploy — 先到 **Environment Variables**（见第三节）填完再部署。
6. Deploy 成功后得到 `xxx.vercel.app` 预览地址。

### 方式 B — 命令行（本机已 `vercel login`）

```powershell
cd F:\codex\web3-2026\frontierx-web
vercel link
# 选 team → Create new project → 名称如 frontierx-web3

cd F:\codex\web3-2026
.\scripts\push-vercel-env.ps1

cd F:\codex\web3-2026\frontierx-web
vercel --prod
```

---

## 三、环境变量怎么填（手把手）

打开 Vercel：**Project → Settings → Environment Variables**。

对 **Production**、**Preview**、**Development** 三个环境，建议 **都勾选**（尤其带 `NEXT_PUBLIC_` 的，构建时就要用到）。

下面表格：**值从你本机 `F:\codex\web3-2026\.env` 复制**（不要发到聊天/不要提交 Git）。

### 3.1 钱包与 Sepolia 合约（前端可见，`NEXT_PUBLIC_`）

| 变量名 | 说明 | 从哪里复制 |
|--------|------|------------|
| `NEXT_PUBLIC_WC_PROJECT_ID` | WalletConnect 项目 ID（Rainbow 连接手机钱包） | `.env` 同名字段；没有则到 [cloud.walletconnect.com](https://cloud.walletconnect.com) 创建 |
| `NEXT_PUBLIC_SEPOLIA_RPC_URL` | 浏览器读链用 RPC | `.env`；可用 `https://ethereum-sepolia-rpc.publicnode.com` |
| `NEXT_PUBLIC_SEPOLIA_FRX_TOKEN_ADDRESS` | FRX 代币 | `.env` 或 `frontierx-contracts/deployments/frontend-env.sepolia.env` |
| `NEXT_PUBLIC_SEPOLIA_FRONTIER_PASS_ADDRESS` | NFT Pass | 同上 |
| `NEXT_PUBLIC_SEPOLIA_FRX_STAKING_ADDRESS` | 质押 | 同上 |
| `NEXT_PUBLIC_SEPOLIA_FRX_LOTTERY_ADDRESS` | 抽奖 | 同上 |
| `NEXT_PUBLIC_SEPOLIA_CRYSTAL_FORGE_ADDRESS` | 锻造 | 同上 |
| `NEXT_PUBLIC_PINATA_GATEWAY_URL` | IPFS 图片网关 | `.env`，例如 `https://gateway.pinata.cloud` |

**当前 Sepolia 合约地址（公开，可与本地文件核对）：**

```
FRX_TOKEN=0xeD710ff884e9a46d2d96555f80225AE801c94C1D
FRONTIER_PASS=0x6fAC02B2c00A49eC6D893455AE65256d7E8836B7
STAKING=0xe5d76b7a5ab7e1ADDf707Fa6aF980345440aBAD2
LOTTERY=0x9976F14605352E09231bBF2DA0Fb61a4FD049F68
CRYSTAL_FORGE=0x4739cE88ab7F557Ee385F5208b2C616510F4CD53
```

### 3.2 服务端密钥（仅 Vercel 服务器，勾选 Sensitive）

| 变量名 | 说明 | 从哪里复制 |
|--------|------|------------|
| `SEPOLIA_RPC_URL` | AI 接口验证链上 burn 时用 | `.env`（建议用 Alchemy/Infura 专用 URL，比公共 RPC 稳） |
| `DEEPSEEK_API_KEY` | Scout / Content 等 AI | `.env` |
| `DEEPSEEK_BASE_URL` | 可选 | `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | 可选 | `.env` 里若有，如 `deepseek-v4-flash` |
| `MINIMAX_API_KEY` | Distill 等 | `.env` |
| `MINIMAX_BASE_URL` | 可选 | `https://api.minimax.io/v1` |
| `MINIMAX_MODEL` | 可选 | `.env` 里若有 |

### 3.3 不必填（本阶段仅 Sepolia）

Polygon / Base 合约地址可留空；用户上线后主要用 **Sepolia** 演示即可。

`PRIVATE_KEY`、`PINATA_*` **不要**放进 Vercel（前端项目不需要部署钱包私钥）。

### 3.4 填完后

1. 点 **Save**。
2. **Deployments → 最新一次 → Redeploy**（勾选 Use existing Build Cache 可取消，确保重新嵌入 `NEXT_PUBLIC_*`）。

### 3.5 一键同步脚本（可选）

本机已 link 项目后：

```powershell
cd F:\codex\web3-2026
.\scripts\push-vercel-env.ps1
cd frontierx-web
vercel --prod
```

---

## 四、自定义域名 frontierweb3.khtain.com

### 4.1 在 Vercel 添加域名

1. Project → **Settings → Domains**。
2. 输入：`frontierweb3.khtain.com` → **Add**。
3. Vercel 会显示需要添加的 DNS 记录（通常是 **CNAME**）。

常见提示：

| 类型 | 名称 (Host) | 值 (Points to) |
|------|-------------|----------------|
| CNAME | `frontierweb3` | `cname.vercel-dns.com` |

（以 Vercel 页面**当前显示**为准，不要照抄旧文档里的 `frontierx`。）

### 4.2 在 GoDaddy 配置 DNS

1. 登录 [GoDaddy](https://www.godaddy.com) → **My Products** → 域名 **khtain.com** → **DNS** / **Manage DNS**。
2. 在 **DNS Records** 里点 **Add**：
   - **Type**: `CNAME`
   - **Name**: `frontierweb3`（只填子域名前缀，不要写完整域名）
   - **Value**: `cname.vercel-dns.com`（或 Vercel 给你的那一串）
   - **TTL**: 默认 1 Hour 即可
3. **Save**。
4. 若已有同名的 A/CNAME 记录冲突，先删除或改掉旧记录。

### 4.3 等待生效

- DNS 传播通常 **几分钟到几小时**（最长 24–48 小时）。
- 回到 Vercel Domains 页，状态变为 **Valid Configuration**。
- Vercel 会自动申请 **HTTPS** 证书；浏览器访问 `https://frontierweb3.khtain.com`。

### 4.4 验证

- 打开 `https://frontierweb3.khtain.com`
- 连接 MetaMask → 选 **Sepolia**
- 访问 `/api/ai/status` 应返回 `burnConsumptionReady: true`（需已配置 `SEPOLIA_RPC_URL`）

---

## 五、正式上线检查清单

- [ ] Root Directory = `frontierx-web`
- [ ] 所有 `NEXT_PUBLIC_SEPOLIA_*` 已配置并 **Redeploy**
- [ ] `SEPOLIA_RPC_URL`、`DEEPSEEK_API_KEY` 已配置（Sensitive）
- [ ] `NEXT_PUBLIC_WC_PROJECT_ID` 已配置（真机钱包连接）
- [ ] 域名 `frontierweb3.khtain.com` 在 Vercel 为 Valid
- [ ] GoDaddy CNAME 正确
- [ ] 生产站连接 Sepolia 可 Claim / Arena / AI Hub

---

## 六、之后改代码会怎样？

- 推送到 GitHub `main` → Vercel **自动**重新 build & 发布。
- 只改环境变量 → 在 Vercel 改完后点 **Redeploy**。
- 本地 Docker `localhost:9830` **不受影响**，可继续开发。

---

## 七、故障排查

| 现象 | 处理 |
|------|------|
| 构建失败 | Vercel 构建日志；本地 `cd frontierx-web && npm run build` |
| 合约地址全是 0 | 缺 `NEXT_PUBLIC_SEPOLIA_*` 或未 Redeploy |
| AI 报错 | 检查 `DEEPSEEK_API_KEY`、`SEPOLIA_RPC_URL` |
| 域名无效 | GoDaddy CNAME 与 Vercel 提示一致；等待 DNS |
| 手机钱包连不上 | 配置 `NEXT_PUBLIC_WC_PROJECT_ID` |
