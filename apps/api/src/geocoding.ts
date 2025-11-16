import './polyfills/fetch';
import type { Logger } from './logger';

export interface GeocodingAddress {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
}

export interface GeocodingConfig {
  geocodeMapsApiKey?: string;
  googleGeocodeApiKey?: string;
}

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  provider: 'geocode-maps' | 'google-maps';
}

const GEOCODE_MAPS_ENDPOINT = 'https://geocode.maps.co/search';
const GOOGLE_GEOCODE_ENDPOINT = 'https://maps.googleapis.com/maps/api/geocode/json';

export async function geocodeListingLocation(
  location: GeocodingAddress | null,
  config: GeocodingConfig,
  logger?: Logger
): Promise<GeocodeResult | null> {
  const query = buildAddressQuery(location);
  if (!query) {
    return null;
  }

  const providers: Array<() => Promise<GeocodeResult | null>> = [
    () => geocodeWithGeocodeMaps(query, config.geocodeMapsApiKey, logger),
    () => geocodeWithGoogle(query, config.googleGeocodeApiKey, logger)
  ];

  for (const lookup of providers) {
    try {
      const result = await lookup();
      if (result) {
        return result;
      }
    } catch (error) {
      logger?.warn(
        { event: 'geocode.provider.error', error: describeError(error) },
        'Geocoding provider threw an unexpected error'
      );
    }
  }

  return null;
}

function buildAddressQuery(location?: GeocodingAddress | null): string | null {
  if (!location) {
    return null;
  }
  const parts = [
    location.addressLine1,
    location.addressLine2,
    location.city,
    location.region,
    location.postalCode,
    location.country
  ]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter((part) => part.length > 0);

  return parts.length > 0 ? parts.join(', ') : null;
}

async function geocodeWithGeocodeMaps(
  query: string,
  apiKey: string | undefined,
  logger?: Logger
): Promise<GeocodeResult | null> {
  const url = new URL(GEOCODE_MAPS_ENDPOINT);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  if (apiKey) {
    url.searchParams.set('api_key', apiKey);
  }

  try {
    const response = await fetch(url.toString(), {
      headers: { accept: 'application/json' }
    });
    if (!response.ok) {
      const details = await safeReadBody(response);
      logger?.warn(
        {
          event: 'geocode.maps.http_error',
          status: response.status,
          provider: 'geocode-maps',
          details
        },
        'Geocode Maps request failed'
      );
      return null;
    }

    const payload = await response.json();
    if (!Array.isArray(payload) || payload.length === 0) {
      logger?.debug({ event: 'geocode.maps.zero_results' }, 'Geocode Maps returned no matches');
      return null;
    }

    for (const candidate of payload) {
      const lat = safeNumber(candidate?.lat);
      const lon = safeNumber(candidate?.lon);
      if (lat !== null && lon !== null) {
        return { latitude: lat, longitude: lon, provider: 'geocode-maps' };
      }
    }

    logger?.warn(
      { event: 'geocode.maps.invalid_result', provider: 'geocode-maps' },
      'Geocode Maps response lacked numeric coordinates'
    );
    return null;
  } catch (error) {
    logger?.warn(
      { event: 'geocode.maps.error', provider: 'geocode-maps', error: describeError(error) },
      'Geocode Maps lookup failed'
    );
    return null;
  }
}

async function geocodeWithGoogle(
  query: string,
  apiKey: string | undefined,
  logger?: Logger
): Promise<GeocodeResult | null> {
  if (!apiKey) {
    logger?.debug({ event: 'geocode.google.skip', reason: 'missing-api-key' }, 'Skipped Google geocoding due to missing key');
    return null;
  }

  const url = new URL(GOOGLE_GEOCODE_ENDPOINT);
  url.searchParams.set('address', query);
  url.searchParams.set('key', apiKey);

  try {
    const response = await fetch(url.toString(), {
      headers: { accept: 'application/json' }
    });
    if (!response.ok) {
      const details = await safeReadBody(response);
      logger?.warn(
        {
          event: 'geocode.google.http_error',
          status: response.status,
          provider: 'google-maps',
          details
        },
        'Google geocoding request failed'
      );
      return null;
    }

    const payload = await response.json();
    if (!payload || payload.status !== 'OK' || !Array.isArray(payload.results) || payload.results.length === 0) {
      logger?.debug(
        {
          event: 'geocode.google.non_ok_status',
          provider: 'google-maps',
          status: payload?.status ?? 'UNKNOWN'
        },
        'Google geocoding did not return any matches'
      );
      return null;
    }

    const primary = payload.results[0]?.geometry?.location;
    const lat = safeNumber(primary?.lat);
    const lon = safeNumber(primary?.lng);
    if (lat === null || lon === null) {
      logger?.warn(
        { event: 'geocode.google.invalid_result', provider: 'google-maps' },
        'Google geocoding returned coordinates in an unexpected format'
      );
      return null;
    }

    return { latitude: lat, longitude: lon, provider: 'google-maps' };
  } catch (error) {
    logger?.warn(
      { event: 'geocode.google.error', provider: 'google-maps', error: describeError(error) },
      'Google geocoding lookup failed'
    );
    return null;
  }
}

function safeNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

async function safeReadBody(response: { text(): Promise<string> }): Promise<string | undefined> {
  try {
    return await response.text();
  } catch (_err) {
    return undefined;
  }
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch (_err) {
    return 'Unknown error';
  }
}
