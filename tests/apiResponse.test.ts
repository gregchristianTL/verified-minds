import { describe, it, expect } from "vitest";
import { apiSuccess, apiError, apiErrorFromCatch } from "@/lib/utils/apiResponse";

describe("apiSuccess", () => {
  it("wraps data in { data } envelope", async () => {
    const response = apiSuccess({ foo: "bar" });
    const body = await response.json();
    expect(body).toEqual({ data: { foo: "bar" } });
    expect(response.status).toBe(200);
  });

  it("supports custom status codes", async () => {
    const response = apiSuccess({ created: true }, 201);
    expect(response.status).toBe(201);
  });
});

describe("apiError", () => {
  it("returns error message with status", async () => {
    const response = apiError("Not found", 404);
    const body = await response.json();
    expect(body).toEqual({ error: "Not found" });
    expect(response.status).toBe(404);
  });

  it("includes errorCode when provided", async () => {
    const response = apiError("Bad", 400, { errorCode: "VALIDATION_ERROR" });
    const body = await response.json();
    expect(body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("includes details when provided", async () => {
    const response = apiError("Bad", 400, { details: { field: "name" } });
    const body = await response.json();
    expect(body.details).toEqual({ field: "name" });
  });
});

describe("apiErrorFromCatch", () => {
  it("extracts message from Error instances", async () => {
    const response = apiErrorFromCatch(new Error("something broke"));
    const body = await response.json();
    expect(body.error).toBe("something broke");
    expect(response.status).toBe(500);
  });

  it("uses fallback for non-Error values", async () => {
    const response = apiErrorFromCatch("string error", "Fallback");
    const body = await response.json();
    expect(body.error).toBe("Fallback");
  });

  it("supports custom status codes", async () => {
    const response = apiErrorFromCatch(new Error("oops"), "default", 422);
    expect(response.status).toBe(422);
  });
});
