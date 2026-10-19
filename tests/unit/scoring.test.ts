import { describe, expect, it } from "vitest";
import { closestRivals, percent, pointsFor, rankPlayers, scoreRound, tallyVotes } from "@/lib/game/scoring";

describe("tallyVotes", () => {
  it("picks the option with more votes", () => {
    expect(tallyVotes([{ playerId: "1", choice: "a" }, { playerId: "2", choice: "a" }, { playerId: "3", choice: "b" }])).toEqual({
      votesA: 2,
      votesB: 1,
      winner: "a",
    });
  });
  it("declares a tie on equal votes", () => {
    expect(tallyVotes([{ playerId: "1", choice: "a" }, { playerId: "2", choice: "b" }]).winner).toBe("tie");
  });
  it("treats zero votes as a tie", () => {
    expect(tallyVotes([]).winner).toBe("tie");
  });
});

describe("pointsFor", () => {
  it("awards 1 for a correct prediction", () => expect(pointsFor("b", "b")).toBe(1));
  it("awards 0 for a wrong prediction", () => expect(pointsFor("a", "b")).toBe(0));
  it("awards 0 on a tie", () => expect(pointsFor("a", "tie")).toBe(0));
  it("awards 0 when no prediction was made", () => expect(pointsFor(null, "a")).toBe(0));
});

describe("scoreRound", () => {
  it("counts the player's own vote toward the majority", () => {
    // p1 votes B, everyone else A. The majority is A.
    const result = scoreRound(
      [
        { playerId: "p1", choice: "b" },
        { playerId: "p2", choice: "a" },
        { playerId: "p3", choice: "a" },
      ],
      [
        { playerId: "p1", predicted: "a" },
        { playerId: "p2", predicted: "b" },
        { playerId: "p3", predicted: "a" },
      ],
    );
    expect(result.winner).toBe("a");
    expect(Object.fromEntries(result.awards.map((a) => [a.playerId, a.points]))).toEqual({ p1: 1, p2: 0, p3: 1 });
    expect(result.awards.every((a) => a.counted)).toBe(true);
  });

  it("gives nobody points on a tie and excludes ties from accuracy", () => {
    const result = scoreRound(
      [
        { playerId: "p1", choice: "a" },
        { playerId: "p2", choice: "b" },
      ],
      [
        { playerId: "p1", predicted: "a" },
        { playerId: "p2", predicted: "b" },
      ],
    );
    expect(result.winner).toBe("tie");
    expect(result.awards.map((a) => a.points)).toEqual([0, 0]);
    expect(result.awards.some((a) => a.counted)).toBe(false);
  });
});

describe("rankPlayers", () => {
  it("uses competition ranking for equal scores", () => {
    const ranked = rankPlayers([
      { id: "a", nickname: "Zed", score: 3 },
      { id: "b", nickname: "Amy", score: 5 },
      { id: "c", nickname: "Bo", score: 3 },
      { id: "d", nickname: "Cy", score: 1 },
    ]);
    expect(ranked.map((r) => [r.nickname, r.rank])).toEqual([
      ["Amy", 1],
      ["Bo", 2],
      ["Zed", 2],
      ["Cy", 4],
    ]);
  });
});

describe("closestRivals", () => {
  it("finds the adjacent pair with the smallest gap", () => {
    const ranked = rankPlayers([
      { id: "a", nickname: "A", score: 9 },
      { id: "b", nickname: "B", score: 5 },
      { id: "c", nickname: "C", score: 4 },
    ]);
    const r = closestRivals(ranked)!;
    expect([r.a.id, r.b.id, r.gap]).toEqual(["b", "c", 1]);
  });
  it("returns null with fewer than two players", () => {
    expect(closestRivals([{ id: "a", nickname: "A", score: 1 }])).toBeNull();
  });
});

describe("percent", () => {
  it("rounds and handles zero totals", () => {
    expect(percent(1, 3)).toBe(33);
    expect(percent(0, 0)).toBe(0);
  });
});
