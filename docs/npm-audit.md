# npm Audit Notes

Last reviewed: 2026-08-08

## Fixed Advisory

| Package | Previous version | Resolved version | Severity | Advisory | Dependency chain | Resolution |
| --- | --- | --- | --- | --- | --- | --- |
| `nanoid` | `3.3.16` | `3.3.18` | High | GHSA-2v37-7h3g-55p8; no CVE was listed by `npm audit` | `@angular/build -> postcss -> nanoid` | Added a narrow npm override for `nanoid@3.3.18`, which stays within `postcss`'s `^3.3.16` dependency range. |

## Remaining Advisory

| Package | Current version | Safe version | Severity | Advisory | Dependency chain | Production impact |
| --- | --- | --- | --- | --- | --- | --- |
| `@hono/node-server` | `1.19.17` | `>=2.0.5` (`2.1.0` latest at review time) | Moderate | GHSA-frvp-7c67-39w9; no CVE was listed by `npm audit` | `@angular/cli -> @modelcontextprotocol/sdk -> @hono/node-server` | No. This is Angular CLI development tooling, not a production browser dependency. |

## Decision

No dependency change was applied.

`npm audit` only offers `npm audit fix --force`, which would install `@angular/cli@21.0.4`.
That is a breaking Angular CLI downgrade from the current Angular 22 toolchain and is not safe for this
production-readiness pass.

Do not add a package override for `@hono/node-server@2.x` unless Angular CLI or
`@modelcontextprotocol/sdk` publishes compatibility guidance. The affected package is transitive CLI tooling,
and forcing a major transitive version could break Angular CLI commands.
