import {
  NegotiationResponseSchema,
  type ObjectiveRecord,
  type Offer
} from "../domain.js";

export interface NegotiationResult {
  accepted: boolean;
  offer?: Offer;
  reason?: string;
}

function sameOrigin(a: string, b: string): boolean {
  return new URL(a).origin === new URL(b).origin;
}

export class NegotiationService {
  configured(offer: Offer): boolean {
    return Boolean(offer.negotiationUrl);
  }

  async negotiate(offer: Offer, counterOfferUsd: number, objective: ObjectiveRecord): Promise<NegotiationResult> {
    if (!offer.negotiationUrl) throw new Error("NEGOTIATION_ENDPOINT_NOT_CONFIGURED");

    const response = await fetch(offer.negotiationUrl, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        merchantId: offer.merchantId,
        offerId: offer.offerId,
        listPriceUsd: offer.priceUsd,
        counterOfferUsd,
        network: offer.network,
        asset: offer.asset,
        objectiveId: objective.id
      }),
      signal: AbortSignal.timeout(8_000)
    });
    if (!response.ok) throw new Error(`NEGOTIATION_HTTP_${response.status}`);

    const parsed = NegotiationResponseSchema.parse(await response.json());
    if (!parsed.accepted) return { accepted: false, reason: parsed.reason ?? "Merchant declined counter-offer." };

    const priceUsd = parsed.priceUsd ?? counterOfferUsd;
    if (priceUsd > offer.priceUsd) throw new Error("NEGOTIATION_PRICE_INCREASE_REJECTED");
    if (parsed.paymentUrl && !sameOrigin(parsed.paymentUrl, offer.url)) {
      throw new Error("NEGOTIATION_PAYMENT_ORIGIN_MISMATCH");
    }

    return {
      accepted: true,
      offer: {
        ...offer,
        priceUsd,
        ...(parsed.paymentUrl ? { url: parsed.paymentUrl } : {}),
        ...(parsed.token ? { negotiationToken: parsed.token } : {})
      },
      reason: parsed.reason
    };
  }
}
