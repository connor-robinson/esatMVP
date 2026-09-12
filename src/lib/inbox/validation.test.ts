import { describe, expect, it } from "vitest";
import { validateInboxCompose } from "@/lib/inbox/validation";

describe("validateInboxCompose", () => {
  it("accepts a broadcast", () => {
    const result = validateInboxCompose({
      audience: "broadcast",
      subject: "Update",
      body: "Hello everyone.",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.audience).toBe("broadcast");
      expect(result.value.recipientIds).toEqual([]);
    }
  });

  it("requires recipients for personal", () => {
    const result = validateInboxCompose({
      audience: "personal",
      subject: "Hi",
      body: "Just you.",
      recipientIds: [],
    });
    expect(result.ok).toBe(false);
  });

  it("accepts personal with recipients", () => {
    const result = validateInboxCompose({
      audience: "personal",
      subject: "Hi",
      body: "Just you.",
      recipientIds: ["aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"],
    });
    expect(result.ok).toBe(true);
  });
});
