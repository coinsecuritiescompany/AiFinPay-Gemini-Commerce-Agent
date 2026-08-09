import { OfferSchema, type Offer } from "../domain.js";
import type { AppConfig } from "../config.js";

export class MerchantDiscoveryService {
  constructor(private readonly config: AppConfig["merchantApi"]) {}

  configured(): boolean {
    return this.config.endpoints.length > 0;
  }

  async search(query: string): Promise<Offer[]> {
    const results = await Promise.allSettled(
      this.config.endpoints.map(async (endpoint) => {
        const response = await fetch(new URL("/search", endpoint), {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({ query }),
          signal: AbortSignal.timeout(this.config.timeoutMs)
        });
        if (!response.ok) throw new Error(`MERCHANT_API_${response.status}`);
        const payload = await response.json() as { offers?: unknown[] };
        return (payload.offers ?? []).map((offer) => OfferSchema.parse(offer));
      })
    );

    const merged = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
    const unique = new Map<string, Offer>();
    for (const offer of merged) unique.set(`${offer.merchantId}:${offer.offerId}`, offer);
    return [...unique.values()].slice(0, 50);
  }
}
