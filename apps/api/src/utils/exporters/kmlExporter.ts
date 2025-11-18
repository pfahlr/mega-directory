/**
 * KML 2.2 export utility for user lists
 * Generates KML files compatible with Google Earth and Google Maps
 * Uses WGS84 (EPSG:4326) projection
 */

export interface KmlPlacemarkData {
  name: string;
  description?: string | null;
  latitude: number;
  longitude: number;
  notes?: string | null;
}

export interface KmlDocumentData {
  title: string;
  description?: string | null;
  placemarks: KmlPlacemarkData[];
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
 * Format coordinates for KML
 * KML uses longitude,latitude,altitude format
 * WGS84 projection with 6 decimal places precision
 * @param longitude Longitude in decimal degrees
 * @param latitude Latitude in decimal degrees
 * @returns Formatted coordinates string
 */
function formatKmlCoordinates(longitude: number, latitude: number): string {
  const lon = longitude.toFixed(6);
  const lat = latitude.toFixed(6);
  const altitude = '0'; // Always 0 for ground-level points

  return `${lon},${lat},${altitude}`;
}

/**
 * Generate KML placemark for a single location
 */
function generatePlacemark(data: KmlPlacemarkData): string {
  const name = escapeXml(data.name);
  const description = data.description || data.notes || '';
  const escapedDescription = escapeXml(description);
  const coordinates = formatKmlCoordinates(data.longitude, data.latitude);

  return `    <Placemark>
      <name>${name}</name>
      <description>${escapedDescription}</description>
      <Point>
        <coordinates>${coordinates}</coordinates>
      </Point>
    </Placemark>`;
}

/**
 * Generate complete KML 2.2 document
 * @param data Document data with title, description, and placemarks
 * @returns KML XML string
 */
export function generateKml(data: KmlDocumentData): string {
  const title = escapeXml(data.title);
  const description = data.description ? escapeXml(data.description) : '';

  const placemarks = data.placemarks
    .map((placemark) => generatePlacemark(placemark))
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${title}</name>
    <description>${description}</description>
${placemarks}
  </Document>
</kml>`;
}
