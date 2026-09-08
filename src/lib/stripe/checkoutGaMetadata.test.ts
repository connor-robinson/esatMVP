import { describe, expect, it } from "vitest";
import {
  fromStripeGaMetadata,
  mergeStripeGaMetadata,
  parseGaCheckoutAttribution,
  toStripeGaMetadata,
} from "./checkoutGaMetadata";

describe("Stripe GA metadata round-trip", () => {
  it("round-trips client_id, session_id and session_number", () => {
    const incoming = parseGaCheckoutAttribution({
      planType: "monthly",
      ga_client_id: "1111111111.2222222222",
      ga_session_id: "1710000000",
      ga_session_number: 2,
    });
    const metadata = mergeStripeGaMetadata(
      { userId: "c6495215-91df-4712-adfc-3899059217a2", planType: "monthly" },
      incoming,
    );
    expect(metadata).toEqual({
      userId: "c6495215-91df-4712-adfc-3899059217a2",
      planType: "monthly",
      ga_client_id: "1111111111.2222222222",
      ga_session_id: "1710000000",
      ga_session_number: "2",
    });
    expect(fromStripeGaMetadata(metadata)).toEqual({
      ga_client_id: "1111111111.2222222222",
      ga_session_id: "1710000000",
      ga_session_number: 2,
    });
  });

  it("omits empty GA keys and never copies email", () => {
    const parsed = parseGaCheckoutAttribution({
      email: "user@example.com",
      ga_client_id: "user@example.com",
      ga_session_id: "user@example.com",
      name: "Ada",
    });
    expect(parsed).toEqual({
      ga_client_id: null,
      ga_session_id: null,
      ga_session_number: null,
    });
    expect(toStripeGaMetadata(parsed)).toEqual({});
  });

  it("ignores invalid session numbers", () => {
    expect(
      parseGaCheckoutAttribution({
        ga_client_id: "1.2",
        ga_session_id: "9",
        ga_session_number: 0,
      }),
    ).toEqual({
      ga_client_id: "1.2",
      ga_session_id: "9",
      ga_session_number: null,
    });
  });
});
