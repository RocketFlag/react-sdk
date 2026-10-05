import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRocketflagClient } from "../core/client";
import { APIError, InvalidResponseError, NetworkError } from "../core/errors";
import type { UserContext } from "../core/types";

const FLAG = { name: "New Sign-ups", enabled: true, id: "IFldMzqP5jtv9wAL" };

const okResponse = (body: unknown): Response =>
  ({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => body,
  }) as Response;

describe("createRocketflagClient", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("resolves the flag on a successful response", async () => {
    fetchMock.mockResolvedValueOnce(okResponse(FLAG));
    const client = createRocketflagClient();

    const flag = await client.getFlag("IFldMzqP5jtv9wAL");

    expect(flag).toEqual(FLAG);
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe("https://api.rocketflag.app/v1/flags/IFldMzqP5jtv9wAL");
  });

  it("appends user context as query params", async () => {
    fetchMock.mockResolvedValueOnce(okResponse(FLAG));
    const client = createRocketflagClient();

    await client.getFlag("IFldMzqP5jtv9wAL", { cohort: "beta", env: "staging" });

    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get("cohort")).toBe("beta");
    expect(url.searchParams.get("env")).toBe("staging");
  });

  it("throws APIError on a non-ok response", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404, statusText: "Not Found" } as Response);
    const client = createRocketflagClient();

    await expect(client.getFlag("missing")).rejects.toBeInstanceOf(APIError);
    await expect(client.getFlag("missing")).rejects.toMatchObject({ status: 404 });
  });

  it("throws NetworkError when fetch rejects", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    const client = createRocketflagClient();

    await expect(client.getFlag("IFldMzqP5jtv9wAL")).rejects.toBeInstanceOf(NetworkError);
  });

  it("throws InvalidResponseError on unparseable JSON", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => {
        throw new Error("bad json");
      },
    } as unknown as Response);
    const client = createRocketflagClient();

    await expect(client.getFlag("IFldMzqP5jtv9wAL")).rejects.toBeInstanceOf(InvalidResponseError);
  });

  it("throws InvalidResponseError when the payload fails validation", async () => {
    fetchMock.mockResolvedValueOnce(okResponse({ enabled: true }));
    const client = createRocketflagClient();

    await expect(client.getFlag("IFldMzqP5jtv9wAL")).rejects.toBeInstanceOf(InvalidResponseError);
  });

  it.each(["prod-portals", "staging_v2", "production1"])("accepts the env name %s", async (env) => {
    fetchMock.mockResolvedValueOnce(okResponse(FLAG));
    const client = createRocketflagClient();

    await client.getFlag("IFldMzqP5jtv9wAL", { env });

    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get("env")).toBe(env);
  });

  it.each(["stag ing", "stag.ing", "staging!"])("rejects the env name %s without calling fetch", async (env) => {
    const client = createRocketflagClient();

    await expect(client.getFlag("IFldMzqP5jtv9wAL", { env })).rejects.toThrow(
      `env values may only contain letters, numbers, hyphens and underscores. Invalid value for env: ${env}`,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  describe("targeting key and audience attributes", () => {
    it("sends the targeting key and every attribute as query params", async () => {
      fetchMock.mockResolvedValueOnce(okResponse(FLAG));
      const client = createRocketflagClient();

      await client.getFlag("IFldMzqP5jtv9wAL", { targetingKey: "user-42", plan: "pro", country: "AU", seats: 5, beta: true });

      const url = new URL(fetchMock.mock.calls[0][0]);
      expect(Object.fromEntries(url.searchParams)).toEqual({
        targetingKey: "user-42",
        plan: "pro",
        country: "AU",
        seats: "5",
        beta: "true",
      });
    });

    it("accepts a context built as a variable", async () => {
      fetchMock.mockResolvedValueOnce(okResponse(FLAG));
      const client = createRocketflagClient();
      const context = { plan: "pro", country: "AU" };

      await expect(client.getFlag("IFldMzqP5jtv9wAL", context)).resolves.toEqual(FLAG);
    });

    it("rejects values the API cannot take at compile time", () => {
      const user: { id: string; plan?: string } = { id: "user-42" };
      const contexts: UserContext[] = [
        // @ts-expect-error an attribute that may be undefined must be left out instead
        { plan: user.plan },
        // @ts-expect-error env is a string
        { env: 5 },
        // @ts-expect-error targetingKey is a string or number
        { targetingKey: true },
        // @ts-expect-error context values are flat
        { plan: { tier: "pro" } },
      ];
      expect(contexts).toHaveLength(4);
    });

    it("accepts contexts declared with a type alias, and interfaces once spread", () => {
      type AliasContext = { cohort: string; plan: string };
      interface InterfaceContext {
        cohort: string;
        plan: string;
      }
      const alias: AliasContext = { cohort: "beta", plan: "pro" };
      const iface: InterfaceContext = { cohort: "beta", plan: "pro" };
      const fromAlias: UserContext = alias;
      const fromSpread: UserContext = { ...iface };
      // @ts-expect-error interfaces have no implicit index signature
      const fromInterface: UserContext = iface;
      expect([fromAlias, fromSpread, fromInterface]).toHaveLength(3);
    });

    it("throws for an undefined value passed from JavaScript", async () => {
      const client = createRocketflagClient();

      await expect(client.getFlag("IFldMzqP5jtv9wAL", { plan: undefined } as unknown as UserContext)).rejects.toThrow(
        "userContext values must be of type string, number, or boolean. Invalid value for key: plan",
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  it("requires a flagId", async () => {
    const client = createRocketflagClient();
    await expect(client.getFlag("")).rejects.toThrow(/flagId is required/);
  });

  describe("caching", () => {
    it("serves a cache hit within the TTL without a second fetch", async () => {
      fetchMock.mockResolvedValueOnce(okResponse(FLAG));
      const client = createRocketflagClient(undefined, undefined, { ttlSeconds: 300 });

      const first = await client.getFlag("IFldMzqP5jtv9wAL");
      const second = await client.getFlag("IFldMzqP5jtv9wAL");

      expect(first).toEqual(FLAG);
      expect(second).toEqual(FLAG);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("re-fetches after the TTL expires", async () => {
      vi.useFakeTimers();
      fetchMock.mockResolvedValue(okResponse(FLAG));
      const client = createRocketflagClient(undefined, undefined, { ttlSeconds: 1 });

      await client.getFlag("IFldMzqP5jtv9wAL");
      vi.advanceTimersByTime(2_000);
      await client.getFlag("IFldMzqP5jtv9wAL");

      expect(fetchMock).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
    });

    it("honours a per-call ttlSeconds: 0 override to bypass cache", async () => {
      fetchMock.mockResolvedValue(okResponse(FLAG));
      const client = createRocketflagClient(undefined, undefined, { ttlSeconds: 300 });

      await client.getFlag("IFldMzqP5jtv9wAL");
      await client.getFlag("IFldMzqP5jtv9wAL", {}, { ttlSeconds: 0 });

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("caches different cohorts independently", async () => {
      fetchMock.mockResolvedValue(okResponse(FLAG));
      const client = createRocketflagClient(undefined, undefined, { ttlSeconds: 300 });

      await client.getFlag("IFldMzqP5jtv9wAL", { cohort: "a" });
      await client.getFlag("IFldMzqP5jtv9wAL", { cohort: "b" });

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("evicts the least recently used entry when the cache is full", async () => {
      fetchMock.mockResolvedValue(okResponse(FLAG));
      const client = createRocketflagClient(undefined, undefined, { ttlSeconds: 300, maxEntries: 2 });

      await client.getFlag("IFldMzqP5jtv9wAL", { targetingKey: "a" });
      await client.getFlag("IFldMzqP5jtv9wAL", { targetingKey: "b" });
      await client.getFlag("IFldMzqP5jtv9wAL", { targetingKey: "a" }); // hit, so "b" is now least recently used
      expect(fetchMock).toHaveBeenCalledTimes(2);

      await client.getFlag("IFldMzqP5jtv9wAL", { targetingKey: "c" }); // evicts "b"
      await client.getFlag("IFldMzqP5jtv9wAL", { targetingKey: "a" });
      expect(fetchMock).toHaveBeenCalledTimes(3);

      await client.getFlag("IFldMzqP5jtv9wAL", { targetingKey: "b" });
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });

    it("caps the cache at 10,000 entries by default", async () => {
      fetchMock.mockResolvedValue(okResponse(FLAG));
      const client = createRocketflagClient(undefined, undefined, { ttlSeconds: 300 });

      for (let i = 0; i <= 10_000; i++) {
        await client.getFlag("IFldMzqP5jtv9wAL", { targetingKey: `user-${i}` });
      }
      expect(fetchMock).toHaveBeenCalledTimes(10_001);

      await client.getFlag("IFldMzqP5jtv9wAL", { targetingKey: "user-10000" });
      expect(fetchMock).toHaveBeenCalledTimes(10_001);
      await client.getFlag("IFldMzqP5jtv9wAL", { targetingKey: "user-0" });
      expect(fetchMock).toHaveBeenCalledTimes(10_002);
    });

    it.each([0, -1, 1.5, Number.NaN])("rejects maxEntries of %s", (maxEntries) => {
      expect(() => createRocketflagClient(undefined, undefined, { ttlSeconds: 300, maxEntries })).toThrow(
        "maxEntries must be a positive integer",
      );
    });

    it("does not let callers mutate cached state", async () => {
      fetchMock.mockResolvedValue(okResponse(FLAG));
      const client = createRocketflagClient(undefined, undefined, { ttlSeconds: 300 });

      const first = await client.getFlag("IFldMzqP5jtv9wAL");
      first.enabled = false;
      const second = await client.getFlag("IFldMzqP5jtv9wAL");

      expect(second.enabled).toBe(true);
    });
  });
});
