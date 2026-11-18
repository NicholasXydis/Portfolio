import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { useScrollRestoration } from "./useScrollRestoration";

function Page() {
  useScrollRestoration();
  return <article id="project-banklite">BankLite</article>;
}

function renderAt(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="*" element={<Page />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("useScrollRestoration", () => {
  it("scrolls a #hash target into view and keeps the hash", () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    const replaceState = vi.spyOn(window.history, "replaceState");

    renderAt("/en/lite#project-banklite");

    expect(scrollIntoView).toHaveBeenCalledWith({
      block: "start",
      behavior: "instant",
    });
    expect(replaceState).not.toHaveBeenCalled();
    replaceState.mockRestore();
  });

  it("restores the saved position on a back or forward visit", async () => {
    const scrollTo = vi.spyOn(window, "scrollTo");
    renderAt("/en/lite");
    fireEvent.scroll(window);
    await waitFor(() => expect(scrollTo).toHaveBeenCalledWith(0, 0));
    scrollTo.mockRestore();
  });
});
