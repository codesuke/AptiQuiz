import { describe, expect, it } from "vitest";
import { getHomeDestinations } from "./home-destinations";

describe("home destinations", () => {
  it("sends a signed-in User to Question Sets and hosting setup", () => {
    expect(getHomeDestinations(true)).toEqual({
      questionSets: "/question-sets",
      hosting: "/host",
      joining: "/join",
    });
  });

  it("sends a Guest to sign-in before Question Set authoring", () => {
    expect(getHomeDestinations(false)).toEqual({
      questionSets: "/sign-in",
      hosting: "/host",
      joining: "/join",
    });
  });
});
