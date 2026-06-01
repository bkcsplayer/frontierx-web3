const DEFAULT_GATEWAY = "https://gateway.pinata.cloud";

function normalizeGatewayBase(value?: string) {
  const base = (value || DEFAULT_GATEWAY).trim().replace(/\/$/, "");
  return base.length > 0 ? base : DEFAULT_GATEWAY;
}

/** Resolve ipfs:// URIs to an HTTP gateway URL for browser display. */
export function ipfsToHttpUrl(uri: string, gatewayBase?: string) {
  const gateway = normalizeGatewayBase(
    gatewayBase ?? process.env.NEXT_PUBLIC_PINATA_GATEWAY_URL ?? process.env.NEXT_PUBLIC_IPFS_GATEWAY_URL,
  );

  if (uri.startsWith("ipfs://")) {
    return `${gateway}/ipfs/${uri.slice("ipfs://".length)}`;
  }

  if (uri.startsWith("ipns://")) {
    return `${gateway}/ipns/${uri.slice("ipns://".length)}`;
  }

  return uri;
}
