import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GettingReady } from "./getting-ready";

const ready = { questionIndex: 0, serverTime: 10_000, endsAt: 13_000 };

afterEach(() => vi.restoreAllMocks());

describe("Getting ready", () => {
  it("shows the same remaining time for viewers with different local clocks", () => {
    vi.spyOn(Date, "now").mockReturnValue(6_000);
    const first = renderToStaticMarkup(<GettingReady ready={ready} receivedAt={5_000} />);
    vi.spyOn(Date, "now").mockReturnValue(106_000);
    const second = renderToStaticMarkup(<GettingReady ready={ready} receivedAt={105_000} />);

    expect(first).toContain("Getting ready");
    expect(first).toContain("Question 1");
    expect(first).toContain('aria-label="Question starts in 2 seconds"');
    expect(second).toContain('aria-label="Question starts in 2 seconds"');
  });

  it("shows zero after the server deadline", () => {
    vi.spyOn(Date, "now").mockReturnValue(9_000);

    expect(renderToStaticMarkup(<GettingReady ready={ready} receivedAt={5_000} />)).toContain(
      'aria-label="Question starts in 0 seconds"',
    );
  });
});
