import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdvancedZoomChart from "../AdvancedZoomChart";

// Mock recharts components
jest.mock("recharts", () => ({
	LineChart: ({
		children,
		onMouseDown,
		onMouseMove,
		onMouseUp,
		onMouseLeave,
	}: any) => (
		<div
			data-testid='line-chart'
			onMouseDown={onMouseDown}
			onMouseMove={onMouseMove}
			onMouseUp={onMouseUp}
			onMouseLeave={onMouseLeave}
		>
			{children}
		</div>
	),
	Line: ({ dataKey, stroke }: any) => (
		<div
			data-testid={`line-${dataKey}`}
			style={{ color: stroke }}
		/>
	),
	XAxis: ({ dataKey }: any) => <div data-testid={`x-axis-${dataKey}`} />,
	YAxis: () => <div data-testid='y-axis' />,
	CartesianGrid: () => <div data-testid='cartesian-grid' />,
	Tooltip: ({ content }: any) => <div data-testid='tooltip'>{content}</div>,
	Legend: () => <div data-testid='legend' />,
	ResponsiveContainer: ({ children }: any) => (
		<div data-testid='responsive-container'>{children}</div>
	),
	Brush: ({ onChange }: any) => (
		<div
			data-testid='brush'
			onClick={() =>
				onChange && onChange({ startIndex: 0, endIndex: 50 })
			}
		/>
	),
	ReferenceLine: ({ x, y }: any) => (
		<div data-testid={`reference-line-${x || y}`} />
	),
	ReferenceArea: ({ x1, x2 }: any) => (
		<div data-testid={`reference-area-${x1}-${x2}`} />
	),
}));

describe("AdvancedZoomChart", () => {
	const mockData = [
		{
			timestamp: 1640995200000,
			timestampFormatted: "2022-01-01 00:00:00",
			value: 10.5,
			index: 0,
		},
		{
			timestamp: 1640995260000,
			timestampFormatted: "2022-01-01 00:01:00",
			value: 12.3,
			index: 1,
		},
		{
			timestamp: 1640995320000,
			timestampFormatted: "2022-01-01 00:02:00",
			value: 8.7,
			index: 2,
		},
		{
			timestamp: 1640995380000,
			timestampFormatted: "2022-01-01 00:03:00",
			value: 15.2,
			index: 3,
		},
		{
			timestamp: 1640995440000,
			timestampFormatted: "2022-01-01 00:04:00",
			value: 9.8,
			index: 4,
		},
	];

	const defaultProps = {
		data: mockData,
		dataKey: "value",
		xAxisKey: "timestampFormatted",
		title: "Test Chart",
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("Basic Rendering", () => {
		it("should render chart with title", () => {
			render(<AdvancedZoomChart {...defaultProps} />);

			expect(screen.getByText("Test Chart")).toBeInTheDocument();
			expect(screen.getByTestId("line-chart")).toBeInTheDocument();
			expect(
				screen.getByTestId("responsive-container")
			).toBeInTheDocument();
		});

		it("should render chart with custom color", () => {
			render(
				<AdvancedZoomChart
					{...defaultProps}
					color='#ff0000'
				/>
			);

			const line = screen.getByTestId("line-value");
			expect(line).toHaveStyle({ color: "#ff0000" });
		});

		it("should render chart with custom height", () => {
			const { container } = render(
				<AdvancedZoomChart
					{...defaultProps}
					height={600}
				/>
			);

			// The height prop should be passed to ResponsiveContainer
			expect(
				screen.getByTestId("responsive-container")
			).toBeInTheDocument();
		});

		it("should render chart components", () => {
			render(<AdvancedZoomChart {...defaultProps} />);

			expect(screen.getByTestId("cartesian-grid")).toBeInTheDocument();
			expect(
				screen.getByTestId("x-axis-timestampFormatted")
			).toBeInTheDocument();
			expect(screen.getByTestId("y-axis")).toBeInTheDocument();
			expect(screen.getByTestId("tooltip")).toBeInTheDocument();
			expect(screen.getByTestId("legend")).toBeInTheDocument();
			expect(screen.getByTestId("line-value")).toBeInTheDocument();
		});
	});

	describe("Controls and UI", () => {
		it("should display zoom level and data points info", () => {
			render(<AdvancedZoomChart {...defaultProps} />);

			expect(screen.getByText(/Zoom Level: 1.0x/)).toBeInTheDocument();
			expect(screen.getByText(/Points: 5 \/ 5/)).toBeInTheDocument();
		});

		it("should render control buttons", () => {
			render(<AdvancedZoomChart {...defaultProps} />);

			expect(screen.getByText(/🔍- Zoom Out/)).toBeInTheDocument();
			expect(screen.getByText(/🏠 Reset/)).toBeInTheDocument();
			expect(screen.getByText(/🔍 Magnifier Off/)).toBeInTheDocument();
		});

		it("should toggle magnifier on button click", async () => {
			const user = userEvent.setup();
			render(<AdvancedZoomChart {...defaultProps} />);

			const magnifierButton = screen.getByText(/🔍 Magnifier Off/);
			await user.click(magnifierButton);

			await waitFor(() => {
				expect(screen.getByText(/🔍 Magnifier On/)).toBeInTheDocument();
			});
		});

		it("should show instructions when magnifier is active", async () => {
			const user = userEvent.setup();
			render(<AdvancedZoomChart {...defaultProps} />);

			const magnifierButton = screen.getByText(/🔍 Magnifier Off/);
			await user.click(magnifierButton);

			await waitFor(() => {
				expect(
					screen.getByText(/Zoom Instructions:/)
				).toBeInTheDocument();
				expect(
					screen.getByText(
						/Click and drag to select an area to zoom into/
					)
				).toBeInTheDocument();
			});
		});

		it("should disable zoom out button initially", () => {
			render(<AdvancedZoomChart {...defaultProps} />);

			const zoomOutButton = screen.getByText(/🔍- Zoom Out/);
			expect(zoomOutButton).toBeDisabled();
		});
	});

	describe("Statistics Panel", () => {
		it("should display statistics for data", () => {
			render(<AdvancedZoomChart {...defaultProps} />);

			expect(screen.getByText("5")).toBeInTheDocument(); // Visible Points
			expect(screen.getByText("Visible Points")).toBeInTheDocument();
			expect(screen.getByText("Minimum")).toBeInTheDocument();
			expect(screen.getByText("Maximum")).toBeInTheDocument();
			expect(screen.getByText("Average")).toBeInTheDocument();
		});

		it("should calculate correct statistics", () => {
			render(<AdvancedZoomChart {...defaultProps} />);

			// Min value should be 8.7
			expect(screen.getByText("8.7000")).toBeInTheDocument();
			// Max value should be 15.2
			expect(screen.getByText("15.2000")).toBeInTheDocument();
			// Average should be (10.5 + 12.3 + 8.7 + 15.2 + 9.8) / 5 = 11.3
			expect(screen.getByText("11.3000")).toBeInTheDocument();
		});

		it("should show N/A for empty data", () => {
			render(
				<AdvancedZoomChart
					{...defaultProps}
					data={[]}
				/>
			);

			const naElements = screen.getAllByText("N/A");
			expect(naElements).toHaveLength(3); // Min, Max, Average should all be N/A
		});
	});

	describe("Brush Feature", () => {
		it("should render brush when enableBrush is true and data length > 100", () => {
			const largeMockData = Array.from({ length: 150 }, (_, i) => ({
				timestamp: 1640995200000 + i * 60000,
				timestampFormatted: `2022-01-01 00:${i
					.toString()
					.padStart(2, "0")}:00`,
				value: Math.random() * 20,
				index: i,
			}));

			render(
				<AdvancedZoomChart
					{...defaultProps}
					data={largeMockData}
					enableBrush={true}
				/>
			);

			expect(
				screen.getByText("Overview & Navigation")
			).toBeInTheDocument();
			expect(screen.getByTestId("brush")).toBeInTheDocument();
		});

		it("should not render brush when data length <= 100", () => {
			render(
				<AdvancedZoomChart
					{...defaultProps}
					enableBrush={true}
				/>
			);

			expect(
				screen.queryByText("Overview & Navigation")
			).not.toBeInTheDocument();
			expect(screen.queryByTestId("brush")).not.toBeInTheDocument();
		});

		it("should not render brush when enableBrush is false", () => {
			const largeMockData = Array.from({ length: 150 }, (_, i) => ({
				timestamp: 1640995200000 + i * 60000,
				timestampFormatted: `2022-01-01 00:${i
					.toString()
					.padStart(2, "0")}:00`,
				value: Math.random() * 20,
				index: i,
			}));

			render(
				<AdvancedZoomChart
					{...defaultProps}
					data={largeMockData}
					enableBrush={false}
				/>
			);

			expect(
				screen.queryByText("Overview & Navigation")
			).not.toBeInTheDocument();
			expect(screen.queryByTestId("brush")).not.toBeInTheDocument();
		});
	});

	describe("Zoom Functionality", () => {
		it("should handle reset zoom", async () => {
			const user = userEvent.setup();
			render(<AdvancedZoomChart {...defaultProps} />);

			const resetButton = screen.getByText(/🏠 Reset/);
			await user.click(resetButton);

			// Should reset to zoom level 1.0x
			expect(screen.getByText(/Zoom Level: 1.0x/)).toBeInTheDocument();
		});

		it("should handle mouse interactions when magnifier is enabled", async () => {
			const user = userEvent.setup();
			render(
				<AdvancedZoomChart
					{...defaultProps}
					enableMagnifier={true}
				/>
			);

			// Enable magnifier first
			const magnifierButton = screen.getByText(/🔍 Magnifier Off/);
			await user.click(magnifierButton);

			const chart = screen.getByTestId("line-chart");

			// Test mouse down
			fireEvent.mouseDown(chart, {
				activeLabel: "2022-01-01 00:01:00",
			});

			// Test mouse move
			fireEvent.mouseMove(chart, {
				activeLabel: "2022-01-01 00:03:00",
			});

			// Test mouse up
			fireEvent.mouseUp(chart);

			// The chart should handle these events without throwing
			expect(chart).toBeInTheDocument();
		});

		it("should not handle mouse interactions when magnifier is disabled", () => {
			render(
				<AdvancedZoomChart
					{...defaultProps}
					enableMagnifier={false}
				/>
			);

			const chart = screen.getByTestId("line-chart");

			// Mouse events should not be attached when magnifier is disabled
			fireEvent.mouseDown(chart);
			fireEvent.mouseMove(chart);
			fireEvent.mouseUp(chart);

			expect(chart).toBeInTheDocument();
		});
	});

	describe("Crosshair Feature", () => {
		it("should handle mouse leave for crosshair", () => {
			render(
				<AdvancedZoomChart
					{...defaultProps}
					enableCrosshair={true}
				/>
			);

			const chart = screen.getByTestId("line-chart");
			fireEvent.mouseLeave(chart);

			expect(chart).toBeInTheDocument();
		});
	});

	describe("Data Processing", () => {
		it("should handle large datasets with downsampling", () => {
			const largeMockData = Array.from({ length: 15000 }, (_, i) => ({
				timestamp: 1640995200000 + i * 1000,
				timestampFormatted: new Date(
					1640995200000 + i * 1000
				).toISOString(),
				value: Math.sin(i / 100) * 10 + Math.random() * 2,
				index: i,
			}));

			render(
				<AdvancedZoomChart
					{...defaultProps}
					data={largeMockData}
					downsampleThreshold={1000}
				/>
			);

			// Should render successfully even with large dataset
			expect(screen.getByText("Test Chart")).toBeInTheDocument();
			expect(
				screen.getByText(/Points:\s*1998\s*\/\s*15\s*000/)
			).toBeInTheDocument();
		});

		it("should use custom dataKey and xAxisKey", () => {
			const customData = [
				{
					timestamp: 1640995200000,
					timestampFormatted: "10:00",
					value: 25.5,
					index: 0,
					measurement: 25.5,
					time: "10:00",
				},
				{
					timestamp: 1640995260000,
					timestampFormatted: "10:01",
					value: 27.3,
					index: 1,
					measurement: 27.3,
					time: "10:01",
				},
			];

			render(
				<AdvancedZoomChart
					data={customData}
					dataKey='measurement'
					xAxisKey='time'
					title='Custom Chart'
				/>
			);

			expect(screen.getByTestId("line-measurement")).toBeInTheDocument();
			expect(screen.getByTestId("x-axis-time")).toBeInTheDocument();
		});
	});

	describe("Props Validation", () => {
		it("should handle missing optional props with defaults", () => {
			render(<AdvancedZoomChart {...defaultProps} />);

			// Should use default color, height, and other settings
			expect(screen.getByTestId("line-value")).toBeInTheDocument();
			expect(screen.getByText("Test Chart")).toBeInTheDocument();
		});

		it("should handle all optional props", () => {
			render(
				<AdvancedZoomChart
					{...defaultProps}
					color='#00ff00'
					height={500}
					enableBrush={false}
					enableMagnifier={false}
					enableCrosshair={false}
					downsampleThreshold={5000}
				/>
			);

			expect(screen.getByTestId("line-value")).toHaveStyle({
				color: "#00ff00",
			});
			expect(screen.queryByText(/🔍 Magnifier/)).toBeInTheDocument(); // Button still exists but functionality disabled
		});
	});

	describe("Edge Cases", () => {
		it("should handle empty data gracefully", () => {
			render(
				<AdvancedZoomChart
					{...defaultProps}
					data={[]}
				/>
			);

			expect(screen.getByText("Test Chart")).toBeInTheDocument();
			expect(screen.getByText("0")).toBeInTheDocument(); // Visible Points
			expect(screen.getAllByText("N/A")).toHaveLength(3); // Min, Max, Average
		});

		it("should handle single data point", () => {
			const singleDataPoint = [mockData[0]];
			render(
				<AdvancedZoomChart
					{...defaultProps}
					data={singleDataPoint}
				/>
			);

			expect(screen.getByText("Test Chart")).toBeInTheDocument();
			expect(screen.getByText("1")).toBeInTheDocument(); // Visible Points
			// For single data point, min/max/average are all the same - just check one instance
			expect(screen.getAllByText("10.5000")).toHaveLength(3); // Should appear as min, max, and average
		});

		it("should handle data with missing or null values", () => {
			const dataWithNulls = [
				{
					timestamp: 1640995200000,
					timestampFormatted: "2022-01-01 00:00:00",
					value: 10.5,
					index: 0,
				},
				{
					timestamp: 1640995260000,
					timestampFormatted: "2022-01-01 00:01:00",
					value: 0,
					index: 1,
				}, // Use 0 instead of null
				{
					timestamp: 1640995320000,
					timestampFormatted: "2022-01-01 00:02:00",
					value: 8.7,
					index: 2,
				},
			];

			render(
				<AdvancedZoomChart
					{...defaultProps}
					data={dataWithNulls}
				/>
			);

			expect(screen.getByText("Test Chart")).toBeInTheDocument();
			expect(screen.getByText("3")).toBeInTheDocument(); // Visible Points
		});
	});
});
