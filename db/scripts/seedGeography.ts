import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { promises as fsp } from 'node:fs';
import { PrismaClient, Prisma } from '@prisma/client';

type CountryJsonRecord = {
  id: number;
  name: string;
  iso2: string;
  iso3?: string | null;
  numeric_code?: string | null;
  phone_code?: string | null;
  capital?: string | null;
  currency?: string | null;
  currency_name?: string | null;
  currency_symbol?: string | null;
  tld?: string | null;
  native?: string | null;
  region?: string | null;
  subregion?: string | null;
  translations?: unknown;
  timezones?: unknown;
  latitude?: string | number | null;
  longitude?: string | number | null;
  emoji?: string | null;
  emojiU?: string | null;
  wikiDataId?: string | null;
};

type StateJsonRecord = {
  id: number;
  name: string;
  country_id: number;
  country_code: string;
  country_name?: string;
  state_code?: string | null;
  type?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
};

type CityJsonRecord = {
  id: number;
  name: string;
  ascii_name?: string | null;
  state_id?: number | null;
  state_code?: string | null;
  state_name?: string | null;
  country_id: number;
  country_code: string;
  country_name?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
  wikiDataId?: string | null;
  population?: number | string | null;
  timezone?: string | null;
};

type PostalRow = {
  countryCode: string;
  postalCode: string;
  placeName: string;
  stateName?: string | null;
  stateCode?: string | null;
  countyName?: string | null;
  countyCode?: string | null;
  cityName?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  accuracy?: string | null;
};

type SeedPaths = {
  datasetDir: string;
  countriesFile: string;
  statesFile: string;
  citiesFile: string;
  postalFile: string;
};

type SeedSummary = {
  countries: number;
  states: number;
  cities: number;
  postalCodes: number;
};

type StateLookup = {
  byCode: Map<string, number>;
  byName: Map<string, number>;
};

type CityLookup = {
  byCountryStateAndName: Map<string, number>;
  byCountryAndName: Map<string, number>;
};

const prisma = new PrismaClient();
const DEFAULT_DATASET_DIR = path.resolve(__dirname, '../geography/sample');
const DATASET_DIR = path.resolve(process.env.GEO_DATASET_DIR ?? DEFAULT_DATASET_DIR);
const POSTAL_FILE_OVERRIDE = process.env.GEO_POSTAL_FILE
  ? path.resolve(process.env.GEO_POSTAL_FILE)
  : undefined;
const CREATE_BATCH_SIZE = parseEnvInt('GEO_CREATE_BATCH_SIZE', 500);
const POSTAL_BATCH_SIZE = parseEnvInt('GEO_POSTAL_BATCH_SIZE', 2000);

async function main() {
  const summary: SeedSummary = { countries: 0, states: 0, cities: 0, postalCodes: 0 };

  try {
    const paths = await resolvePaths();
    console.info('[geo-seed] Using dataset directory:', paths.datasetDir);
    const [countryJson, stateJson, cityJson] = await Promise.all([
      readJsonFile<CountryJsonRecord[]>(paths.countriesFile),
      readJsonFile<StateJsonRecord[]>(paths.statesFile),
      readJsonFile<CityJsonRecord[]>(paths.citiesFile)
    ]);

    const allCountryIds = new Set(countryJson.map((record) => record.id));
    const isoToCountryId = new Map(countryJson.map((record) => [record.iso2.toUpperCase(), record.id]));

    summary.countries = countryJson.length;
    await seedCountries(countryJson);

    const { stateLookup, countriesWithStates } = await seedStates(stateJson);
    summary.states = stateJson.length;

    const cityLookup = await seedCities(cityJson);
    summary.cities = cityJson.length;

    const postalStats = await seedPostalCodes(paths.postalFile, {
      isoToCountryId,
      stateLookup,
      cityLookup
    });
    summary.postalCodes = postalStats.processed;

    await updateCountryFlags({
      allCountryIds,
      countriesWithStates,
      countriesWithPostalCodes: postalStats.countriesWithPostalCodes
    });

    console.info('[geo-seed] Completed geographic bootstrap', summary);
  } catch (error) {
    console.error('[geo-seed] Failed to seed geography', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

async function resolvePaths(): Promise<SeedPaths> {
  const datasetDir = DATASET_DIR;
  const countriesFile = path.join(datasetDir, 'countries.json');
  const statesFile = path.join(datasetDir, 'states.json');
  const citiesFile = path.join(datasetDir, 'cities.json');
  const postalFile = POSTAL_FILE_OVERRIDE ?? path.join(datasetDir, 'postal_codes.txt');

  await Promise.all([
    ensureFile(countriesFile),
    ensureFile(statesFile),
    ensureFile(citiesFile),
    ensureFile(postalFile)
  ]);

  return { datasetDir, countriesFile, statesFile, citiesFile, postalFile };
}

async function ensureFile(filePath: string): Promise<void> {
  try {
    await fsp.access(filePath, fs.constants.R_OK);
  } catch (error) {
    throw new Error(`Required dataset file not found at ${filePath}`);
  }
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await fsp.readFile(filePath, 'utf8');
  return JSON.parse(raw) as T;
}

async function seedCountries(records: CountryJsonRecord[]): Promise<void> {
  const batchInputs: Prisma.CountryCreateManyInput[] = records.map((country) => ({
    id: country.id,
    name: country.name,
    iso2: country.iso2.toUpperCase(),
    iso3: sanitizeString(country.iso3),
    numericCode: sanitizeString(country.numeric_code),
    phoneCode: sanitizeString(country.phone_code),
    capital: sanitizeString(country.capital),
    currency: sanitizeString(country.currency),
    currencyName: sanitizeString(country.currency_name),
    currencySymbol: sanitizeString(country.currency_symbol),
    tld: sanitizeString(country.tld),
    nativeName: sanitizeString(country.native),
    region: sanitizeString(country.region),
    subregion: sanitizeString(country.subregion),
    translations: country.translations ?? Prisma.JsonNull,
    timezones: country.timezones ?? Prisma.JsonNull,
    latitude: toFloat(country.latitude),
    longitude: toFloat(country.longitude),
    emoji: sanitizeString(country.emoji),
    emojiU: sanitizeString(country.emojiU),
    wikiDataId: sanitizeString(country.wikiDataId),
    hasStates: true,
    hasPostalCodes: true
  }));

  await chunkedCreateMany(batchInputs, async (chunk) => {
    await prisma.country.createMany({ data: chunk, skipDuplicates: true });
  });
}

async function seedStates(records: StateJsonRecord[]): Promise<{
  stateLookup: StateLookup;
  countriesWithStates: Set<number>;
}> {
  const byCode = new Map<string, number>();
  const byName = new Map<string, number>();
  const countriesWithStates = new Set<number>();

  const inputs: Prisma.StateProvinceCreateManyInput[] = records.map((state) => {
    const countryCode = state.country_code.toUpperCase();
    const codeKey = buildStateCodeKey(countryCode, state.state_code);
    if (codeKey) {
      byCode.set(codeKey, state.id);
    }
    const nameKey = buildStateNameKey(countryCode, state.name);
    if (nameKey) {
      byName.set(nameKey, state.id);
    }
    countriesWithStates.add(state.country_id);

    return {
      id: state.id,
      name: state.name,
      stateCode: sanitizeString(state.state_code),
      type: sanitizeString(state.type),
      latitude: toFloat(state.latitude),
      longitude: toFloat(state.longitude),
      countryId: state.country_id,
      countryCode
    } satisfies Prisma.StateProvinceCreateManyInput;
  });

  await chunkedCreateMany(inputs, async (chunk) => {
    await prisma.stateProvince.createMany({ data: chunk, skipDuplicates: true });
  });

  return { stateLookup: { byCode, byName }, countriesWithStates };
}

async function seedCities(records: CityJsonRecord[]): Promise<CityLookup> {
  const byCountryStateAndName = new Map<string, number>();
  const byCountryAndName = new Map<string, number>();

  const inputs: Prisma.CityCreateManyInput[] = records.map((city) => {
    const countryCode = city.country_code.toUpperCase();
    const stateCode = sanitizeString(city.state_code);
    const normalizedKey = buildCityKey(countryCode, stateCode, city.name);
    if (normalizedKey) {
      byCountryStateAndName.set(normalizedKey, city.id);
    }
    const fallbackKey = buildCityKey(countryCode, null, city.name);
    if (fallbackKey) {
      byCountryAndName.set(fallbackKey, city.id);
    }

    return {
      id: city.id,
      name: city.name,
      asciiName: sanitizeString(city.ascii_name),
      latitude: toFloat(city.latitude),
      longitude: toFloat(city.longitude),
      population: toInteger(city.population),
      timezone: sanitizeString(city.timezone),
      wikiDataId: sanitizeString(city.wikiDataId),
      stateId: city.state_id ?? null,
      stateCode,
      stateName: sanitizeString(city.state_name),
      countryId: city.country_id,
      countryCode
    } satisfies Prisma.CityCreateManyInput;
  });

  await chunkedCreateMany(inputs, async (chunk) => {
    await prisma.city.createMany({ data: chunk, skipDuplicates: true });
  });

  return { byCountryStateAndName, byCountryAndName };
}

async function seedPostalCodes(
  postalFile: string,
  lookups: {
    isoToCountryId: Map<string, number>;
    stateLookup: StateLookup;
    cityLookup: CityLookup;
  }
): Promise<{ processed: number; countriesWithPostalCodes: Set<number> }> {
  if (!fs.existsSync(postalFile)) {
    throw new Error(`Postal code dataset missing at ${postalFile}`);
  }

  const countriesWithPostalCodes = new Set<number>();
  const batch: Prisma.PostalCodeCreateManyInput[] = [];
  const stream = fs.createReadStream(postalFile);
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let processed = 0;

  for await (const line of rl) {
    if (!line || line.startsWith('#')) {
      continue;
    }
    const row = parsePostalLine(line);
    if (!row) {
      continue;
    }
    const countryId = lookups.isoToCountryId.get(row.countryCode.toUpperCase());
    if (!countryId) {
      continue;
    }

    const stateId = resolveStateId(row, lookups.stateLookup);
    const cityId = resolveCityId(row, lookups.cityLookup);

    batch.push({
      code: row.postalCode,
      placeName: row.placeName,
      countryId,
      countryCode: row.countryCode.toUpperCase(),
      stateId,
      stateCode: sanitizeString(row.stateCode),
      stateName: sanitizeString(row.stateName),
      countyName: sanitizeString(row.countyName),
      countyCode: sanitizeString(row.countyCode),
      cityId,
      latitude: toFloat(row.latitude),
      longitude: toFloat(row.longitude),
      accuracy: toInteger(row.accuracy)
    });
    processed += 1;
    countriesWithPostalCodes.add(countryId);

    if (batch.length >= POSTAL_BATCH_SIZE) {
      await prisma.postalCode.createMany({ data: batch, skipDuplicates: true });
      batch.length = 0;
    }
  }

  if (batch.length > 0) {
    await prisma.postalCode.createMany({ data: batch, skipDuplicates: true });
  }

  return { processed, countriesWithPostalCodes };
}

async function updateCountryFlags(params: {
  allCountryIds: Set<number>;
  countriesWithStates: Set<number>;
  countriesWithPostalCodes: Set<number>;
}): Promise<void> {
  const { allCountryIds, countriesWithStates, countriesWithPostalCodes } = params;
  const withStates = Array.from(countriesWithStates);
  if (withStates.length > 0) {
    await prisma.country.updateMany({
      data: { hasStates: true },
      where: { id: { in: withStates } }
    });
  }
  const withoutStates = Array.from(allCountryIds).filter((id) => !countriesWithStates.has(id));
  if (withoutStates.length > 0) {
    await prisma.country.updateMany({
      data: { hasStates: false },
      where: { id: { in: withoutStates } }
    });
  }

  const withPostal = Array.from(countriesWithPostalCodes);
  if (withPostal.length > 0) {
    await prisma.country.updateMany({
      data: { hasPostalCodes: true },
      where: { id: { in: withPostal } }
    });
  }
  const withoutPostal = Array.from(allCountryIds).filter((id) => !countriesWithPostalCodes.has(id));
  if (withoutPostal.length > 0) {
    await prisma.country.updateMany({
      data: { hasPostalCodes: false },
      where: { id: { in: withoutPostal } }
    });
  }
}

function resolveStateId(row: PostalRow, lookup: StateLookup): number | null {
  if (row.stateCode) {
    const codeKey = buildStateCodeKey(row.countryCode.toUpperCase(), row.stateCode);
    const codeMatch = codeKey ? lookup.byCode.get(codeKey) : undefined;
    if (codeMatch) {
      return codeMatch;
    }
  }
  if (row.stateName) {
    const nameKey = buildStateNameKey(row.countryCode.toUpperCase(), row.stateName);
    const nameMatch = nameKey ? lookup.byName.get(nameKey) : undefined;
    if (nameMatch) {
      return nameMatch;
    }
  }
  return null;
}

function resolveCityId(row: PostalRow, lookup: CityLookup): number | null {
  const stateCode = sanitizeString(row.stateCode);
  const key = buildCityKey(row.countryCode.toUpperCase(), stateCode, row.cityName ?? row.placeName);
  if (key) {
    const exact = lookup.byCountryStateAndName.get(key);
    if (exact) {
      return exact;
    }
  }
  const fallbackKey = buildCityKey(row.countryCode.toUpperCase(), null, row.cityName ?? row.placeName);
  if (fallbackKey) {
    const fallback = lookup.byCountryAndName.get(fallbackKey);
    if (fallback) {
      return fallback;
    }
  }
  return null;
}

function parsePostalLine(line: string): PostalRow | null {
  const parts = line.split('\t');
  if (parts.length < 4) {
    return null;
  }
  return {
    countryCode: parts[0],
    postalCode: parts[1],
    placeName: parts[2],
    stateName: parts[3] || null,
    stateCode: parts[4] || null,
    countyName: parts[5] || null,
    countyCode: parts[6] || null,
    cityName: parts[2],
    latitude: parts[9] || null,
    longitude: parts[10] || null,
    accuracy: parts[11] || null
  };
}

function sanitizeString(value?: string | null): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = `${value}`.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toFloat(value?: string | number | null): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const numeric = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toInteger(value?: string | number | null): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = typeof value === 'number' ? value : Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseEnvInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function chunkedCreateMany<T>(records: T[], handler: (chunk: T[]) => Promise<void>): Promise<void> {
  for (let index = 0; index < records.length; index += CREATE_BATCH_SIZE) {
    const chunk = records.slice(index, index + CREATE_BATCH_SIZE);
    if (chunk.length === 0) {
      continue;
    }
    await handler(chunk);
  }
}

function buildStateCodeKey(countryCode: string, stateCode?: string | null): string | null {
  const normalizedCode = sanitizeString(stateCode);
  if (!normalizedCode) {
    return null;
  }
  return `${countryCode.toUpperCase()}::${normalizedCode.toUpperCase()}`;
}

function buildStateNameKey(countryCode: string, name?: string | null): string | null {
  const normalizedName = normalizeName(name);
  if (!normalizedName) {
    return null;
  }
  return `${countryCode.toUpperCase()}::${normalizedName}`;
}

function buildCityKey(countryCode: string, stateCode: string | null, name?: string | null): string | null {
  const normalizedName = normalizeName(name);
  if (!normalizedName) {
    return null;
  }
  const statePart = stateCode ? stateCode.toUpperCase() : '*';
  return `${countryCode.toUpperCase()}::${statePart}::${normalizedName}`;
}

function normalizeName(value?: string | null): string {
  if (!value) {
    return '';
  }
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

void main();
