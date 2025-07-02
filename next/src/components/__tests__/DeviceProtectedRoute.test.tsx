import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import { DeviceProtectedRoute } from "../DeviceProtectedRoute";
import { useDeviceOwnership } from "../../hooks/useDeviceOwnership";

// Mock the useDeviceOwnership hook
jest.mock("../../hooks/useDeviceOwnership");
const mockUseDeviceOwnership = useDeviceOwnership as jest.MockedFunction<
	typeof useDeviceOwnership
>;

// Mock Next.js router
jest.mock("next/navigation", () => ({
	useRouter: jest.fn(),
}));

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockPush = jest.fn();

describe("DeviceProtectedRoute", () => {
	const mockDevice = {
		id: "device-123",
		name: "Test Device",
		device_type: "pmsm-mechanical-vibration",
		owner_id: 1,
		created_at: "2023-01-01",
		updated_at: "2023-01-01",
	};

	const createMockOwnership = (overrides = {}) => ({
		isOwner: false,
		isAdmin: false,
		canAccess: false,
		loading: false,
		error: null,
		device: null,
		...overrides,
	});

	beforeEach(() => {
		jest.clearAllMocks();
		mockUseRouter.mockReturnValue({
			push: mockPush,
			replace: jest.fn(),
			prefetch: jest.fn(),
			back: jest.fn(),
			forward: jest.fn(),
			refresh: jest.fn(),
		});
	});

	describe("Loading state", () => {
		it("should render default loading spinner when loading is true", () => {
			mockUseDeviceOwnership.mockReturnValue(
				createMockOwnership({
					loading: true,
				})
			);

			render(
				<DeviceProtectedRoute deviceId='device-123'>
					<div>Protected Device Content</div>
				</DeviceProtectedRoute>
			);

			expect(
				screen.getByText("Verifying access permissions...")
			).toBeInTheDocument();
			expect(screen.getByTestId("device-loading-spinner")).toHaveClass(
				"animate-spin"
			);
			expect(
				screen.queryByText("Protected Device Content")
			).not.toBeInTheDocument();
		});

		it("should render custom fallback when provided and loading", () => {
			mockUseDeviceOwnership.mockReturnValue(
				createMockOwnership({
					loading: true,
				})
			);

			const customFallback = <div>Custom Loading Message</div>;

			render(
				<DeviceProtectedRoute
					deviceId='device-123'
					fallback={customFallback}
				>
					<div>Protected Device Content</div>
				</DeviceProtectedRoute>
			);

			expect(
				screen.getByText("Custom Loading Message")
			).toBeInTheDocument();
			expect(
				screen.queryByText("Verifying access permissions...")
			).not.toBeInTheDocument();
			expect(
				screen.queryByText("Protected Device Content")
			).not.toBeInTheDocument();
		});
	});

	describe("Error state", () => {
		it("should render error message when there is an error", () => {
			const errorMessage = "Device not found";
			mockUseDeviceOwnership.mockReturnValue(
				createMockOwnership({
					error: errorMessage,
				})
			);

			render(
				<DeviceProtectedRoute deviceId='invalid-device'>
					<div>Protected Device Content</div>
				</DeviceProtectedRoute>
			);

			expect(screen.getByText("Access Denied")).toBeInTheDocument();
			expect(screen.getByText(errorMessage)).toBeInTheDocument();
			expect(screen.getByText("Go Back")).toBeInTheDocument();
			expect(
				screen.queryByText("Protected Device Content")
			).not.toBeInTheDocument();
		});

		it("should redirect when Go Back button is clicked", async () => {
			const user = userEvent.setup();
			mockUseDeviceOwnership.mockReturnValue(
				createMockOwnership({
					error: "Access denied",
				})
			);

			render(
				<DeviceProtectedRoute deviceId='device-123'>
					<div>Protected Device Content</div>
				</DeviceProtectedRoute>
			);

			const goBackButton = screen.getByText("Go Back");
			await user.click(goBackButton);

			expect(mockPush).toHaveBeenCalledWith("/");
		});

		it("should redirect to custom path when specified", async () => {
			const user = userEvent.setup();
			mockUseDeviceOwnership.mockReturnValue(
				createMockOwnership({
					error: "Access denied",
				})
			);

			render(
				<DeviceProtectedRoute
					deviceId='device-123'
					redirectTo='/devices'
				>
					<div>Protected Device Content</div>
				</DeviceProtectedRoute>
			);

			const goBackButton = screen.getByText("Go Back");
			await user.click(goBackButton);

			expect(mockPush).toHaveBeenCalledWith("/devices");
		});
	});

	describe("Access denied state", () => {
		it("should redirect when user cannot access device", async () => {
			mockUseDeviceOwnership.mockReturnValue(
				createMockOwnership({
					canAccess: false,
				})
			);

			render(
				<DeviceProtectedRoute deviceId='device-123'>
					<div>Protected Device Content</div>
				</DeviceProtectedRoute>
			);

			await waitFor(() => {
				expect(mockPush).toHaveBeenCalledWith("/");
			});

			expect(
				screen.queryByText("Protected Device Content")
			).not.toBeInTheDocument();
		});

		it("should redirect to custom path when access denied", async () => {
			mockUseDeviceOwnership.mockReturnValue(
				createMockOwnership({
					canAccess: false,
				})
			);

			render(
				<DeviceProtectedRoute
					deviceId='device-123'
					redirectTo='/unauthorized'
				>
					<div>Protected Device Content</div>
				</DeviceProtectedRoute>
			);

			await waitFor(() => {
				expect(mockPush).toHaveBeenCalledWith("/unauthorized");
			});
		});
	});

	describe("Access granted state", () => {
		it("should render children when user can access device", () => {
			mockUseDeviceOwnership.mockReturnValue(
				createMockOwnership({
					canAccess: true,
					isOwner: true,
					device: mockDevice,
				})
			);

			render(
				<DeviceProtectedRoute deviceId='device-123'>
					<div>Protected Device Content</div>
				</DeviceProtectedRoute>
			);

			expect(
				screen.getByText("Protected Device Content")
			).toBeInTheDocument();
			expect(mockPush).not.toHaveBeenCalled();
		});

		it("should render complex nested content when access is granted", () => {
			mockUseDeviceOwnership.mockReturnValue(
				createMockOwnership({
					canAccess: true,
					isAdmin: true,
					device: mockDevice,
				})
			);

			render(
				<DeviceProtectedRoute deviceId='device-123'>
					<div>
						<h1>Device Dashboard</h1>
						<p>Device ID: device-123</p>
						<button>Control Device</button>
					</div>
				</DeviceProtectedRoute>
			);

			expect(screen.getByText("Device Dashboard")).toBeInTheDocument();
			expect(
				screen.getByText("Device ID: device-123")
			).toBeInTheDocument();
			expect(screen.getByText("Control Device")).toBeInTheDocument();
		});
	});

	describe("Hook integration", () => {
		it("should pass correct deviceId to useDeviceOwnership hook", () => {
			const deviceId = "test-device-456";
			mockUseDeviceOwnership.mockReturnValue(
				createMockOwnership({
					canAccess: true,
				})
			);

			render(
				<DeviceProtectedRoute deviceId={deviceId}>
					<div>Content</div>
				</DeviceProtectedRoute>
			);

			expect(mockUseDeviceOwnership).toHaveBeenCalledWith({ deviceId });
		});

		it("should handle multiple device IDs correctly", () => {
			const { rerender } = render(
				<DeviceProtectedRoute deviceId='device-1'>
					<div>Device 1 Content</div>
				</DeviceProtectedRoute>
			);

			expect(mockUseDeviceOwnership).toHaveBeenLastCalledWith({
				deviceId: "device-1",
			});

			rerender(
				<DeviceProtectedRoute deviceId='device-2'>
					<div>Device 2 Content</div>
				</DeviceProtectedRoute>
			);

			expect(mockUseDeviceOwnership).toHaveBeenLastCalledWith({
				deviceId: "device-2",
			});
		});
	});

	describe("State transitions", () => {
		it("should handle loading to success transition", () => {
			// Start with loading state
			mockUseDeviceOwnership.mockReturnValue(
				createMockOwnership({
					loading: true,
				})
			);

			const { rerender } = render(
				<DeviceProtectedRoute deviceId='device-123'>
					<div>Protected Content</div>
				</DeviceProtectedRoute>
			);

			expect(
				screen.getByText("Verifying access permissions...")
			).toBeInTheDocument();

			// Transition to success state
			mockUseDeviceOwnership.mockReturnValue(
				createMockOwnership({
					canAccess: true,
					isOwner: true,
					device: mockDevice,
				})
			);

			rerender(
				<DeviceProtectedRoute deviceId='device-123'>
					<div>Protected Content</div>
				</DeviceProtectedRoute>
			);

			expect(screen.getByText("Protected Content")).toBeInTheDocument();
			expect(
				screen.queryByText("Verifying access permissions...")
			).not.toBeInTheDocument();
		});

		it("should handle loading to error transition", () => {
			// Start with loading state
			mockUseDeviceOwnership.mockReturnValue(
				createMockOwnership({
					loading: true,
				})
			);

			const { rerender } = render(
				<DeviceProtectedRoute deviceId='device-123'>
					<div>Protected Content</div>
				</DeviceProtectedRoute>
			);

			expect(
				screen.getByText("Verifying access permissions...")
			).toBeInTheDocument();

			// Transition to error state
			mockUseDeviceOwnership.mockReturnValue(
				createMockOwnership({
					error: "Device access denied",
				})
			);

			rerender(
				<DeviceProtectedRoute deviceId='device-123'>
					<div>Protected Content</div>
				</DeviceProtectedRoute>
			);

			expect(screen.getByText("Access Denied")).toBeInTheDocument();
			expect(
				screen.getByText("Device access denied")
			).toBeInTheDocument();
			expect(
				screen.queryByText("Verifying access permissions...")
			).not.toBeInTheDocument();
		});
	});
});
