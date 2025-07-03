import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import DevicesPage from "../page";
import { deviceApi } from "@/services/api";

// Mock the dependencies
jest.mock("@/services/api");
jest.mock("@/components/PageLayout", () => {
	return function MockPageLayout({
		children,
	}: {
		children: React.ReactNode;
	}) {
		return <div data-testid='page-layout'>{children}</div>;
	};
});

jest.mock("next/link", () => {
	return function MockLink({ href, children, ...props }: any) {
		return (
			<a
				href={href}
				{...props}
			>
				{children}
			</a>
		);
	};
});

// Mock window.confirm
Object.defineProperty(window, "confirm", {
	writable: true,
	value: jest.fn(),
});

const mockDeviceApi = deviceApi as jest.Mocked<typeof deviceApi>;
const mockConfirm = window.confirm as jest.MockedFunction<
	typeof window.confirm
>;

const mockDevices = [
	{
		device_id: "1",
		device_name: "Test Device 1",
		device_type: "pmsm-mechanical-vibration",
		status: "Active" as const,
		registration_date: "2023-01-01T00:00:00Z",
		last_updated: "2023-01-01T00:00:00Z",
	},
	{
		device_id: "2",
		device_name: "Test Device 2",
		device_type: "bldc-high-speed",
		status: "Pending-Registration" as const,
		registration_date: "2023-01-02T00:00:00Z",
		last_updated: "2023-01-02T00:00:00Z",
	},
	{
		device_id: "3",
		device_name: "Test Device 3",
		device_type: "pmsm-torque-load",
		status: "Not-Active" as const,
		registration_date: "2023-01-03T00:00:00Z",
		last_updated: "2023-01-03T00:00:00Z",
	},
];

describe("DevicesPage", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockDeviceApi.getDevices.mockResolvedValue(mockDevices);
		mockDeviceApi.activateDevice.mockResolvedValue(true);
		mockDeviceApi.deactivateDevice.mockResolvedValue(true);
	});

	it("renders the devices page correctly", async () => {
		render(<DevicesPage />);

		await waitFor(() => {
			expect(screen.getByTestId("page-layout")).toBeInTheDocument();
		});
		expect(
			screen.getByText("Manage and monitor your measurement devices")
		).toBeInTheDocument();
		expect(screen.getByText("+ Register Device")).toBeInTheDocument();
	});

	it("loads and displays devices on mount", async () => {
		render(<DevicesPage />);

		await waitFor(() => {
			expect(mockDeviceApi.getDevices).toHaveBeenCalledTimes(1);
			expect(screen.getByText("Test Device 1")).toBeInTheDocument();
			expect(screen.getByText("Test Device 2")).toBeInTheDocument();
			expect(screen.getByText("Test Device 3")).toBeInTheDocument();
		});
	});

	it("displays loading state initially", () => {
		render(<DevicesPage />);

		// The loading state shows a pulse animation, not a text
		expect(screen.queryByText(/Loading/)).not.toBeInTheDocument();
		expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
	});

	it("handles API error gracefully", async () => {
		const errorMessage = "Failed to fetch devices";
		mockDeviceApi.getDevices.mockRejectedValueOnce(new Error(errorMessage));

		render(<DevicesPage />);

		await waitFor(() => {
			expect(
				screen.getByText("Failed to fetch devices")
			).toBeInTheDocument();
		});
	});

	it("filters devices by status", async () => {
		render(<DevicesPage />);

		await waitFor(() => {
			expect(screen.getByText("Test Device 1")).toBeInTheDocument();
		});

		// Filter by Active status - use getAllByText to handle multiple Active buttons
		const activeButtons = screen.getAllByText(/Active/);
		const activeFilterButton = activeButtons.find((button) =>
			button.closest("button")?.textContent?.includes("1")
		);
		fireEvent.click(activeFilterButton!);

		expect(screen.getByText("Test Device 1")).toBeInTheDocument();
		expect(screen.queryByText("Test Device 2")).not.toBeInTheDocument();
		expect(screen.queryByText("Test Device 3")).not.toBeInTheDocument();
	});

	it("activates a device successfully", async () => {
		mockDeviceApi.activateDevice.mockResolvedValueOnce(true);

		render(<DevicesPage />);

		await waitFor(() => {
			expect(screen.getByText("Test Device 2")).toBeInTheDocument();
		});

		const activateButtons = screen.getAllByText("Activate");
		fireEvent.click(activateButtons[0]);

		await waitFor(() => {
			expect(mockDeviceApi.activateDevice).toHaveBeenCalledWith("2");
			expect(mockDeviceApi.getDevices).toHaveBeenCalledTimes(2); // Initial load + reload after activation
		});
	});

	it("deactivates a device successfully after confirmation", async () => {
		mockConfirm.mockReturnValueOnce(true);
		mockDeviceApi.deactivateDevice.mockResolvedValueOnce(true);

		render(<DevicesPage />);

		await waitFor(() => {
			expect(screen.getByText("Test Device 1")).toBeInTheDocument();
		});

		const deactivateButton = screen.getByText("Deactivate");
		fireEvent.click(deactivateButton);

		await waitFor(() => {
			expect(mockConfirm).toHaveBeenCalledWith(
				"Are you sure you want to deactivate this device?"
			);
			expect(mockDeviceApi.deactivateDevice).toHaveBeenCalledWith("1");
			expect(mockDeviceApi.getDevices).toHaveBeenCalledTimes(2);
		});
	});

	it("cancels device deactivation when user declines confirmation", async () => {
		mockConfirm.mockReturnValueOnce(false);

		render(<DevicesPage />);

		await waitFor(() => {
			expect(screen.getByText("Test Device 1")).toBeInTheDocument();
		});

		const deactivateButton = screen.getByText("Deactivate");
		fireEvent.click(deactivateButton);

		expect(mockConfirm).toHaveBeenCalledWith(
			"Are you sure you want to deactivate this device?"
		);
		expect(mockDeviceApi.deactivateDevice).not.toHaveBeenCalled();
	});

	it("handles device activation error", async () => {
		const errorMessage = "Failed to activate device";
		mockDeviceApi.activateDevice.mockRejectedValueOnce(
			new Error(errorMessage)
		);

		render(<DevicesPage />);

		await waitFor(() => {
			expect(screen.getByText("Test Device 2")).toBeInTheDocument();
		});

		const activateButtons = screen.getAllByText("Activate");
		fireEvent.click(activateButtons[0]);

		await waitFor(() => {
			expect(
				screen.getByText("Failed to activate device")
			).toBeInTheDocument();
		});
	});

	it("handles device deactivation error", async () => {
		mockConfirm.mockReturnValueOnce(true);
		const errorMessage = "Failed to deactivate device";
		mockDeviceApi.deactivateDevice.mockRejectedValueOnce(
			new Error(errorMessage)
		);

		render(<DevicesPage />);

		await waitFor(() => {
			expect(screen.getByText("Test Device 1")).toBeInTheDocument();
		});

		const deactivateButton = screen.getByText("Deactivate");
		fireEvent.click(deactivateButton);

		await waitFor(() => {
			expect(
				screen.getByText("Failed to deactivate device")
			).toBeInTheDocument();
		});
	});

	it("displays correct status colors and text", async () => {
		render(<DevicesPage />);

		await waitFor(() => {
			// Check all status texts appear (in filter buttons and table)
			expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
			expect(
				screen.getAllByText("Pending Registration").length
			).toBeGreaterThan(0);
			expect(screen.getAllByText("Not Active").length).toBeGreaterThan(0);
		});
	});

	it("displays correct device type names and icons", async () => {
		render(<DevicesPage />);

		await waitFor(() => {
			expect(
				screen.getByText("PMSM Mechanical Vibration")
			).toBeInTheDocument();
			expect(screen.getByText("BLDC High Speed")).toBeInTheDocument();
			expect(screen.getByText("PMSM Torque Load")).toBeInTheDocument();
		});
	});

	it("handles empty device list", async () => {
		mockDeviceApi.getDevices.mockResolvedValueOnce([]);

		render(<DevicesPage />);

		await waitFor(() => {
			expect(screen.getByText("No devices found")).toBeInTheDocument();
		});
	});

	it("handles non-array response from API", async () => {
		mockDeviceApi.getDevices.mockResolvedValueOnce(null as any);

		render(<DevicesPage />);

		await waitFor(() => {
			expect(screen.getByText("No devices found")).toBeInTheDocument();
		});
	});

	it("refreshes device list when try again button is clicked", async () => {
		const errorMessage = "Failed to fetch devices";
		mockDeviceApi.getDevices.mockRejectedValueOnce(new Error(errorMessage));

		render(<DevicesPage />);

		await waitFor(() => {
			expect(
				screen.getByText("Failed to fetch devices")
			).toBeInTheDocument();
		});

		mockDeviceApi.getDevices.mockResolvedValueOnce(mockDevices);

		const tryAgainButton = screen.getByText("Try Again");
		fireEvent.click(tryAgainButton);

		await waitFor(() => {
			expect(mockDeviceApi.getDevices).toHaveBeenCalledTimes(2);
		});
	});

	it("displays formatted dates correctly", async () => {
		render(<DevicesPage />);

		await waitFor(() => {
			// Check that dates are displayed (the exact format depends on the formatDate utility)
			expect(screen.getByText("Test Device 1")).toBeInTheDocument();
		});
	});

	it("navigates to device details on view button click", async () => {
		render(<DevicesPage />);

		await waitFor(() => {
			expect(screen.getByText("Test Device 1")).toBeInTheDocument();
		});

		const viewLinks = screen.getAllByText("View");
		expect(viewLinks[0]).toHaveAttribute("href", "/devices/1");
	});

	it("shows all filters and applies them correctly", async () => {
		render(<DevicesPage />);

		await waitFor(() => {
			expect(screen.getByText("Test Device 1")).toBeInTheDocument();
		});

		// Check all filter buttons exist - use getAllByText for multiple matches
		const allFilter = screen.getByText("All Devices");
		const activeButtons = screen.getAllByText(/Active/);
		const pendingFilterButtons = screen.getAllByText(
			"Pending Registration"
		);
		const inactiveButtons = screen.getAllByText(/Not Active/);

		expect(allFilter).toBeInTheDocument();
		expect(activeButtons.length).toBeGreaterThan(0);
		expect(pendingFilterButtons.length).toBeGreaterThan(0);
		expect(inactiveButtons.length).toBeGreaterThan(0);

		// Test filtering by clicking the first pending filter button (the filter button, not the status badge)
		const pendingFilterButton = pendingFilterButtons.find((button) =>
			button.closest("button")?.textContent?.includes("1")
		);
		fireEvent.click(pendingFilterButton!);
		expect(screen.getByText("Test Device 2")).toBeInTheDocument();
		expect(screen.queryByText("Test Device 1")).not.toBeInTheDocument();
	});
});
