export function shortenAddress(address?: string, chars = 4) {
  if (!address) return "";
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function formatNumber(value: number | bigint, maximumFractionDigits = 2) {
  if (typeof value === "bigint") {
    const absValue = value < BigInt(0) ? -value : value;

    if (absValue > BigInt(Number.MAX_SAFE_INTEGER)) {
      return value.toString();
    }
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
  }).format(Number(value));
}
