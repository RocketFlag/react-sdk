import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRocketflagClient } from "../core/client";
import { APIError, InvalidResponseError, NetworkError } from "../core/errors";

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

  it("rejects non-alphanumeric env values without calling fetch", async () => {
    const client = createRocketflagClient();

    await expect(client.getFlag("IFldMzqP5jtv9wAL", { env: "stag-ing" })).rejects.toThrow(/alphanumeric/);
    expect(fetchMock).not.toHaveBeenCalled();
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
