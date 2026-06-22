# Releasing

This monorepo publishes three packages, each from its own git tag, via **OIDC
trusted publishing** — there are no long-lived npm/PyPI tokens stored anywhere.

| Package | Source | Registry | Tag | Workflow |
| --- | --- | --- | --- | --- |
| `@cyfrin/battlechain-lib` | Solidity at the root + `deployments.json` + `abis/` | npm | `v*` | `publish-npm.yml` |
| `@cyfrin/battlechain-lib-js` | `packages/battlechain-lib-js` (ethers SDK) | npm | `js-v*` | `publish-js.yml` |
| `battlechain-lib-py` | `packages/battlechain-lib-py` | PyPI | `py-v*` | `publish-pypi.yml` |

The **tag prefix** selects which workflow runs; each workflow builds and
publishes only its own package directory. All three tags point at the same
commit, but they publish independently.

## One-time setup (per package, already done for the current packages)

Publishing authenticates via GitHub Actions OIDC, so each package needs a
**Trusted Publisher** configured on its registry — no token secrets.

- **npm** — npmjs.com → the package → Settings → Trusted Publisher → GitHub
  Actions:
  - Organization: `Cyfrin` *(case-sensitive — must match the GitHub URL exactly)*
  - Repository: `battlechain-lib`
  - Workflow filename: `publish-npm.yml` or `publish-js.yml` *(filename only, not the path)*
  - Environment: leave blank
  - Allowed action: `npm publish`
  - Publishing access: "require two-factor authentication and disallow tokens"
    (recommended — OIDC is unaffected by it)
- **PyPI** — the project → trusted publishers → GitHub: repo `Cyfrin/battlechain-lib`,
  workflow `publish-pypi.yml`, environment `production`.

> **New npm packages:** npm cannot configure a Trusted Publisher for a package
> that doesn't exist yet. The *first* publish of a brand-new npm package must be
> done once with a short-lived token or a local `npm publish`; configure the
> Trusted Publisher afterward and all later versions go through OIDC. (PyPI has
> "pending publishers", so this caveat is npm-only.)

## Cutting a release

1. **Bump the version** in the package's manifest and add a `CHANGELOG.md` entry:
   - canonical → root `package.json`
   - js → `packages/battlechain-lib-js/package.json`
   - py → `packages/battlechain-lib-py/pyproject.toml` (then `uv lock`)
2. **If the contracts changed, regenerate** (CI's `codegen-check` enforces this):
   ```bash
   forge build && node scripts/codegen.mjs        # canonical: deployments.json + abis/
   (cd packages/battlechain-lib-js && npm run gen)
   (cd packages/battlechain-lib-py && just gen)
   ```
3. **Open a PR, review, merge to `main`.**
4. **Tag the merged `main` and push** — the matching workflow publishes:
   ```bash
   git checkout main && git pull
   git tag v1.1.0    && git push origin v1.1.0      # @cyfrin/battlechain-lib
   git tag js-v1.1.0 && git push origin js-v1.1.0   # @cyfrin/battlechain-lib-js
   git tag py-v1.1.0 && git push origin py-v1.1.0   # battlechain-lib-py
   ```
   Push **tags** — they are the trigger. GitHub Releases are optional (notes only).
   Watch the runs in the Actions tab.
5. **Bump downstream consumers** after the publish lands: the docs site's
   `@cyfrin/battlechain-lib` dependency, and moccasin's `battlechain-lib-py`.

## Gotchas

- **`repository.url` casing must match the GitHub org exactly** (`Cyfrin`, not
  `cyfrin`). npm provenance verification rejects a mismatch with `E422` *after*
  building and signing — so the run looks like it worked until the final PUT.
- **npm ≥ 11.5.1 is required for OIDC.** Node 22 ships npm 10.x, so the publish
  workflows run `npm install -g npm@latest` first.
- **Dependency cooldown.** `min-release-age=7` (npm) / `exclude-newer = "7 days"`
  (uv) block installing a version published in the last 7 days. To consume a
  just-published first-party package immediately (e.g. regenerating a downstream
  lockfile), bypass it once: `npm install --min-release-age=0`.
- **Versions are independent.** A package may skip a number on a registry (e.g.
  publishing canonical `1.1.0` when `1.0.0` never landed) — that's fine.
