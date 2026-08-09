# Contributing

AiFinPay Gemini Commerce Agent is source-available. Contributions are reviewed for security, financial correctness, maintainability, and fit with the project roadmap.

## Before opening a change

- Use a GitHub issue for a new feature or behavioral change.
- Report exploitable payment, authentication, privacy, or secret-handling issues privately under [SECURITY.md](SECURITY.md).
- Do not include credentials, wallet seeds, receipt tokens, customer data, or proprietary third-party code.
- Keep payment decisions deterministic after the model boundary.

## Development workflow

```bash
npm ci
npm run check
npm run build
```

Changes should include tests for observable behavior. Financial-path changes need positive, rejection, boundary, authentication, and idempotency coverage.

## Pull-request standard

A pull request should explain:

- the problem and intended behavior;
- security and financial impact;
- files and interfaces changed;
- tests executed and their result;
- migration, configuration, evidence, or rollback implications.

Keep changes focused. Generated files, unrelated formatting, and dependency updates should not be mixed with functional changes.

## Contribution rights

Only submit work you have the legal right to contribute. By intentionally submitting a contribution, you agree to the contribution grant in Section 7 of [LICENSE](LICENSE). AiFinPay may require a separate contributor or intellectual-property assignment agreement before accepting substantial work.

## Code principles

1. Models propose; deterministic code authorizes financial actions.
2. Private keys and signing secrets never enter prompts, logs, responses, or tests.
3. Every external input is untrusted and schema-validated.
4. Ambiguous payment outcomes are not blindly retried.
5. Evidence is useful only when it is traceable and contains no secret material.
6. Revenue claims must come from successful verifiable transactions.
