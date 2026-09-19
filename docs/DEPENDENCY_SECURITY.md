# Dependency security review

Reviewed 19 September 2026 against the checked-in npm lockfile. `npm audit --omit=dev` includes Expo's build/dev-server dependencies because Expo itself is a production dependency; its count is not a count of reachable iPhone vulnerabilities.

The initial root production-dependency audit reported 32 package findings (1 critical, 17 high, 13 moderate, 1 low). A non-forced `npm audit fix` refreshed compatible locked transitives, including navigation's Nano ID and development-tool Shell Quote/WebSocket/Undici packages. Same-major overrides select PostCSS 8.5.28 and brace-expansion 1.1.18; Expo SDK and React Native were not upgraded across major versions.

## Reachable URI parser backport

Expo Router uses query-string 6, whose CommonJS decoder dependency is `decode-uri-component` 0.2.2. Malformed external URL text could reach its exponential fallback. The [maintainer advisory](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr) identifies 0.5.0 as patched. That version is ESM-only, so directly overriding it would break query-string's callable `require()` interface.

`patches/decode-uri-component+0.2.2.patch` backports the 0.5.0 decoding algorithm from [upstream commit a12fabaa28303cc8b5b07e93d128f4fc09fc31e5](https://github.com/SamVerschueren/decode-uri-component/tree/a12fabaa28303cc8b5b07e93d128f4fc09fc31e5). The only compatibility adaptations are a CommonJS export and preserving 0.2.x plus-to-space behavior. Original upstream source SHA-256: `9401353df38f8010ad7035fe8d666bce6a4902bc1cff809afc4ab23fa2e0bdaa`. The MIT notice is retained in the package and [licenses/decode-uri-component-MIT.txt](licenses/decode-uri-component-MIT.txt), with an in-app notice asset.

`npm ci` applies the committed patch through `postinstall: patch-package`. Do not build with installation scripts disabled; if your build environment does so, explicitly run `npm run postinstall` before tests/bundling. `tests/domain/dependency-security.test.ts` tests the actual installed decoder and query-string, including a child-process timeout for a long malformed input, valid UTF-8, legacy plus handling and invalid-byte behavior. A framework upgrade that replaces this dependency must deliberately retire the patch and rerun those cases.

## Remaining scanner findings

After remediation, `npm audit --omit=dev` reports 20 package findings: 8 high, 12 moderate, no critical. The leaf causes are:

- **decode-uri-component:** still version-reported by npm, which cannot inspect a patch-package backport. The installed algorithm is patched and regression-tested; the version alert is not silently suppressed.
- **image-size 1.2.1:** malformed ICNS/JXL/HEIF parsers in Metro's build-time image processing. Narnigrams uses local PNG assets, not user-supplied images, and no runtime asset upload/import endpoint was found. Avoid processing untrusted files with this toolchain. The published fix requires a major image-size/Metro compatibility change; track a supported Expo upgrade rather than forcing a incompatible replacement.
- **uuid under xcode:** build/configuration tooling; the advisory concerns explicitly supplied buffers for v3/v5/v6. No app runtime call to these APIs or user-controlled buffer use was found. Track a supported xcode/Expo dependency update.

Other flagged Expo/Metro/query-string packages are parent dependents of those leaves, not separate demonstrated app exploits. The all-dependencies scan also reports Firebase CLI transitive advisories; the CLI is not part of the installed app. The Functions package has its own lockfile/audit and must be evaluated separately; its remaining gaxios/uuid moderate findings were reported by the backend audit.

Do not use `npm audit fix --force` as a release step: npm suggested an Expo SDK major upgrade or Router/Firebase CLI downgrades that are not justified by compatibility verification. Re-run audits at release time, record the exact lockfiles and assess new advisories. This review does not certify that unlisted packages or platform code are vulnerability-free.
