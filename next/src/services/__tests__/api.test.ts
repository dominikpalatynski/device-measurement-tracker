import { 
  getDevices, 
  getDevice, 
  registerDevice, 
  updateDevice, 
  activateDevice,
  deactivateDevice,
  deleteDevice,
  testApiConnection,
  // Add new imports for measurement functions
  getAllMeasurements,
  getLatestMeasurement,
  getMeasurementStats,
  getConditionMeasurements,
  getUnassignedMeasurements,
  getMeasurementsInRange,
  getConditions,
  regenerateDeviceToken,
  faultApi,
  deviceApi,
  onlineModeApi,
  conditionsApi,
} from '../api';

// Mock fetch globally
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set environment variable for tests
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8080/api';
  });

  describe('testApiConnection', () => {
    it('should test API connection successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'hello',
        time: '2023-01-01T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => JSON.stringify(mockResponse),
      } as Response);

      const result = await testApiConnection('hello');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/measurement/echo?message=hello',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept': 'application/json',
          }),
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle API connection failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(testApiConnection()).rejects.toThrow('API request failed: Network error');
    });

    it('should handle invalid JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => 'invalid json',
      } as Response);

      await expect(testApiConnection()).rejects.toThrow('Invalid JSON response from API');
    });

    it('should handle empty response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => '',
      } as Response);

      await expect(testApiConnection()).rejects.toThrow('Empty response received from API');
    });
  });

  describe('getDevices', () => {
    it('should get devices list successfully', async () => {
      const mockDevices = [
        {
          device_id: 'device-1',
          device_name: 'Test Device 1',
          device_type: 'pmsm-mechanical-vibration',
          status: 'Active' as const,
          registration_date: '2023-01-01',
          last_updated: '2023-01-01',
          owner_id: 1,
        },
        {
          device_id: 'device-2',
          device_name: 'Test Device 2',
          device_type: 'bldc-high-speed',
          status: 'Inactive' as const,
          registration_date: '2023-01-02',
          last_updated: '2023-01-02',
          owner_id: 2,
        },
      ];

      const mockResponse = {
        success: true,
        data: mockDevices,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => JSON.stringify(mockResponse),
      } as Response);

      const result = await getDevices();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/device-register/list',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept': 'application/json',
          }),
        })
      );

      expect(result).toEqual(mockDevices);
    });

    it('should handle devices list error', async () => {
      const mockResponse = {
        success: false,
        error: 'Unauthorized access',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => JSON.stringify(mockResponse),
      } as Response);

      await expect(getDevices()).resolves.toEqual([]);
    });

    it('should handle network error when getting devices', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

      await expect(getDevices()).resolves.toEqual([]);
    });
  });

  describe('getDevice', () => {
    it('should get single device successfully', async () => {
      const mockDevice = {
        device_id: 'device-123',
        device_name: 'Test Device',
        device_type: 'pmsm-mechanical-vibration',
        status: 'Active' as const,
        registration_date: '2023-01-01',
        last_updated: '2023-01-01',
        owner_id: 1,
      };

      const mockResponse = {
        success: true,
        data: mockDevice,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => JSON.stringify(mockResponse),
      } as Response);

      const result = await getDevice('device-123');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/device-register/view?id=device-123',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept': 'application/json',
          }),
        })
      );

      expect(result).toEqual(mockDevice);
    });

    it('should return null when device not found', async () => {
      const mockResponse = {
        success: false,
        error: 'Device not found',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => JSON.stringify(mockResponse),
      } as Response);

      const result = await getDevice('nonexistent-device');

      expect(result).toBeNull();
    });

    it('should handle network error when getting device', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Server error'));

      await expect(getDevice('device-123')).resolves.toBeNull();
    });
  });

  describe('registerDevice', () => {
    it('should register device successfully', async () => {
      const deviceData = {
        device_name: 'New Device',
        device_type: 'pmsm-mechanical-vibration',
      };

      const mockDevice = {
        device_id: 'new-device-id',
        device_name: 'New Device',
        device_type: 'pmsm-mechanical-vibration',
        status: 'Pending-Registration' as const,
        registration_date: '2023-01-01',
        last_updated: '2023-01-01',
        verification_token: 'abc123',
      };

      const mockResponse = {
        success: true,
        data: mockDevice,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => JSON.stringify(mockResponse),
      } as Response);

      const result = await registerDevice(deviceData);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/device-register/create',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(deviceData),
        })
      );

      expect(result).toEqual(expect.objectContaining({
        device_id: mockDevice.device_id,
        device_name: mockDevice.device_name,
        device_type: mockDevice.device_type,
        status: mockDevice.status,
        verification_token: mockDevice.verification_token,
      }));
    });

    it('should handle registration failure', async () => {
      const deviceData = {
        device_name: 'Invalid Device',
        device_type: 'invalid-type',
      };

      const mockResponse = {
        success: false,
        error: 'Invalid device type',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => JSON.stringify(mockResponse),
      } as Response);

      await expect(registerDevice(deviceData)).rejects.toThrow('Invalid device type');
    });
  });

  describe('updateDevice', () => {
    it('should update device successfully', async () => {
      const deviceId = 'device-123';
      const updateData = {
        device_name: 'Updated Device Name',
        status: 'Active' as const,
      };

      const mockUpdatedDevice = {
        device_id: 'device-123',
        device_name: 'Updated Device Name',
        device_type: 'pmsm-mechanical-vibration',
        status: 'Active' as const,
        registration_date: '2023-01-01',
        last_updated: '2023-01-02',
        owner_id: 1,
      };

      const mockResponse = {
        success: true,
        data: mockUpdatedDevice,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => JSON.stringify(mockResponse),
      } as Response);

      const result = await updateDevice(deviceId, updateData);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/device/update?id=device-123',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(updateData),
        })
      );

      expect(result).toEqual(mockUpdatedDevice);
    });

    it('should handle update failure', async () => {
      const mockResponse = {
        success: false,
        error: 'Device not found',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => JSON.stringify(mockResponse),
      } as Response);

      const result = await updateDevice('nonexistent', { device_name: 'New Name' });

      expect(result).toBeNull();
    });
  });

  describe('activateDevice', () => {
    it('should activate device successfully', async () => {
      const mockResponse = {
        success: true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => JSON.stringify(mockResponse),
      } as Response);

      const result = await activateDevice('device-123');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/device-register/activate?id=device-123',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Accept': 'application/json',
          }),
        })
      );

      expect(result).toBe(true);
    });

    it('should handle activation failure', async () => {
      const mockResponse = {
        success: false,
        error: 'Device cannot be activated',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => JSON.stringify(mockResponse),
      } as Response);

      const result = await activateDevice('device-123');

      expect(result).toBe(false);
    });
  });

  describe('deactivateDevice', () => {
    it('should deactivate device successfully', async () => {
      const mockResponse = {
        success: true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => JSON.stringify(mockResponse),
      } as Response);

      const result = await deactivateDevice('device-123');

      expect(result).toBe(true);
    });

    it('should handle deactivation failure', async () => {
      const mockResponse = {
        success: false,
        error: 'Device cannot be deactivated',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => JSON.stringify(mockResponse),
      } as Response);

      const result = await deactivateDevice('device-123');

      expect(result).toBe(false);
    });
  });

  describe('deleteDevice', () => {
    it('should delete device successfully', async () => {
      const mockResponse = {
        success: true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => JSON.stringify(mockResponse),
      } as Response);

      const result = await deleteDevice('device-123');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/device/delete?id=device-123',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'Accept': 'application/json',
          }),
        })
      );

      expect(result).toBe(true);
    });

    it('should handle deletion failure', async () => {
      const mockResponse = {
        success: false,
        error: 'Device cannot be deleted',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => JSON.stringify(mockResponse),
      } as Response);

      const result = await deleteDevice('device-123');

      expect(result).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should handle missing API URL', async () => {
      // Temporarily remove API URL
      delete process.env.NEXT_PUBLIC_API_URL;

      await expect(getDevices()).resolves.toEqual([]);

      // Restore API URL
      process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8080/api';
    });

    it('should handle fetch errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'));

      await expect(getDevices()).resolves.toEqual([]);
    });

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => '{invalid json}',
      } as Response);

      await expect(getDevices()).resolves.toEqual([]);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle fetch throwing due to undefined response', async () => {
      mockFetch.mockResolvedValueOnce(undefined as any);

      const result = await getDevices();
      expect(result).toEqual([]);
    });

    it('should handle fetch network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'));

      const result = await getDevices();
      expect(result).toEqual([]);
    });

    it('should handle malformed JSON in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => '{invalid json}',
      } as Response);

      const result = await getDevices();
      expect(result).toEqual([]);
    });
  });

  // Add comprehensive tests for measurement functions
  describe('Measurement Functions', () => {
    describe('getAllMeasurements', () => {
      it('should get all measurements successfully', async () => {
        const mockData = {
          success: true,
          data: [
            { id: 1, device_uuid: 'device-1', timestamp: '2023-01-01', value: 10.5 },
            { id: 2, device_uuid: 'device-1', timestamp: '2023-01-02', value: 12.3 },
          ],
          total: 2
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          text: async () => JSON.stringify(mockData),
        } as Response);

        const result = await getAllMeasurements('device-1', 100);

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:8080/api/measurement/index?deviceUuid=device-1&limit=100',
          expect.objectContaining({
            headers: expect.objectContaining({
              'Accept': 'application/json',
            }),
          })
        );

        expect(result).toEqual(mockData);
      });

      it('should handle getAllMeasurements error', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        await expect(getAllMeasurements('device-1')).rejects.toThrow('API request failed: Network error');
      });
    });

    describe('getLatestMeasurement', () => {
      it('should get latest measurement successfully', async () => {
        const mockData = {
          success: true,
          data: { id: 1, device_uuid: 'device-1', timestamp: '2023-01-01', value: 10.5 }
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          text: async () => JSON.stringify(mockData),
        } as Response);

        const result = await getLatestMeasurement('device-1');

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:8080/api/measurement/latest?deviceUuid=device-1',
          expect.objectContaining({
            headers: expect.objectContaining({
              'Accept': 'application/json',
            }),
          })
        );

        expect(result).toEqual(mockData);
      });
    });

    describe('getMeasurementStats', () => {
      it('should get measurement stats successfully', async () => {
        const mockData = {
          success: true,
          data: { count: 100, average: 15.2, min: 10.1, max: 20.5 }
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          text: async () => JSON.stringify(mockData),
        } as Response);

        const result = await getMeasurementStats('device-1');

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:8080/api/measurement/stats?deviceUuid=device-1',
          expect.objectContaining({
            headers: expect.objectContaining({
              'Accept': 'application/json',
            }),
          })
        );

        expect(result).toEqual(mockData);
      });
    });

    describe('getConditionMeasurements', () => {
      it('should get condition measurements successfully', async () => {
        // Mock the MongoDB response format with data_payload
        const mockMongoResponse = {
          success: true,
          data: [
            { 
              _id: 'measurement-1',
              deviceId: 'device-1',
              conditionId: 'cond-1',
              timestamp: 1672531200,
              data_payload: { id: 1, condition_id: 'cond-1', measurement_data: [1, 2, 3] }
            }
          ]
        };

        // Expected result after transformation
        const expectedResult = {
          success: true,
          data: [
            { id: 1, condition_id: 'cond-1', measurement_data: [1, 2, 3] }
          ],
          error: undefined
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          text: async () => JSON.stringify(mockMongoResponse),
        } as Response);

        const result = await getConditionMeasurements('device-1', 'cond-1');

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('http://localhost:8080/api/mongodb/measurements?conditionId=device-1'),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Accept': 'application/json',
            }),
          })
        );

        expect(result).toEqual(expectedResult);
      });
    });

    describe('getUnassignedMeasurements', () => {
      it('should get unassigned measurements successfully', async () => {
        // Mock the MongoDB response format
        const mockMongoResponse = {
          success: true,
          data: [
            { 
              _id: 'measurement-1',
              deviceId: 'device-1',
              faultId: null,
              conditionId: null,
              timestamp: 1672531200,
              data_payload: { value: 42 }
            }
          ]
        };

        // Expected result after transformation
        const expectedResult = {
          success: true,
          data: [
            {
              data_id: 'measurement-1',
              device_id: 'device-1',
              fault_id: null,
              condition_id: null,
              timestamp: '2023-01-01T00:00:00.000Z',
              data_payload: { value: 42 },
              upload_type: 'batch',
              created_at: '2023-01-01T00:00:00.000Z',
              updated_at: '2023-01-01T00:00:00.000Z'
            }
          ],
          error: undefined
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          text: async () => JSON.stringify(mockMongoResponse),
        } as Response);

        const result = await getUnassignedMeasurements('device-1', 100);

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('http://localhost:8080/api/mongodb/measurements?deviceId=device-1'),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Accept': 'application/json',
            }),
          })
        );

        expect(result).toEqual(expectedResult);
      });
    });

    describe('getMeasurementsInRange', () => {
      it('should get measurements in range successfully', async () => {
        const mockData = {
          success: true,
          data: [
            { id: 1, timestamp: '2023-01-01', value: 10.5 }
          ]
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          text: async () => JSON.stringify(mockData),
        } as Response);

        const result = await getMeasurementsInRange('device-1', 1672531200000, 1672617600000);

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:8080/api/measurement/range?deviceUuid=device-1&startTimestamp=1672531200000&endTimestamp=1672617600000',
          expect.objectContaining({
            headers: expect.objectContaining({
              'Accept': 'application/json',
            }),
          })
        );

        expect(result).toEqual(mockData);
      });
    });
  });

  // Add tests for other API functions
  describe('Additional API Functions', () => {
    describe('getConditions', () => {
      it('should get conditions successfully', async () => {
        const mockConditions = [
          { id: 'cond-1', name: 'Normal Operation', description: 'Standard operating conditions' },
          { id: 'cond-2', name: 'High Load', description: 'Operating under high load' }
        ];

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          text: async () => JSON.stringify({ success: true, data: mockConditions }),
        } as Response);

        const result = await getConditions();

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:8080/api/condition/list',
          expect.objectContaining({
            headers: expect.objectContaining({
              'Accept': 'application/json',
            }),
          })
        );

        expect(result).toEqual(mockConditions);
      });

      it('should handle getConditions error', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const result = await getConditions();
        expect(result).toEqual([]);
      });
    });

    describe('regenerateDeviceToken', () => {
      it('should regenerate device token successfully', async () => {
        const mockResponse = {
          success: true,
          data: { token: 'new-token-123', expires_at: '2024-01-01' }
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          text: async () => JSON.stringify(mockResponse),
        } as Response);

        const result = await regenerateDeviceToken('device-1');

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:8080/api/device-register/regenerate-token',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            }),
            body: JSON.stringify({ deviceId: 'device-1' }),
          })
        );

        expect(result).toEqual(mockResponse);
      });

      it('should handle regenerateDeviceToken error', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Server error'));

        const result = await regenerateDeviceToken('device-1');
        expect(result).toEqual({ 
          success: false, 
          error: 'API request failed: Server error' 
        });
      });
    });
  });

  // Add tests for API objects
  describe('API Objects', () => {
    describe('faultApi', () => {
      it('should have all required methods', () => {
        expect(faultApi).toBeDefined();
        expect(typeof faultApi.getFaults).toBe('function');
        expect(typeof faultApi.getFault).toBe('function');
        expect(typeof faultApi.createFault).toBe('function');
        expect(typeof faultApi.updateFault).toBe('function');
        expect(typeof faultApi.deleteFault).toBe('function');
      });

      it('should get faults successfully', async () => {
        const mockFaults = [
          { id: 'fault-1', name: 'Test Fault 1', device_id: 'device-1' },
          { id: 'fault-2', name: 'Test Fault 2', device_id: 'device-1' }
        ];

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          text: async () => JSON.stringify({ success: true, data: mockFaults }),
        } as Response);

        const result = await faultApi.getFaults();
        expect(result).toEqual(mockFaults);
      });

      it('should create fault successfully', async () => {
        const mockFault = { id: 'fault-1', name: 'New Fault', device_id: 'device-1' };
        const faultData = { name: 'New Fault', description: 'Test fault' };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          text: async () => JSON.stringify({ success: true, data: mockFault }),
        } as Response);

        const result = await faultApi.createFault(faultData);
        expect(result).toEqual(mockFault);

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:8080/api/faults/create',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
            body: JSON.stringify(faultData),
          })
        );
      });
    });

    describe('deviceApi', () => {
      it('should have all required methods', () => {
        expect(deviceApi).toBeDefined();
        expect(typeof deviceApi.getDevices).toBe('function');
        expect(typeof deviceApi.getDevice).toBe('function');
        expect(typeof deviceApi.registerDevice).toBe('function');
        expect(typeof deviceApi.updateDevice).toBe('function');
        expect(typeof deviceApi.activateDevice).toBe('function');
        expect(typeof deviceApi.deactivateDevice).toBe('function');
        expect(typeof deviceApi.deleteDevice).toBe('function');
        expect(typeof deviceApi.regenerateToken).toBe('function');
      });

      it('deviceApi methods should work correctly', async () => {
        const mockDevices = [{ id: 'device-1', name: 'Test Device' }];

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          text: async () => JSON.stringify({ success: true, data: mockDevices }),
        } as Response);

        const result = await deviceApi.getDevices();
        expect(result).toEqual(mockDevices);
      });
    });

    describe('onlineModeApi', () => {
      it('should have all required methods', () => {
        expect(onlineModeApi).toBeDefined();
        expect(typeof onlineModeApi.startLiveFault).toBe('function');
        expect(typeof onlineModeApi.getLiveFault).toBe('function');
        expect(typeof onlineModeApi.stopLiveFault).toBe('function');
        expect(typeof onlineModeApi.startCondition).toBe('function');
        expect(typeof onlineModeApi.stopCondition).toBe('function');
      });

      it('should start live fault successfully', async () => {
        const mockLiveFault = {
          id: 'live-fault-1',
          name: 'Test Live Fault',
          device_id: 'device-1',
          status: 'active'
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          text: async () => JSON.stringify({ success: true, data: mockLiveFault }),
        } as Response);

        const result = await onlineModeApi.startLiveFault('device-1', 'Test Live Fault');
        expect(result).toEqual(mockLiveFault);

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:8080/api/devices/device-1/live-fault',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
            body: JSON.stringify({ name: 'Test Live Fault' }),
          })
        );
      });
    });

    describe('conditionsApi', () => {
      it('should have all required methods', () => {
        expect(conditionsApi).toBeDefined();
        expect(typeof conditionsApi.getConditions).toBe('function');
        expect(typeof conditionsApi.getConditionsForFault).toBe('function');
        expect(typeof conditionsApi.getCondition).toBe('function');
        expect(typeof conditionsApi.createCondition).toBe('function');
        expect(typeof conditionsApi.updateCondition).toBe('function');
        expect(typeof conditionsApi.deleteCondition).toBe('function');
      });

      it('should get conditions successfully', async () => {
        const mockConditions = [
          { id: 'cond-1', name: 'Normal Operation' },
          { id: 'cond-2', name: 'High Load' }
        ];

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          text: async () => JSON.stringify({ success: true, data: mockConditions }),
        } as Response);

        const result = await conditionsApi.getConditions();
        expect(result).toEqual(mockConditions);
      });

      it('should get conditions for fault successfully', async () => {
        const mockConditions = [
          { id: 'cond-1', name: 'Normal Operation', fault_id: 'fault-1' }
        ];

        // Mock the getConditions call first
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          text: async () => JSON.stringify({ success: true, data: mockConditions }),
        } as Response);

        const result = await conditionsApi.getConditionsForFault('fault-1');
        expect(result).toEqual(mockConditions);
      });
    });
  });
});
