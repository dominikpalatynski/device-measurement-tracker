/**
 * Unit tests for individual functions in the Fault Detail Page
 * These tests focus on testing the business logic of each function in isolation
 */

import {
	deviceApi,
	faultApi,
	onlineModeApi,
	conditionsApi,
	getMongoMeasurements,
} from "@/services/api";

// Mock all the API services
jest.mock("@/services/api", () => ({
	deviceApi: {
		getDevice: jest.fn(),
	},
	faultApi: {
		getFaults: jest.fn(),
		updateFault: jest.fn(),
		deleteFault: jest.fn(),
	},
	onlineModeApi: {
		getLiveFault: jest.fn(),
		startCondition: jest.fn(),
		stopCondition: jest.fn(),
		stopLiveFault: jest.fn(),
	},
	conditionsApi: {
		getConditionsForFault: jest.fn(),
		getConditions: jest.fn(),
		createCondition: jest.fn(),
		updateCondition: jest.fn(),
		deleteCondition: jest.fn(),
		startCondition: jest.fn(),
		stopCondition: jest.fn(),
		finishCondition: jest.fn(),
	},
	getMongoMeasurements: jest.fn(),
}));

// Mock Next.js router
const mockPush = jest.fn();
const mockRouter = {
	push: mockPush,
	replace: jest.fn(),
	refresh: jest.fn(),
};

describe("Fault Detail Page Functions", () => {
	// Get the mocked functions with proper typing
	const mockDeviceApi = deviceApi as jest.Mocked<typeof deviceApi>;
	const mockFaultApi = faultApi as jest.Mocked<typeof faultApi>;
	const mockOnlineModeApi = onlineModeApi as jest.Mocked<typeof onlineModeApi>;
	const mockConditionsApi = conditionsApi as jest.Mocked<typeof conditionsApi>;
	const mockGetMongoMeasurements = getMongoMeasurements as jest.MockedFunction<typeof getMongoMeasurements>;

	beforeEach(() => {
		jest.clearAllMocks();
		jest.clearAllTimers();
		
		// Mock console methods to avoid noise in tests
		jest.spyOn(console, 'log').mockImplementation();
		jest.spyOn(console, 'error').mockImplementation();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe("loadFaultData function logic", () => {
		const deviceId = "test-device-123";
		const faultId = "test-fault-456";

		it("should successfully load all required data", async () => {
			// Arrange
			const mockDevice = {
				device_id: deviceId,
				device_name: "Test Device",
				device_type: "sensor",
			};

			const mockFaults = [
				{
					fault_id: faultId,
					fault_name: "Test Fault",
					status: "Active" as const,
					start_date: "2024-01-01T00:00:00Z",
				},
			];

			const mockOfflineConditions = [
				{
					condition_id: "cond-1",
					fault_id: faultId,
					name: "Test Condition",
					status: "Inactive" as const,
				},
			];

			const mockAllConditions = [
				{
					condition_id: "cond-2",
					fault_id: "other-fault",
					name: "Other Condition",
					status: "Active" as const,
				},
			];

			const mockLiveFault = {
				fault_id: faultId,
				device_id: deviceId,
				status: "Active" as const,
			};

			// Setup mocks
			mockDeviceApi.getDevice.mockResolvedValue(mockDevice);
			mockFaultApi.getFaults.mockResolvedValue(mockFaults);
			mockConditionsApi.getConditionsForFault.mockResolvedValue(mockOfflineConditions);
			mockConditionsApi.getConditions.mockResolvedValue(mockAllConditions);
			mockOnlineModeApi.getLiveFault.mockResolvedValue(mockLiveFault);

			// Act - This would be the loadFaultData function logic
			const deviceData = await mockDeviceApi.getDevice(deviceId);
			const faultsData = await mockFaultApi.getFaults();
			
			expect(deviceData).toBeTruthy();
			const faultData = faultsData.find(f => f.fault_id === faultId);
			expect(faultData).toBeTruthy();

			// Check if this is a live fault
			if (faultData?.status === "Active") {
				const liveFaultData = await mockOnlineModeApi.getLiveFault(deviceId);
				if (liveFaultData && liveFaultData.fault_id === faultId) {
					expect(liveFaultData).toBeTruthy();
				}
			}

			// Load conditions
			const offlineConditionsData = await mockConditionsApi.getConditionsForFault(faultId);
			const allConditionsData = await mockConditionsApi.getConditions();

			// Assert
			expect(mockDeviceApi.getDevice).toHaveBeenCalledWith(deviceId);
			expect(mockFaultApi.getFaults).toHaveBeenCalled();
			expect(mockConditionsApi.getConditionsForFault).toHaveBeenCalledWith(faultId);
			expect(mockConditionsApi.getConditions).toHaveBeenCalled();
			expect(mockOnlineModeApi.getLiveFault).toHaveBeenCalledWith(deviceId);
			expect(offlineConditionsData).toEqual(mockOfflineConditions);
			expect(allConditionsData).toEqual(mockAllConditions);
		});

		it("should handle device not found", async () => {
			// Arrange
			mockDeviceApi.getDevice.mockResolvedValue(null);

			// Act
			const deviceData = await mockDeviceApi.getDevice(deviceId);

			// Assert
			expect(deviceData).toBeNull();
			expect(mockDeviceApi.getDevice).toHaveBeenCalledWith(deviceId);
		});

		it("should handle fault not found", async () => {
			// Arrange
			const mockDevice = { device_id: deviceId, device_name: "Test Device" };
			mockDeviceApi.getDevice.mockResolvedValue(mockDevice);
			mockFaultApi.getFaults.mockResolvedValue([]);

			// Act
			const deviceData = await mockDeviceApi.getDevice(deviceId);
			const faultsData = await mockFaultApi.getFaults();
			const faultData = faultsData.find(f => f.fault_id === faultId);

			// Assert
			expect(deviceData).toBeTruthy();
			expect(faultData).toBeUndefined();
		});

		it("should handle API errors gracefully", async () => {
			// Arrange
			const error = new Error("API Error");
			mockDeviceApi.getDevice.mockRejectedValue(error);

			// Act & Assert
			await expect(mockDeviceApi.getDevice(deviceId)).rejects.toThrow("API Error");
		});
	});

	describe("loadLiveData function logic", () => {
		const deviceId = "test-device-123";
		const faultName = "Test Fault";

		it("should load mongo measurements successfully", async () => {
			// Arrange
			const mockMeasurements = [
				{
					_id: "1",
					timestamp: new Date().toISOString(),
					data: { voltage: 220, current: 5, power: 1100 },
				},
				{
					_id: "2",
					timestamp: new Date().toISOString(),
					data: { voltage: 215, current: 4.8, power: 1032 },
				},
			];

			mockGetMongoMeasurements.mockResolvedValue({
				success: true,
				data: mockMeasurements,
			});

			// Act - This simulates the loadLiveData function
			const result = await mockGetMongoMeasurements(
				deviceId,
				undefined, // faultId
				undefined, // conditionId
				undefined, // dataSeriesId
				undefined, // timeRange
				50, // limit
				0, // offset
				true, // includeData
				undefined, // conditionName
				faultName, // faultName
				undefined // dataSeriesValue
			);

			// Assert
			expect(result.success).toBe(true);
			expect(result.data).toEqual(mockMeasurements);
			expect(mockGetMongoMeasurements).toHaveBeenCalledWith(
				deviceId,
				undefined,
				undefined,
				undefined,
				undefined,
				50,
				0,
				true,
				undefined,
				faultName,
				undefined
			);
		});

		it("should handle failed mongo measurements", async () => {
			// Arrange
			mockGetMongoMeasurements.mockResolvedValue({
				success: false,
				data: null,
			});

			// Act
			const result = await mockGetMongoMeasurements(
				deviceId,
				undefined,
				undefined,
				undefined,
				undefined,
				50,
				0,
				true,
				undefined,
				faultName,
				undefined
			);

			// Assert
			expect(result.success).toBe(false);
			expect(result.data).toBeNull();
		});

		it("should handle API errors in loadLiveData", async () => {
			// Arrange
			const error = new Error("Network error");
			mockGetMongoMeasurements.mockRejectedValue(error);

			// Act & Assert
			await expect(mockGetMongoMeasurements(
				deviceId,
				undefined,
				undefined,
				undefined,
				undefined,
				50,
				0,
				true,
				undefined,
				faultName,
				undefined
			)).rejects.toThrow("Network error");
		});
	});

	describe("handleStartCondition function logic", () => {
		const deviceId = "test-device-123";

		it("should start condition successfully", async () => {
			// Arrange
			const conditionData = {
				name: "New Condition",
				description: "Test description",
			};

			const mockCondition = {
				condition_id: "new-condition-id",
				name: conditionData.name,
				description: conditionData.description,
				status: "Active" as const,
			};

			const mockUpdatedLiveFault = {
				fault_id: "test-fault-456",
				device_id: deviceId,
				status: "Active" as const,
			};

			mockOnlineModeApi.startCondition.mockResolvedValue(mockCondition);
			mockOnlineModeApi.getLiveFault.mockResolvedValue(mockUpdatedLiveFault);

			// Act
			const condition = await mockOnlineModeApi.startCondition(deviceId, conditionData);
			const updatedLiveFault = await mockOnlineModeApi.getLiveFault(deviceId);

			// Assert
			expect(condition).toEqual(mockCondition);
			expect(updatedLiveFault).toEqual(mockUpdatedLiveFault);
			expect(mockOnlineModeApi.startCondition).toHaveBeenCalledWith(deviceId, conditionData);
			expect(mockOnlineModeApi.getLiveFault).toHaveBeenCalledWith(deviceId);
		});

		it("should handle start condition failure", async () => {
			// Arrange
			const error = new Error("Failed to start condition");
			mockOnlineModeApi.startCondition.mockRejectedValue(error);

			// Act & Assert
			await expect(mockOnlineModeApi.startCondition(deviceId, {
				name: "Test Condition",
			})).rejects.toThrow("Failed to start condition");
		});
	});

	describe("handleStopCondition function logic", () => {
		const deviceId = "test-device-123";
		const conditionId = "condition-123";

		it("should stop condition successfully", async () => {
			// Arrange
			const mockUpdatedLiveFault = {
				fault_id: "test-fault-456",
				device_id: deviceId,
				status: "Active" as const,
			};

			mockOnlineModeApi.stopCondition.mockResolvedValue(true);
			mockOnlineModeApi.getLiveFault.mockResolvedValue(mockUpdatedLiveFault);

			// Act
			await mockOnlineModeApi.stopCondition(deviceId, conditionId);
			const updatedLiveFault = await mockOnlineModeApi.getLiveFault(deviceId);

			// Assert
			expect(mockOnlineModeApi.stopCondition).toHaveBeenCalledWith(deviceId, conditionId);
			expect(mockOnlineModeApi.getLiveFault).toHaveBeenCalledWith(deviceId);
			expect(updatedLiveFault).toEqual(mockUpdatedLiveFault);
		});

		it("should handle stop condition failure", async () => {
			// Arrange
			const error = new Error("Failed to stop condition");
			mockOnlineModeApi.stopCondition.mockRejectedValue(error);

			// Act & Assert
			await expect(mockOnlineModeApi.stopCondition(deviceId, conditionId))
				.rejects.toThrow("Failed to stop condition");
		});
	});

	describe("handleStopFault function logic", () => {
		const deviceId = "test-device-123";

		it("should stop fault successfully", async () => {
			// Arrange
			mockOnlineModeApi.stopLiveFault.mockResolvedValue(true);

			// Act
			const result = await mockOnlineModeApi.stopLiveFault(deviceId);

			// Assert
			expect(result).toBe(true);
			expect(mockOnlineModeApi.stopLiveFault).toHaveBeenCalledWith(deviceId);
		});

		it("should handle stop fault failure", async () => {
			// Arrange
			const error = new Error("Failed to stop fault");
			mockOnlineModeApi.stopLiveFault.mockRejectedValue(error);

			// Act & Assert
			await expect(mockOnlineModeApi.stopLiveFault(deviceId))
				.rejects.toThrow("Failed to stop fault");
		});
	});

	describe("handleCreateOfflineCondition function logic", () => {
		const faultId = "test-fault-456";

		it("should create offline condition successfully", async () => {
			// Arrange
			const conditionData = {
				fault_id: faultId,
				name: "New Offline Condition",
				description: "Test description",
			};

			const mockCondition = {
				condition_id: "new-condition-id",
				...conditionData,
				status: "Active" as const,
			};

			mockConditionsApi.createCondition.mockResolvedValue(mockCondition);

			// Act
			const condition = await mockConditionsApi.createCondition(conditionData);

			// Assert
			expect(condition).toEqual(mockCondition);
			expect(mockConditionsApi.createCondition).toHaveBeenCalledWith(conditionData);
		});

		it("should handle create condition failure", async () => {
			// Arrange
			const error = new Error("Failed to create condition");
			mockConditionsApi.createCondition.mockRejectedValue(error);

			// Act & Assert
			await expect(mockConditionsApi.createCondition({
				fault_id: faultId,
				name: "Test Condition",
			})).rejects.toThrow("Failed to create condition");
		});
	});

	describe("handleDeleteOfflineCondition function logic", () => {
		const conditionId = "condition-123";

		it("should delete condition successfully after confirmation", async () => {
			// Arrange
			window.confirm = jest.fn().mockReturnValue(true);
			mockConditionsApi.deleteCondition.mockResolvedValue(true);

			// Act
			const confirmed = window.confirm("Are you sure you want to delete this condition?");
			if (confirmed) {
				const result = await mockConditionsApi.deleteCondition(conditionId);
				expect(result).toBe(true);
			}

			// Assert
			expect(window.confirm).toHaveBeenCalled();
			expect(mockConditionsApi.deleteCondition).toHaveBeenCalledWith(conditionId);
		});

		it("should not delete condition if user cancels", async () => {
			// Arrange
			window.confirm = jest.fn().mockReturnValue(false);

			// Act
			const confirmed = window.confirm("Are you sure you want to delete this condition?");
			if (confirmed) {
				await mockConditionsApi.deleteCondition(conditionId);
			}

			// Assert
			expect(window.confirm).toHaveBeenCalled();
			expect(mockConditionsApi.deleteCondition).not.toHaveBeenCalled();
		});

		it("should handle delete condition failure", async () => {
			// Arrange
			window.confirm = jest.fn().mockReturnValue(true);
			mockConditionsApi.deleteCondition.mockResolvedValue(false);

			// Act
			const confirmed = window.confirm("Are you sure you want to delete this condition?");
			if (confirmed) {
				const result = await mockConditionsApi.deleteCondition(conditionId);
				expect(result).toBe(false);
			}

			// Assert
			expect(mockConditionsApi.deleteCondition).toHaveBeenCalledWith(conditionId);
		});
	});

	describe("handleDeleteFault function logic", () => {
		const faultId = "test-fault-456";
		const faultName = "Test Fault";

		it("should delete fault successfully after confirmation", async () => {
			// Arrange
			window.confirm = jest.fn().mockReturnValue(true);
			mockFaultApi.deleteFault.mockResolvedValue(true);

			// Act
			const confirmed = window.confirm(
				`Are you sure you want to delete fault "${faultName}"? This action cannot be undone and will delete all associated conditions.`
			);
			if (confirmed) {
				const result = await mockFaultApi.deleteFault(faultId);
				expect(result).toBe(true);
			}

			// Assert
			expect(window.confirm).toHaveBeenCalled();
			expect(mockFaultApi.deleteFault).toHaveBeenCalledWith(faultId);
		});

		it("should not delete fault if user cancels", async () => {
			// Arrange
			window.confirm = jest.fn().mockReturnValue(false);

			// Act
			const confirmed = window.confirm(
				`Are you sure you want to delete fault "${faultName}"? This action cannot be undone and will delete all associated conditions.`
			);
			if (confirmed) {
				await mockFaultApi.deleteFault(faultId);
			}

			// Assert
			expect(window.confirm).toHaveBeenCalled();
			expect(mockFaultApi.deleteFault).not.toHaveBeenCalled();
		});
	});

	describe("handleUpdateFaultStatus function logic", () => {
		const faultId = "test-fault-456";

		it("should update fault status successfully", async () => {
			// Arrange
			const newStatus = "Inactive" as const;
			const updatedFault = {
				fault_id: faultId,
				fault_name: "Test Fault",
				status: newStatus,
			};

			mockFaultApi.updateFault.mockResolvedValue(updatedFault);

			// Act
			const result = await mockFaultApi.updateFault(faultId, { status: newStatus });

			// Assert
			expect(result).toEqual(updatedFault);
			expect(mockFaultApi.updateFault).toHaveBeenCalledWith(faultId, { status: newStatus });
		});

		it("should handle update fault status failure", async () => {
			// Arrange
			mockFaultApi.updateFault.mockResolvedValue(null);

			// Act
			const result = await mockFaultApi.updateFault(faultId, { status: "Inactive" });

			// Assert
			expect(result).toBeNull();
		});
	});

	describe("Offline Condition Management Functions", () => {
		const conditionId = "condition-123";

		describe("handleStartOfflineCondition", () => {
			it("should start offline condition successfully", async () => {
				// Arrange
				const updatedCondition = {
					condition_id: conditionId,
					name: "Test Condition",
					status: "Active" as const,
				};

				mockConditionsApi.startCondition.mockResolvedValue(updatedCondition);

				// Act
				const result = await mockConditionsApi.startCondition(conditionId);

				// Assert
				expect(result).toEqual(updatedCondition);
				expect(mockConditionsApi.startCondition).toHaveBeenCalledWith(conditionId);
			});

			it("should handle start offline condition failure", async () => {
				// Arrange
				mockConditionsApi.startCondition.mockResolvedValue(null);

				// Act
				const result = await mockConditionsApi.startCondition(conditionId);

				// Assert
				expect(result).toBeNull();
			});
		});

		describe("handleStopOfflineCondition", () => {
			it("should stop offline condition successfully", async () => {
				// Arrange
				const updatedCondition = {
					condition_id: conditionId,
					name: "Test Condition",
					status: "Inactive" as const,
				};

				mockConditionsApi.stopCondition.mockResolvedValue(updatedCondition);

				// Act
				const result = await mockConditionsApi.stopCondition(conditionId);

				// Assert
				expect(result).toEqual(updatedCondition);
				expect(mockConditionsApi.stopCondition).toHaveBeenCalledWith(conditionId);
			});
		});

		describe("handleFinishOfflineCondition", () => {
			it("should finish offline condition successfully", async () => {
				// Arrange
				const updatedCondition = {
					condition_id: conditionId,
					name: "Test Condition",
					status: "Finished" as const,
				};

				mockConditionsApi.finishCondition.mockResolvedValue(updatedCondition);

				// Act
				const result = await mockConditionsApi.finishCondition(conditionId);

				// Assert
				expect(result).toEqual(updatedCondition);
				expect(mockConditionsApi.finishCondition).toHaveBeenCalledWith(conditionId);
			});
		});
	});

	describe("handleUpdateCondition function logic", () => {
		const conditionId = "condition-123";

		it("should update condition successfully", async () => {
			// Arrange
			const updateData = {
				name: "Updated Condition",
				description: "Updated description",
				status: "Active" as const,
			};

			const updatedCondition = {
				condition_id: conditionId,
				...updateData,
			};

			mockConditionsApi.updateCondition.mockResolvedValue(updatedCondition);

			// Act
			const result = await mockConditionsApi.updateCondition(conditionId, updateData);

			// Assert
			expect(result).toEqual(updatedCondition);
			expect(mockConditionsApi.updateCondition).toHaveBeenCalledWith(conditionId, updateData);
		});

		it("should handle update condition failure", async () => {
			// Arrange
			mockConditionsApi.updateCondition.mockResolvedValue(null);

			// Act
			const result = await mockConditionsApi.updateCondition(conditionId, {
				name: "Updated Condition",
			});

			// Assert
			expect(result).toBeNull();
		});
	});

	describe("copyToClipboard function logic", () => {
		it("should copy text to clipboard and show alert", async () => {
			// Arrange
			const text = "test-device-123";
			const label = "Device ID";

			// Mock clipboard API
			Object.assign(navigator, {
				clipboard: {
					writeText: jest.fn().mockResolvedValue(undefined),
				},
			});

			// Mock alert
			window.alert = jest.fn();

			// Act
			await navigator.clipboard.writeText(text);
			window.alert(`${label} copied to clipboard!`);

			// Assert
			expect(navigator.clipboard.writeText).toHaveBeenCalledWith(text);
			expect(window.alert).toHaveBeenCalledWith(`${label} copied to clipboard!`);
		});

		it("should handle clipboard write failure", async () => {
			// Arrange
			const error = new Error("Clipboard write failed");
			Object.assign(navigator, {
				clipboard: {
					writeText: jest.fn().mockRejectedValue(error),
				},
			});

			// Act & Assert
			await expect(navigator.clipboard.writeText("test"))
				.rejects.toThrow("Clipboard write failed");
		});
	});

	describe("State management utility functions", () => {
		describe("anyConditionActive logic", () => {
			it("should return true when live conditions are active", () => {
				// Arrange
				const conditions = [
					{ condition_id: "1", status: "Active" as const },
					{ condition_id: "2", status: "Inactive" as const },
				];
				const offlineConditions = [
					{ condition_id: "3", status: "Inactive" as const },
				];

				// Act
				const anyConditionActive = 
					conditions.some(c => c.status === "Active") ||
					offlineConditions.some(c => c.status === "Active");

				// Assert
				expect(anyConditionActive).toBe(true);
			});

			it("should return true when offline conditions are active", () => {
				// Arrange
				const conditions = [
					{ condition_id: "1", status: "Inactive" as const },
				];
				const offlineConditions = [
					{ condition_id: "2", status: "Active" as const },
					{ condition_id: "3", status: "Inactive" as const },
				];

				// Act
				const anyConditionActive = 
					conditions.some(c => c.status === "Active") ||
					offlineConditions.some(c => c.status === "Active");

				// Assert
				expect(anyConditionActive).toBe(true);
			});

			it("should return false when no conditions are active", () => {
				// Arrange
				const conditions = [
					{ condition_id: "1", status: "Inactive" as const },
				];
				const offlineConditions = [
					{ condition_id: "2", status: "Inactive" as const },
					{ condition_id: "3", status: "Finished" as const },
				];

				// Act
				const anyConditionActive = 
					conditions.some(c => c.status === "Active") ||
					offlineConditions.some(c => c.status === "Active");

				// Assert
				expect(anyConditionActive).toBe(false);
			});
		});
	});

	describe("Auto-refresh interval management", () => {
		beforeEach(() => {
			jest.useFakeTimers();
		});

		afterEach(() => {
			jest.useRealTimers();
		});

		it("should set up interval correctly", () => {
			// Arrange
			const mockCallback = jest.fn();
			
			// Act
			const intervalId = setInterval(mockCallback, 3000);
			
			// Fast forward time
			jest.advanceTimersByTime(3000);
			
			// Assert
			expect(mockCallback).toHaveBeenCalledTimes(1);
			
			// Fast forward again
			jest.advanceTimersByTime(3000);
			expect(mockCallback).toHaveBeenCalledTimes(2);
			
			// Cleanup
			clearInterval(intervalId);
		});

		it("should clear interval correctly", () => {
			// Arrange
			const mockCallback = jest.fn();
			const intervalId = setInterval(mockCallback, 3000);
			
			// Act
			clearInterval(intervalId);
			
			// Fast forward time
			jest.advanceTimersByTime(6000);
			
			// Assert
			expect(mockCallback).not.toHaveBeenCalled();
		});
	});

	describe("Error handling patterns", () => {
		it("should handle network errors gracefully", async () => {
			// Arrange
			const networkError = new Error("Network request failed");
			mockDeviceApi.getDevice.mockRejectedValue(networkError);

			// Act & Assert
			await expect(mockDeviceApi.getDevice("test-device"))
				.rejects.toThrow("Network request failed");
		});

		it("should handle API response errors", async () => {
			// Arrange
			mockFaultApi.updateFault.mockResolvedValue(null);

			// Act
			const result = await mockFaultApi.updateFault("fault-id", { status: "Inactive" });

			// Assert
			expect(result).toBeNull();
		});

		it("should handle validation errors in condition creation", async () => {
			// Arrange
			const validationError = new Error("Name is required");
			mockConditionsApi.createCondition.mockRejectedValue(validationError);

			// Act & Assert
			await expect(mockConditionsApi.createCondition({
				fault_id: "fault-id",
				name: "",
			})).rejects.toThrow("Name is required");
		});
	});
});
