/**
 * GPX 1.1 export utility for user lists
 * Generates GPX files compatible with GPS devices and navigation apps
 * Uses WGS84 (EPSG:4326) projection
 */

export interface GpxWaypointData {
  name: string;
  description?: string | null;
  latitude: number;
  longitude: number;
  type?: string | null; // Category or type
  notes?: string | null;
}

export interface GpxDocumentData {
  title: string;
  description?: string | null;
  creator: string;
  waypoints: GpxWaypointData[];
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Format coordinates for GPX
 * GPX uses lat/lon as attributes with 6 decimal places
 * @param latitude Latitude in decimal degrees
 * @param longitude Longitude in decimal degrees
 * @returns Object with formatted lat and lon
 */
function formatGpxCoordinates(latitude: number, longitude: number): { lat: string; lon: string } {
  return {
    lat: latitude.toFixed(6),
    lon: longitude.toFixed(6),
  };
}

/**
 * Get current timestamp in ISO 8601 format
 */
function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Generate GPX waypoint element
 */
function generateWaypoint(data: GpxWaypointData): string {
  const { lat, lon } = formatGpxCoordinates(data.latitude, data.longitude);
  const name = escapeXml(data.name);

  // Combine description and notes
  const description = [data.description, data.notes].filter(Boolean).join(' - ');
  const escapedDescription = description ? escapeXml(description) : '';

  const type = data.type ? escapeXml(data.type) : '';

  return `  <wpt lat="${lat}" lon="${lon}">
    <name>${name}</name>${escapedDescription ? `
    <desc>${escapedDescription}</desc>` : ''}${type ? `
    <type>${type}</type>` : ''}
  </wpt>`;
}

/**
 * Generate complete GPX 1.1 document
 * @param data Document data with metadata and waypoints
 * @returns GPX XML string
 */
export function generateGpx(data: GpxDocumentData): string {
  const title = escapeXml(data.title);
  const description = data.description ? escapeXml(data.description) : '';
  const creator = escapeXml(data.creator);
  const timestamp = getCurrentTimestamp();

  const waypoints = data.waypoints
    .map((waypoint) => generateWaypoint(waypoint))
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="${creator}"
     xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${title}</name>${description ? `
    <desc>${description}</desc>` : ''}
    <time>${timestamp}</time>
  </metadata>
${waypoints}
</gpx>`;
}
