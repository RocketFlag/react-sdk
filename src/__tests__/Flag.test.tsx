import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { RocketFlagProvider } from "../RocketFlagProvider";
import { Flag } from "../Flag";
import type { FlagStatus, RocketFlagClient } from "../core/types";

const makeFlag = (enabled: boolean): FlagStatus => ({ name: "Banner", enabled, id: "IFldMzqP5jtv9wAL" });

const makeClient = (impl: RocketFlagClient["getFlag"]): RocketFlagClient => ({ getFlag: vi.fn(impl) });

const renderFlag = (client: RocketFlagClient, props?: { fallback?: React.ReactNode; loading?: React.ReactNode }) =>
  render(
    <RocketFlagProvider client={client}>
      <Flag id="IFldMzqP5jtv9wAL" fallback={props?.fallback} loading={props?.loading}>
        <span>new</span>
      </Flag>
    </RocketFlagProvider>,
  );

describe("<Flag>", () => {
  it("renders the loading node while pending, then children when enabled", async () => {
    const client = makeClient(async () => makeFlag(true));
    renderFlag(client, { loading: <span>spinner</span> });

    expect(screen.getByText("spinner")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("new")).toBeInTheDocument());
  });

  it("renders the fallback when the flag is disabled", async () => {
    const client = makeClient(async () => makeFlag(false));
    renderFlag(client, { fallback: <span>old</span> });

    await waitFor(() => expect(screen.getByText("old")).toBeInTheDocument());
    expect(screen.queryByText("new")).not.toBeInTheDocument();
  });

  it("renders the fallback on error", async () => {
    const client = makeClient(async () => {
      throw new Error("boom");
    });
    renderFlag(client, { fallback: <span>old</span> });

    await waitFor(() => expect(screen.getByText("old")).toBeInTheDocument());
    expect(screen.queryByText("new")).not.toBeInTheDocument();
  });
});
