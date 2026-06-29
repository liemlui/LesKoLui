import { describe, it, expect } from "vitest";
import { colorForStudent, STUDENT_COLORS } from "../lib/studentColor";

describe("colorForStudent", () => {
  it("returns a color from the palette", () => {
    expect(STUDENT_COLORS).toContain(colorForStudent("abc-123"));
  });

  it("is stable for the same id", () => {
    const id = crypto.randomUUID();
    expect(colorForStudent(id)).toBe(colorForStudent(id));
  });

  it("does not depend on insertion order (hash-based, not index-based)", () => {
    const a = colorForStudent("student-a");
    const b = colorForStudent("student-b");
    // both valid palette colors; recomputing a after b is unchanged
    expect(STUDENT_COLORS).toContain(a);
    expect(STUDENT_COLORS).toContain(b);
    expect(colorForStudent("student-a")).toBe(a);
  });
});
