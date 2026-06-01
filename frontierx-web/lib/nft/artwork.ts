export const rarityArtFiles = ["common", "rare", "epic", "legendary"] as const;

export type RarityArtFile = (typeof rarityArtFiles)[number];

export function rarityArtPath(rarityIndex: number, revealed: boolean) {
  if (!revealed || rarityIndex < 0 || rarityIndex >= rarityArtFiles.length) {
    return "/nft-art/placeholder.svg";
  }

  return `/nft-art/${rarityArtFiles[rarityIndex]}.svg`;
}

export function isPlaceholderArtUrl(url: string) {
  return /placeholder\.svg/i.test(url);
}
