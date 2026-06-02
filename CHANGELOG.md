# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
