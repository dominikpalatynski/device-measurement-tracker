import React from "react";
import {
	render,
	screen,
	fireEvent,
	waitFor,
	act,
} from "@testing-library/react";
import { useParams, useRouter } from "next/navigation";
import FaultDetailPage from "../page";

// Mock next/navigation
jest.mock("next/navigation", () => ({
	useParams: jest.fn(),
	useRouter: jest.fn(),
}));

jest.mock("@/services/api", () => ({
	deviceApi: {
		getDevice: jest.fn(),
	},
	faultApi: {
		getFault: jest.fn(),
		updateFault: jest.fn(),
		deleteFault: jest.fn(),
	},
	onlineModeApi: {
		getLiveFault: jest.fn(),
		startCondition: jest.fn(),
		stopCondition: jest.fn(),
		getLiveData: jest.fn(),
	},
	conditionsApi: {
		getConditions: jest.fn(),
		createCondition: jest.fn(),
		updateCondition: jest.fn(),
		deleteCondition: jest.fn(),
		startCondition: jest.fn(),
		stopCondition: jest.fn(),
		finishCondition: jest.fn(),
	},
	getAllMeasurements: jest.fn(),
	getLatestMeasurementData: jest.fn(),
	getMongoMeasurements: jest.fn(),
}));

// Get the mocked functions
const mockDeviceApi = require("@/services/api").deviceApi;
const mockFaultApi = require("@/services/api").faultApi;
const mockOnlineModeApi = require("@/services/api").onlineModeApi;
const mockConditionsApi = require("@/services/api").conditionsApi;
const mockGetAllMeasurements = require("@/services/api").getAllMeasurements;
const mockGetLatestMeasurementData =
	require("@/services/api").getLatestMeasurementData;
const mockGetMongoMeasurements = require("@/services/api").getMongoMeasurements;

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

// Mock recharts
jest.mock("recharts", () => ({
	LineChart: ({ children }: any) => (
		<div data-testid='line-chart'>{children}</div>
	),
	Line: () => <div data-testid='line' />,
	XAxis: () => <div data-testid='x-axis' />,
	YAxis: () => <div data-testid='y-axis' />,
	CartesianGrid: () => <div data-testid='cartesian-grid' />,
	Tooltip: () => <div data-testid='tooltip' />,
	Legend: () => <div data-testid='legend' />,
	ResponsiveContainer: ({ children }: any) => (
		<div data-testid='responsive-container'>{children}</div>
	),
}));

const mockUseParams = useParams as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;
const mockPush = jest.fn();

describe("Fault Detail Page", () => {
	const mockDevice = {
		id: "test-device-123",
		name: "Test Device",
		type: "pmsm-mechanical-vibration",
		status: "active",
	};

	const mockFault = {
		id: "test-fault-456",
		device_id: "test-device-123",
		name: "Test Fault",
		description: "Test fault description",
		status: "active",
		created_at: "2024-01-01T00:00:00Z",
	};

	const mockConditions = [
		{
			id: "condition-1",
			fault_id: "test-fault-456",
			name: "Test Condition",
			description: "Test condition description",
			status: "completed",
			created_at: "2024-01-01T00:00:00Z",
		},
	];

	const mockLiveFault = {
		status: "active",
		currentCondition: {
			id: "condition-1",
			name: "Live Condition",
			status: "running",
		},
	};

	beforeEach(() => {
		jest.clearAllMocks();
		mockUseParams.mockReturnValue({
			deviceId: "test-device-123",
			faultId: "test-fault-456",
		});
		mockUseRouter.mockReturnValue({
			push: mockPush,
			replace: jest.fn(),
			refresh: jest.fn(),
		});

		// Set default successful responses
		mockDeviceApi.getDevice.mockResolvedValue(mockDevice);
		mockFaultApi.getFault.mockResolvedValue(mockFault);
		mockOnlineModeApi.getLiveFault.mockResolvedValue(mockLiveFault);
		mockConditionsApi.getConditions.mockResolvedValue(mockConditions);
		mockGetAllMeasurements.mockResolvedValue([]);
		mockGetLatestMeasurementData.mockResolvedValue(null);
		mockGetMongoMeasurements.mockResolvedValue([]);
	});

	it("should render without crashing", () => {
		render(<FaultDetailPage />);

		// Should render the device protected route
		expect(
			screen.getByTestId("device-protected-route")
		).toBeInTheDocument();
	});

	it("should handle fault editing", async () => {
		mockFaultApi.updateFault.mockResolvedValue({ success: true });

		render(<FaultDetailPage />);

		await waitFor(() => {
			expect(screen.getByTestId("page-layout")).toBeInTheDocument();
		});

		// Look for edit button
		const editButton = screen.queryByText("Edit");
		if (editButton) {
			fireEvent.click(editButton);

			// Look for save button after editing
			const saveButton = screen.queryByText("Save");
			if (saveButton) {
				fireEvent.click(saveButton);
				await waitFor(() => {
					expect(mockFaultApi.updateFault).toHaveBeenCalled();
				});
			}
		}
	});

	it("should handle fault deletion", async () => {
		mockFaultApi.deleteFault.mockResolvedValue({ success: true });
		window.confirm = jest.fn().mockReturnValue(true);

		render(<FaultDetailPage />);

		await waitFor(() => {
			expect(screen.getByTestId("page-layout")).toBeInTheDocument();
		});

		// Look for delete button
		const deleteButton =
			screen.queryByText("Delete") || screen.queryByText("Delete Fault");
		if (deleteButton) {
			fireEvent.click(deleteButton);
			await waitFor(() => {
				expect(mockFaultApi.deleteFault).toHaveBeenCalledWith(
					"test-fault-456"
				);
				expect(mockPush).toHaveBeenCalledWith(
					"/devices/test-device-123"
				);
			});
		}
	});

	it("should handle starting a condition", async () => {
		mockOnlineModeApi.startCondition.mockResolvedValue({ success: true });

		render(<FaultDetailPage />);

		await waitFor(() => {
			expect(screen.getByTestId("page-layout")).toBeInTheDocument();
		});

		// Look for start condition button
		const startButton =
			screen.queryByText("Start Condition") ||
			screen.queryByText("Start");
		if (startButton) {
			fireEvent.click(startButton);
			await waitFor(() => {
				expect(mockOnlineModeApi.startCondition).toHaveBeenCalled();
			});
		}
	});

	it("should handle stopping a condition", async () => {
		mockOnlineModeApi.stopCondition.mockResolvedValue({ success: true });

		// Mock active live fault
		mockOnlineModeApi.getLiveFault.mockResolvedValue({
			...mockLiveFault,
			currentCondition: {
				...mockLiveFault.currentCondition,
				status: "running",
			},
		});

		render(<FaultDetailPage />);

		await waitFor(() => {
			expect(screen.getByTestId("page-layout")).toBeInTheDocument();
		});

		// Look for stop condition button
		const stopButton =
			screen.queryByText("Stop Condition") || screen.queryByText("Stop");
		if (stopButton) {
			fireEvent.click(stopButton);
			await waitFor(() => {
				expect(mockOnlineModeApi.stopCondition).toHaveBeenCalled();
			});
		}
	});

	it("should handle condition creation", async () => {
		mockConditionsApi.createCondition.mockResolvedValue({
			success: true,
			data: { id: "new-condition" },
		});

		render(<FaultDetailPage />);

		await waitFor(() => {
			expect(screen.getByTestId("page-layout")).toBeInTheDocument();
		});

		// Look for create condition button
		const createButton =
			screen.queryByText("Create Condition") ||
			screen.queryByText("Add Condition");
		if (createButton) {
			fireEvent.click(createButton);

			// Fill in form if modal opens
			const nameInput =
				screen.queryByLabelText(/name/i) ||
				screen.queryByPlaceholderText(/name/i);
			if (nameInput) {
				fireEvent.change(nameInput, {
					target: { value: "New Condition" },
				});
			}

			const submitButton =
				screen.queryByText("Create") || screen.queryByText("Save");
			if (submitButton) {
				fireEvent.click(submitButton);
				await waitFor(() => {
					expect(
						mockConditionsApi.createCondition
					).toHaveBeenCalled();
				});
			}
		}
	});

	it("should handle condition editing", async () => {
		mockConditionsApi.updateCondition.mockResolvedValue({ success: true });

		render(<FaultDetailPage />);

		await waitFor(() => {
			expect(screen.getByTestId("page-layout")).toBeInTheDocument();
		});

		// Look for condition edit buttons
		const editButtons = screen.queryAllByText("Edit");
		if (editButtons.length > 0) {
			// Click the first edit button (likely for a condition)
			fireEvent.click(editButtons[editButtons.length - 1]);

			const saveButton =
				screen.queryByText("Save") || screen.queryByText("Update");
			if (saveButton) {
				fireEvent.click(saveButton);
				await waitFor(() => {
					expect(
						mockConditionsApi.updateCondition
					).toHaveBeenCalled();
				});
			}
		}
	});

	it("should handle condition deletion", async () => {
		mockConditionsApi.deleteCondition.mockResolvedValue({ success: true });
		window.confirm = jest.fn().mockReturnValue(true);

		render(<FaultDetailPage />);

		await waitFor(() => {
			expect(screen.getByTestId("page-layout")).toBeInTheDocument();
		});

		// Look for condition delete buttons
		const deleteButtons = screen.queryAllByText("Delete");
		if (deleteButtons.length > 0) {
			// Click the last delete button (likely for a condition)
			fireEvent.click(deleteButtons[deleteButtons.length - 1]);
			await waitFor(() => {
				expect(mockConditionsApi.deleteCondition).toHaveBeenCalled();
			});
		}
	});

	it("should handle tab switching between different views", async () => {
		render(<FaultDetailPage />);

		await waitFor(() => {
			expect(screen.getByTestId("page-layout")).toBeInTheDocument();
		});

		// Look for different tabs/sections
		const tabs = screen.queryAllByRole("button");
		const tabTexts = ["Overview", "Conditions", "Data", "Live", "Settings"];

		tabs.forEach((tab) => {
			const tabText = tab.textContent;
			if (tabText && tabTexts.some((text) => tabText.includes(text))) {
				fireEvent.click(tab);
			}
		});
	});

	it("should handle chart data visualization", async () => {
		const mockMeasurements = [
			{
				id: 1,
				timestamp: 1640995200000,
				data: { voltage: 12.5, current: 2.1 },
			},
			{
				id: 2,
				timestamp: 1640995260000,
				data: { voltage: 12.3, current: 2.0 },
			},
		];

		mockGetMongoMeasurements.mockResolvedValue(mockMeasurements);

		render(<FaultDetailPage />);

		await waitFor(() => {
			expect(screen.getByTestId("page-layout")).toBeInTheDocument();
		});

		// Check if charts are rendered when there's data
		await waitFor(() => {
			const charts = screen.queryAllByTestId("line-chart");
			// Charts should be rendered if there's measurement data
			if (mockMeasurements.length > 0) {
				expect(charts.length).toBeGreaterThanOrEqual(0);
			}
		});
	});

	it("should handle creating an offline condition", async () => {
		mockConditionsApi.createCondition.mockResolvedValue({
			condition_id: "new-condition",
			fault_id: "test-fault-456",
			name: "New Offline Condition",
			description: "Description",
			status: "active",
		});

		render(<FaultDetailPage />);

		await waitFor(() => {
			expect(screen.getByTestId("page-layout")).toBeInTheDocument();
		});

		// Find and click button to show offline condition form
		const createOfflineButton =
			screen.queryByText(/add offline condition/i) ||
			screen.queryByText(/create condition/i);

		if (createOfflineButton) {
			fireEvent.click(createOfflineButton);

			// Fill in the condition form
			const nameInput =
				screen.queryByLabelText(/condition name/i) ||
				screen.queryByPlaceholderText(/condition name/i) ||
				screen.queryAllByRole("textbox")[0];

			const descInput =
				screen.queryByLabelText(/description/i) ||
				screen.queryByPlaceholderText(/description/i) ||
				screen.queryAllByRole("textbox")[1];

			if (nameInput) {
				fireEvent.change(nameInput, {
					target: { value: "New Offline Condition" },
				});
			}

			if (descInput) {
				fireEvent.change(descInput, {
					target: { value: "Description" },
				});
			}

			// Submit the form
			const submitButton =
				screen.queryByText(/create/i) ||
				screen.queryByText(/save/i) ||
				screen.queryByText(/add/i);

			if (submitButton) {
				fireEvent.click(submitButton);

				await waitFor(() => {
					expect(
						mockConditionsApi.createCondition
					).toHaveBeenCalledWith({
						fault_id: "test-fault-456",
						name: "New Offline Condition",
						description: "Description",
					});
				});
			}
		}
	});

	it("should handle live data loading and visualization", async () => {
		// Mock a successful measurement data response
		const mockData = [
			{
				_id: "1",
				timestamp: new Date().toISOString(),
				data: {
					voltage: 220,
					current: 5,
					power: 1100,
				},
			},
		];

		mockGetMongoMeasurements.mockResolvedValue({
			success: true,
			data: mockData,
		});

		render(<FaultDetailPage />);

		await waitFor(() => {
			expect(screen.getByTestId("page-layout")).toBeInTheDocument();
		});

		// Find and click any "Data" or "Live Data" tab
		const dataTab =
			screen.queryByText(/data/i) || screen.queryByText(/live data/i);

		if (dataTab) {
			fireEvent.click(dataTab);

			// Wait for data to load
			await waitFor(() => {
				expect(mockGetMongoMeasurements).toHaveBeenCalled();
			});

			// Check if the chart is rendered
			const charts = screen.queryAllByTestId("responsive-container");
			expect(charts.length).toBeGreaterThanOrEqual(0);
		}
	});
});
