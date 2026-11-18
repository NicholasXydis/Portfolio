import { act, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  enter,
  harness,
  renderLanding,
  setUpWorldLanding,
  wait,
} from "@/test/worldLanding";
import type { CreateWorld } from "./types";

describe("WorldLanding", { timeout: 20000 }, () => {
  setUpWorldLanding();

  it("paints the loading screen with the flat-page link before any 3D code runs", () => {
    const h = harness();
    renderLanding(h.load);
    expect(
      screen.getByRole("link", { name: "View the 2D version" }),
    ).toHaveAttribute("href", "/en/lite");
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("shows an autofocused Enter once the world resolves, then focuses the host's question", async () => {
    const h = harness();
    const { user } = renderLanding(h.load);
    await enter(user);
    expect(
      screen.getByRole("button", { name: "Just looking around" }),
    ).toBeInTheDocument();
    expect(h.world.setView).not.toHaveBeenCalledWith("explore");
  });

  it("ignores taps in the world before Enter", async () => {
    const h = harness();
    renderLanding(h.load);
    const button = await screen.findByRole("button", {
      name: "Enter the world",
    });
    await waitFor(() => expect(button).toHaveFocus());
    act(() => h.options().onPick?.("about"));
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("fades the loading layer while the world pushes in, then the host asks and takes focus", async () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      ...original(query),
      matches: false,
    })) as typeof window.matchMedia;
    try {
      const h = harness();
      let finishPush: () => void = () => {};
      const intro = vi.fn(
        () => new Promise<void>((done) => (finishPush = done)),
      );
      Object.assign(h.world, { intro });
      const { user } = renderLanding(h.load);
      const button = await screen.findByRole("button", {
        name: "Enter the world",
      });
      await waitFor(() => expect(button).toHaveFocus());
      await user.click(button);
      await user.click(button);
      expect(intro).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("loading-screen")).toBeInTheDocument();
      await wait(900);
      expect(screen.queryByTestId("loading-screen")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("heading", { name: /what brings you in/i }),
      ).not.toBeInTheDocument();
      act(() => finishPush());
      const question = await screen.findByRole("heading", {
        name: /what brings you in/i,
      });
      await waitFor(() => expect(question).toHaveFocus());
      expect(screen.queryByTestId("loading-screen")).not.toBeInTheDocument();
    } finally {
      window.matchMedia = original;
    }
  });

  it("skips the push-in under reduced motion and asks straight after a quick fade", async () => {
    const h = harness();
    const intro = vi.fn(() => Promise.resolve());
    Object.assign(h.world, { intro });
    const { user } = renderLanding(h.load);
    await enter(user);
    expect(intro).not.toHaveBeenCalled();
  });

  it("comes back from the flat page into the world as it was, with no second load or Enter", async () => {
    let made = 0;
    const h = harness();
    const load = async () => {
      const create = await h.load();
      return ((canvas, options) => {
        made += 1;
        return create(canvas, options);
      }) as CreateWorld;
    };
    const { user } = renderLanding(load);
    await enter(user);
    await user.click(
      screen.getByRole("button", { name: "Just looking around" }),
    );
    await user.click(screen.getByRole("button", { name: "test to lite" }));
    expect(await screen.findByText("flat page")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "test back" }));
    expect(
      await screen.findByRole("button", { name: "Ask the tea master" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Enter the world" }),
    ).not.toBeInTheDocument();
    expect(made).toBe(1);
    expect(h.world.dispose).not.toHaveBeenCalled();
  });

  it("sends the visitor to the flat page when the world cannot start", async () => {
    const failing: CreateWorld = () => Promise.reject(new Error("no WebGL"));
    renderLanding(() => Promise.resolve(failing));
    await waitFor(() =>
      expect(screen.getByTestId("where")).toHaveTextContent("/en/lite"),
    );
    expect(screen.getByText("flat page")).toBeInTheDocument();
  });
});
