import { seededRandom } from "@/lib/utils";
import { stageBucketFor } from "./fields";
import type {
  Category,
  CategoryGroup,
  FundingRound,
  Organization,
} from "./types";

/**
 * Deterministic synthetic venture dataset. Generates a realistic ~12-year
 * history of funding rounds across category groups, with believable boom/bust
 * dynamics (AI surging 2023+, crypto spiking 2021 then cooling, climate rising,
 * a 2022-2023 broad pullback). Stable across runs for a given seed.
 */

export interface MockDataset {
  categoryGroups: CategoryGroup[];
  categories: Category[];
  organizations: Organization[];
  rounds: FundingRound[];
}

interface GroupDef {
  id: string;
  name: string;
  categories: string[];
  /** Relative share of new-company formation. */
  weight: number;
  /** Multiplier on typical round size (capital intensity). */
  capitalIntensity: number;
  /** Per-year multiplier on formation/dollars; default 1 when missing. */
  surge: Record<number, number>;
}

const GROUPS: GroupDef[] = [
  {
    id: "artificial-intelligence",
    name: "Artificial Intelligence",
    categories: ["Machine Learning", "Generative AI", "Computer Vision", "NLP", "MLOps"],
    weight: 1.4,
    capitalIntensity: 1.5,
    surge: { 2020: 1.2, 2021: 1.4, 2022: 1.5, 2023: 2.6, 2024: 3.6, 2025: 4.2 },
  },
  {
    id: "fintech",
    name: "Fintech & Financial Services",
    categories: ["Payments", "Banking", "Lending", "Insurance", "Wealth Management"],
    weight: 1.5,
    capitalIntensity: 1.3,
    surge: { 2018: 1.3, 2019: 1.5, 2020: 1.7, 2021: 2.2, 2022: 1.4, 2023: 0.9, 2024: 1.0 },
  },
  {
    id: "health-biotech",
    name: "Health & Biotech",
    categories: ["Biotechnology", "Digital Health", "Medical Devices", "Therapeutics", "Genomics"],
    weight: 1.3,
    capitalIntensity: 1.8,
    surge: { 2020: 1.6, 2021: 2.0, 2022: 1.3, 2023: 1.1, 2024: 1.2, 2025: 1.3 },
  },
  {
    id: "climate-energy",
    name: "Climate & Energy",
    categories: ["Clean Energy", "Batteries", "Carbon Capture", "EV Infrastructure", "Grid Tech"],
    weight: 0.9,
    capitalIntensity: 1.9,
    surge: { 2019: 1.2, 2020: 1.4, 2021: 1.8, 2022: 2.2, 2023: 2.4, 2024: 2.6, 2025: 2.8 },
  },
  {
    id: "enterprise-saas",
    name: "Enterprise Software",
    categories: ["SaaS", "DevTools", "Data Infrastructure", "Productivity", "Vertical SaaS"],
    weight: 1.6,
    capitalIntensity: 1.1,
    surge: { 2019: 1.3, 2020: 1.5, 2021: 2.0, 2022: 1.3, 2023: 1.0, 2024: 1.1 },
  },
  {
    id: "cybersecurity",
    name: "Cybersecurity",
    categories: ["Network Security", "Identity", "Cloud Security", "Threat Intelligence"],
    weight: 0.8,
    capitalIntensity: 1.2,
    surge: { 2020: 1.4, 2021: 1.8, 2022: 1.6, 2023: 1.4, 2024: 1.6, 2025: 1.8 },
  },
  {
    id: "commerce-retail",
    name: "Commerce & Retail",
    categories: ["E-Commerce", "Marketplaces", "Retail Tech", "Logistics", "D2C"],
    weight: 1.2,
    capitalIntensity: 1.2,
    surge: { 2020: 1.6, 2021: 2.1, 2022: 1.1, 2023: 0.8 },
  },
  {
    id: "crypto-web3",
    name: "Crypto & Web3",
    categories: ["Blockchain", "DeFi", "NFTs", "Crypto Infrastructure", "Wallets"],
    weight: 0.7,
    capitalIntensity: 1.3,
    surge: { 2017: 1.8, 2018: 1.6, 2021: 3.0, 2022: 2.4, 2023: 0.5, 2024: 0.9, 2025: 1.4 },
  },
  {
    id: "transportation-mobility",
    name: "Transportation & Mobility",
    categories: ["Autonomous Vehicles", "Micromobility", "Delivery", "Aviation"],
    weight: 0.8,
    capitalIntensity: 1.7,
    surge: { 2018: 1.6, 2019: 1.8, 2021: 1.6, 2022: 1.0, 2023: 0.8 },
  },
  {
    id: "food-agriculture",
    name: "Food & Agriculture",
    categories: ["AgTech", "Alternative Protein", "Food Delivery", "Farm Robotics"],
    weight: 0.7,
    capitalIntensity: 1.4,
    surge: { 2020: 1.4, 2021: 1.9, 2022: 1.2, 2023: 0.9 },
  },
  {
    id: "proptech",
    name: "Real Estate & PropTech",
    categories: ["PropTech", "Construction Tech", "Smart Buildings", "Real Estate Marketplaces"],
    weight: 0.6,
    capitalIntensity: 1.5,
    surge: { 2019: 1.5, 2021: 1.8, 2022: 1.0, 2023: 0.7 },
  },
  {
    id: "media-entertainment",
    name: "Media & Entertainment",
    categories: ["Streaming", "Gaming", "Creator Economy", "AdTech"],
    weight: 0.8,
    capitalIntensity: 1.0,
    surge: { 2020: 1.4, 2021: 2.0, 2022: 1.1, 2023: 0.9 },
  },
  {
    id: "education",
    name: "Education",
    categories: ["EdTech", "Workforce Training", "Learning Platforms"],
    weight: 0.6,
    capitalIntensity: 0.9,
    surge: { 2020: 2.2, 2021: 2.4, 2022: 1.0, 2023: 0.6 },
  },
  {
    id: "hardware-robotics",
    name: "Hardware & Robotics",
    categories: ["Robotics", "Semiconductors", "IoT", "Manufacturing Tech"],
    weight: 0.7,
    capitalIntensity: 1.8,
    surge: { 2021: 1.4, 2023: 1.5, 2024: 1.9, 2025: 2.2 },
  },
  {
    id: "space-defense",
    name: "Space & Defense",
    categories: ["Space Tech", "Defense Tech", "Satellites", "Aerospace"],
    weight: 0.5,
    capitalIntensity: 2.0,
    surge: { 2021: 1.6, 2022: 1.8, 2023: 2.0, 2024: 2.6, 2025: 3.0 },
  },
  {
    id: "consumer-social",
    name: "Consumer & Social",
    categories: ["Social", "Consumer Apps", "Travel", "Fitness & Wellness"],
    weight: 0.9,
    capitalIntensity: 0.9,
    surge: { 2020: 1.3, 2021: 1.9, 2022: 1.0, 2023: 0.7 },
  },
];

interface GeoDef {
  countryCode: string;
  region: string;
  city: string;
  weight: number;
}

const GEOS: GeoDef[] = [
  { countryCode: "USA", region: "California", city: "San Francisco", weight: 3.2 },
  { countryCode: "USA", region: "New York", city: "New York", weight: 1.6 },
  { countryCode: "USA", region: "Massachusetts", city: "Boston", weight: 1.0 },
  { countryCode: "USA", region: "Texas", city: "Austin", weight: 0.8 },
  { countryCode: "USA", region: "Washington", city: "Seattle", weight: 0.7 },
  { countryCode: "GBR", region: "England", city: "London", weight: 1.1 },
  { countryCode: "DEU", region: "Berlin", city: "Berlin", weight: 0.7 },
  { countryCode: "FRA", region: "Île-de-France", city: "Paris", weight: 0.6 },
  { countryCode: "IND", region: "Karnataka", city: "Bangalore", weight: 0.9 },
  { countryCode: "CHN", region: "Beijing", city: "Beijing", weight: 0.8 },
  { countryCode: "CAN", region: "Ontario", city: "Toronto", weight: 0.5 },
  { countryCode: "ISR", region: "Tel Aviv", city: "Tel Aviv", weight: 0.6 },
  { countryCode: "SGP", region: "Singapore", city: "Singapore", weight: 0.5 },
];

// Stage ladder used to build per-company funding trajectories.
const STAGE_LADDER = [
  "seed",
  "series_a",
  "series_b",
  "series_c",
  "series_d",
  "series_e",
] as const;

// Typical round size (USD) midpoints by investment_type.
const SIZE_BY_TYPE: Record<string, number> = {
  pre_seed: 1_200_000,
  seed: 3_500_000,
  series_a: 14_000_000,
  series_b: 33_000_000,
  series_c: 70_000_000,
  series_d: 130_000_000,
  series_e: 220_000_000,
  private_equity: 400_000_000,
};

function pickWeighted<T extends { weight: number }>(
  items: T[],
  rnd: () => number,
): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = rnd() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export interface MockDatasetOptions {
  seed?: number;
  startYear?: number;
  endYear?: number;
  /** Global scaler on number of companies formed. */
  scale?: number;
}

export function generateMockDataset(opts: MockDatasetOptions = {}): MockDataset {
  const seed = opts.seed ?? 1337;
  const startYear = opts.startYear ?? 2013;
  const endYear = opts.endYear ?? 2025;
  const scale = opts.scale ?? 1;
  const rnd = seededRandom(seed);

  // Build category-group + category reference data.
  const categoryGroups: CategoryGroup[] = GROUPS.map((g) => ({
    id: g.id,
    name: g.name,
  }));
  const categories: Category[] = [];
  const categoriesByGroup: Record<string, Category[]> = {};
  for (const g of GROUPS) {
    categoriesByGroup[g.id] = [];
    for (const cName of g.categories) {
      const cat: Category = {
        id: `${g.id}/${cName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        name: cName,
        groupId: g.id,
        groupName: g.name,
      };
      categories.push(cat);
      categoriesByGroup[g.id].push(cat);
    }
  }

  const organizations: Organization[] = [];
  const rounds: FundingRound[] = [];

  let orgCounter = 0;
  let roundCounter = 0;

  const surgeFor = (g: GroupDef, year: number) => g.surge[year] ?? 1;
  // Broad market scaler: VC dollars grew through 2021, pulled back 2022-2023.
  const marketScale = (year: number): number => {
    const base = 1 + (year - startYear) * 0.16; // secular growth
    const cycle: Record<number, number> = {
      2021: 1.5,
      2022: 1.05,
      2023: 0.8,
      2024: 0.95,
      2025: 1.1,
    };
    return base * (cycle[year] ?? 1);
  };

  for (let year = startYear; year <= endYear; year++) {
    for (const g of GROUPS) {
      // New companies formed by this group in this cohort year.
      const expected =
        6 * g.weight * surgeFor(g, year) * marketScale(year) * scale;
      const count = Math.max(0, Math.round(expected + (rnd() - 0.5) * 2));

      for (let i = 0; i < count; i++) {
        const geo = pickWeighted(GEOS, rnd);
        const primaryCat = categoriesByGroup[g.id][
          Math.floor(rnd() * categoriesByGroup[g.id].length)
        ];
        const catIds = [primaryCat.id];
        const groupIds = [g.id];
        // ~20% of companies also tagged with a second (sometimes cross-group) category.
        if (rnd() < 0.2) {
          const otherGroup = GROUPS[Math.floor(rnd() * GROUPS.length)];
          const otherCat =
            categoriesByGroup[otherGroup.id][
              Math.floor(rnd() * categoriesByGroup[otherGroup.id].length)
            ];
          if (!catIds.includes(otherCat.id)) {
            catIds.push(otherCat.id);
            if (!groupIds.includes(otherGroup.id)) groupIds.push(otherGroup.id);
          }
        }

        orgCounter++;
        const uuid = `org-${orgCounter.toString(36)}`;
        const foundedMonth = 1 + Math.floor(rnd() * 12);
        const foundedDay = 1 + Math.floor(rnd() * 27);
        const orgName = `${primaryCat.name.split(" ")[0]} ${
          ["Labs", "AI", "Technologies", "Systems", "Networks", "Works", "Health", "Capital", "Dynamics", "Bio"][
            orgCounter % 10
          ]
        } ${orgCounter}`;

        const org: Organization = {
          uuid,
          permalink: `mock-org-${orgCounter}`,
          name: orgName,
          shortDescription: `${primaryCat.name} company building in the ${g.name.toLowerCase()} space.`,
          countryCode: geo.countryCode,
          region: geo.region,
          city: geo.city,
          foundedOn: `${year}-${pad(foundedMonth)}-${pad(foundedDay)}`,
          fundingTotalUsd: 0,
          lastFundingAt: null,
          categoryIds: catIds,
          categoryGroupIds: groupIds,
          cbUpdatedAt: `${endYear}-12-31`,
        };

        // Build a funding trajectory.
        let stageIdx = rnd() < 0.15 ? -1 : 0; // 15% start at pre_seed
        let roundYear = year;
        let roundMonth = foundedMonth + Math.floor(rnd() * 6);
        let total = 0;
        const maxRounds = 1 + Math.floor(rnd() * STAGE_LADDER.length);
        for (let r = 0; r < maxRounds; r++) {
          if (roundYear > endYear) break;
          const type =
            stageIdx < 0 ? "pre_seed" : STAGE_LADDER[Math.min(stageIdx, STAGE_LADDER.length - 1)];
          // Round size: midpoint * capitalIntensity * noise * surge influence.
          const mid = SIZE_BY_TYPE[type] ?? 5_000_000;
          const noise = 0.5 + rnd() * 1.4;
          const surgeBoost = 0.85 + (surgeFor(g, roundYear) - 1) * 0.25;
          const amount = Math.round(
            (mid * g.capitalIntensity * noise * Math.max(0.6, surgeBoost)) / 1000,
          ) * 1000;

          if (roundMonth > 12) {
            roundYear += Math.floor((roundMonth - 1) / 12);
            roundMonth = ((roundMonth - 1) % 12) + 1;
          }
          if (roundYear > endYear) break;

          const day = 1 + Math.floor(rnd() * 27);
          const announcedOn = `${roundYear}-${pad(roundMonth)}-${pad(day)}`;
          // Currency: mostly USD, sometimes local.
          const localCurrency =
            geo.countryCode === "GBR"
              ? "GBP"
              : geo.countryCode === "DEU" || geo.countryCode === "FRA"
                ? "EUR"
                : geo.countryCode === "IND"
                  ? "INR"
                  : geo.countryCode === "CHN"
                    ? "CNY"
                    : "USD";
          const currencyOriginal = rnd() < 0.7 ? "USD" : localCurrency;

          roundCounter++;
          const numInvestors = 1 + Math.floor(rnd() * 6);
          const round: FundingRound = {
            uuid: `rd-${roundCounter.toString(36)}`,
            orgUuid: uuid,
            orgName,
            orgPermalink: org.permalink,
            announcedOn,
            investmentType: type,
            stageBucket: stageBucketFor(type),
            moneyRaisedUsd: amount,
            currencyOriginal,
            numInvestors,
            leadInvestorUuids: [`inv-${(roundCounter % 200).toString(36)}`],
            investorUuids: Array.from(
              { length: numInvestors },
              (_, k) => `inv-${((roundCounter + k) % 200).toString(36)}`,
            ),
            orgCategoryIds: catIds,
            orgCategoryGroupIds: groupIds,
            cbUpdatedAt: announcedOn,
          };
          rounds.push(round);
          total += amount;
          org.lastFundingAt = announcedOn;

          // Advance: chance to stop raising increases at later stages.
          stageIdx = Math.max(0, stageIdx) + 1;
          roundMonth += 12 + Math.floor(rnd() * 12);
          if (rnd() < 0.25 + stageIdx * 0.08) break; // dropout
        }
        org.fundingTotalUsd = total;
        organizations.push(org);
      }
    }
  }

  // Sort rounds chronologically so cursor-based pagination is meaningful.
  rounds.sort((a, b) =>
    a.announcedOn < b.announcedOn ? -1 : a.announcedOn > b.announcedOn ? 1 : a.uuid < b.uuid ? -1 : 1,
  );

  return { categoryGroups, categories, organizations, rounds };
}

// Cache the default dataset so repeated provider calls are cheap + consistent.
let defaultDataset: MockDataset | null = null;
export function getDefaultMockDataset(): MockDataset {
  if (!defaultDataset) defaultDataset = generateMockDataset();
  return defaultDataset;
}
