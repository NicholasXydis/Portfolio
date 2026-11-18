import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { firstTheme, resetThemeForTest } from "@/components/koi/theme";
import {
  enter,
  harness,
  renderLanding,
  setUpWorldLanding,
} from "@/test/worldLanding";
import { dropKept } from "./keepAlive";

describe("WorldLanding", { timeout: 20000 }, () => {
  setUpWorldLanding();

  it("shows a quiet notice when the graphics are lost, and removes it on restore", async () => {
    const h = harness();
    const { user } = renderLanding(h.load);
    await enter(user);
    act(() => h.options().onEvent?.("contextLost", {}));
    const notice = await screen.findByRole("alert");
    expect(
      within(notice).getByRole("button", { name: "Reload" }),
    ).toBeInTheDocument();
    expect(
      within(notice).getByRole("link", { name: /2D version/ }),
    ).toHaveAttribute("href", "/en/lite");
    act(() => h.options().onEvent?.("contextRestored", {}));
    await waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
    );
    act(() => h.options().onEvent?.("somethingNew", {}));
  });

  it("tells the world what the panel covers, and nothing once it closes", async () => {
    const h = harness();
    const setInsets = vi.fn();
    Object.assign(h.world, { setInsets });
    const { user } = renderLanding(h.load);
    await enter(user);
    await waitFor(() =>
      expect(setInsets).toHaveBeenLastCalledWith({
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      }),
    );
    await user.click(screen.getByRole("button", { name: /^Education/ }));
    await screen.findByRole("region", { name: "Education" });
    await waitFor(() =>
      expect(setInsets).toHaveBeenLastCalledWith(
        expect.objectContaining({
          right: Math.round(Math.min(1024 * 0.43, 560) + 1024 * 0.045),
          bottom: 0,
        }),
      ),
    );
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(setInsets).toHaveBeenLastCalledWith({
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      }),
    );
  });

  it("gives the world canvas the pointing hand, the open hand in explore and the closed hand while orbiting", async () => {
    const h = harness();
    const { user } = renderLanding(h.load);
    await enter(user);
    const canvas = document.querySelector<HTMLCanvasElement>(
      "#main-content canvas",
    ) as HTMLCanvasElement;
    expect(canvas.dataset.cursor).toBeUndefined();
    act(() =>
      h.options().onHover?.("about", { tappable: true, name: "about" }),
    );
    expect(canvas.dataset.cursor).toBe("hand");
    act(() => h.options().onHover?.(null, { tappable: false, name: null }));
    expect(canvas.dataset.cursor).toBeUndefined();
    await user.click(
      screen.getByRole("button", { name: /just looking around/i }),
    );
    await waitFor(() => expect(canvas.dataset.cursor).toBe("grab"));
    act(() => h.options().onHover?.(null, { tappable: true, name: "frog" }));
    expect(canvas.dataset.cursor).toBe("hand");
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(canvas, { clientX: 140, clientY: 100 });
    expect(canvas.dataset.cursor).toBe("grabbing");
    fireEvent.pointerUp(canvas, { clientX: 140, clientY: 100 });
    expect(canvas.dataset.cursor).toBe("hand");
    act(() => h.options().onHover?.(null, { tappable: false, name: null }));
    expect(canvas.dataset.cursor).toBe("grab");
  });

  describe("night first, day for the session", () => {
    afterEach(() => {
      resetThemeForTest();
      document.documentElement.classList.remove("light", "dark");
    });

    it("opens the world and the page at night, with no crossfade", async () => {
      resetThemeForTest();
      const h = harness();
      renderLanding(h.load);
      await screen.findByRole("button", { name: "Enter the world" });
      expect(h.options().mode).toBe("night");
      expect(document.documentElement).toHaveClass("dark");
      expect(h.world.setMode).not.toHaveBeenCalled();
    });

    it("tells the world when the visitor picks day, and opens in day again in the same session", async () => {
      resetThemeForTest();
      const h = harness();
      const { unmount, user } = renderLanding(h.load);
      await enter(user);
      expect(h.options().mode).toBe("night");
      await user.click(screen.getByRole("button", { name: "Night" }));
      await waitFor(() => expect(h.world.setMode).toHaveBeenCalledWith("day"));
      expect(document.documentElement).toHaveClass("light");
      unmount();
      dropKept();
      const again = harness();
      renderLanding(again.load);
      await screen.findByRole("button", { name: "Enter the world" });
      expect(again.options().mode).toBe("day");
    });

    it("keeps the day choice when the page reloads before the day textures arrive", async () => {
      resetThemeForTest();
      const h = harness();
      let fail: (error: Error) => void = () => undefined;
      vi.mocked(h.world.setMode).mockImplementation(
        () =>
          new Promise<void>((_resolve, reject) => {
            fail = reject;
          }),
      );
      const { user } = renderLanding(h.load);
      await enter(user);
      await user.click(screen.getByRole("button", { name: "Night" }));
      await waitFor(() => expect(h.world.setMode).toHaveBeenCalledWith("day"));
      act(() => {
        window.dispatchEvent(new Event("beforeunload"));
      });
      await act(async () => fail(new Error("aborted")));
      expect(document.documentElement).toHaveClass("light");
      expect(firstTheme()).toBe("light");
      act(() => {
        window.dispatchEvent(new Event("pageshow"));
      });
    });

    it("goes back to night when the day textures really fail while the page stays open", async () => {
      resetThemeForTest();
      const h = harness();
      vi.mocked(h.world.setMode).mockImplementation((mode) =>
        mode === "day"
          ? Promise.reject(new Error("offline"))
          : Promise.resolve(),
      );
      const { user } = renderLanding(h.load);
      await enter(user);
      await user.click(screen.getByRole("button", { name: "Night" }));
      await waitFor(() => expect(document.documentElement).toHaveClass("dark"));
      expect(firstTheme()).toBe("dark");
    });
  });
});
