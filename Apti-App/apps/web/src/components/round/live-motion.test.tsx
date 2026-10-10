import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LivePulse, LiveStage } from "./live-motion";

describe("live motion", () => {
  it("keeps a new Question and its countdown visible from the first frame", () => {
    const html = renderToStaticMarkup(
      <LiveStage>
        <h2>Question 2</h2>
        <LivePulse>3</LivePulse>
      </LiveStage>,
    );
    expect(html).toContain("Question 2");
    expect(html).toContain(">3</span>");
    expect(html).not.toContain("opacity:0");
  });
});
