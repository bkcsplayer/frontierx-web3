# Arena 玩法说明（Lottery + Crystal Forge）

进入 **Arena** 前请确认：

- MetaMask 与网站网络均为 **Sepolia**
- 钱包里已有足够 **FRX**（可先 `/stake` 领取质押奖励）
- 已质押 Frontier Pass（NFT 门控）

---

## 每日抽奖 Daily Lottery（2 步）

| 步骤 | 操作 | 说明 |
|------|------|------|
| **1** | **Approve FRX** | 在 MetaMask 确认授权。仅授权不会进奖池。 |
| **2** | **Enter lottery** | 默认 10 FRX，确认交易。成功后 **Current Pool**、**Entries** 会增加。 |

**提示：** 至少 10 FRX；24 小时后可 **Draw winner**（需有参与者）。

---

## 水晶锻造 Crystal Forge（4 步）

| 步骤 | 操作 | 说明 |
|------|------|------|
| **1** | **Approve FRX** | 授权 5 FRX（单次锻造）。 |
| **2** | **Forge crystal** | 支付 5 FRX，生成 pending 请求。 |
| **3** | **等待 1 个区块** | Sepolia 出块后 **Settle** 按钮才可点（通常 &lt; 1 分钟）。 |
| **4** | **Settle forge** | 结算结果：SHATTER / GLOW / BLAZE / SUPERNOVA。 |

**提示：** 完整一轮 = 1→2→3→4。玩下一轮通常需再次 **Approve**。

---

## 常见误解

- 只点了 Approve，以为已经参与 → **还要 Enter / Forge**
- Forge 后没点 Settle → **链上不算完成一局**
- 链选 Local、钱包选 Sepolia → **数据会显示 0**

页面内已显示分步指引；生产环境：https://frontierweb3.khtain.com/arena
