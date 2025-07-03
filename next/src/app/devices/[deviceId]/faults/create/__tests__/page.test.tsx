import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useParams, useRouter } from "next/navigation";
import CreateFaultPage from "../page";
import { faultApi } from "@/services/api";

// Mock next/navigation
jest.mock("next/navigation", () => ({
	useParams: jest.fn(),
	useRouter: jest.fn(),
}));

// Mock the API services
jest.mock("@/services/api", () => ({
	faultApi: {
		createFault: jest.fn(),
	},
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
const mockUseRouter = useRouter as jest.Mock;
const mockCreateFault = faultApi.createFault as jest.Mock;

describe("Create Fault Page", () => {
	beforeEach(() => {
		mockUseParams.mockReturnValue({ deviceId: "test-device-123" });
		mockUseRouter.mockReturnValue({
			push: jest.fn(),
			replace: jest.fn(),
			refresh: jest.fn(),
		});
	});

	it("should render without crashing", () => {
		render(<CreateFaultPage />);

		// Should render the device protected route
		expect(
			screen.getByTestId("device-protected-route")
		).toBeInTheDocument();
	});

	it("should navigate back to device page when cancel is clicked", () => {
		render(<CreateFaultPage />);

		const cancelButton = screen.getByText("Cancel");
		expect(cancelButton).toHaveAttribute(
			"href",
			"/devices/test-device-123"
		);
	});

	it("should trim whitespace from inputs when submitting", async () => {
		mockCreateFault.mockResolvedValue({ fault_id: "new-fault-123" });

		render(<CreateFaultPage />);

		// Fill form with whitespace-padded values
		fireEvent.change(screen.getByLabelText(/Fault Name/i), {
			target: { value: "  Test Fault  " },
		});
		fireEvent.change(screen.getByLabelText(/Description/i), {
			target: { value: "  Test description  " },
		});

		// Submit the form
		fireEvent.click(screen.getByText(/Create Fault$/i));

		// Verify API call with trimmed values
		await waitFor(() => {
			expect(mockCreateFault).toHaveBeenCalledWith(
				expect.objectContaining({
					fault_name: "Test Fault",
					description: "Test description",
				})
			);
		});
	});

	it("should display the correct explanation text for stream fault type", () => {
		render(<CreateFaultPage />);

		// Default is stream type
		expect(
			screen.getByText(/Stream faults collect data continuously/i)
		).toBeInTheDocument();

		// Change to batch and back to stream
		fireEvent.change(screen.getByLabelText(/Fault Type/i), {
			target: { value: "batch" },
		});
		fireEvent.change(screen.getByLabelText(/Fault Type/i), {
			target: { value: "stream" },
		});

		// Verify explanation is for stream type
		expect(
			screen.getByText(/Stream faults collect data continuously/i)
		).toBeInTheDocument();
	});
});
