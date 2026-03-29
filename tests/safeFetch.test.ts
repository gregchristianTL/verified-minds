import { describe, it, expect } from "vitest";
import { validateUrl, SSRFError } from "@/lib/utils/safeFetch";

describe("validateUrl", () => {
  it("allows valid HTTPS URLs", () => {
    const url = validateUrl("https://example.com/page");
    expect(url.hostname).toBe("example.com");
  });

  it("allows valid HTTP URLs", () => {
    const url = validateUrl("http://example.com/page");
    expect(url.hostname).toBe("example.com");
  });

  it("blocks localhost", () => {
    expect(() => validateUrl("http://localhost:3000")).toThrow(SSRFError);
  });

  it("blocks 127.x.x.x loopback", () => {
    expect(() => validateUrl("http://127.0.0.1/admin")).toThrow(SSRFError);
    expect(() => validateUrl("http://127.0.0.255/")).toThrow(SSRFError);
  });

  it("blocks 10.x.x.x private IPs", () => {
    expect(() => validateUrl("http://10.0.0.1/")).toThrow(SSRFError);
  });

  it("blocks 172.16-31.x.x private IPs", () => {
    expect(() => validateUrl("http://172.16.0.1/")).toThrow(SSRFError);
    expect(() => validateUrl("http://172.31.255.255/")).toThrow(SSRFError);
  });

  it("blocks 192.168.x.x private IPs", () => {
    expect(() => validateUrl("http://192.168.1.1/")).toThrow(SSRFError);
  });

  it("blocks AWS/GCP metadata endpoint", () => {
    expect(() => validateUrl("http://169.254.169.254/latest/meta-data/")).toThrow(SSRFError);
  });

  it("blocks GCP metadata hostname", () => {
    expect(() => validateUrl("http://metadata.google.internal/")).toThrow(SSRFError);
  });

  it("blocks file:// protocol", () => {
    expect(() => validateUrl("file:///etc/passwd")).toThrow(SSRFError);
  });

  it("blocks ftp:// protocol", () => {
    expect(() => validateUrl("ftp://example.com/file")).toThrow(SSRFError);
  });

  it("blocks invalid URLs", () => {
    expect(() => validateUrl("not-a-url")).toThrow(SSRFError);
  });

  it("allows public IPs outside private ranges", () => {
    const url = validateUrl("https://8.8.8.8/dns");
    expect(url.hostname).toBe("8.8.8.8");
  });
});
