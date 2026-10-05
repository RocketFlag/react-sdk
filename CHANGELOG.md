# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-10-05

### Added
- `UserContext` now declares `targetingKey` and accepts any other key as an audience attribute, so TypeScript callers no longer need a cast to use sticky percentage rollouts or audiences. Values must be `string`, `number` or `boolean`. A value that may be `undefined`, such as `{ plan: user.plan }`, is now a compile error, so leave out a key you don't have.
- `ContextValue` type export.
- `cacheMaxEntries` provider prop and `maxEntries` client cache option. The cache now holds at most 10,000 entries by default and evicts the least recently used entry when full.
- README section on sticky rollouts and audiences.

### Fixed
- `env` values containing hyphens or underscores (for example `prod-portals`, `staging_v2`) were rejected before the request was made, although RocketFlag allows them in environment names.
- The invalid `env` error message now shows the rejected value instead of the word `env`.

### Changed
- `UserContext` is now a type with a string index signature, so a context typed with your own `interface` no longer type-checks (TypeScript only gives `type` aliases an implicit index signature). Declare it with `type` instead, or spread it: `getFlag(id, { ...context })`.
- `CallOptions` is now its own interface with `ttlSeconds` only, rather than an alias of `CacheOptions`.

## [1.0.0] - 2026-06-03

### Added
- Initial release of the RocketFlag React SDK.
- `RocketFlagProvider` to configure a shared client (and shared cache) once at
  the app root, with `version`, `apiUrl`, `cacheTtlSeconds`, and `client` props.
- `useFlag(flagId, context?, options?)` hook returning `{ flag, enabled,
  loading, error, refetch }`.
- `<Flag>` component for declarative conditional rendering with `fallback` and
  `loading` slots.
- `createRocketflagClient` exported as an imperative escape hatch.
- Browser-native `fetch` client with opt-in in-memory response caching, cohort/
  `env` user context, and `APIError` / `InvalidResponseError` / `NetworkError`
  error types.
- Built as dual ESM + CJS with TypeScript declarations; React is a peer
  dependency (`>=16.14.0`).
