import { describe, expect, it, vi } from "vitest";
import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { RocketFlagProvider } from "../RocketFlagProvider";
import { useFlag } from "../useFlag";
import type { FlagStatus, RocketFlagClient } from "../core/types";

const FLAG: FlagStatus = { name: "New Sign-ups", enabled: true, id: "IFldMzqP5jtv9wAL" };

const makeClient = (impl: RocketFlagClient["getFlag"]): RocketFlagClient => ({ getFlag: vi.fn(impl) });

const wrapperWith = (client: RocketFlagClient) =>
  ({ children }: { children: ReactNode }) => <RocketFlagProvider client={client}>{children}</RocketFlagProvider>;

describe("useFlag", () => {
  it("transitions from loading to the resolved flag", async () => {
    const client = makeClient(async () => FLAG);
    const { result } = renderHook(() => useFlag("IFldMzqP5jtv9wAL"), { wrapper: wrapperWith(client) });

    expect(result.current.loading).toBe(true);
    expect(result.current.enabled).toBe(false);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.flag).toEqual(FLAG);
    expect(result.current.enabled).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("surfaces errors", async () => {
    const client = makeClient(async () => {
      throw new Error("boom");
    });
    const { result } = renderHook(() => useFlag("IFldMzqP5jtv9wAL"), { wrapper: wrapperWith(client) });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("boom");
    expect(result.current.enabled).toBe(false);
  });

  it("refetches on demand", async () => {
    const client = makeClient(async () => FLAG);
    const { result } = renderHook(() => useFlag("IFldMzqP5jtv9wAL"), { wrapper: wrapperWith(client) });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(client.getFlag).toHaveBeenCalledTimes(1);

    act(() => result.current.refetch());
    await waitFor(() => expect(client.getFlag).toHaveBeenCalledTimes(2));
  });

  it("throws when used outside a provider", () => {
    // Silence the expected React error boundary console noise.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const Broken = () => {
      useFlag("IFldMzqP5jtv9wAL");
      return null;
    };
    expect(() => render(<Broken />)).toThrow(/must be used within a <RocketFlagProvider>/);
    spy.mockRestore();
  });

  it("passes flagId and context through to the client", async () => {
    const client = makeClient(async () => FLAG);
    renderHook(() => useFlag("IFldMzqP5jtv9wAL", { cohort: "beta" }), { wrapper: wrapperWith(client) });

    await waitFor(() => expect(client.getFlag).toHaveBeenCalled());
    expect(client.getFlag).toHaveBeenCalledWith("IFldMzqP5jtv9wAL", { cohort: "beta" }, undefined);
  });

  it("renders the resolved flag in a component", async () => {
    const client = makeClient(async () => FLAG);
    const Component = () => {
      const { enabled, loading } = useFlag("IFldMzqP5jtv9wAL");
      if (loading) return <span>loading</span>;
      return <span>{enabled ? "on" : "off"}</span>;
    };

    render(
      <RocketFlagProvider client={client}>
        <Component />
      </RocketFlagProvider>,
    );

    expect(screen.getByText("loading")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("on")).toBeInTheDocument());
  });
});
