# Security Policy

## Supported version

Security fixes are applied to the latest commit on `main`. Earlier commits and private forks are not supported.

## Private reporting

Do not open a public issue for an exploitable payment, authentication, authorization, privacy, receipt, or secret-handling vulnerability. Use the private contact route at [aifinpay.io](https://aifinpay.io) and include:

- affected commit and component;
- sanitized reproduction steps;
- expected and observed result;
- potential financial, privacy, or availability impact;
- whether exploitation has been observed;
- a safe way to contact the reporter.

Do not include live private keys, seeds, entity secrets, admin tokens, customer records, or full receipt JWTs. Use redacted values and test wallets.

AiFinPay will aim to acknowledge a complete report within three business days, validate severity, coordinate remediation, and agree on disclosure timing. This target is not a service-level agreement.

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
- Firestore claims each objective transactionally before model or payment execution.
- Failed payments record zero gross volume and zero revenue.
- Security headers disable framing and MIME sniffing and restrict dashboard content sources.

## Good-faith research

The license permits good-faith security research that avoids privacy violations, service disruption, third-party data access, financial loss, and premature public disclosure. Testing production infrastructure without written authorization is outside scope.

## Incident handling

For suspected credential or financial compromise:

1. stop the affected deployment or disable the financial integration;
2. revoke and rotate the exposed credential;
3. preserve redacted Cloud Logging and Firestore evidence;
4. identify the last known safe objective and transaction;
5. avoid blind retries where settlement outcome is ambiguous;
6. document the root cause and add a regression test before restoration.
