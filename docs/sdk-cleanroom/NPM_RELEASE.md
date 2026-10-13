# Public publisher SDK release

`@axp001/publisher-sdk@0.2.1` is published on
[npm](https://www.npmjs.com/package/@axp001/publisher-sdk).
The SDK alone is MIT licensed; this does not relicense AXP's backend or data.

```sh
npm install @axp001/publisher-sdk@0.2.1
```

Release verification passed all 47 SDK tests, including packed offline consumers,
browser/receipt binding and the optional React adapter. A fresh credential-free
public-registry install succeeded without React. Root, browser, receipt and
financial exports loaded successfully. All 14 installed files byte-matched the
release source, and the registry tarball's SHA-512 integrity was independently
verified. Tarball size: 13,719 bytes; SHA-1:
`967bd0efeb7597818d331d4d28b63335d354791e`.

The prepublish gate runs generated React parity and SDK tests with provider
credentials removed. It does not call paid models or payment transports.

The public package was also used in the
[isolated account-owned Devnet acceptance](../accounts/DEVNET_ACCEPTANCE.md).
Account-issued keys require `https://axp.one/api/accounts/sdk` explicitly and
remain server-only. Installing this package does not enable native payments.
