# RocketFlag React SDK

The official React SDK for [RocketFlag](https://rocketflag.app), a feature flag
and A/B testing platform. It wraps RocketFlag's HTTP API in idiomatic React
primitives — a provider, a hook, and a declarative component — so you get
loading/error state and re-renders on resolution without hand-rolling effects.

Built on browser-native `fetch` with **zero runtime dependencies** (React is a
peer dependency).

## Installation

```bash
npm install @rocketflag/react-sdk
```

Requires **React 16.14 or newer**.

## Basic Usage

### 1. Wrap your app in the provider

Add `RocketFlagProvider` once, near the root of your app. It builds a single
shared client (and shared cache) for every flag check below it.

```tsx
import { RocketFlagProvider } from "@rocketflag/react-sdk";

function Root() {
  return (
    <RocketFlagProvider cacheTtlSeconds={300}>
      <App />
    </RocketFlagProvider>
  );
}
```

Provider props (all optional):

| Prop              | Description                                                        |
| ----------------- | ----------------------------------------------------------------- |
| `version`         | API version segment (defaults to `v1`).                           |
| `apiUrl`          | Base API URL (defaults to `https://api.rocketflag.app`).          |
| `cacheTtlSeconds` | Default cache TTL in seconds, shared across all hooks. Omit to disable caching. |
| `cacheMaxEntries` | Most responses the shared cache holds before evicting the least recently used (defaults to 10,000). |
| `client`          | Inject a pre-built client (testing / advanced use).               |

### 2. Read a flag with the `useFlag` hook

```tsx
import { useFlag } from "@rocketflag/react-sdk";

function SignUpButton() {
  const { enabled, loading, error } = useFlag("IFldMzqP5jtv9wAL");

  if (loading) return <Spinner />;
  if (error) return null;
  return enabled ? <NewSignUp /> : <OldSignUp />;
}
```

`useFlag` returns:

| Field     | Type                  | Description                              |
| --------- | --------------------- | ---------------------------------------- |
| `enabled` | `boolean`             | `flag?.enabled ?? false`.                |
| `flag`    | `FlagStatus \| null`  | The full flag, or `null` until resolved. |
| `loading` | `boolean`             | `true` until the first fetch settles.    |
| `error`   | `Error \| null`       | The thrown error, if any.                |
| `refetch` | `() => void`          | Re-run the fetch on demand.              |

### 3. Or render declaratively with `<Flag>`

```tsx
import { Flag } from "@rocketflag/react-sdk";

<Flag id="IFldMzqP5jtv9wAL" fallback={<OldBanner />} loading={<Spinner />}>
  <NewBanner />
</Flag>;
```

`children` render when the flag is enabled; `fallback` when it's disabled or the
fetch errors; `loading` while it's pending. Both `fallback` and `loading`
default to rendering nothing.

## Advanced Usage

### Cohorts and environments

Pass a user context as the second argument. The cache keys on flag ID **and**
context, so different cohorts/environments resolve independently.

```tsx
const { enabled } = useFlag("IFldMzqP5jtv9wAL", { cohort: "beta", env: "staging" });
```

- `cohort`: `string | number | boolean`, a cohort/variant identifier.
- `env`: `string`, the environment of a group flag. Letters, numbers, hyphens
  and underscores.

### Sticky rollouts and audiences

Pass a `targetingKey` to make percentage rollouts sticky, and any other keys as
audience attributes, in the same context object:

```tsx
const { enabled } = useFlag("IFldMzqP5jtv9wAL", {
  targetingKey: user.id,
  plan: "pro",
  country: "AU",
});
```

- **`targetingKey`**: a stable identifier for the user. The same key always
  gets the same answer from a percentage rollout, in every environment of a
  group flag, and raising the percentage only ever adds users. Without a
  `targetingKey` the `cohort` is used, and with neither each request is a fresh
  random roll. The key is part of the request URL, which is visible in the
  browser's network tab, so prefer an opaque id over an email address.
- **Any other key** is an audience attribute, matched against the flag's
  audience exactly and case-sensitively. An attribute you don't send never
  matches. `cohort`, `env` and `targetingKey` are reserved and can't be
  audience attributes.

Every context value must be a `string`, `number` or `boolean`. Leave out an
attribute you don't have rather than passing it as `undefined`. The
`UserContext` type rejects a value that may be `undefined`, such as
`{ plan: user.plan }`. TypeScript can't see through an optional property on an
object you've typed yourself, so that case throws at runtime instead.

```tsx
import { useFlag, type UserContext } from "@rocketflag/react-sdk";

const context: UserContext = { targetingKey: user.id };
if (user.plan) context.plan = user.plan;
const { enabled } = useFlag("IFldMzqP5jtv9wAL", context);
```

### Per-call cache override

Pass cache options as the third argument to override the provider default for a
single call (or `0` to force a fresh fetch):

```tsx
const { flag } = useFlag("IFldMzqP5jtv9wAL", {}, { ttlSeconds: 0 });
```

### Imperative use

Need a client outside of React (e.g. in an event handler or loader)? Build one
directly:

```ts
import { createRocketflagClient } from "@rocketflag/react-sdk";

const client = createRocketflagClient(); // (version?, apiUrl?, { ttlSeconds, maxEntries }?)
const flag = await client.getFlag("IFldMzqP5jtv9wAL");
```

## Error Handling

The underlying client throws the same three error types as the Node SDK:

- `APIError` — the API returned a non-ok response (carries `status` and `statusText`).
- `InvalidResponseError` — the response wasn't valid JSON or didn't match the expected shape.
- `NetworkError` — a network failure, such as a dropped connection.

These surface via the `error` field on `useFlag`. You can narrow them:

```tsx
import { APIError, InvalidResponseError, NetworkError } from "@rocketflag/react-sdk";

const { error } = useFlag("IFldMzqP5jtv9wAL");
if (error instanceof APIError) {
  // error.status, error.statusText
}
```

## Server-Side Rendering (Next.js, Remix)

Flag fetching runs client-side inside `useEffect`, so **no request is made
during SSR** — the server render produces the `loading` state, and the real
value resolves after hydration. This keeps the SDK safe to drop into
server-rendered apps without leaking requests onto the server.

## Caching notes & limitations

- Caching is **opt-in** — without `cacheTtlSeconds` (or a per-call `ttlSeconds`),
  every check hits the API.
- Each distinct context is its own cache entry. The cache holds at most 10,000
  entries (`cacheMaxEntries`) and evicts the least recently used one when full.
- **No in-flight de-duplication:** two components requesting the same uncached
  flag in the same tick may each fire a request before the cache populates.
- The API is one-flag-per-request, so this SDK offers `useFlag(id)` rather than a
  bulk `useFlags()`.

## License

MIT
