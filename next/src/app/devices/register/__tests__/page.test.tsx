import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import AuthContext from "../../../../contexts/AuthContext";
import DeviceRegisterPage from "../page";
import { deviceApi } from "../../../../services/api";
import { Device } from "../../../../services/api";

// Mock Next.js router
jest.mock("next/navigation", () => ({
	useRouter: jest.fn(),
}));

// Mock the API
jest.mock("../../../../services/api", () => ({
	deviceApi: {
		registerDevice: jest.fn(),
	},
}));

// Mock PageLayout component
jest.mock("../../../../components/PageLayout", () => {
	return function MockPageLayout({
		children,
		title,
	}: {
		children: React.ReactNode;
		title: string;
	}) {
		return (
			<div data-testid='page-layout'>
				<h1>{title}</h1>
				{children}
			</div>
		);
	};
});

const mockPush = jest.fn();
const mockRegisterDevice = deviceApi.registerDevice as jest.MockedFunction<
	typeof deviceApi.registerDevice
>;

describe("DeviceRegisterPage", () => {
	const mockUser = {
		id: 1,
		username: "testuser",
		email: "test@example.com",
		first_name: "Test",
		last_name: "User",
		role: "normal" as const,
		display_name: "Test User",
	};

	const mockAuthContext = {
		user: mockUser,
		login: jest.fn(),
		logout: jest.fn(),
		loading: false,
		isAuthenticated: true,
		isAdmin: false,
		refreshUser: jest.fn(),
	};

	beforeEach(() => {
		jest.clearAllMocks();
		(useRouter as jest.Mock).mockReturnValue({
			push: mockPush,
		});
	});

	const renderComponent = () => {
		return render(
			<AuthContext.Provider value={mockAuthContext}>
				<DeviceRegisterPage />
			</AuthContext.Provider>
		);
	};

	it("renders device registration form", () => {
		renderComponent();

		expect(screen.getByText("Register New Device")).toBeInTheDocument();
		expect(screen.getByLabelText(/device name/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/device type/i)).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /register device/i })
		).toBeInTheDocument();
	});

	it("disables submit button when device name is empty", () => {
		renderComponent();

		const submitButton = screen.getByRole("button", {
			name: /register device/i,
		});
		expect(submitButton).toBeDisabled();
	});

	it("enables submit button when device name is filled", () => {
		renderComponent();

		// Fill device name
		fireEvent.change(screen.getByLabelText(/device name/i), {
			target: { value: "Test Device" },
		});

		const submitButton = screen.getByRole("button", {
			name: /register device/i,
		});
		expect(submitButton).not.toBeDisabled();
	});

	it("submits form with valid data", async () => {
		const mockDevice: Device = {
			device_id: "device-123",
			device_name: "Test Device",
			device_type: "pmsm-mechanical-vibration",
			status: "Pending-Registration",
			registration_date: "2024-01-01T00:00:00Z",
			last_updated: "2024-01-01T00:00:00Z",
			owner_id: 1,
		};

		mockRegisterDevice.mockResolvedValueOnce(mockDevice);

		renderComponent();

		// Fill out the form
		fireEvent.change(screen.getByLabelText(/device name/i), {
			target: { value: "Test Device" },
		});

		fireEvent.change(screen.getByLabelText(/device type/i), {
			target: { value: "pmsm-mechanical-vibration" },
		});

		// Submit the form
		fireEvent.click(
			screen.getByRole("button", { name: /register device/i })
		);

		await waitFor(() => {
			expect(mockRegisterDevice).toHaveBeenCalledWith({
				device_name: "Test Device",
				device_type: "pmsm-mechanical-vibration",
			});
		});

		await waitFor(() => {
			expect(
				screen.getByText(/device registered successfully/i)
			).toBeInTheDocument();
		});

		await waitFor(() => {
			expect(
				screen.getByText(/view device details/i)
			).toBeInTheDocument();
		});
	});

	it("handles registration error", async () => {
		mockRegisterDevice.mockRejectedValueOnce(
			new Error("Registration failed")
		);

		renderComponent();

		// Fill out the form
		fireEvent.change(screen.getByLabelText(/device name/i), {
			target: { value: "Test Device" },
		});

		fireEvent.change(screen.getByLabelText(/device type/i), {
			target: { value: "pmsm-mechanical-vibration" },
		});

		// Submit the form
		fireEvent.click(
			screen.getByRole("button", { name: /register device/i })
		);

		await waitFor(() => {
			expect(screen.getAllByText(/registration failed/i)).toHaveLength(2); // heading + paragraph
		});
	});

	it("clears error when form is modified", async () => {
		mockRegisterDevice.mockRejectedValueOnce(
			new Error("Registration failed")
		);

		renderComponent();

		// Fill out and submit the form to generate an error
		fireEvent.change(screen.getByLabelText(/device name/i), {
			target: { value: "Test Device" },
		});

		fireEvent.change(screen.getByLabelText(/device type/i), {
			target: { value: "pmsm-mechanical-vibration" },
		});

		fireEvent.click(
			screen.getByRole("button", { name: /register device/i })
		);

		await waitFor(() => {
			expect(screen.getAllByText(/registration failed/i)).toHaveLength(2);
		});

		// Modify the form - error should clear
		fireEvent.change(screen.getByLabelText(/device name/i), {
			target: { value: "Modified Device" },
		});

		await waitFor(() => {
			expect(
				screen.queryByText(/registration failed/i)
			).not.toBeInTheDocument();
		});
	});

	it("shows loading state during submission", async () => {
		let resolvePromise: (value: Device) => void;
		const pendingPromise = new Promise<Device>((resolve) => {
			resolvePromise = resolve;
		});

		mockRegisterDevice.mockReturnValueOnce(pendingPromise);

		renderComponent();

		// Fill out the form
		fireEvent.change(screen.getByLabelText(/device name/i), {
			target: { value: "Test Device" },
		});

		fireEvent.change(screen.getByLabelText(/device type/i), {
			target: { value: "pmsm-mechanical-vibration" },
		});

		// Submit the form
		fireEvent.click(
			screen.getByRole("button", { name: /register device/i })
		);

		// Check loading state
		await waitFor(() => {
			expect(screen.getByText(/registering.../i)).toBeInTheDocument();
		});

		expect(
			screen.getByRole("button", { name: /registering.../i })
		).toBeDisabled();

		// Resolve the promise to complete the test
		resolvePromise!({
			device_id: "device-123",
			device_name: "Test Device",
			device_type: "pmsm-mechanical-vibration",
			status: "Pending-Registration",
			registration_date: "2024-01-01T00:00:00Z",
			last_updated: "2024-01-01T00:00:00Z",
			owner_id: 1,
		});

		// Wait for success state
		await waitFor(() => {
			expect(
				screen.getByText(/device registered successfully/i)
			).toBeInTheDocument();
		});
	});

	it("trims device name on submit", async () => {
		const mockDevice: Device = {
			device_id: "device-123",
			device_name: "Test Device",
			device_type: "test-type",
			status: "Pending-Registration",
			registration_date: "2024-01-01T00:00:00Z",
			last_updated: "2024-01-01T00:00:00Z",
			owner_id: 1,
		};

		mockRegisterDevice.mockResolvedValueOnce(mockDevice);

		renderComponent();

		// Fill with whitespace-padded device name
		fireEvent.change(screen.getByLabelText(/device name/i), {
			target: { value: "  Test Device  " },
		});

		fireEvent.change(screen.getByLabelText(/device type/i), {
			target: { value: "test-type" },
		});

		fireEvent.click(
			screen.getByRole("button", { name: /register device/i })
		);

		await waitFor(() => {
			expect(mockRegisterDevice).toHaveBeenCalledWith({
				device_name: "Test Device",
				device_type: "test-type",
			});
		});
	});

	it("handles null device response", async () => {
		mockRegisterDevice.mockResolvedValueOnce(null);

		renderComponent();

		fireEvent.change(screen.getByLabelText(/device name/i), {
			target: { value: "Test Device" },
		});

		fireEvent.change(screen.getByLabelText(/device type/i), {
			target: { value: "test-type" },
		});

		fireEvent.click(
			screen.getByRole("button", { name: /register device/i })
		);

		await waitFor(() => {
			expect(
				screen.getByText("Failed to register device")
			).toBeInTheDocument();
		});
	});

	it("handles non-Error exception", async () => {
		mockRegisterDevice.mockRejectedValueOnce("Unknown error");

		renderComponent();

		fireEvent.change(screen.getByLabelText(/device name/i), {
			target: { value: "Test Device" },
		});

		fireEvent.change(screen.getByLabelText(/device type/i), {
			target: { value: "test-type" },
		});

		fireEvent.click(
			screen.getByRole("button", { name: /register device/i })
		);

		await waitFor(() => {
			expect(
				screen.getByText("Failed to register device")
			).toBeInTheDocument();
		});
	});

	it("resets form when reset button is clicked", () => {
		renderComponent();

		// Fill out the form
		fireEvent.change(screen.getByLabelText(/device name/i), {
			target: { value: "Test Device" },
		});

		fireEvent.change(screen.getByLabelText(/device type/i), {
			target: { value: "test-type" },
		});

		// Click reset
		fireEvent.click(screen.getByRole("button", { name: /reset form/i }));

		// Check that form is reset
		expect(screen.getByLabelText(/device name/i)).toHaveValue("");
		expect(screen.getByLabelText(/device type/i)).toHaveValue(
			"pmsm-mechanical-vibration"
		);
	});

	describe("Success state", () => {
		const mockDevice: Device = {
			device_id: "device-123",
			device_name: "Test Device",
			device_type: "test-type",
			status: "Pending-Registration",
			registration_date: "2024-01-01T00:00:00Z",
			last_updated: "2024-01-01T00:00:00Z",
			owner_id: 1,
			verification_token: "token-123",
		};

		beforeEach(async () => {
			// Mock localStorage
			Object.defineProperty(window, "localStorage", {
				value: {
					getItem: jest.fn(() => "stored-token-123"),
					setItem: jest.fn(),
				},
				writable: true,
			});

			// Mock clipboard
			Object.defineProperty(navigator, "clipboard", {
				value: {
					writeText: jest.fn(),
				},
				writable: true,
			});

			mockRegisterDevice.mockResolvedValueOnce(mockDevice);

			renderComponent();

			// Fill and submit form
			fireEvent.change(screen.getByLabelText(/device name/i), {
				target: { value: "Test Device" },
			});

			fireEvent.change(screen.getByLabelText(/device type/i), {
				target: { value: "test-type" },
			});

			fireEvent.click(
				screen.getByRole("button", { name: /register device/i })
			);

			await waitFor(() => {
				expect(
					screen.getByText(/device registered successfully/i)
				).toBeInTheDocument();
			});
		});

		it("displays device details in success state", () => {
			expect(screen.getByText("Test Device")).toBeInTheDocument();
			expect(screen.getByText("test-type")).toBeInTheDocument();
			expect(screen.getByText("device-123")).toBeInTheDocument();
		});

		it("navigates to device page when view device button is clicked", () => {
			fireEvent.click(screen.getByText(/view device details/i));
			expect(mockPush).toHaveBeenCalledWith("/devices/device-123");
		});

		it("resets form when register another button is clicked", () => {
			fireEvent.click(screen.getByText(/register another device/i));
			expect(screen.getByText("Register New Device")).toBeInTheDocument();
			expect(screen.getByLabelText(/device name/i)).toBeInTheDocument();
		});

		it("copies device ID to clipboard", () => {
			const copyButtons = screen.getAllByText("Copy");
			fireEvent.click(copyButtons[0]); // First copy button (device ID)
			expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
				"device-123"
			);
		});

		it("copies verification token to clipboard", () => {
			const copyButtons = screen.getAllByText("Copy");
			fireEvent.click(copyButtons[1]); // Second copy button (verification token)
			expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
				"token-123"
			);
		});

		it("copies registration command to clipboard", () => {
			const copyCommandButton = screen.getByText(/📋 Copy command/i);
			fireEvent.click(copyCommandButton);
			expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
				"python register_device.py --token token-123 --device-id device-123"
			);
		});

		it("displays verification token from localStorage", () => {
			expect(screen.getByText("stored-token-123")).toBeInTheDocument();
		});

		it("displays status badge correctly", () => {
			expect(
				screen.getByText("Pending Registration")
			).toBeInTheDocument();
		});
	});

	describe("Success state without verification token", () => {
		const mockDeviceWithoutToken: Device = {
			device_id: "device-123",
			device_name: "Test Device",
			device_type: "test-type",
			status: "Active",
			registration_date: "2024-01-01T00:00:00Z",
			last_updated: "2024-01-01T00:00:00Z",
			owner_id: 1,
		};

		it("handles device without verification token", async () => {
			Object.defineProperty(window, "localStorage", {
				value: {
					getItem: jest.fn(() => null),
				},
				writable: true,
			});

			mockRegisterDevice.mockResolvedValueOnce(mockDeviceWithoutToken);

			renderComponent();

			fireEvent.change(screen.getByLabelText(/device name/i), {
				target: { value: "Test Device" },
			});

			fireEvent.change(screen.getByLabelText(/device type/i), {
				target: { value: "test-type" },
			});

			fireEvent.click(
				screen.getByRole("button", { name: /register device/i })
			);

			await waitFor(() => {
				expect(
					screen.getByText(/device registered successfully/i)
				).toBeInTheDocument();
			});

			// Should not show registration command section
			expect(
				screen.queryByText("Registration Information")
			).not.toBeInTheDocument();
		});

		it("displays Active status correctly", async () => {
			mockRegisterDevice.mockResolvedValueOnce(mockDeviceWithoutToken);

			renderComponent();

			fireEvent.change(screen.getByLabelText(/device name/i), {
				target: { value: "Test Device" },
			});

			fireEvent.change(screen.getByLabelText(/device type/i), {
				target: { value: "test-type" },
			});

			fireEvent.click(
				screen.getByRole("button", { name: /register device/i })
			);

			await waitFor(() => {
				expect(screen.getByText("Active")).toBeInTheDocument();
			});
		});
	});
});
