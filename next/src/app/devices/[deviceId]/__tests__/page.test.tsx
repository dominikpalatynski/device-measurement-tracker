import React from "react";
import {
	render,
	screen,
	fireEvent,
	waitFor,
	act,
} from "@testing-library/react";
import { useParams, useRouter } from "next/navigation";
import DeviceDetailPage from "../page";

// Mock next/navigation
jest.mock("next/navigation", () => ({
	useParams: jest.fn(),
	useRouter: jest.fn(),
}));

jest.mock("@/services/api", () => ({
	deviceApi: {
		getDevice: jest.fn(),
		activateDevice: jest.fn(),
		deactivateDevice: jest.fn(),
		deleteDevice: jest.fn(),
		updateDevice: jest.fn(),
	},
	faultApi: {
		getFaults: jest.fn(),
		createFault: jest.fn(),
	},
	getAllMeasurements: jest.fn(),
	getLatestMeasurement: jest.fn(),
	getMeasurementStats: jest.fn(),
	getUnassignedMeasurements: jest.fn(),
	getMongoMeasurements: jest.fn(),
	measurementChannelApi: {
		getChannels: jest.fn(),
		createChannel: jest.fn(),
		updateChannel: jest.fn(),
		deleteChannel: jest.fn(),
	},
}));

// Get the mocked functions
const mockDeviceApi = require("@/services/api").deviceApi;
const mockFaultApi = require("@/services/api").faultApi;
const mockGetAllMeasurements = require("@/services/api").getAllMeasurements;
const mockGetLatestMeasurement = require("@/services/api").getLatestMeasurement;
const mockGetMeasurementStats = require("@/services/api").getMeasurementStats;
const mockGetUnassignedMeasurements =
	require("@/services/api").getUnassignedMeasurements;
const mockGetMongoMeasurements = require("@/services/api").getMongoMeasurements;
const mockMeasurementChannelApi =
	require("@/services/api").measurementChannelApi;

// Mock the components
jest.mock("@/components/PageLayout", () => {
	return function MockPageLayout({
		children,
		title,
	}: {
		children: React.ReactNode;
		title: string;
	}) {
		return (
			<div
				data-testid='page-layout'
				title={title}
			>
				{children}
			</div>
		);
	};
});

jest.mock("@/components/DeviceProtectedRoute", () => {
	return function MockDeviceProtectedRoute({
		children,
	}: {
		children: React.ReactNode;
	}) {
		return <div data-testid='device-protected-route'>{children}</div>;
	};
});

jest.mock("@/components/AdvancedZoomChart", () => {
	return function MockAdvancedZoomChart(props: any) {
		return <div data-testid='advanced-zoom-chart'>Chart Component</div>;
	};
});

const mockUseParams = useParams as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;
const mockPush = jest.fn();

describe("Device Detail Page", () => {
	const mockDevice = {
		id: "test-device-123",
		name: "Test Device",
		type: "pmsm-mechanical-vibration",
		status: "active",
		created_at: "2024-01-01T00:00:00Z",
		user_id: "user-1",
	};

	const mockMeasurements = [
		{
			id: 1,
			deviceUuid: "test-device-123",
			timestamp: 1640995200000,
			data: { voltage: 12.5 },
		},
	];

	const mockFaults = [
		{
			id: "fault-1",
			device_id: "test-device-123",
			name: "Test Fault",
			description: "Test description",
			status: "active",
		},
	];

	const mockStats = {
		total: 100,
		average: 50,
		min: 10,
		max: 90,
	};

	beforeEach(() => {
		jest.clearAllMocks();
		mockUseParams.mockReturnValue({ deviceId: "test-device-123" });
		mockUseRouter.mockReturnValue({
			push: mockPush,
			replace: jest.fn(),
			refresh: jest.fn(),
		});
	});

	it("should render without crashing", () => {
		mockDeviceApi.getDevice.mockResolvedValue(null);
		mockFaultApi.getFaults.mockResolvedValue([]);
		mockGetAllMeasurements.mockResolvedValue([]);
		mockGetLatestMeasurement.mockResolvedValue(null);
		mockGetMeasurementStats.mockResolvedValue(null);
		mockGetUnassignedMeasurements.mockResolvedValue([]);
		mockGetMongoMeasurements.mockResolvedValue([]);
		mockMeasurementChannelApi.getChannels.mockResolvedValue([]);

		render(<DeviceDetailPage />);

		// Should render something (the page starts with a loading state)
		expect(document.body).toBeTruthy();
	});

	it("should display device not found error when device is null", async () => {
		mockDeviceApi.getDevice.mockResolvedValue(null);
		mockFaultApi.getFaults.mockResolvedValue([]);
		mockGetAllMeasurements.mockResolvedValue([]);
		mockGetLatestMeasurement.mockResolvedValue(null);
		mockGetMeasurementStats.mockResolvedValue(null);
		mockGetUnassignedMeasurements.mockResolvedValue([]);
		mockGetMongoMeasurements.mockResolvedValue([]);
		mockMeasurementChannelApi.getChannels.mockResolvedValue([]);

		render(<DeviceDetailPage />);

		await waitFor(() => {
			expect(screen.getByText("Device not found")).toBeInTheDocument();
		});
	});

	it("should load and display device data successfully", async () => {
		mockDeviceApi.getDevice.mockResolvedValue(mockDevice);
		mockFaultApi.getFaults.mockResolvedValue(mockFaults);
		mockGetAllMeasurements.mockResolvedValue(mockMeasurements);
		mockGetLatestMeasurement.mockResolvedValue(mockMeasurements[0]);
		mockGetMeasurementStats.mockResolvedValue(mockStats);
		mockGetUnassignedMeasurements.mockResolvedValue([]);
		mockGetMongoMeasurements.mockResolvedValue([]);
		mockMeasurementChannelApi.getChannels.mockResolvedValue([]);

		render(<DeviceDetailPage />);

		await waitFor(() => {
			expect(screen.getByTestId("page-layout")).toBeInTheDocument();
		});

		await waitFor(() => {
			expect(mockDeviceApi.getDevice).toHaveBeenCalledWith(
				"test-device-123"
			);
			expect(mockFaultApi.getFaults).toHaveBeenCalled();
			expect(mockGetAllMeasurements).toHaveBeenCalled();
			expect(mockGetLatestMeasurement).toHaveBeenCalled();
			expect(mockGetMeasurementStats).toHaveBeenCalled();
		});
	});

	it("should handle loading errors", async () => {
		mockDeviceApi.getDevice.mockRejectedValue(
			new Error("Failed to load device")
		);
		mockFaultApi.getFaults.mockResolvedValue([]);
		mockGetAllMeasurements.mockResolvedValue([]);
		mockGetLatestMeasurement.mockResolvedValue(null);
		mockGetMeasurementStats.mockResolvedValue(null);
		mockGetUnassignedMeasurements.mockResolvedValue([]);
		mockGetMongoMeasurements.mockResolvedValue([]);
		mockMeasurementChannelApi.getChannels.mockResolvedValue([]);

		render(<DeviceDetailPage />);

		await waitFor(() => {
			expect(
				screen.getByText("Failed to load device")
			).toBeInTheDocument();
		});
	});
});
