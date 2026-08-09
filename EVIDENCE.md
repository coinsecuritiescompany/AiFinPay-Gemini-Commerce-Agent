# Hackathon evidence checklist

Do not commit customer personal data, private financial records, API keys, wallet secrets or bearer receipts. Store private submission evidence outside the public repository.

## Product evidence

- [x] Production application URL: `https://aifinpay-gemini-commerce-agent.onrender.com`
- [x] Real production Gemini structured function-call proof: `gemini-3.6-flash`, model request ID `Evh4avzsNJnAqtsPxf6JsA8`, recorded by Render at `2026-08-09T21:58:50Z`
- [ ] `/health` screenshot with Gemini and AiFinPay configured
- [ ] Gemini model/API usage screenshot from Google
- [ ] Render application-log screenshot showing the successful Gemini smoke event
- [ ] Dashboard screenshot after real user activity
- [ ] HTTP 402 challenge screenshot or redacted log
- [ ] Policy approval record from a real objective
- [ ] Receipt ID and verification result without bearer JWT
- [ ] Paid response hash and HTTP status

The Gemini startup smoke test is non-financial: it verifies a real Gemini API call and structured function calling, but it never invokes the payment executor. `GEMINI_STARTUP_SMOKE_TEST` is returned to `false` after verification.

## Google / Google Cloud evidence

- [ ] May 2026 invoice or zero-dollar cost statement, if applicable
- [ ] June 2026 invoice or zero-dollar cost statement, if applicable
- [ ] July 2026 invoice or zero-dollar cost statement, if applicable
- [ ] August 2026 invoice or current cost statement
- [ ] Gemini API usage/observability record corresponding to the production test
- [ ] Google Cloud product evidence required by the hackathon rules
- [ ] Firestore evidence after production credentials are configured
- [ ] Cloud Run revision details only if Cloud Run is used for a later deployment

## Render evidence

- [x] Production service created separately from the existing AiFinPay wallet service
- [x] Production build and deployment reached `live`
- [x] Application bound successfully to Render's runtime port
- [x] Gemini production smoke call completed successfully
- [ ] Capture final Render dashboard deployment screenshot for Devpost

## Circle Agentic Economy Prize

- [ ] Public repository URL
- [ ] Circle agent wallet address
- [ ] Circle transaction ID
- [ ] On-chain transaction hash
- [ ] Clickable explorer URL
- [ ] Same wallet and transaction visible in production logs and demo video

## Business evidence

- [ ] Number of unique external users acquired during the hackathon
- [ ] Number of unique external paying users
- [ ] Gross payment volume
- [ ] AiFinPay 1% revenue
- [ ] Merchant 99% proceeds
- [ ] Related-party revenue reported separately
- [ ] P&L for May, June, July and August
- [ ] Actual Google Cloud, Render and marketing expenses
- [ ] Public testimonial, if the customer consents

Grants, investments, internal transfers and team-member payments are not arms-length customer revenue.

## Demo video

Maximum length: 3 minutes.

1. Show the goal, budget and allowlists.
2. Show the merchant offer and HTTP 402 requirement.
3. Show Gemini's structured decision.
4. Show the deterministic policy verdict.
5. Show the real AiFinPay payment.
6. Show receipt verification and delivered result.
7. Show Circle wallet/transaction proof, if entering that prize.
8. Show Google usage evidence, Render logs and dashboard metrics.

## v0.2 advanced-capability code evidence

Automated code/test evidence now covers multimodal objective construction without raw-image persistence, deterministic negotiation bounds, transient failure classification, and allowlisted recovery failover. This is implementation evidence only. A real multimodal settled purchase, external merchant negotiation, or real cross-network recovery must not be claimed until a production trace plus corresponding merchant/payment evidence exists.
