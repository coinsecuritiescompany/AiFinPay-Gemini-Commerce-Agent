# Security

## Secrets

Never commit or paste into issues:

- `AIFINPAY_AGENT_SEED_HEX`
- Circle API keys or entity secret
- Google service-account JSON
- admin tokens
- receipt bearer JWTs
- customer financial evidence

Production secrets belong in Google Secret Manager and must be granted only to the Cloud Run service account.

## Financial safeguards

- Gemini cannot access signers.
- AiFinPay SDK daily and per-call budgets are mandatory.
- The policy engine independently validates the model decision.
- Circle requires admin authentication, explicit confirmation and a transfer cap.
- Completed objectives cannot be run twice.
- AIFP-1 receipt tokens are not logged or returned by the API.

## Reporting

Do not open a public issue for an exploitable payment or secret-handling vulnerability. Contact the AiFinPay security owner privately and include the affected commit, reproduction steps and potential financial impact.
