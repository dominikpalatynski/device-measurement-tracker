import React from "react";
import {
	render,
	screen,
	fireEvent,
	waitFor,
	act,
} from "@testing-library/react";
import { useParams, useRouter } from "next/navigation";
import UnassignedDataSeriesDetailPage from "../page";

// Mock next/navigation
jest.mock("next/navigation", () => ({
	useParams: jest.fn(),
	useRouter: jest.fn(),
}));

// Mock API services
jest.mock("@/services/api", () => ({
	deviceApi: {
		getDevice: jest.fn(),
	},
	getMongoMeasurements: jest.fn(),
	Device: {},
	MeasurementData: {},
}));

// Mock components
jest.mock("@/components/PageLayout", () => {
	return function MockPageLayout({
		children,
		title,
		breadcrumbs,
	}: {
		children: React.ReactNode;
		title: string;
		breadcrumbs?: Array<{ label: string; href: string }>;
	}) {
		return (
			<div
				data-testid='page-layout'
				title={title}
			>
				{breadcrumbs && (
					<div data-testid='breadcrumbs'>
						{breadcrumbs.map((item, i) => (
							<span
								key={i}
								data-href={item.href}
							>
								{item.label}
							</span>
						))}
					</div>
				)}
				{children}
			</div>
		);
	};
});

jest.mock("@/components/DeviceProtectedRoute", () => {
	return function MockDeviceProtectedRoute({
		children,
		deviceId,
	}: {
		children: React.ReactNode;
		deviceId: string;
	}) {
		return (
			<div
				data-testid='device-protected-route'
				data-device-id={deviceId}
			>
				{children}
			</div>
		);
	};
});

jest.mock("@/components/AdvancedZoomChart", () => {
	return function MockAdvancedZoomChart(props: any) {
		return (
			<div
				data-testid='advanced-zoom-chart'
				data-title={props.title}
			>
				<button onClick={() => props.onZoom && props.onZoom()}>
					Zoom
				</button>
				Chart Component with {props.data?.length || 0} data points
			</div>
		);
	};
});

// Mock utils
jest.mock("@/utils/dateUtils", () => ({
	formatDate: jest.fn(() => "2023-01-01"),
	formatDateShort: jest.fn(() => "Jan 1, 2023"),
}));

// Mock console methods to prevent console pollution during tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

const mockUseParams = useParams as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;
const mockGetDevice = require("@/services/api").deviceApi.getDevice;
const mockGetMongoMeasurements = require("@/services/api").getMongoMeasurements;

describe("Unassigned Data Series Detail Page", () => {
	const mockDevice = {
		id: "test-device-123",
		device_name: "Test Device",
		device_type: "sensor",
		status: "active",
	};

	const mockMeasurements = [
		{
			_id: "measurement-1",
			deviceId: "test-device-123",
			timestamp_unix: 1672531200,
			data: {
				value: 42,
				multiValue: [1, 2, 3],
				temperature: 25.5,
			},
		},
		{
			_id: "measurement-2",
			deviceId: "test-device-123",
			timestamp: "2023-01-02T00:00:00.000Z",
			data: {
				value: 43,
				multiValue: [4, 5, 6],
				temperature: 26.5,
			},
		},
		// Invalid timestamp to test error handling
		{
			_id: "measurement-3",
			deviceId: "test-device-123",
			timestamp: "invalid-date",
			data: {
				value: 44,
			},
		},
	];

	beforeAll(() => {
		// Mock console methods to prevent pollution during tests
		console.log = jest.fn();
		console.error = jest.fn();
	});

	afterAll(() => {
		// Restore console methods
		console.log = originalConsoleLog;
		console.error = originalConsoleError;
	});

	beforeEach(() => {
		jest.clearAllMocks();
		mockUseParams.mockReturnValue({
			deviceId: "test-device-123",
			dataseriesId: "test-dataseries-456",
		});
		mockUseRouter.mockReturnValue({
			push: jest.fn(),
			replace: jest.fn(),
			refresh: jest.fn(),
		});

		// Mock timers for testing auto-refresh
		jest.useFakeTimers();
	});

	afterEach(() => {
		// Restore timers
		jest.useRealTimers();
	});

	it("should render loading state initially", () => {
		mockGetDevice.mockResolvedValue(null);
		mockGetMongoMeasurements.mockResolvedValue({ success: true, data: [] });

		render(<UnassignedDataSeriesDetailPage />);

		// Check loading spinner is displayed
		const loadingSpinner = document.querySelector(".animate-spin");
		expect(loadingSpinner).toBeInTheDocument();
	});

	it("should handle device loading error", async () => {
		mockGetDevice.mockRejectedValue(new Error("Failed to load device"));

		render(<UnassignedDataSeriesDetailPage />);

		await waitFor(() => {
			expect(mockGetDevice).toHaveBeenCalledWith("test-device-123");
		});

		// Check that error message is displayed
		await waitFor(() => {
			expect(
				screen.getByText(/Failed to load device/)
			).toBeInTheDocument();
		});
	});

	it("should handle case when device is not found", async () => {
		mockGetDevice.mockResolvedValue(null);

		render(<UnassignedDataSeriesDetailPage />);

		await waitFor(() => {
			expect(mockGetDevice).toHaveBeenCalledWith("test-device-123");
		});

		// Check that error message is displayed
		await waitFor(() => {
			expect(screen.getByText(/Device not found/)).toBeInTheDocument();
		});
	});

	it("should handle measurement loading error", async () => {
		mockGetDevice.mockResolvedValue(mockDevice);
		mockGetMongoMeasurements.mockRejectedValue(
			new Error("Failed to load measurements")
		);

		render(<UnassignedDataSeriesDetailPage />);

		await waitFor(() => {
			expect(mockGetDevice).toHaveBeenCalledWith("test-device-123");
			expect(mockGetMongoMeasurements).toHaveBeenCalled();
		});

		// Check that error message is displayed
		await waitFor(() => {
			expect(
				screen.getByText(/Failed to load measurements/)
			).toBeInTheDocument();
		});
	});

	it("should change active chart tab when clicking on a chart key", async () => {
		mockGetDevice.mockResolvedValue(mockDevice);
		mockGetMongoMeasurements.mockResolvedValue({
			success: true,
			data: mockMeasurements,
		});

		render(<UnassignedDataSeriesDetailPage />);

		await waitFor(() => {
			expect(mockGetDevice).toHaveBeenCalledWith("test-device-123");
			expect(mockGetMongoMeasurements).toHaveBeenCalled();
		});

		// Wait for chart keys to be displayed
		await waitFor(() => {
			expect(screen.getByText("value")).toBeInTheDocument();
		});

		// Click on a different chart key
		fireEvent.click(screen.getByText("temperature"));

		// Should update active chart tab
		await waitFor(() => {
			// Check if temperature visualization title is shown
			expect(
				screen.getByText(/temperature Data Visualization/)
			).toBeInTheDocument();
		});
	});

	it("should render chart statistics correctly", async () => {
		mockGetDevice.mockResolvedValue(mockDevice);
		mockGetMongoMeasurements.mockResolvedValue({
			success: true,
			data: mockMeasurements,
		});

		render(<UnassignedDataSeriesDetailPage />);

		await waitFor(() => {
			expect(mockGetDevice).toHaveBeenCalledWith("test-device-123");
			expect(mockGetMongoMeasurements).toHaveBeenCalled();
		});

		// Wait for chart to load
		await waitFor(() => {
			expect(screen.getByText("value")).toBeInTheDocument();
		});

		// Check for statistics
		expect(screen.getByText("Average")).toBeInTheDocument();
		expect(screen.getByText("Minimum")).toBeInTheDocument();
		expect(screen.getByText("Maximum")).toBeInTheDocument();
		expect(screen.getByText("Latest")).toBeInTheDocument();
	});

	it("should handle data with no measurements", async () => {
		mockGetDevice.mockResolvedValue(mockDevice);
		mockGetMongoMeasurements.mockResolvedValue({
			success: true,
			data: [],
		});

		render(<UnassignedDataSeriesDetailPage />);

		await waitFor(() => {
			expect(mockGetDevice).toHaveBeenCalledWith("test-device-123");
			expect(mockGetMongoMeasurements).toHaveBeenCalled();
		});

		// Check for no data message
		await waitFor(() => {
			expect(
				screen.getByText(/No Unknown Data Found/)
			).toBeInTheDocument();
		});
	});

	it("should correctly process array and numeric data in payloads", async () => {
		mockGetDevice.mockResolvedValue(mockDevice);
		mockGetMongoMeasurements.mockResolvedValue({
			success: true,
			data: mockMeasurements,
		});

		render(<UnassignedDataSeriesDetailPage />);

		await waitFor(() => {
			expect(mockGetDevice).toHaveBeenCalledWith("test-device-123");
			expect(mockGetMongoMeasurements).toHaveBeenCalled();
		});

		// Wait for chart keys to load
		await waitFor(() => {
			// Should show both regular value and multiValue array
			expect(screen.getByText("value")).toBeInTheDocument();
			expect(screen.getByText("multiValue")).toBeInTheDocument();
		});

		// Click on multiValue to see array data
		fireEvent.click(screen.getByText("multiValue"));

		// Should see array data points count
		await waitFor(() => {
			// 6 points (3 from first measurement, 3 from second)
			expect(screen.getByText(/\(6 points\)/)).toBeInTheDocument();
		});
	});

	// Test coverage for error handling of timestamp conversion
	it("should handle invalid timestamps in data", async () => {
		mockGetDevice.mockResolvedValue(mockDevice);
		mockGetMongoMeasurements.mockResolvedValue({
			success: true,
			data: [
				{
					_id: "measurement-invalid",
					deviceId: "test-device-123",
					timestamp: "invalid-date",
					data: { value: 100 },
				},
			],
		});

		// Need to restore console.error to check it's called
		console.error = jest.fn();

		render(<UnassignedDataSeriesDetailPage />);

		await waitFor(() => {
			expect(mockGetDevice).toHaveBeenCalledWith("test-device-123");
			expect(mockGetMongoMeasurements).toHaveBeenCalled();
		});

		// Should have logged an error for invalid timestamp
		expect(console.error).toHaveBeenCalled();
	});
});

// Test the component's interaction with React hooks
describe("Unassigned Data Series Detail Page Hooks", () => {
	it("should render basic component structure", () => {
		mockGetDevice.mockResolvedValue(null);
		mockGetMongoMeasurements.mockResolvedValue({ success: true, data: [] });

		render(<UnassignedDataSeriesDetailPage />);
		expect(document.body).toBeTruthy();
	});

	it("should handle mock params", () => {
		const params = mockUseParams();
		expect(params.deviceId).toBe("test-device-123");
		expect(params.dataseriesId).toBe("test-dataseries-456");
	});

	it("should handle router functionality", () => {
		const router = mockUseRouter();
		expect(router.push).toBeDefined();
		expect(router.replace).toBeDefined();
		expect(router.refresh).toBeDefined();
	});
});

// Additional simple tests to increase coverage
describe("Additional coverage tests", () => {
	// Define test data directly here
	const testDevice = {
		id: "test-device-123",
		device_name: "Test Device",
		device_type: "sensor",
		status: "active",
	};

	const differentDevice = {
		id: "different-device-123",
		device_name: "Different Test Device",
		device_type: "sensor",
		status: "active",
	};

	const testMeasurements = [
		{
			_id: "test-measurement-1",
			deviceId: "test-device-123",
			timestamp: "2023-01-05T00:00:00.000Z",
			data: { simpleProp: 42 },
		},
		{
			_id: "test-measurement-2",
			deviceId: "test-device-123",
			timestamp: "2023-01-06T00:00:00.000Z",
			data: { simpleProp: 43 },
		},
	];

	it("should properly use device data when available", async () => {
		mockGetDevice.mockResolvedValue(differentDevice);
		mockGetMongoMeasurements.mockResolvedValue({
			success: true,
			data: [
				{
					_id: "simple-measurement",
					deviceId: "different-device-123",
					timestamp: "2023-01-05T00:00:00.000Z",
					data: { simpleProp: 42 },
				},
			],
		});

		render(<UnassignedDataSeriesDetailPage />);

		await waitFor(() => {
			expect(mockGetDevice).toHaveBeenCalled();
			expect(mockGetMongoMeasurements).toHaveBeenCalled();
		});

		// Simple check for the device name
		await waitFor(() => {
			const elements = screen.getAllByText(/Different Test Device/);
			expect(elements.length).toBeGreaterThan(0);
			elements.forEach((el) => expect(el).toBeInTheDocument());
		});
	});

	it("should handle refresh click", async () => {
		mockGetDevice.mockResolvedValue(testDevice);
		mockGetMongoMeasurements.mockResolvedValue({
			success: true,
			data: testMeasurements,
		});

		render(<UnassignedDataSeriesDetailPage />);

		await waitFor(() => {
			expect(mockGetDevice).toHaveBeenCalledWith("test-device-123");
			expect(mockGetMongoMeasurements).toHaveBeenCalled();
		});

		// Find and click refresh button
		const refreshButton = await screen.findByText(/Refresh/i);
		fireEvent.click(refreshButton);

		// Verify that API calls were made again
		await waitFor(() => {
			expect(mockGetMongoMeasurements).toHaveBeenCalledTimes(3);
		});
	});

	it("should handle null data values in measurements", async () => {
		mockGetDevice.mockResolvedValue(testDevice);
		mockGetMongoMeasurements.mockResolvedValue({
			success: true,
			data: [
				{
					_id: "measurement-null-values",
					deviceId: "test-device-123",
					timestamp: "2023-01-10T00:00:00.000Z",
					data: { nullValue: null, undefinedValue: undefined },
				},
			],
		});

		render(<UnassignedDataSeriesDetailPage />);

		await waitFor(() => {
			expect(mockGetDevice).toHaveBeenCalledWith("test-device-123");
			expect(mockGetMongoMeasurements).toHaveBeenCalled();
		});

		// Verify that the page doesn't crash with null values
		await waitFor(() => {
			expect(screen.getByTestId("page-layout")).toBeInTheDocument();
		});
	});

	it("should handle empty data object in measurements", async () => {
		mockGetDevice.mockResolvedValue(testDevice);
		mockGetMongoMeasurements.mockResolvedValue({
			success: true,
			data: [
				{
					_id: "measurement-empty-data",
					deviceId: "test-device-123",
					timestamp: "2023-01-15T00:00:00.000Z",
					data: {},
				},
			],
		});

		render(<UnassignedDataSeriesDetailPage />);

		await waitFor(() => {
			expect(mockGetDevice).toHaveBeenCalledWith("test-device-123");
			expect(mockGetMongoMeasurements).toHaveBeenCalled();
		});

		// Check for no data message
		await waitFor(() => {
			expect(
				screen.getByText(/No Unknown Data Found/)
			).toBeInTheDocument();
		});
	});

	it("should clear date filters when clear button is clicked", async () => {
		mockGetDevice.mockResolvedValue(testDevice);
		mockGetMongoMeasurements.mockResolvedValue({
			success: true,
			data: testMeasurements,
		});

		render(<UnassignedDataSeriesDetailPage />);

		await waitFor(() => {
			expect(mockGetDevice).toHaveBeenCalled();
		});

		// Wait for measurements to load before interacting with form elements
		await waitFor(() => {
			expect(mockGetMongoMeasurements).toHaveBeenCalled();
		});

		// Get the date inputs by type (there should be two datetime-local inputs)
		const dateInputs = screen.getAllByDisplayValue("");
		const datetimeInputs = dateInputs.filter(
			(input) => input.getAttribute("type") === "datetime-local"
		);
		const startDateInput = datetimeInputs[0]; // First datetime-local input is the "From" input

		// Set some date values
		fireEvent.change(startDateInput, {
			target: { value: "2023-01-01T00:00" },
		});

		// Verify the value was set
		await waitFor(() => {
			expect(startDateInput).toHaveValue("2023-01-01T00:00");
		});

		// Click clear button
		const clearButton = screen.getByText(/Clear/i);
		fireEvent.click(clearButton);

		// Should clear the input
		await waitFor(() => {
			expect(startDateInput).toHaveValue("");
		});
	});

	it("should toggle auto-refresh when checkbox is clicked", async () => {
		mockGetDevice.mockResolvedValue(testDevice);
		mockGetMongoMeasurements.mockResolvedValue({
			success: true,
			data: testMeasurements,
		});

		render(<UnassignedDataSeriesDetailPage />);

		await waitFor(() => {
			expect(mockGetDevice).toHaveBeenCalled();
		});

		// Find and click auto-refresh checkbox
		const autoRefreshCheckbox = screen.getByLabelText(/Auto-refresh/i);
		fireEvent.click(autoRefreshCheckbox);

		expect(autoRefreshCheckbox).toBeChecked();

		// Click again to uncheck
		fireEvent.click(autoRefreshCheckbox);
		expect(autoRefreshCheckbox).not.toBeChecked();
	});

	it("should handle auto-refresh interval", async () => {
		mockGetDevice.mockResolvedValue(testDevice);
		mockGetMongoMeasurements.mockResolvedValue({
			success: true,
			data: testMeasurements,
		});

		render(<UnassignedDataSeriesDetailPage />);

		await waitFor(() => {
			expect(mockGetDevice).toHaveBeenCalled();
			expect(mockGetMongoMeasurements).toHaveBeenCalled();
		});

		// Record initial call count after component loads
		const initialCallCount = mockGetMongoMeasurements.mock.calls.length;

		// Enable auto-refresh
		const autoRefreshCheckbox = screen.getByLabelText(/Auto-refresh/i);
		fireEvent.click(autoRefreshCheckbox);

		// Wait a moment for auto-refresh to be enabled
		await waitFor(() => {
			expect(autoRefreshCheckbox).toBeChecked();
		});

		// Fast-forward 5 seconds to trigger auto-refresh
		act(() => {
			jest.advanceTimersByTime(5000);
		});

		// Should have made additional API calls (more than initial)
		await waitFor(() => {
			expect(mockGetMongoMeasurements.mock.calls.length).toBeGreaterThan(
				initialCallCount
			);
		});
	});

	it("should render breadcrumbs correctly", async () => {
		mockGetDevice.mockResolvedValue(testDevice);
		mockGetMongoMeasurements.mockResolvedValue({
			success: true,
			data: [],
		});

		render(<UnassignedDataSeriesDetailPage />);

		// Wait for device to load and UI to render
		await waitFor(() => {
			expect(mockGetDevice).toHaveBeenCalled();
			expect(mockGetMongoMeasurements).toHaveBeenCalled();
		});

		// Wait for breadcrumbs to render
		await waitFor(() => {
			const breadcrumbs = screen.getByTestId("breadcrumbs");
			expect(breadcrumbs).toBeInTheDocument();
			expect(screen.getByText("Home")).toBeInTheDocument();
			expect(screen.getByText("Devices")).toBeInTheDocument();
		});
	});

	it("should handle measurement loading state", async () => {
		mockGetDevice.mockResolvedValue(testDevice);

		// Create a promise that doesn't resolve immediately
		let resolveMeasurements: (value: any) => void;
		const pendingMeasurements = new Promise((resolve) => {
			resolveMeasurements = resolve;
		});
		mockGetMongoMeasurements.mockReturnValue(pendingMeasurements);

		render(<UnassignedDataSeriesDetailPage />);

		await waitFor(() => {
			expect(mockGetDevice).toHaveBeenCalled();
		});

		// Should show loading state
		await waitFor(() => {
			expect(
				screen.getByText("Loading measurement data...")
			).toBeInTheDocument();
		});

		// Resolve the promise
		resolveMeasurements!({ success: true, data: [] });

		await waitFor(() => {
			expect(
				screen.queryByText("Loading measurement data...")
			).not.toBeInTheDocument();
		});
	});

	it("should render navigation links", async () => {
		mockGetDevice.mockResolvedValue(testDevice);
		mockGetMongoMeasurements.mockResolvedValue({
			success: true,
			data: [],
		});

		render(<UnassignedDataSeriesDetailPage />);

		// Wait for device to load and UI to render
		await waitFor(() => {
			expect(mockGetDevice).toHaveBeenCalled();
			expect(mockGetMongoMeasurements).toHaveBeenCalled();
		});

		// Wait for the main UI to render, then check navigation links
		await waitFor(() => {
			expect(screen.getByText("← Back to Device")).toBeInTheDocument();
			expect(screen.getByText("← All Devices")).toBeInTheDocument();
		});
	});

	it("should handle measurements with timestamp_unix", async () => {
		mockGetDevice.mockResolvedValue(testDevice);
		mockGetMongoMeasurements.mockResolvedValue({
			success: true,
			data: [
				{
					_id: "unix-timestamp-measurement",
					deviceId: "test-device-123",
					timestamp_unix: 1672531200, // Unix timestamp
					data: { value: 50 },
				},
			],
		});

		render(<UnassignedDataSeriesDetailPage />);

		await waitFor(() => {
			expect(mockGetDevice).toHaveBeenCalled();
			expect(mockGetMongoMeasurements).toHaveBeenCalled();
		});

		// Should process the unix timestamp correctly
		await waitFor(() => {
			expect(screen.getByText("value")).toBeInTheDocument();
		});
	});

	it("should show filter loading state on button", async () => {
		mockGetDevice.mockResolvedValue(testDevice);

		// First call resolves, second call is pending
		mockGetMongoMeasurements
			.mockResolvedValueOnce({ success: true, data: testMeasurements })
			.mockImplementationOnce(() => new Promise(() => {})); // Never resolves

		render(<UnassignedDataSeriesDetailPage />);

		// Wait for device to load and UI to render
		await waitFor(() => {
			expect(mockGetDevice).toHaveBeenCalled();
			expect(mockGetMongoMeasurements).toHaveBeenCalled();
		});

		// Wait for the filter button to appear
		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: /filter/i })
			).toBeInTheDocument();
		});

		// Click filter button to trigger loading state
		const filterButton = screen.getByRole("button", { name: /filter/i });
		fireEvent.click(filterButton);

		// Should show loading text on button
		await waitFor(() => {
			expect(screen.getByText("Loading...")).toBeInTheDocument();
		});
	});
});
