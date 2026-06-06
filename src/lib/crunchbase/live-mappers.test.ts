import { describe, it, expect } from "vitest";
import { mapFundingRound, mapOrganization } from "./live-mappers";

describe("mapFundingRound", () => {
  it("maps a typical funding_round property bag", () => {
    const round = mapFundingRound("rd-1", {
      announced_on: "2023-05-10",
      investment_type: "series_b",
      money_raised: { value: 30000000, currency: "EUR", value_usd: 33000000 },
      num_investors: 4,
      funded_organization_identifier: {
        uuid: "org-1",
        value: "Acme AI",
        permalink: "acme-ai",
      },
      funded_organization_categories: [
        { permalink: "machine-learning", value: "Machine Learning" },
        { permalink: "saas", value: "SaaS" },
      ],
      lead_investor_identifiers: [{ uuid: "inv-1" }],
      investor_identifiers: [{ uuid: "inv-1" }, { uuid: "inv-2" }],
      updated_at: "2023-05-11",
    });
    expect(round).not.toBeNull();
    expect(round!.orgUuid).toBe("org-1");
    expect(round!.orgName).toBe("Acme AI");
    expect(round!.stageBucket).toBe("Early (A/B)");
    expect(round!.moneyRaisedUsd).toBe(33000000); // prefers value_usd
    expect(round!.currencyOriginal).toBe("EUR");
    expect(round!.numInvestors).toBe(4);
    expect(round!.orgCategoryIds).toEqual(["machine-learning", "saas"]);
    expect(round!.investorUuids).toEqual(["inv-1", "inv-2"]);
  });

  it("falls back to value when value_usd missing and returns null without a date", () => {
    const r = mapFundingRound("rd-2", {
      announced_on: "2020-01-01",
      investment_type: "seed",
      money_raised: { value: 1000000, currency: "USD" },
    });
    expect(r!.moneyRaisedUsd).toBe(1000000);

    expect(mapFundingRound("rd-3", { investment_type: "seed" })).toBeNull();
  });
});

describe("mapOrganization", () => {
  it("maps identifier, categories, groups, and location", () => {
    const org = mapOrganization("fallback", {
      identifier: { uuid: "org-9", value: "Beta Corp", permalink: "beta-corp" },
      short_description: "A fintech company.",
      categories: [{ permalink: "payments", value: "Payments" }],
      category_groups: [{ permalink: "financial-services", value: "Financial Services" }],
      location_identifiers: [
        { location_type: "city", value: "London" },
        { location_type: "region", value: "England" },
        { location_type: "country", value: "United Kingdom" },
      ],
      founded_on: "2016-03-01",
      funding_total: { value_usd: 52000000 },
      last_funding_at: "2022-09-01",
      updated_at: "2023-01-01",
    });
    expect(org.uuid).toBe("org-9");
    expect(org.name).toBe("Beta Corp");
    expect(org.city).toBe("London");
    expect(org.countryCode).toBe("United Kingdom");
    expect(org.categoryIds).toEqual(["payments"]);
    expect(org.categoryGroupIds).toEqual(["financial-services"]);
    expect(org.fundingTotalUsd).toBe(52000000);
  });
});
