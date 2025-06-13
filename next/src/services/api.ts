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

// Device interfaces
export interface Device {
  id: number;
  device_id: string;
  device_uuid: string;
  device_name: string;
  device_type: "Drone" | "DSP" | "IoT-Sensor" | "Other";
  status: "Active" | "Pending-Registration" | "Not-Active";
  last_updated: string;
  created_at: string;
  last_seen_at?: string;
  experiments_count?: number;
  active_experiments_count?: number;
}

export interface DeviceResponse {
  success: boolean;
  data: Device[];
  error?: string;
}

export interface SingleDeviceResponse {
  success: boolean;
  data: Device;
  error?: string;
}

// Experiment interfaces
export interface Experiment {
  id: number;
  experiment_id: string;
  name: string;
  description?: string;
  status: "Active" | "Completed" | "Paused" | "Draft";
  start_date: string;
  end_date?: string;
  device_ids: string[];
  phenomena: string[];
  created_at: string;
  updated_at: string;
}

export interface ExperimentResponse {
  success: boolean;
  data: Experiment[];
  error?: string;
}

export interface SingleExperimentResponse {
  success: boolean;
  data: Experiment;
  error?: string;
}

// Phenomenon interface
export interface Phenomenon {
  id: number;
  name: string;
  description?: string;
  unit?: string;
  type: string;
}

export interface PhenomenonResponse {
  success: boolean;
  data: Phenomenon[];
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

// Device API functions
/**
 * Get all devices
 */
export async function getDevices(): Promise<Device[]> {
  try {
    const response = await fetchApi<DeviceResponse>('device/list');
    if (response.success && response.data) {
      return response.data;
    }
    return [];
  } catch (error) {
    console.error('Error fetching devices:', error);
    return [];
  }
}

/**
 * Get a single device by ID
 */
export async function getDevice(deviceId: string): Promise<Device | null> {
  try {
    const response = await fetchApi<SingleDeviceResponse>(`device/view?id=${deviceId}`);
    if (response.success && response.data) {
      return response.data;
    }
    return null;
  } catch (error) {
    console.error('Error fetching device:', error);
    return null;
  }
}

/**
 * Register a new device
 */
export async function registerDevice(deviceData: {device_name: string}): Promise<Device | null> {
  try {
    const response = await fetchApi<SingleDeviceResponse>('device/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(deviceData),
    });
    if (response.success && response.data) {
      return response.data;
    }
    return null;
  } catch (error) {
    console.error('Error registering device:', error);
    return null;
  }
}

/**
 * Update device
 */
export async function updateDevice(deviceId: string, deviceData: Partial<Device>): Promise<Device | null> {
  try {
    const response = await fetchApi<SingleDeviceResponse>(`device/update?id=${deviceId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(deviceData),
    });
    if (response.success && response.data) {
      return response.data;
    }
    return null;
  } catch (error) {
    console.error('Error updating device:', error);
    return null;
  }
}

/**
 * Activate device
 */
export async function activateDevice(deviceId: string): Promise<boolean> {
  try {
    const response = await updateDevice(deviceId, { status: "Active" });
    return response !== null;
  } catch (error) {
    console.error('Error activating device:', error);
    return false;
  }
}

/**
 * Deactivate device
 */
export async function deactivateDevice(deviceId: string): Promise<boolean> {
  try {
    const response = await updateDevice(deviceId, { status: "Not-Active" });
    return response !== null;
  } catch (error) {
    console.error('Error deactivating device:', error);
    return false;
  }
}

/**
 * Delete device
 */
export async function deleteDevice(deviceId: string): Promise<boolean> {
  try {
    const response = await fetchApi<{success: boolean}>(`device/delete?id=${deviceId}`, {
      method: 'DELETE',
    });
    return response.success;
  } catch (error) {
    console.error('Error deleting device:', error);
    return false;
  }
}

// Experiment API functions
/**
 * Get all experiments
 */
export async function getExperiments(): Promise<Experiment[]> {
  try {
    const response = await fetchApi<ExperimentResponse>('experiment/list');
    if (response.success && response.data) {
      return response.data;
    }
    return [];
  } catch (error) {
    console.error('Error fetching experiments:', error);
    return [];
  }
}

/**
 * Get a single experiment by ID
 */
export async function getExperiment(experimentId: string): Promise<Experiment | null> {
  try {
    const response = await fetchApi<SingleExperimentResponse>(`experiment/view?id=${experimentId}`);
    if (response.success && response.data) {
      return response.data;
    }
    return null;
  } catch (error) {
    console.error('Error fetching experiment:', error);
    return null;
  }
}

/**
 * Create a new experiment
 */
export async function createExperiment(experimentData: Partial<Experiment>): Promise<Experiment | null> {
  try {
    const response = await fetchApi<SingleExperimentResponse>('experiment/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(experimentData),
    });
    if (response.success && response.data) {
      return response.data;
    }
    return null;
  } catch (error) {
    console.error('Error creating experiment:', error);
    return null;
  }
}

/**
 * Update experiment
 */
export async function updateExperiment(experimentId: string, experimentData: Partial<Experiment>): Promise<Experiment | null> {
  try {
    const response = await fetchApi<SingleExperimentResponse>(`experiment/update?id=${experimentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(experimentData),
    });
    if (response.success && response.data) {
      return response.data;
    }
    return null;
  } catch (error) {
    console.error('Error updating experiment:', error);
    return null;
  }
}

/**
 * Delete experiment
 */
export async function deleteExperiment(experimentId: string): Promise<boolean> {
  try {
    const response = await fetchApi<{success: boolean}>(`experiment/delete?id=${experimentId}`, {
      method: 'DELETE',
    });
    return response.success;
  } catch (error) {
    console.error('Error deleting experiment:', error);
    return false;
  }
}

/**
 * Get all phenomena
 */
export async function getPhenomena(): Promise<Phenomenon[]> {
  try {
    const response = await fetchApi<PhenomenonResponse>('phenomenon/list');
    if (response.success && response.data) {
      return response.data;
    }
    return [];
  } catch (error) {
    console.error('Error fetching phenomena:', error);
    return [];
  }
}

// Device API object for easy access
export const deviceApi = {
  getDevices,
  getDevice,
  registerDevice,
  updateDevice,
  activateDevice,
  deactivateDevice,
  deleteDevice,
};

// Experiment API object for easy access
export const experimentApi = {
  getExperiments,
  getExperiment,
  createExperiment,
  updateExperiment,
  deleteExperiment,
};

// Update the default export
export default {
  getAllMeasurements,
  getLatestMeasurement,
  getMeasurementStats,
  getMeasurementsInRange,
  testApiConnection,
  deviceApi,
  experimentApi,
  getPhenomena,
};