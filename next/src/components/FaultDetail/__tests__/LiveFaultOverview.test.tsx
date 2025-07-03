import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import LiveFaultOverview from "../LiveFaultOverview";
import { Device, LiveFault, MongoMeasurementData } from "@/services/api";

// Mock the copyToClipboard function
const mockCopyToClipboard = jest.fn();

describe("LiveFaultOverview", () => {
	const mockDevice: Device = {
		device_id: "device-1",
		device_name: "Test Device",
		device_type: "sensor",
		status: "Active",
		registration_date: "2023-01-01T00:00:00Z",
		last_updated: "2023-01-01T00:00:00Z",
	};

	const mockLiveFault: LiveFault = {
		fault_id: "live-fault-1",
		device_id: "device-1",
		start_time: "2023-01-01T10:00:00Z",
		conditions_count: 5,
		duration: 3600, // 1 hour in seconds
		current_condition: {
			condition_id: "condition-1",
			name: "Test Condition",
			description: "Test condition description",
			status: "Active",
			start_time: "2023-01-01T10:30:00Z",
			duration: 1800, // 30 minutes in seconds
		},
	};

	const mockConditionsData: MongoMeasurementData[] = [
		{
			id: "measurement-1",
			dataSeriesId: "series-1",
			conditionId: "condition-1",
			faultId: "live-fault-1",
			timestamp: Date.now(),
			metadata: {
				channels: ["channel1", "channel2"],
				sample_count_per_channel: 1000,
				channel_count: 2,
				total_samples: 2000,
				compression_ratio: 0.8,
				original_size_bytes: 8000,
				compressed_size_bytes: 6400,
			},
		},
		{
			id: "measurement-2",
			dataSeriesId: "series-1",
			conditionId: "condition-1",
			faultId: "live-fault-1",
			timestamp: Date.now() - 60000, // 1 minute ago
			metadata: {
				channels: ["channel1", "channel2"],
				sample_count_per_channel: 1000,
				channel_count: 2,
				total_samples: 2000,
				compression_ratio: 0.8,
				original_size_bytes: 8000,
				compressed_size_bytes: 6400,
			},
		},
	];

	const defaultProps = {
		device: mockDevice,
		liveFault: mockLiveFault,
		conditionsData: mockConditionsData,
		autoRefresh: false,
		onAutoRefreshChange: jest.fn(),
		onStopFault: jest.fn(),
		copyToClipboard: mockCopyToClipboard,
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("should render live fault status correctly", () => {
		render(<LiveFaultOverview {...defaultProps} />);

		expect(screen.getByText("🔥 Live Fault Active")).toBeInTheDocument();
		expect(screen.getByText("Recording")).toBeInTheDocument();
		expect(screen.getByText("Active")).toBeInTheDocument();
	});

	it("should display statistics correctly", () => {
		render(<LiveFaultOverview {...defaultProps} />);

		expect(screen.getByText("5")).toBeInTheDocument(); // conditions count
		expect(screen.getByText("Conditions Recorded")).toBeInTheDocument();
		expect(screen.getByText("2")).toBeInTheDocument(); // data points count
		expect(screen.getByText("Data Points")).toBeInTheDocument();
		expect(screen.getByText("Minutes Running")).toBeInTheDocument();
		expect(screen.getByText("Last Measurement")).toBeInTheDocument();
	});

	it("should show device and fault information", () => {
		render(<LiveFaultOverview {...defaultProps} />);

		expect(screen.getByText("Test Device")).toBeInTheDocument();
		expect(screen.getByText("live-fault-1")).toBeInTheDocument();
		expect(screen.getByText("Test Condition")).toBeInTheDocument();
	});

	it("should handle auto-refresh toggle", () => {
		const onAutoRefreshChange = jest.fn();
		render(
			<LiveFaultOverview
				{...defaultProps}
				onAutoRefreshChange={onAutoRefreshChange}
			/>
		);

		const checkbox = screen.getByRole("checkbox");
		expect(checkbox).not.toBeChecked();

		fireEvent.click(checkbox);
		expect(onAutoRefreshChange).toHaveBeenCalledWith(true);
	});

	it("should render checked auto-refresh when enabled", () => {
		render(
			<LiveFaultOverview
				{...defaultProps}
				autoRefresh={true}
			/>
		);

		const checkbox = screen.getByRole("checkbox");
		expect(checkbox).toBeChecked();
	});

	it("should call onStopFault when stop button is clicked", () => {
		const onStopFault = jest.fn();
		render(
			<LiveFaultOverview
				{...defaultProps}
				onStopFault={onStopFault}
			/>
		);

		const stopButton = screen.getByText("Stop Fault");
		fireEvent.click(stopButton);

		expect(onStopFault).toHaveBeenCalled();
	});

	it("should call copyToClipboard when fault ID is clicked", () => {
		render(<LiveFaultOverview {...defaultProps} />);

		const faultIdElement = screen.getByText("live-fault-1");
		fireEvent.click(faultIdElement);

		expect(mockCopyToClipboard).toHaveBeenCalledWith(
			"live-fault-1",
			"Live Fault ID"
		);
	});

	it("should handle empty conditions data", () => {
		render(
			<LiveFaultOverview
				{...defaultProps}
				conditionsData={[]}
			/>
		);

		expect(screen.getByText("0")).toBeInTheDocument(); // data points
		expect(screen.getByText("No data")).toBeInTheDocument(); // last measurement
	});

	it("should handle missing current condition", () => {
		const liveFaultWithoutCondition = {
			...mockLiveFault,
			current_condition: undefined,
		};
		render(
			<LiveFaultOverview
				{...defaultProps}
				liveFault={liveFaultWithoutCondition}
			/>
		);

		expect(screen.getByText("None")).toBeInTheDocument(); // current condition
	});

	it("should handle missing start time", () => {
		const liveFaultWithoutStartTime = { ...mockLiveFault, start_time: "" };
		render(
			<LiveFaultOverview
				{...defaultProps}
				liveFault={liveFaultWithoutStartTime}
			/>
		);

		expect(screen.getByText("Unknown")).toBeInTheDocument(); // started time
		expect(screen.getByText("0")).toBeInTheDocument(); // minutes running should be 0
	});

	it("should calculate minutes running correctly", () => {
		// Mock Date.now to return a fixed time
		const mockNow = new Date("2023-01-01T11:00:00Z").getTime();
		jest.spyOn(Date, "now").mockReturnValue(mockNow);

		render(<LiveFaultOverview {...defaultProps} />);

		// Should show 60 minutes (11:00 - 10:00)
		expect(screen.getByText("60")).toBeInTheDocument();

		// Restore Date.now
		jest.restoreAllMocks();
	});
});
