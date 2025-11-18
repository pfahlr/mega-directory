/**
 * CSV export utility for user lists
 * Generates CSV files with listing data
 */

export interface ListingExportData {
  name: string;
  description?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  website?: string | null;
  phone?: string | null;
  categories?: string;
  notes?: string | null;
}

/**
 * Escape CSV field value
 * Handles quotes and commas properly
 */
function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  const strValue = String(value);

  // If field contains comma, quote, or newline, wrap in quotes and escape quotes
  if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
    return `"${strValue.replace(/"/g, '""')}"`;
  }

  return strValue;
}

/**
 * Convert listings data to CSV format
 * @param listings Array of listing data
 * @returns CSV string
 */
export function generateCsv(listings: ListingExportData[]): string {
  const headers = [
    'Name',
    'Description',
    'Address',
    'Latitude',
    'Longitude',
    'Website',
    'Phone',
    'Categories',
    'Notes',
  ];

  // Create header row
  const headerRow = headers.join(',');

  // Create data rows
  const dataRows = listings.map((listing) => {
    const row = [
      escapeCsvField(listing.name),
      escapeCsvField(listing.description),
      escapeCsvField(listing.address),
      escapeCsvField(listing.latitude),
      escapeCsvField(listing.longitude),
      escapeCsvField(listing.website),
      escapeCsvField(listing.phone),
      escapeCsvField(listing.categories),
      escapeCsvField(listing.notes),
    ];

    return row.join(',');
  });

  // Combine header and data
  return [headerRow, ...dataRows].join('\n');
}

/**
 * Format address from listing address data
 */
export function formatAddress(addresses: any[]): string | null {
  if (!addresses || addresses.length === 0) {
    return null;
  }

  const primary = addresses[0];
  const parts = [
    primary.addressLine1,
    primary.addressLine2,
    primary.city,
    primary.region,
    primary.postalCode,
    primary.country,
  ].filter(Boolean);

  return parts.join(', ');
}

/**
 * Format categories as comma-separated string
 */
export function formatCategories(categories: any[]): string {
  if (!categories || categories.length === 0) {
    return '';
  }

  return categories.map((c) => c.category?.name || 'Unknown').join(', ');
}
