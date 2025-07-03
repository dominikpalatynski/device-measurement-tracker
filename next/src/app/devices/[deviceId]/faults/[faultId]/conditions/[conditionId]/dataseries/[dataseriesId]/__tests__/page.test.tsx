import React from "react";
import { render, screen } from "@testing-library/react";
import { useParams } from "next/navigation";
import DataSeriesDetailPage from "../page";

// Mock next/navigation
jest.mock("next/navigation", () => ({
	useParams: jest.fn(),
}));

// Mock the API services
jest.mock("@/services/api", () => ({
	deviceApi: {
		getDevice: jest.fn(),
	},
	faultApi: {
		getFault: jest.fn(),
	},
	getMongoMeasurements: jest.fn(),
	filterMeasurementsByNames: jest.fn(),
	getDataSeriesList: jest.fn(),
}));

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

describe("Data Series Detail Page", () => {
	beforeEach(() => {
		mockUseParams.mockReturnValue({
			deviceId: "test-device-123",
			faultId: "test-fault-456",
			conditionId: "test-condition-789",
			dataseriesId: "test-dataseries-101",
		});
	});

	it("should render without crashing", () => {
		render(<DataSeriesDetailPage />);

		// Should render the device protected route
		expect(
			screen.getByTestId("device-protected-route")
		).toBeInTheDocument();
	});
});
