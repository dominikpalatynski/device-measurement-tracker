import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import QuickActionsBar from "../QuickActionsBar";
import { Device } from "@/services/api";

// Mock Next.js Link component
jest.mock("next/link", () => {
	return function MockLink({
		children,
		href,
		...props
	}: {
		children: React.ReactNode;
		href: string;
		[key: string]: any;
	}) {
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

// Mock device data
const mockDevice: Device = {
	device_id: "test-device-1",
	device_name: "Test Device",
	device_type: "sensor",
	status: "Active",
	registration_date: "2023-01-01T00:00:00Z",
	last_updated: "2023-01-01T00:00:00Z",
};

const defaultProps = {
	device: mockDevice,
	deviceId: "test-device-1",
	anyConditionActive: false,
};

describe("QuickActionsBar", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("renders navigation links correctly", () => {
		render(<QuickActionsBar {...defaultProps} />);

		const backToDeviceLink = screen.getByText("← Back to Device");
		const allDevicesLink = screen.getByText("← All Devices");
		const newFaultLink = screen.getByText("+ New Fault");

		expect(backToDeviceLink).toBeInTheDocument();
		expect(backToDeviceLink.closest("a")).toHaveAttribute(
			"href",
			"/devices/test-device-1"
		);

		expect(allDevicesLink).toBeInTheDocument();
		expect(allDevicesLink.closest("a")).toHaveAttribute("href", "/devices");

		expect(newFaultLink).toBeInTheDocument();
		expect(newFaultLink.closest("a")).toHaveAttribute(
			"href",
			"/devices/test-device-1/faults/create"
		);
	});

	it("does not show active condition indicator when no condition is active", () => {
		render(<QuickActionsBar {...defaultProps} />);

		expect(
			screen.queryByText("Active Condition Running")
		).not.toBeInTheDocument();
	});

	it("shows active condition indicator when condition is active", () => {
		render(
			<QuickActionsBar
				{...defaultProps}
				anyConditionActive={true}
			/>
		);

		const activeIndicator = screen.getByText("Active Condition Running");
		expect(activeIndicator).toBeInTheDocument();

		// Check for the animated dot
		const animatedDot =
			activeIndicator.parentElement?.querySelector(".animate-pulse");
		expect(animatedDot).toBeInTheDocument();
	});

	it("renders with correct CSS classes", () => {
		const { container } = render(<QuickActionsBar {...defaultProps} />);

		const wrapper = container.querySelector(
			".bg-blue-50.border.border-blue-200.rounded-lg.p-4"
		);
		expect(wrapper).toBeInTheDocument();
	});

	it("has proper link styling", () => {
		render(<QuickActionsBar {...defaultProps} />);

		const backToDeviceLink = screen.getByText("← Back to Device");
		const allDevicesLink = screen.getByText("← All Devices");
		const newFaultLink = screen.getByText("+ New Fault");

		expect(backToDeviceLink.closest("a")).toHaveClass(
			"text-blue-600",
			"hover:text-blue-800"
		);
		expect(allDevicesLink.closest("a")).toHaveClass(
			"text-blue-600",
			"hover:text-blue-800"
		);
		expect(newFaultLink.closest("a")).toHaveClass(
			"bg-blue-600",
			"text-white",
			"hover:bg-blue-700"
		);
	});

	it("shows separator between navigation links", () => {
		render(<QuickActionsBar {...defaultProps} />);

		const separator = screen.getByText("|");
		expect(separator).toBeInTheDocument();
		expect(separator).toHaveClass("text-gray-300");
	});

	it("applies correct styling to active condition indicator", () => {
		render(
			<QuickActionsBar
				{...defaultProps}
				anyConditionActive={true}
			/>
		);

		const activeIndicator = screen.getByText("Active Condition Running");
		// Get the parent span which has the styling classes
		const indicatorContainer = activeIndicator.parentElement;

		expect(indicatorContainer).toHaveClass(
			"px-3",
			"py-1",
			"bg-green-100",
			"text-green-800",
			"rounded-full",
			"text-sm",
			"font-medium",
			"flex",
			"items-center",
			"space-x-1"
		);
	});

	it("renders proper layout structure", () => {
		const { container } = render(<QuickActionsBar {...defaultProps} />);

		const flexContainer = container.querySelector(
			".flex.flex-wrap.items-center.justify-between"
		);
		expect(flexContainer).toBeInTheDocument();

		const leftSection = container.querySelector(
			".flex.items-center.space-x-2"
		);
		const rightSection = container.querySelectorAll(
			".flex.items-center.space-x-2"
		)[1];

		expect(leftSection).toBeInTheDocument();
		expect(rightSection).toBeInTheDocument();
	});
});
