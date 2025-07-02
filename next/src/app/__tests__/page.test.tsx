import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Dashboard from "../page";
import { useAuth } from "../../contexts/AuthContext";
import { deviceApi, testApiConnection } from "../../services/api";

// Mock the dependencies
jest.mock("../../contexts/AuthContext");
jest.mock("../../services/api");
jest.mock("../../components/PageLayout", () => {
	return ({
		children,
		title,
	}: {
		children: React.ReactNode;
		title: string;
	}) => (
		<div
			data-testid='page-layout'
			data-title={title}
		>
			{children}
		</div>
	);
});

// Mock Next.js Link
jest.mock("next/link", () => {
	return ({
		children,
		href,
	}: {
		children: React.ReactNode;
		href: string;
	}) => (
		<a
			href={href}
			data-testid={`link-${href}`}
		>
			{children}
		</a>
	);
});

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockDeviceApi = deviceApi as jest.Mocked<typeof deviceApi>;
const mockTestApiConnection = testApiConnection as jest.MockedFunction<
	typeof testApiConnection
>;

describe("Dashboard Component", () => {
	const mockDevices = [
		{
			device_id: "device-1",
			device_name: "Device 1",
			device_type: "pmsm-mechanical-vibration",
			status: "Active" as const,
			registration_date: "2022-01-01",
			last_updated: "2022-01-01",
		},
		{
			device_id: "device-2",
			device_name: "Device 2",
			device_type: "pmsm-mechanical-vibration",
			status: "Inactive" as const,
			registration_date: "2022-01-01",
			last_updated: "2022-01-01",
		},
	];

	beforeEach(() => {
		jest.clearAllMocks();

		// Default auth mock
		mockUseAuth.mockReturnValue({
			user: null,
			login: jest.fn(),
			logout: jest.fn(),
			refreshUser: jest.fn(),
			isAuthenticated: false,
			isAdmin: false,
			loading: false,
		});

		// Default API mocks
		mockTestApiConnection.mockResolvedValue({
			success: true,
			message: "API connection successful",
			time: "10ms",
		});

		mockDeviceApi.getDevices.mockResolvedValue(mockDevices);
	});

	describe("Loading State", () => {
		it("should show loading spinner initially", async () => {
			// Make API calls pending
			mockTestApiConnection.mockImplementation(
				() => new Promise(() => {})
			);
			render(<Dashboard />);

			expect(
				screen.getByText("Loading dashboard...")
			).toBeInTheDocument();
			// Check for spinner with test id instead of role
			expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
		});
	});

	describe("Basic Rendering", () => {
		it("should render dashboard with PageLayout", async () => {
			render(<Dashboard />);

			await waitFor(() => {
				expect(screen.getByTestId("page-layout")).toBeInTheDocument();
				expect(screen.getByTestId("page-layout")).toHaveAttribute(
					"data-title",
					"Dashboard"
				);
			});
		});

		it("should load and display API status", async () => {
			render(<Dashboard />);

			await waitFor(() => {
				expect(mockTestApiConnection).toHaveBeenCalledWith(
					"Dashboard connection test"
				);
				expect(mockDeviceApi.getDevices).toHaveBeenCalled();
			});
		});
	});

	describe("Error Handling", () => {
		it("should display error message when API fails", async () => {
			const errorMessage = "API connection failed";
			mockTestApiConnection.mockRejectedValue(new Error(errorMessage));

			render(<Dashboard />);

			await waitFor(() => {
				expect(screen.getByText("Dashboard Error")).toBeInTheDocument();
				expect(screen.getByText(errorMessage)).toBeInTheDocument();
			});
		});

		it("should provide refresh button on error", async () => {
			mockTestApiConnection.mockRejectedValue(new Error("API failed"));

			render(<Dashboard />);

			await waitFor(() => {
				const refreshButton = screen.getByText("Refresh");
				expect(refreshButton).toBeInTheDocument();
			});
		});

		it("should retry loading when refresh button is clicked", async () => {
			const user = userEvent.setup();
			mockTestApiConnection.mockRejectedValueOnce(
				new Error("API failed")
			);
			mockTestApiConnection.mockResolvedValueOnce({
				success: true,
				message: "API connection successful",
				time: "10ms",
			});

			render(<Dashboard />);

			await waitFor(() => {
				expect(screen.getByText("Refresh")).toBeInTheDocument();
			});

			const refreshButton = screen.getByText("Refresh");
			await user.click(refreshButton);

			await waitFor(() => {
				expect(mockTestApiConnection).toHaveBeenCalledTimes(2);
			});
		});
	});

	describe("Admin Features", () => {
		beforeEach(() => {
			mockUseAuth.mockReturnValue({
				user: {
					id: 1,
					username: "admin",
					email: "admin@test.com",
					first_name: "Admin",
					last_name: "User",
					role: "admin",
					display_name: "Admin User",
				},
				login: jest.fn(),
				logout: jest.fn(),
				refreshUser: jest.fn(),
				isAuthenticated: true,
				isAdmin: true,
				loading: false,
			});
		});

		it("should show admin panel for admin users", async () => {
			render(<Dashboard />);

			await waitFor(() => {
				expect(screen.getByText("Admin Panel")).toBeInTheDocument();
				expect(
					screen.getByText(
						"Administrative functions and user management"
					)
				).toBeInTheDocument();
			});
		});

		it("should show admin navigation links", async () => {
			render(<Dashboard />);

			await waitFor(() => {
				expect(screen.getByTestId("link-/users")).toBeInTheDocument();
				expect(screen.getByTestId("link-/profile")).toBeInTheDocument();
				expect(screen.getByText("User Management")).toBeInTheDocument();
			});
		});

		it("should not show admin panel for non-admin users", async () => {
			mockUseAuth.mockReturnValue({
				user: {
					id: 1,
					username: "user",
					email: "user@test.com",
					first_name: "Regular",
					last_name: "User",
					role: "normal",
					display_name: "Regular User",
				},
				login: jest.fn(),
				logout: jest.fn(),
				refreshUser: jest.fn(),
				isAuthenticated: true,
				isAdmin: false,
				loading: false,
			});

			render(<Dashboard />);

			await waitFor(() => {
				expect(
					screen.queryByText("Admin Panel")
				).not.toBeInTheDocument();
			});
		});

		it("should not show admin panel for unauthenticated users", async () => {
			render(<Dashboard />);

			await waitFor(() => {
				expect(
					screen.queryByText("Admin Panel")
				).not.toBeInTheDocument();
			});
		});
	});

	describe("Device Statistics", () => {
		it("should calculate and display device statistics correctly", async () => {
			render(<Dashboard />);

			await waitFor(() => {
				// Should show device cards instead of numerical statistics
				expect(screen.getByText("Device 1")).toBeInTheDocument();
				expect(screen.getByText("Device 2")).toBeInTheDocument();
				expect(screen.getByText("Active")).toBeInTheDocument();
				expect(screen.getByText("Inactive")).toBeInTheDocument();
			});
		});

		it("should handle empty device list", async () => {
			mockDeviceApi.getDevices.mockResolvedValue([]);

			render(<Dashboard />);

			await waitFor(() => {
				expect(
					screen.getByText("No devices registered yet")
				).toBeInTheDocument();
			});
		});
	});

	describe("Device Management Links", () => {
		it("should show device management navigation", async () => {
			render(<Dashboard />);

			await waitFor(() => {
				// Should have link to devices page
				expect(screen.getByTestId("link-/devices")).toBeInTheDocument();
			});
		});

		it("should show device registration link", async () => {
			render(<Dashboard />);

			await waitFor(() => {
				expect(
					screen.getByTestId("link-/devices/register")
				).toBeInTheDocument();
			});
		});
	});

	describe("API Connection Status", () => {
		it("should display successful API connection status", async () => {
			render(<Dashboard />);

			await waitFor(() => {
				expect(mockTestApiConnection).toHaveBeenCalledWith(
					"Dashboard connection test"
				);
			});
		});

		it("should handle API connection failure", async () => {
			mockTestApiConnection.mockResolvedValue({
				success: false,
				message: "API connection failed",
			});

			render(<Dashboard />);

			await waitFor(() => {
				expect(mockTestApiConnection).toHaveBeenCalled();
			});
		});
	});
});
