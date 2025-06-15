/**
 * API service for making requests to the backend
 */

// Get the API URL from environment variables
const API_URL = "http://localhost:8080/api";

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
  device_id: string;
  device_name: string;
  device_type: 'Drone' | 'DSP' | 'Linear Module';
  status: 'Active' | 'Pending-Registration' | 'Not-Active';
  registration_date: string;
  last_updated: string;
  // Optional fields that might be added by frontend
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
  device_id: string;
  mode: "Online" | "Offline";
  status: "Created" | "Running" | "Paused" | "Completed" | "Failed";
  start_date: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
  phenomena?: Phenomenon[];
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
  phenomenon_id: string;
  experiment_id: string;
  name: string;
  description?: string;
  status: "Pending" | "Active" | "Finished" | "Stopped";
  start_time?: string;
  end_time?: string;
  created_at: string;
  updated_at: string;
}

export interface PhenomenonResponse {
  success: boolean;
  data: Phenomenon[];
  error?: string;
}

// Online Mode interfaces
export interface LiveExperiment {
  live_experiment_id: number;
  experiment_id: string;
  device_id: string;
  stream_url?: string;
  is_active: boolean;
  start_time: string;
  end_time?: string;
  current_phenomenon?: ActivePhenomenon;
  phenomena_count: number;
  duration: number; // in seconds
}

export interface ActivePhenomenon {
  phenomenon_id: string;
  name: string;
  description?: string;
  status: "Active";
  start_time: string;
  duration: number; // in seconds
}

export interface LiveExperimentResponse {
  success: boolean;
  data: LiveExperiment;
  error?: string;
}

export interface PhenomenonControlResponse {
  success: boolean;
  data: ActivePhenomenon;
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
    const response = await fetchApi<DeviceResponse>('device-register/list');
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
 * Get a single device by UUID
 */
export async function getDevice(deviceUuid: string): Promise<Device | null> {
  try {
    const response = await fetchApi<SingleDeviceResponse>(`device/view?id=${deviceUuid}`);
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
export async function registerDevice(deviceData: {device_name: string, device_type: string}): Promise<Device | null> {
  try {
    console.log('Registering device:', deviceData);
    const response = await fetchApi<SingleDeviceResponse>('device-register/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(deviceData),
    });
    if (response.success && response.data) {
      return response.data;
    }
    console.log('API response:', response);
    return null;
  } catch (error) {
    console.error('Error registering device:', error);
    console.log('API response:', error);
    return null;
  }
}

/**
 * Update device
 */
export async function updateDevice(deviceUuid: string, deviceData: Partial<Device>): Promise<Device | null> {
  try {
    const response = await fetchApi<SingleDeviceResponse>(`device/update?id=${deviceUuid}`, {
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
export async function activateDevice(deviceUuid: string): Promise<boolean> {
  try {
    const response = await updateDevice(deviceUuid, { status: 'Active' });
    return response !== null;
  } catch (error) {
    console.error('Error activating device:', error);
    return false;
  }
}

/**
 * Deactivate device
 */
export async function deactivateDevice(deviceUuid: string): Promise<boolean> {
  try {
    const response = await updateDevice(deviceUuid, { status: 'Not-Active' });
    return response !== null;
  } catch (error) {
    console.error('Error deactivating device:', error);
    return false;
  }
}

/**
 * Delete device
 */
export async function deleteDevice(deviceUuid: string): Promise<boolean> {
  try {
    const response = await fetchApi<{success: boolean}>(`device/delete?id=${deviceUuid}`, {
      method: 'DELETE',
    });
    return response.success;
  } catch (error) {
    console.error('Error deleting device:', error);
    return false;
  }
}

// Experiment API functions
export const experimentApi = {
  /**
   * Get all experiments
   */
  getExperiments: async (): Promise<Experiment[]> => {
    try {
      const response = await fetchApi<ExperimentResponse>('experiments/list');
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Error fetching experiments:', error);
      return [];
    }
  },

  /**
   * Get a single experiment by ID
   */
  getExperiment: async (experimentId: string): Promise<Experiment | null> => {
    try {
      const response = await fetchApi<SingleExperimentResponse>(`experiments/view?id=${experimentId}`);
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching experiment:', error);
      return null;
    }
  },

  /**
   * Create a new experiment
   */
  createExperiment: async (experimentData: Partial<Experiment>): Promise<Experiment | null> => {
    try {
      const response = await fetchApi<SingleExperimentResponse>('experiments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(experimentData),
      });
      console.log('API response:', response);
      if (response.success && response.data) {
        return response.data;
      }
      console.log('API response:', response);
      return null;
    } catch (error) {
      console.log('API response:', error);
      console.error('Error creating experiment:', error);
      return null;
    }
  },

  /**
   * Update experiment
   */
  updateExperiment: async (experimentId: string, experimentData: Partial<Experiment>): Promise<Experiment | null> => {
    try {
      const response = await fetchApi<SingleExperimentResponse>(`experiments/update?id=${experimentId}`, {
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
  },

  /**
   * Delete experiment
   */
  deleteExperiment: async (experimentId: string): Promise<boolean> => {
    try {
      const response = await fetchApi<{success: boolean}>(`experiments/delete?id=${experimentId}`, {
        method: 'DELETE',
      });
      return response.success;
    } catch (error) {
      console.error('Error deleting experiment:', error);
      return false;
    }
  }
};

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

// Online Mode API for real-time experiment control
export const onlineModeApi = {
  /**
   * Start a live experiment on a device (Online Mode)
   */
  startLiveExperiment: async (deviceId: string, name?: string): Promise<LiveExperiment> => {
    try {
      const response = await fetchApi<LiveExperimentResponse>(`devices/${deviceId}/live-experiment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name || `Live Experiment - ${new Date().toLocaleString()}`,
        }),
      });
      
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to start live experiment');
    } catch (error) {
      console.error('Error starting live experiment:', error);
      throw error;
    }
  },

  /**
   * Get current live experiment status for a device
   */
  getLiveExperiment: async (deviceId: string): Promise<LiveExperiment | null> => {
    try {
      const response = await fetchApi<LiveExperimentResponse>(`devices/${deviceId}/live-experiment`);
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error getting live experiment:', error);
      return null;
    }
  },

  /**
   * Stop/Complete a live experiment
   */
  stopLiveExperiment: async (deviceId: string): Promise<boolean> => {
    try {
      const response = await fetchApi<{ success: boolean; error?: string }>(`devices/${deviceId}/live-experiment`, {
        method: 'DELETE',
      });
      return response.success;
    } catch (error) {
      console.error('Error stopping live experiment:', error);
      return false;
    }
  },
  /**
   * Start a phenomenon in the current live experiment
   */
  startPhenomenon: async (deviceId: string, phenomenonData: { name: string; description?: string }): Promise<ActivePhenomenon> => {
    try {
      const response = await fetchApi<PhenomenonControlResponse>(`devices/${deviceId}/start-phenomenon`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(phenomenonData),
      });
      
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to start phenomenon');
    } catch (error) {
      console.error('Error starting phenomenon:', error);
      throw error;
    }
  },  /**
   * Stop the current active phenomenon
   */
  stopPhenomenon: async (deviceId: string, phenomenonId: string): Promise<boolean> => {
    try {
      const response = await fetchApi<{ success: boolean; error?: string }>(`devices/${deviceId}/stop-phenomenon`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phenomenon_id: phenomenonId,
        }),
      });
      return response.success;
    } catch (error) {
      console.error('Error stopping phenomenon:', error);
      return false;
    }
  },

  /**
   * Get real-time data for the current phenomenon
   */
  getLiveData: async (deviceId: string): Promise<any[]> => {
    try {
      const response = await fetchApi<{ success: boolean; data: any[]; error?: string }>(`devices/${deviceId}/live-data`);
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Error getting live data:', error);
      return [];
    }
  },
};

export const phenomenaApi = {
  /**
   * Get all phenomena
   */
  getPhenomena: async (): Promise<Phenomenon[]> => {
    try {
      const response = await fetchApi<PhenomenonResponse>('phenomena/list');
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Error fetching phenomena:', error);
      return [];
    }
  },

  /**
   * Get phenomena for an experiment
   */
  getPhenomenaForExperiment: async (experimentId: string): Promise<Phenomenon[]> => {
    try {
      const allPhenomena = await phenomenaApi.getPhenomena();
      return allPhenomena.filter(p => p.experiment_id === experimentId);
    } catch (error) {
      console.error('Error fetching phenomena for experiment:', error);
      return [];
    }
  },

  /**
   * Get a single phenomenon by ID
   */
  getPhenomenon: async (phenomenonId: string): Promise<Phenomenon | null> => {
    try {
      const response = await fetchApi<{success: boolean, data: Phenomenon}>(`phenomena/view?id=${phenomenonId}`);
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching phenomenon:', error);
      return null;
    }
  },

  /**
   * Create a new phenomenon
   */
  createPhenomenon: async (phenomenonData: Partial<Phenomenon>): Promise<Phenomenon | null> => {
    try {
      const response = await fetchApi<{success: boolean, data: Phenomenon}>('phenomena/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(phenomenonData),
      });
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error creating phenomenon:', error);
      return null;
    }
  },

  /**
   * Update phenomenon
   */
  updatePhenomenon: async (phenomenonId: string, phenomenonData: Partial<Phenomenon>): Promise<Phenomenon | null> => {
    try {
      const response = await fetchApi<{success: boolean, data: Phenomenon}>(`phenomena/update?id=${phenomenonId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(phenomenonData),
      });
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error updating phenomenon:', error);
      return null;
    }
  },

  /**
   * Delete phenomenon
   */
  deletePhenomenon: async (phenomenonId: string): Promise<boolean> => {
    try {
      const response = await fetchApi<{success: boolean}>(`phenomena/delete?id=${phenomenonId}`, {
        method: 'DELETE',
      });
      return response.success;
    } catch (error) {
      console.error('Error deleting phenomenon:', error);
      return false;
    }
  },

  /**
   * Start a phenomenon
   */
  startPhenomenon: async (phenomenonId: string): Promise<Phenomenon | null> => {
    try {
      const response = await fetchApi<{success: boolean, data: Phenomenon}>(`phenomena/start?id=${phenomenonId}`, {
        method: 'POST',
      });
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error starting phenomenon:', error);
      return null;
    }
  },

  /**
   * Stop a phenomenon
   */
  stopPhenomenon: async (phenomenonId: string): Promise<Phenomenon | null> => {
    try {
      const response = await fetchApi<{success: boolean, data: Phenomenon}>(`phenomena/stop?id=${phenomenonId}`, {
        method: 'POST',
      });
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error stopping phenomenon:', error);
      return null;
    }
  },

  /**
   * Finish a phenomenon
   */
  finishPhenomenon: async (phenomenonId: string): Promise<Phenomenon | null> => {
    try {
      const response = await fetchApi<{success: boolean, data: Phenomenon}>(`phenomena/finish?id=${phenomenonId}`, {
        method: 'POST',
      });
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error finishing phenomenon:', error);
      return null;
    }
  },

  /**
   * Upload measurement data to a phenomenon
   */
  uploadData: async (phenomenonId: string, data: any): Promise<boolean> => {
    try {
      const response = await fetchApi<{success: boolean, message: string}>(`phenomena/${phenomenonId}/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      return response.success;
    } catch (error) {
      console.error('Error uploading phenomenon data:', error);
      return false;
    }
  }
};
