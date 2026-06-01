import { ipfsToHttpUrl } from "@/lib/utils/ipfs";

export type NftMetadata = {
  name?: string;
  description?: string;
  image?: string;
  external_url?: string;
};

export async function fetchNftMetadata(tokenUri: string, signal?: AbortSignal): Promise<NftMetadata> {
  const response = await fetch(ipfsToHttpUrl(tokenUri), { signal });
  if (!response.ok) {
    throw new Error(`Metadata request failed (${response.status})`);
  }

  return (await response.json()) as NftMetadata;
}
