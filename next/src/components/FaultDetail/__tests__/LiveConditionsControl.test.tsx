import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import LiveConditionsControl from "../LiveConditionsControl";
import {
	Device,
	LiveFault,
	ActiveCondition,
	MongoMeasurementData,
} from "@/services/api";

// Mock recharts components
jest.mock("recharts", () => ({
	ResponsiveContainer: ({ children }: any) => (
		<div data-testid='responsive-container'>{children}</div>
	),
	LineChart: ({ children }: any) => (
		<div data-testid='line-chart'>{children}</div>
	),
	Line: () => <div data-testid='line' />,
	XAxis: () => <div data-testid='x-axis' />,
	YAxis: () => <div data-testid='y-axis' />,
	CartesianGrid: () => <div data-testid='cartesian-grid' />,
	Tooltip: () => <div data-testid='tooltip' />,
	Legend: () => <div data-testid='legend' />,
}));

describe("LiveConditionsControl", () => {
	const mockDevice: Device = {
		device_id: "device-1",
		device_name: "Test Device",
		device_type: "sensor",
		status: "Active",
		registration_date: "2023-01-01T00:00:00Z",
		last_updated: "2023-01-01T00:00:00Z",
	};

	const mockActiveCondition: ActiveCondition = {
		condition_id: "condition-1",
		name: "Test Condition",
		description: "Test condition description",
		status: "Active",
		start_time: "2023-01-01T10:30:00Z",
		duration: 1800,
	};

	const mockLiveFault: LiveFault = {
		fault_id: "live-fault-1",
		device_id: "device-1",
		start_time: "2023-01-01T10:00:00Z",
		conditions_count: 2,
		duration: 3600,
		current_condition: mockActiveCondition,
	};

	const mockConditions: ActiveCondition[] = [
		mockActiveCondition,
		{
			condition_id: "condition-2",
			name: "Previous Condition",
			description: "Previous condition description",
			status: "Active",
			start_time: "2023-01-01T10:00:00Z",
			duration: 1800,
		},
	];

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
	];

	const defaultProps = {
		device: mockDevice,
		liveFault: mockLiveFault,
		conditions: mockConditions,
		conditionsData: mockConditionsData,
		chartViewMode: "chart" as const,
		showConditionForm: false,
		newConditionName: "",
		newConditionDescription: "",
		onChartViewModeChange: jest.fn(),
		onToggleConditionForm: jest.fn(),
		onConditionNameChange: jest.fn(),
		onConditionDescriptionChange: jest.fn(),
		onStartCondition: jest.fn(),
		onStopCondition: jest.fn(),
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("should render the main title and controls", () => {
		render(<LiveConditionsControl {...defaultProps} />);

		expect(
			screen.getByText("🔴 Live Conditions Control")
		).toBeInTheDocument();
		expect(screen.getByText("📈 Chart")).toBeInTheDocument();
		expect(screen.getByText("📊 Stats")).toBeInTheDocument();
		expect(screen.getByText("Add Condition")).toBeInTheDocument();
	});

	it("should show active condition information", () => {
		render(<LiveConditionsControl {...defaultProps} />);

		expect(screen.getByText("Active: Test Condition")).toBeInTheDocument();
		expect(screen.getByText("Recording Data")).toBeInTheDocument();
		// Use getAllByText since this text appears in multiple places
		const descriptions = screen.getAllByText("Test condition description");
		expect(descriptions.length).toBeGreaterThan(0);
		expect(screen.getByText("Stop Condition")).toBeInTheDocument();
	});

	it("should switch between chart and stats view modes", () => {
		const onChartViewModeChange = jest.fn();
		render(
			<LiveConditionsControl
				{...defaultProps}
				onChartViewModeChange={onChartViewModeChange}
			/>
		);

		const statsButton = screen.getByText("📊 Stats");
		fireEvent.click(statsButton);

		expect(onChartViewModeChange).toHaveBeenCalledWith("stats");
	});

	it("should show chart view when chartViewMode is chart", () => {
		// Add some mock data with numeric values
		const conditionsDataWithData = [
			{
				...mockConditionsData[0],
				data: { temperature: 25.5, pressure: 1013.25 },
			},
		] as any;

		render(
			<LiveConditionsControl
				{...defaultProps}
				conditionsData={conditionsDataWithData}
			/>
		);

		expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
		expect(screen.getByTestId("line-chart")).toBeInTheDocument();
	});

	it("should show no data message when no numeric data is available for stats", () => {
		// Mock data with non-numeric values
		const conditionsDataWithoutNumericData = [
			{
				...mockConditionsData[0],
				data: { status: "running", message: "all good" },
			},
		] as any;

		render(
			<LiveConditionsControl
				{...defaultProps}
				chartViewMode='stats'
				conditionsData={conditionsDataWithoutNumericData}
			/>
		);

		expect(
			screen.getByText("No numeric data available for statistics")
		).toBeInTheDocument();
	});

	it("should toggle condition form visibility", () => {
		const onToggleConditionForm = jest.fn();
		render(
			<LiveConditionsControl
				{...defaultProps}
				onToggleConditionForm={onToggleConditionForm}
			/>
		);

		const addButton = screen.getByText("Add Condition");
		fireEvent.click(addButton);

		expect(onToggleConditionForm).toHaveBeenCalled();
	});

	it("should show condition form when showConditionForm is true", () => {
		render(
			<LiveConditionsControl
				{...defaultProps}
				showConditionForm={true}
			/>
		);

		expect(screen.getByText("Start New Condition")).toBeInTheDocument();
		expect(screen.getByText("Condition Name *")).toBeInTheDocument();
		expect(screen.getByText("Description")).toBeInTheDocument();
		expect(screen.getByText("Start Condition")).toBeInTheDocument();
		// Find the cancel button within the form (should be the second one)
		const cancelButtons = screen.getAllByText("Cancel");
		expect(cancelButtons).toHaveLength(2); // One in header, one in form
		expect(cancelButtons[1]).toBeInTheDocument(); // Form cancel button
	});

	it("should handle condition name input changes", () => {
		const onConditionNameChange = jest.fn();
		render(
			<LiveConditionsControl
				{...defaultProps}
				showConditionForm={true}
				onConditionNameChange={onConditionNameChange}
			/>
		);

		const nameInput = screen.getByPlaceholderText(
			"e.g., Baseline, Load 5kg, Speed 100rpm"
		);
		fireEvent.change(nameInput, { target: { value: "New Condition" } });

		expect(onConditionNameChange).toHaveBeenCalledWith("New Condition");
	});

	it("should handle condition description input changes", () => {
		const onConditionDescriptionChange = jest.fn();
		render(
			<LiveConditionsControl
				{...defaultProps}
				showConditionForm={true}
				onConditionDescriptionChange={onConditionDescriptionChange}
			/>
		);

		const descriptionInput = screen.getByPlaceholderText(
			"Describe the condition..."
		);
		fireEvent.change(descriptionInput, {
			target: { value: "New description" },
		});

		expect(onConditionDescriptionChange).toHaveBeenCalledWith(
			"New description"
		);
	});

	it("should disable start condition button when name is empty", () => {
		render(
			<LiveConditionsControl
				{...defaultProps}
				showConditionForm={true}
			/>
		);

		const startButton = screen.getByText("Start Condition");
		expect(startButton).toBeDisabled();
	});

	it("should enable start condition button when name is provided", () => {
		render(
			<LiveConditionsControl
				{...defaultProps}
				showConditionForm={true}
				newConditionName='New Condition'
			/>
		);

		const startButton = screen.getByText("Start Condition");
		expect(startButton).not.toBeDisabled();
	});

	it("should call onStartCondition when start button is clicked", () => {
		const onStartCondition = jest.fn();
		render(
			<LiveConditionsControl
				{...defaultProps}
				showConditionForm={true}
				newConditionName='New Condition'
				onStartCondition={onStartCondition}
			/>
		);

		const startButton = screen.getByText("Start Condition");
		fireEvent.click(startButton);

		expect(onStartCondition).toHaveBeenCalled();
	});

	it("should call onStopCondition when stop condition button is clicked", () => {
		const onStopCondition = jest.fn();
		render(
			<LiveConditionsControl
				{...defaultProps}
				onStopCondition={onStopCondition}
			/>
		);

		const stopButton = screen.getByText("Stop Condition");
		fireEvent.click(stopButton);

		expect(onStopCondition).toHaveBeenCalledWith("condition-1");
	});

	it("should show conditions history", () => {
		render(<LiveConditionsControl {...defaultProps} />);

		expect(screen.getByText("Conditions History")).toBeInTheDocument();
		expect(screen.getByText("Test Condition")).toBeInTheDocument();
		expect(screen.getByText("Previous Condition")).toBeInTheDocument();
	});

	it("should show message when no conditions exist", () => {
		const liveFaultWithoutConditions = {
			...mockLiveFault,
			conditions_count: 0,
		};
		render(
			<LiveConditionsControl
				{...defaultProps}
				liveFault={liveFaultWithoutConditions}
				conditions={[]}
			/>
		);

		expect(
			screen.getByText(
				"No conditions recorded yet. Add one to start measuring specific conditions."
			)
		).toBeInTheDocument();
	});

	it("should not show active condition section when no current condition", () => {
		const liveFaultWithoutCurrentCondition = {
			...mockLiveFault,
			current_condition: undefined,
		};
		render(
			<LiveConditionsControl
				{...defaultProps}
				liveFault={liveFaultWithoutCurrentCondition}
			/>
		);

		expect(
			screen.queryByText("Active: Test Condition")
		).not.toBeInTheDocument();
		expect(screen.queryByText("Recording Data")).not.toBeInTheDocument();
	});

	it("should show measurement count", () => {
		render(<LiveConditionsControl {...defaultProps} />);

		expect(
			screen.getByText("1 measurements collected")
		).toBeInTheDocument();
	});
});
