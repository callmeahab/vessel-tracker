/**
 * Centralized API configuration
 * Uses NODE_ENV to determine the base URL:
 * - Development: Uses localhost:8080
 * - Production: Uses relative URLs (empty string)
 */
export const API_BASE_URL = process.env.NODE_ENV === 'development' ? 'http://localhost:8080' : '';

/**
 * Helper function to construct API URLs
 */
export const getApiUrl = (endpoint: string): string => {
  // Ensure endpoint starts with /
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${normalizedEndpoint}`;
};

/**
 * Common API endpoints
 */
export const API_ENDPOINTS = {
  vessels: '/api/vessels',
  vesselsInPark: '/api/vessels/in-park',
  parkBoundaries: '/api/park-boundaries',
  bufferedBoundaries: '/api/buffered-boundaries',
  posidonia: '/api/posidonia',
  shoreline: '/api/shoreline',
  vesselPreviousPositions: (uuid: string, limit: number = 50) => `/api/vessels/${uuid}/previous-positions?limit=${limit}`,
  vesselHistoricalData: (uuid: string, days: number = 7, limit: number = 100) => `/api/vessels/historical-data?uuid=${uuid}&days=${days}&limit=${limit}`,
} as const;