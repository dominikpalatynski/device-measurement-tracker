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

/**
 * Measurement Data from measurement_data table (for conditions)
 */
export interface MeasurementData {
  data_id: number;
  device_id: string;
  condition_id: string | null;
  fault_id: string | null;
  data_payload: any; // JSON data
  upload_type?: string; // Metadata for upload method
  timestamp: string;
  [key: string]: any; // Allow string indexing for dynamic field access
}

export interface MeasurementDataResponse {
  success: boolean;
  data: MeasurementData[];
  error?: string;
}

// Device interfaces
export interface Device {
  device_id: string;
  device_name: string;
  device_type: 'pmsm-mechanical-vibration' | 'bldc-high-speed' | 'pmsm-torque-load';
  status: 'Active' | 'Inactive';
  registration_date: string;
  last_updated: string;
  // Optional fields that might be added by frontend
  faults_count?: number;
  active_faults_count?: number;
  verification_token?: string;
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

// Fault interfaces
export interface Fault {
  id: number;
  fault_id: string;
  fault_name: string;
  description?: string;
  device_id: string;
  mode: "Online" | "Offline";
  status: "Active" | "Inactive";
  start_date: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
  conditions?: Condition[];
}

export interface FaultResponse {
  success: boolean;
  data: Fault[];
  error?: string;
}

export interface SingleFaultResponse {
  success: boolean;
  data: Fault;
  error?: string;
}

// Condition interface
export interface Condition {
  id: number;
  condition_id: string;
  fault_id: string;
  name: string;
  description?: string;
  status: "Active" | "Inactive";
  start_time?: string;
  end_time?: string;
  created_at: string;
  updated_at: string;
}

export interface ConditionResponse {
  success: boolean;
  data: Condition[];
  error?: string;
}

// Online Mode interfaces
export interface LiveFault {
  fault_id: string;
  device_id: string;
  start_time: string;
  end_time?: string;
  current_condition?: ActiveCondition;
  conditions_count: number;
  duration: number; // in seconds
}

export interface ActiveCondition {
  condition_id: string;
  name: string;
  description?: string;
  status: "Active";
  start_time: string;
  duration: number; // in seconds
}

export interface LiveFaultResponse {
  success: boolean;
  data: LiveFault;
  error?: string;
}

export interface ConditionControlResponse {
  success: boolean;
  data: ActiveCondition;
  error?: string;
}

// MeasurementChannel interfaces
export interface MeasurementChannel {
  id: number;
  sensor_type?: string;
  data_type?: string;
  frame_offset?: number;
  samples_per_frame?: number;
  sampling_frequency?: number;
  channel_name?: string;
  physical_unit?: string;
  measurement_range_min?: number;
  measurement_range_max?: number;
}

export interface MeasurementChannelResponse {
  success: boolean;
  data: MeasurementChannel[];
  error?: string;
}

export interface SingleMeasurementChannelResponse {
  success: boolean;
  data: MeasurementChannel;
  error?: string;
}

/**
 * Get all measurements for a device from measurement_data table
 */
export async function getAllMeasurements(deviceUuid: string, limit: number = 50): Promise<MeasurementDataResponse> {
  return fetchApi<MeasurementDataResponse>(`measurement/index?deviceUuid=${deviceUuid}&limit=${limit}`);
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
 * Get measurement data for a specific condition from measurement_data table
 */
export async function getConditionMeasurements(
  conditionId: string, 
  startDate?: string, 
  endDate?: string
): Promise<MeasurementDataResponse> {
  let url = `measurement-data/condition?conditionId=${conditionId}`;
  
  if (startDate) {
    url += `&startDate=${encodeURIComponent(startDate)}`;
  }
  if (endDate) {
    url += `&endDate=${encodeURIComponent(endDate)}`;
  }
  
  return fetchApi<MeasurementDataResponse>(url);
}

/**
 * Get unassigned measurement data for a device (where condition_id is null)
 */
export async function getUnassignedMeasurements(
  deviceUuid: string, 
  limit: number = 100, 
  startDate?: string, 
  endDate?: string
): Promise<MeasurementDataResponse> {
  let url = `device-measurement/unassigned?deviceUuid=${deviceUuid}&limit=${limit}`;
  
  if (startDate) {
    url += `&startDate=${encodeURIComponent(startDate)}`;
  }
  if (endDate) {
    url += `&endDate=${encodeURIComponent(endDate)}`;
  }
  
  return fetchApi<MeasurementDataResponse>(url);
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
    const response = await fetchApi<{success: boolean, data?: {device_id: string, verification_token: string, device_name: string, device_type: string, status: string}, error?: string}>('device-register/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(deviceData),
    });
      if (response.success && response.data && response.data.device_id) {
      // Store verification token for later use
      if (response.data.verification_token) {
        localStorage.setItem(`verification_token_${response.data.device_id}`, response.data.verification_token);
      }
        // Create a device object from the response
      const device: Device = {
        device_id: response.data.device_id,
        device_name: response.data.device_name,
        device_type: response.data.device_type as "pmsm-mechanical-vibration" | "bldc-high-speed" | "pmsm-torque-load",
        status: (response.data.status === "Active" ? "Active" : "Inactive") as "Active" | "Inactive",
        registration_date: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        verification_token: response.data.verification_token,
      };
      return device;
    }
    
    if (!response.success && response.error) {
      throw new Error(response.error);
    }
    
    console.log('API response:', response);
    return null;
  } catch (error) {
    console.error('Error registering device:', error);
    throw error; // Re-throw to let the UI handle it properly
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
    const response = await fetchApi<{success: boolean; data?: any; message?: string}>(`device-register/activate?id=${deviceUuid}`, {
      method: 'POST',
    });
    return response.success;
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
    const response = await fetchApi<{success: boolean; data?: any; message?: string}>(`device-register/deactivate?id=${deviceUuid}`, {
      method: 'POST',
    });
    return response.success;
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

// Fault API functions
export const faultApi = {
  /**
   * Get all faults
   */
  getFaults: async (): Promise<Fault[]> => {
    try {
      const response = await fetchApi<FaultResponse>('faults/list');
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Error fetching faults:', error);
      return [];
    }
  },

  /**
   * Get a single fault by ID
   */
  getFault: async (faultId: string): Promise<Fault | null> => {
    try {
      const response = await fetchApi<SingleFaultResponse>(`faults/view?id=${faultId}`);
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching fault:', error);
      return null;
    }
  },

  /**
   * Create a new fault
   */
  createFault: async (faultData: Partial<Fault>): Promise<Fault | null> => {
    try {
      const response = await fetchApi<SingleFaultResponse>('faults/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(faultData),
      });
      console.log('API response:', response);
      if (response.success && response.data) {
        return response.data;
      }
      console.log('API response:', response);
      return null;
    } catch (error) {
      console.log('API response:', error);
      console.error('Error creating fault:', error);
      return null;
    }
  },

  /**
   * Update fault
   */
  updateFault: async (faultId: string, faultData: Partial<Fault>): Promise<Fault | null> => {
    try {
      const response = await fetchApi<SingleFaultResponse>(`faults/update?id=${faultId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(faultData),
      });
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error updating fault:', error);
      return null;
    }
  },

  /**
   * Delete fault
   */
  deleteFault: async (faultId: string): Promise<boolean> => {
    try {
      const response = await fetchApi<{success: boolean}>(`faults/delete?id=${faultId}`, {
        method: 'DELETE',
      });
      return response.success;
    } catch (error) {
      console.error('Error deleting fault:', error);
      return false;
    }
  }
};

/**
 * Delete fault
 */
export async function deleteFault(faultId: string): Promise<boolean> {
  try {
    const response = await fetchApi<{success: boolean}>(`fault/delete?id=${faultId}`, {
      method: 'DELETE',
    });
    return response.success;
  } catch (error) {
    console.error('Error deleting fault:', error);
    return false;
  }
}

/**
 * Get all conditions
 */
export async function getConditions(): Promise<Condition[]> {
  try {
    const response = await fetchApi<ConditionResponse>('condition/list');
    if (response.success && response.data) {
      return response.data;
    }
    return [];
  } catch (error) {
    console.error('Error fetching conditions:', error);
    return [];
  }
}

export async function regenerateDeviceToken(deviceId: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await fetchApi<{ success: boolean; data?: any; error?: string }>(`device-register/regenerate-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ deviceId }),
    });
    
    return response;
  } catch (error) {
    console.error('Failed to regenerate device token:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
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
  regenerateToken: regenerateDeviceToken,
};

// Online Mode API for real-time fault control
export const onlineModeApi = {
  /**
   * Start a live fault on a device (Online Mode)
   */
  startLiveFault: async (deviceId: string, name?: string): Promise<LiveFault> => {
    try {
      const response = await fetchApi<LiveFaultResponse>(`devices/${deviceId}/live-fault`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name || `Live Fault - ${new Date().toLocaleString()}`,
        }),
      });
      
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to start live fault');
    } catch (error) {
      console.log('Starting live fault:', error);
      console.error('Error starting live fault:', error);
      throw error;
    }
  },

  /**
   * Get current live fault status for a device
   */
  getLiveFault: async (deviceId: string): Promise<LiveFault | null> => {
    try {
      const response = await fetchApi<LiveFaultResponse>(`devices/${deviceId}/live-fault`);
      if (response.success && response.data) {
        return response.data;
      }
      console.log('Error getting live fault:', response);
      return null;
    } catch (error) {
      console.log('Error getting live fault:', error);
      console.error('Error getting live fault:', error);
      return null;
    }
  },

  /**
   * Stop/Complete a live fault
   */
  stopLiveFault: async (deviceId: string): Promise<boolean> => {
    try {
      const response = await fetchApi<{ success: boolean; error?: string }>(`devices/${deviceId}/live-fault`, {
        method: 'DELETE',
      });
      return response.success;
    } catch (error) {
      console.error('Error stopping live fault:', error);
      return false;
    }
  },
  /**
   * Start a condition in the current live fault
   */
  startCondition: async (deviceId: string, conditionData: { name: string; description?: string }): Promise<ActiveCondition> => {
    try {
      const response = await fetchApi<ConditionControlResponse>(`devices/${deviceId}/start-condition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(conditionData),
      });
      
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to start condition');
    } catch (error) {
      console.error('Error starting condition:', error);
      throw error;
    }
  },  /**
   * Stop the current active condition
   */
  stopCondition: async (deviceId: string, conditionId: string): Promise<boolean> => {
    try {
      const response = await fetchApi<{ success: boolean; error?: string }>(`devices/${deviceId}/stop-condition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          condition_id: conditionId,
        }),
      });
      return response.success;
    } catch (error) {
      console.error('Error stopping condition:', error);
      return false;
    }
  },

  /**
   * Get real-time data for the current condition
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

export const conditionsApi = {
  /**
   * Get all conditions
   */
  getConditions: async (): Promise<Condition[]> => {
    try {
      const response = await fetchApi<ConditionResponse>('conditions/list');
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Error fetching conditions:', error);
      return [];
    }
  },

  /**
   * Get conditions for a fault
   */
  getConditionsForFault: async (faultId: string): Promise<Condition[]> => {
    try {
      const allConditions = await conditionsApi.getConditions();
      return allConditions.filter(c => c.fault_id === faultId);
    } catch (error) {
      console.error('Error fetching conditions for fault:', error);
      return [];
    }
  },

  /**
   * Get a single condition by ID
   */
  getCondition: async (conditionId: string): Promise<Condition | null> => {
    try {
      const response = await fetchApi<{success: boolean, data: Condition}>(`conditions/view?id=${conditionId}`);
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching condition:', error);
      return null;
    }
  },

  /**
   * Create a new condition
   */
  createCondition: async (conditionData: Partial<Condition>): Promise<Condition | null> => {
    try {
      const response = await fetchApi<{success: boolean, data: Condition}>('conditions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(conditionData),
      });
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error creating condition:', error);
      return null;
    }
  },

  /**
   * Update condition
   */
  updateCondition: async (conditionId: string, conditionData: Partial<Condition>): Promise<Condition | null> => {
    try {
      const response = await fetchApi<{success: boolean, data: Condition}>(`conditions/update?id=${conditionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(conditionData),
      });
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error updating condition:', error);
      return null;
    }
  },

  /**
   * Delete condition
   */
  deleteCondition: async (conditionId: string): Promise<boolean> => {
    try {
      const response = await fetchApi<{success: boolean}>(`conditions/delete?id=${conditionId}`, {
        method: 'DELETE',
      });
      return response.success;
    } catch (error) {
      console.error('Error deleting condition:', error);
      return false;
    }
  },

  /**
   * Start a condition
   */
  startCondition: async (conditionId: string): Promise<Condition | null> => {
    try {
      const response = await fetchApi<{success: boolean, data: Condition}>(`conditions/start?id=${conditionId}`, {
        method: 'POST',
      });
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error starting condition:', error);
      return null;
    }
  },

  /**
   * Stop a condition
   */
  stopCondition: async (conditionId: string): Promise<Condition | null> => {
    try {
      const response = await fetchApi<{success: boolean, data: Condition}>(`conditions/stop?id=${conditionId}`, {
        method: 'POST',
      });
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error stopping condition:', error);
      return null;
    }
  },

  /**
   * Finish a condition
   */
  finishCondition: async (conditionId: string): Promise<Condition | null> => {
    try {
      const response = await fetchApi<{success: boolean, data: Condition}>(`conditions/finish?id=${conditionId}`, {
        method: 'POST',
      });
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error finishing condition:', error);
      return null;
    }
  },

  /**
   * Upload measurement data to a condition
   */
  uploadData: async (conditionId: string, data: any): Promise<boolean> => {
    try {
      const response = await fetchApi<{success: boolean, message: string}>(`conditions/${conditionId}/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      return response.success;
    } catch (error) {
      console.error('Error uploading condition data:', error);
      return false;
    }
  }
};

// MeasurementChannel API object
export const measurementChannelApi = {
  getChannels: async (): Promise<MeasurementChannel[]> => {
    try {
      const response = await fetchApi<MeasurementChannelResponse>('measurement-channel/list');
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Error fetching channels:', error);
      return [];
    }
  },
  getChannel: async (id: number): Promise<MeasurementChannel | null> => {
    try {
      const response = await fetchApi<SingleMeasurementChannelResponse>(`measurement-channel/view?id=${id}`);
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching channel:', error);
      return null;
    }
  },
  createChannel: async (channelData: Partial<MeasurementChannel>): Promise<MeasurementChannel | null> => {
    try {
      const response = await fetchApi<SingleMeasurementChannelResponse>('measurement-channel/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(channelData),
      });
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error creating channel:', error);
      return null;
    }
  },
  updateChannel: async (id: number, channelData: Partial<MeasurementChannel>): Promise<MeasurementChannel | null> => {
    try {
      const response = await fetchApi<SingleMeasurementChannelResponse>(`measurement-channel/update?id=${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(channelData),
      });
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error updating channel:', error);
      return null;
    }
  },
  deleteChannel: async (id: number): Promise<boolean> => {
    try {
      const response = await fetchApi<{success: boolean}>(`measurement-channel/delete?id=${id}`, {
        method: 'DELETE',
      });
      return response.success;
    } catch (error) {
      console.error('Error deleting channel:', error);
      return false;
    }
  },
};

/**
 * Get live measurement data for a specific condition from measurement_data table
 * with optional limit and sorting by timestamp DESC for real-time updates
 */
export async function getLiveConditionMeasurements(
  conditionId: string, 
  limit: number = 50,
  since?: string
): Promise<MeasurementDataResponse> {
  let endpoint = `measurement-data/condition/live?conditionId=${conditionId}&limit=${limit}`;
  if (since) {
    endpoint += `&since=${encodeURIComponent(since)}`;
  }
  return fetchApi<MeasurementDataResponse>(endpoint);
}

/**
 * Get the latest measurement data for a specific condition
 * (just the most recent entry)
 */
export async function getLatestConditionMeasurement(conditionId: string): Promise<MeasurementDataResponse> {
  return fetchApi<MeasurementDataResponse>(`measurement-data/condition/latest?conditionId=${conditionId}`);
}

/**
 * Get the latest measurement data from measurement_data table with real-time support
 */
export async function getLatestMeasurementData(
  limit: number = 50,
  deviceId?: string,
  conditionId?: string
): Promise<MeasurementDataResponse> {
  let endpoint = `measurement-data/latest-all?limit=${limit}`;
  if (deviceId) {
    endpoint += `&deviceId=${encodeURIComponent(deviceId)}`;
  }
  if (conditionId) {
    endpoint += `&conditionId=${encodeURIComponent(conditionId)}`;
  }
  return fetchApi<MeasurementDataResponse>(endpoint);
}
