import { describe, expect, it } from "vitest";
import { rankExpertsByLocation } from "./db";

describe("expert location matching", () => {
  it("prioritizes the saved district, then state, then other verified experts", () => {
    const rows = [
      { name: "Other State Expert", state: "Gujarat", district: "Surat" },
      { name: "Same State Expert", state: "Maharashtra", district: "Pune" },
      { name: "Same District Expert", state: "Maharashtra", district: "Nashik" },
    ];

    expect(rankExpertsByLocation(rows, { state: "maharashtra", district: "nashik" }).map((expert) => expert.name)).toEqual([
      "Same District Expert",
      "Same State Expert",
      "Other State Expert",
    ]);
  });
});
