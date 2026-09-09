import { describe, expect, it, vi } from "vitest";
import {
  buildCommerceMpCollectBody,
  COMMERCE_PAGE_LOCATION,
  DEFAULT_ENGAGEMENT_TIME_MSEC,
  fallbackGaClientId,
  isUniqueViolation,
  sendGaCommerceEvent,
} from "./measurementProtocol";

const USER_ID = "c6495215-91df-4712-adfc-3899059217a2";

describe("buildCommerceMpCollectBody", () => {
  it("returns null when client_id is missing or not digit.digit", () => {
    expect(
      buildCommerceMpCollectBody({
        clientId: null,
        userId: USER_ID,
        eventName: "trial_started",
        params: { transaction_id: "cs_1" },
      }),
    ).toBeNull();
    expect(
      buildCommerceMpCollectBody({
        clientId: fallbackGaClientId(USER_ID),
        userId: USER_ID,
        eventName: "trial_started",
        params: { transaction_id: "cs_1" },
      }),
    ).toBeNull();
  });

  it("includes session, engagement, page_location, transaction_id and user_id", () => {
    const body = buildCommerceMpCollectBody({
      clientId: "1111111111.2222222222",
      userId: USER_ID,
      eventName: "trial_started",
      params: { transaction_id: "cs_trial", currency: "GBP", plan_type: "monthly" },
      gaSessionId: "1710000000",
      gaSessionNumber: 2,
    });
    expect(body).toEqual({
      client_id: "1111111111.2222222222",
      user_id: USER_ID,
      events: [
        {
          name: "trial_started",
          params: {
            transaction_id: "cs_trial",
            currency: "GBP",
            plan_type: "monthly",
            session_id: "1710000000",
            session_number: 2,
            engagement_time_msec: DEFAULT_ENGAGEMENT_TIME_MSEC,
            page_location: COMMERCE_PAGE_LOCATION,
          },
        },
      ],
    });
    expect(JSON.stringify(body)).not.toContain("@");
  });

  it("omits session fields when they were not captured", () => {
    const body = buildCommerceMpCollectBody({
      clientId: "1.2",
      userId: null,
      eventName: "purchase",
      params: { transaction_id: "cs_pass" },
    });
    expect(body?.events[0]?.params.session_id).toBeUndefined();
    expect(body?.events[0]?.params.session_number).toBeUndefined();
    expect(body?.user_id).toBeUndefined();
  });
});

describe("sendGaCommerceEvent", () => {
  it("does not send when the dedupe claim loses", async () => {
    const fetchImpl = vi.fn();
    const result = await sendGaCommerceEvent(
      {
        eventName: "trial_started",
        transactionId: "cs_1",
        userId: USER_ID,
        source: "webhook",
        gaClientId: "1.2",
      },
      {
        claim: async () => false,
        fetchImpl,
        mpSecret: "secret",
        resolveClientId: async () => "1.2",
      },
    );
    expect(result).toEqual({ claimed: false, sent: false });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("claims but does not send when client_id is invalid", async () => {
    const fetchImpl = vi.fn();
    const result = await sendGaCommerceEvent(
      {
        eventName: "trial_started",
        transactionId: "cs_1",
        userId: USER_ID,
        source: "webhook",
        gaClientId: "supabase.not-a-client",
      },
      {
        claim: async () => true,
        fetchImpl,
        mpSecret: "secret",
        resolveClientId: async () => fallbackGaClientId(USER_ID),
      },
    );
    expect(result).toEqual({ claimed: true, sent: false });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("POSTs the MP payload when claim wins and client_id is valid", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => ({ ok: true }) as Response);
    const result = await sendGaCommerceEvent(
      {
        eventName: "purchase",
        transactionId: "cs_pass",
        userId: USER_ID,
        source: "webhook",
        params: { transaction_id: "cs_pass", value: 99, currency: "GBP" },
        gaClientId: "111.222",
        gaSessionId: "1710000000",
        gaSessionNumber: 1,
      },
      {
        claim: async () => true,
        fetchImpl,
        mpSecret: "secret",
        measurementId: "G-Y7E2CJSKV0",
        resolveClientId: async (_userId, explicit) => explicit ?? null,
      },
    );
    expect(result).toEqual({ claimed: true, sent: true });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(String(url)).toContain("measurement_id=G-Y7E2CJSKV0");
    expect(String(url)).toContain("api_secret=secret");
    const body = JSON.parse(String(init?.body));
    expect(body.client_id).toBe("111.222");
    expect(body.user_id).toBe(USER_ID);
    expect(body.events[0].name).toBe("purchase");
    expect(body.events[0].params.transaction_id).toBe("cs_pass");
    expect(body.events[0].params.session_id).toBe("1710000000");
    expect(body.events[0].params.engagement_time_msec).toBe(1);
    expect(body.events[0].params.page_location).toBe(COMMERCE_PAGE_LOCATION);
  });
});

describe("dedupe unique violation", () => {
  it("treats Postgres 23505 as already claimed", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
    expect(isUniqueViolation({ code: "42501" })).toBe(false);
  });
});
