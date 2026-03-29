import { describe, it, expect, vi, beforeEach } from "vitest";
import { logger } from "@/lib/logger";

describe("logger", () => {
  beforeEach(() => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("logs info messages", () => {
    logger.info("test message");
    expect(console.info).toHaveBeenCalled();
  });

  it("logs warn messages", () => {
    logger.warn("warning");
    expect(console.warn).toHaveBeenCalled();
  });

  it("logs error messages", () => {
    logger.error("error occurred");
    expect(console.error).toHaveBeenCalled();
  });

  it("includes context in log output", () => {
    logger.info("context-test", { userId: "abc-123" });
    const calls = vi.mocked(console.info).mock.calls;
    const lastCall = calls[calls.length - 1][0] as string;
    expect(lastCall).toContain("context-test");
    expect(lastCall).toContain("abc-123");
  });
});
