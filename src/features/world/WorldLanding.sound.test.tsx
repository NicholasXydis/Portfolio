import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as music from "@/features/music";
import { resetSoundsForTest } from "@/features/music/effects";
import {
  enter,
  harness,
  renderLanding,
  setUpWorldLanding,
  wait,
} from "@/test/worldLanding";

const SOUNDS = {
  open: "/sounds/card-open.mp3",
  close: "/sounds/card-close.mp3",
  water: "/sounds/water.mp3",
};

const TRACK = {
  id: "sakuya3",
  file: "/music/samples/06-sakuya3.mp3",
  title: "Sakuya3",
  artist: "PeriTune",
  license: "credit optional",
  lufs: -9.1,
};

class Param {
  constructor(public value = 1) {}
  setValueAtTime(v: number) {
    this.value = v;
    return this;
  }
  linearRampToValueAtTime() {
    return this;
  }
  exponentialRampToValueAtTime() {
    return this;
  }
  setValueCurveAtTime() {
    return this;
  }
  cancelScheduledValues() {
    return this;
  }
}

class Node {
  connect<T>(next: T): T {
    return next;
  }
  disconnect() {}
}

let contexts: FakeContext[] = [];
let started: string[] = [];
const playing = new Set<HTMLMediaElement>();

class FakeContext {
  state: "suspended" | "running" | "closed" = "suspended";
  destination = new Node();
  constructor() {
    contexts.push(this);
  }
  get currentTime() {
    return performance.now() / 1000;
  }
  addEventListener() {}
  removeEventListener() {}
  resume() {
    this.state = "running";
    return Promise.resolve();
  }
  suspend() {
    this.state = "suspended";
    return Promise.resolve();
  }
  close() {
    this.state = "closed";
    return Promise.resolve();
  }
  createGain() {
    return Object.assign(new Node(), { gain: new Param() });
  }
  createDelay() {
    return Object.assign(new Node(), { delayTime: new Param(0) });
  }
  createDynamicsCompressor() {
    return Object.assign(new Node(), {
      threshold: new Param(),
      knee: new Param(),
      ratio: new Param(),
      attack: new Param(),
      release: new Param(),
    });
  }
  createAnalyser() {
    return Object.assign(new Node(), {
      fftSize: 2048,
      getFloatTimeDomainData: (out: Float32Array) => out.fill(0),
    });
  }
  createMediaElementSource() {
    return new Node();
  }
  createBufferSource() {
    const source = Object.assign(new Node(), {
      buffer: null as { url?: string } | null,
      onended: null as null | (() => void),
      start: () => started.push(source.buffer?.url ?? "?"),
      stop: () => {},
    });
    return source;
  }
  decodeAudioData(bytes: { url: string }) {
    return Promise.resolve({ duration: 0.3, url: bytes.url });
  }
}

function serve(url: string) {
  if (url.endsWith("tracks.json"))
    return { ok: true, status: 200, json: () => Promise.resolve([TRACK]) };
  if (url.startsWith("/sounds/"))
    return {
      ok: true,
      status: 200,
      arrayBuffer: () => Promise.resolve({ url }),
    };
  return { ok: false, status: 404 };
}

describe("WorldLanding", { timeout: 20000 }, () => {
  setUpWorldLanding();

  beforeEach(() => {
    contexts = [];
    started = [];
    playing.clear();
    resetSoundsForTest();
    vi.stubGlobal("AudioContext", FakeContext);
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => Promise.resolve(serve(String(url)))),
    );
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (
      this: HTMLMediaElement,
    ) {
      playing.add(this);
      return Promise.resolve();
    });
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(function (
      this: HTMLMediaElement,
    ) {
      playing.delete(this);
    });
    vi.spyOn(HTMLMediaElement.prototype, "paused", "get").mockImplementation(
      function (this: HTMLMediaElement) {
        return !playing.has(this);
      },
    );
  });

  afterEach(() => {
    music.stop();
    window.sessionStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const plays = () => vi.mocked(HTMLMediaElement.prototype.play).mock.calls;

  async function readyToEnter() {
    const button = await screen.findByRole("button", {
      name: "Enter the world",
    });
    await waitFor(() => expect(button).toHaveFocus());
    return button;
  }

  it("starts the music at the press of Enter, inside the gesture, and readies the card sounds", async () => {
    const h = harness();
    renderLanding(h.load);
    const button = await readyToEnter();
    await wait(2000);
    expect(contexts).toHaveLength(0);
    expect(plays()).toHaveLength(0);
    act(() => {
      fireEvent.pointerDown(button, { pointerType: "mouse", button: 0 });
    });
    expect(contexts).toHaveLength(1);
    expect(contexts[0]?.state).toBe("running");
    expect(plays()).toHaveLength(1);
    expect(vi.mocked(fetch).mock.calls.map(([url]) => url)).toEqual(
      expect.arrayContaining([SOUNDS.open, SOUNDS.close, SOUNDS.water]),
    );
    await act(async () => {
      fireEvent.click(button);
    });
    expect(plays()).toHaveLength(1);
  });

  it("starts the music in the same keypress when Enter is pressed from the keyboard", async () => {
    const h = harness();
    const { user } = renderLanding(h.load);
    await readyToEnter();
    expect(plays()).toHaveLength(0);
    await user.keyboard("{Enter}");
    expect(contexts).toHaveLength(1);
    expect(plays()).toHaveLength(1);
    expect(
      await screen.findByRole("button", { name: "Mute the music" }),
    ).toBeInTheDocument();
  });

  it("pops when a place opens and again when it closes", async () => {
    const h = harness();
    const { user } = renderLanding(h.load);
    await enter(user);
    expect(started).toEqual([]);
    await user.click(screen.getByRole("button", { name: /^About/ }));
    await screen.findByRole("region", { name: "About" });
    expect(started).toEqual([SOUNDS.open]);
    await user.click(
      screen.getByRole("button", { name: "Back to the island" }),
    );
    expect(started).toEqual([SOUNDS.open, SOUNDS.close]);
  });

  it("goes silent when the radio mutes the music, and pops again once it plays", async () => {
    const h = harness();
    const { user } = renderLanding(h.load);
    await enter(user);
    await user.click(
      await screen.findByRole("button", { name: "Mute the music" }),
    );
    await wait(1000);
    expect(
      screen.getByRole("button", { name: "Play the music" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Education/ }));
    await screen.findByRole("region", { name: "Education" });
    await user.click(
      screen.getByRole("button", { name: "Back to the island" }),
    );
    expect(started).toEqual([]);
    await user.click(screen.getByRole("button", { name: "Play the music" }));
    act(() => h.options().onPick?.("projects"));
    await screen.findByRole("region", { name: "Projects" });
    expect(started).toEqual([SOUNDS.open]);
  });

  it("drops water when the visitor touches the pond or a koi", async () => {
    const h = harness();
    const { user } = renderLanding(h.load);
    await enter(user);
    act(() => h.options().onEvent?.("secret", { name: "pond" }));
    expect(started).toEqual([SOUNDS.water]);
    await wait(500);
    act(() => h.options().onEvent?.("secret", { name: "koi" }));
    expect(started).toEqual([SOUNDS.water, SOUNDS.water]);
    act(() => h.options().onEvent?.("secret", { name: "lantern" }));
    expect(started).toEqual([SOUNDS.water, SOUNDS.water]);
  });
});
