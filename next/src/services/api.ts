/**
 * API service for making requests to the backend
 */

// Get the API URL from environment variables
const API_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * Base API request function with error handling
 */
async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  if (!API_URL) {
    console.error('API_URL is not defined');
    throw new Error('API URL is not configured. Please check your .env file.');
  }
  
  const url = `${API_URL}/${endpoint}`;
  
  console.log(`API Request: ${url}`);
  
  try {
    // Simple fetch with minimal options to reduce potential issues
    const response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        ...options.headers,
      },
    });

    console.log(`API Response status: ${response.status} ${response.statusText}`);

    // Get the response text first to avoid JSON parsing errors
    const responseText = await response.text();
    console.log(`Response text length: ${responseText.length} characters`);
    
    // Try to parse as JSON
    try {
      if (responseText.length === 0) {
        throw new Error('Empty response received from API');
      }
      
      const data = JSON.parse(responseText) as T;
      console.log('API response parsed successfully');
      return data;
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      console.error('Raw response:', responseText);
      throw new Error(`Invalid JSON response from API: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }
  } catch (error: any) {
    console.error('API request failed:', error.message);
    throw new Error(`API request failed: ${error.message}`);
  }
}

/**
 * Measurement interfaces
 */
export interface Measurement {
  id: number;
  temperature: number;
  humidity: number;
  pressure: number;
  battery_level: number;
  measured_at: string;
  created_at: string;
}

export interface MeasurementResponse {
  success: boolean;
  data: Measurement[];
  error?: string;
}

export interface SingleMeasurementResponse {
  success: boolean;
  data: Measurement;
  error?: string;
}

export interface MeasurementStats {
  total_measurements: number;
  avg_temperature: number;
  avg_humidity: number;
  avg_pressure: number;
  min_temperature: number;
  max_temperature: number;
  min_humidity: number;
  max_humidity: number;
  min_pressure: number;
  max_pressure: number;
}

export interface MeasurementStatsResponse {
  success: boolean;
  data: MeasurementStats;
  error?: string;
}

/**
 * Get all measurements for a device
 */
export async function getAllMeasurements(deviceUuid: string, limit: number = 10): Promise<MeasurementResponse> {
  return fetchApi<MeasurementResponse>(`measurement/index?deviceUuid=${deviceUuid}&limit=${limit}`);
}

/**
 * Get the latest measurement for a device
 */
export async function getLatestMeasurement(deviceUuid: string): Promise<SingleMeasurementResponse> {
  return fetchApi<SingleMeasurementResponse>(`measurement/latest?deviceUuid=${deviceUuid}`);
}

/**
 * Get measurement statistics for a device
 */
export async function getMeasurementStats(deviceUuid: string): Promise<MeasurementStatsResponse> {
  return fetchApi<MeasurementStatsResponse>(`measurement/stats?deviceUuid=${deviceUuid}`);
}

/**
 * Get measurements within a time range
 */
export async function getMeasurementsInRange(
  deviceUuid: string, 
  startTimestamp: number, 
  endTimestamp: number
): Promise<MeasurementResponse> {
  return fetchApi<MeasurementResponse>(
    `measurement/range?deviceUuid=${deviceUuid}&startTimestamp=${startTimestamp}&endTimestamp=${endTimestamp}`
  );
}

/**
 * Test the API connection with a simple echo request
 */
export async function testApiConnection(message: string = "hello"): Promise<{success: boolean, message: string, time?: string}> {
  return fetchApi<{success: boolean, message: string, time: string}>(`measurement/echo?message=${message}`);
}

export default {
  getAllMeasurements,
  getLatestMeasurement,
  getMeasurementStats,
  getMeasurementsInRange,
  testApiConnection
};