import { describe, expect, it } from "vitest";
import {
  blankLead,
  demoLeads,
  filterLeads,
  summarize,
  validateLead,
} from "./domain";
describe("lead domain", () => {
  it("requires a nonempty name", () => {
    expect(validateLead(blankLead)).toBeTruthy();
    expect(validateLead({ ...blankLead, name: "  " })).toBeTruthy();
  });
  it("accepts only a name and validates optional email", () => {
    expect(validateLead({ ...blankLead, name: "Ada" })).toBeNull();
    expect(validateLead({ ...blankLead, name: "Ada", email: "bad" })).toContain(
      "email",
    );
  });
  it("enforces limits and allowed status", () => {
    expect(validateLead({ ...blankLead, name: "x".repeat(121) })).toBeTruthy();
    expect(
      validateLead({ ...blankLead, name: "Ada", notes: "x".repeat(5001) }),
    ).toBeTruthy();
    expect(
      validateLead({ ...blankLead, name: "Ada", status: "Fake" as never }),
    ).toBeTruthy();
  });
  it("searches case-insensitively and combines status", () => {
    const l = demoLeads();
    expect(filterLeads(l, "  NORTHSTAR ", "New")).toHaveLength(1);
    expect(filterLeads(l, "Northstar", "Won")).toHaveLength(0);
    expect(filterLeads(l, "proposal", "All")).toHaveLength(1);
  });
  it("counts all states accurately", () => {
    expect(summarize(demoLeads())).toEqual({
      Total: 8,
      New: 2,
      Contacted: 3,
      Won: 2,
      Lost: 1,
    });
    expect(summarize([]).Total).toBe(0);
  });
  it("creates fresh fictional data each time", () => {
    expect(demoLeads()[0].id).not.toBe(demoLeads()[0].id);
    expect(
      demoLeads().every(
        (l) => l.user_id === "demo-only" && l.email.endsWith(".example"),
      ),
    ).toBe(true);
  });
});
