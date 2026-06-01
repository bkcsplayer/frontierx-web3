import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { chainConfig, supportedChains } from "@/lib/utils/chains";

const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WC_PROJECT_ID || "frontierx-local-dev";

const localRpcUrl =
  process.env.NEXT_PUBLIC_LOCAL_RPC_URL || "http://127.0.0.1:9831";

export const wagmiConfig = getDefaultConfig({
  appName: "FrontierX Protocol",
  projectId: walletConnectProjectId,
  chains: supportedChains,
  transports: {
    [supportedChains[0].id]: http(localRpcUrl),
    [supportedChains[1].id]: http(chainConfig[supportedChains[1].id].rpcUrl),
    [supportedChains[2].id]: http(chainConfig[supportedChains[2].id].rpcUrl),
    [supportedChains[3].id]: http(chainConfig[supportedChains[3].id].rpcUrl),
  },
  ssr: true,
});
