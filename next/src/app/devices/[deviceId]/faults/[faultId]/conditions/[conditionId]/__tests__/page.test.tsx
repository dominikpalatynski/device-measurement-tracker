import React from "react";
import { render, screen } from "@testing-library/react";
import { useParams } from "next/navigation";
import ConditionDetailPage from "../page";

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

const mockUseParams = useParams as jest.Mock;

describe("Condition Detail Page", () => {
	beforeEach(() => {
		mockUseParams.mockReturnValue({
			deviceId: "test-device-123",
			faultId: "test-fault-456",
			conditionId: "test-condition-789",
		});
	});

	it("should render without crashing", () => {
		render(<ConditionDetailPage />);

		// Should render the device protected route
		expect(
			screen.getByTestId("device-protected-route")
		).toBeInTheDocument();
	});
});
