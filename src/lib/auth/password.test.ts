import { describe, expect, it } from "vitest";
import {
  MIN_PASSWORD_LENGTH,
  validatePassword,
  validatePasswordConfirmation,
} from "./password";

describe("validatePassword", () => {
  it("rejects empty passwords", () => {
    expect(validatePassword("").ok).toBe(false);
  });

  it("rejects short passwords", () => {
    const result = validatePassword("1234567");
    expect(result.ok).toBe(false);
    expect(result.error).toContain(String(MIN_PASSWORD_LENGTH));
  });

  it("rejects passwords with spaces", () => {
    expect(validatePassword("pass word").ok).toBe(false);
  });

  it("accepts a valid password", () => {
    expect(validatePassword("correcthorse").ok).toBe(true);
  });
});

describe("validatePasswordConfirmation", () => {
  it("rejects mismatched confirmation", () => {
    const result = validatePasswordConfirmation("correcthorse", "correcthorses");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/do not match/i);
  });

  it("accepts matching passwords", () => {
    expect(validatePasswordConfirmation("correcthorse", "correcthorse").ok).toBe(
      true,
    );
  });
});
