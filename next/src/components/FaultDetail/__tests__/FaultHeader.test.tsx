import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import FaultHeader from "../FaultHeader";
import { Device, Fault } from "@/services/api";

// Mock the copyToClipboard function
const mockCopyToClipboard = jest.fn();

describe("FaultHeader", () => {
	const mockDevice: Device = {
		device_id: "device-1",
		device_name: "Test Device",
		device_type: "sensor",
		status: "Active",
		registration_date: "2023-01-01T00:00:00Z",
		last_updated: "2023-01-01T00:00:00Z",
	};

	const mockFault: Fault = {
		id: 1,
		fault_id: "fault-1",
		fault_name: "Test Fault",
		device_id: "device-1",
		status: "Active",
		mode: "Online",
		description: "Test fault description",
		start_date: "2023-01-01T00:00:00Z",
		end_date: "2023-01-02T00:00:00Z",
		created_at: "2023-01-01T00:00:00Z",
		updated_at: "2023-01-01T00:00:00Z",
	};

	const defaultProps = {
		device: mockDevice,
		fault: mockFault,
		faultActionLoading: null,
		onDeleteFault: jest.fn(),
		onUpdateFaultStatus: jest.fn(),
		copyToClipboard: mockCopyToClipboard,
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("should render fault information correctly", () => {
		render(<FaultHeader {...defaultProps} />);

		expect(screen.getByText("Test Fault")).toBeInTheDocument();
		expect(screen.getByText("Active")).toBeInTheDocument();
		expect(screen.getByText("Test Device")).toBeInTheDocument();
		expect(screen.getByText("Test fault description")).toBeInTheDocument();
	});

	it("should display fault ID as clickable element", () => {
		render(<FaultHeader {...defaultProps} />);

		const faultIdElement = screen.getByText("fault-1");
		expect(faultIdElement).toBeInTheDocument();
		expect(faultIdElement).toHaveClass("cursor-pointer");
	});

	it("should call copyToClipboard when fault ID is clicked", () => {
		render(<FaultHeader {...defaultProps} />);

		const faultIdElement = screen.getByText("fault-1");
		fireEvent.click(faultIdElement);

		expect(mockCopyToClipboard).toHaveBeenCalledWith("fault-1", "Fault ID");
	});

	it("should show deactivate button when fault is active", () => {
		render(<FaultHeader {...defaultProps} />);

		const deactivateButton = screen.getByText("Deactivate");
		expect(deactivateButton).toBeInTheDocument();
	});

	it("should show activate button when fault is inactive", () => {
		const inactiveFault = { ...mockFault, status: "Inactive" as const };
		render(
			<FaultHeader
				{...defaultProps}
				fault={inactiveFault}
			/>
		);

		const activateButton = screen.getByText("Activate");
		expect(activateButton).toBeInTheDocument();
	});

	it("should call onUpdateFaultStatus when status button is clicked", () => {
		const onUpdateFaultStatus = jest.fn();
		render(
			<FaultHeader
				{...defaultProps}
				onUpdateFaultStatus={onUpdateFaultStatus}
			/>
		);

		const deactivateButton = screen.getByText("Deactivate");
		fireEvent.click(deactivateButton);

		expect(onUpdateFaultStatus).toHaveBeenCalledWith("Inactive");
	});

	it("should call onDeleteFault when delete button is clicked", () => {
		const onDeleteFault = jest.fn();
		render(
			<FaultHeader
				{...defaultProps}
				onDeleteFault={onDeleteFault}
			/>
		);

		const deleteButton = screen.getByText("Delete Fault");
		fireEvent.click(deleteButton);

		expect(onDeleteFault).toHaveBeenCalled();
	});

	it("should show loading state for status update", () => {
		render(
			<FaultHeader
				{...defaultProps}
				faultActionLoading='status'
			/>
		);

		expect(screen.getByText("Updating...")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /updating/i })
		).toBeDisabled();
	});

	it("should show loading state for delete action", () => {
		render(
			<FaultHeader
				{...defaultProps}
				faultActionLoading='delete'
			/>
		);

		expect(screen.getByText("Deleting...")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /deleting/i })
		).toBeDisabled();
	});

	it("should display dates correctly", () => {
		render(<FaultHeader {...defaultProps} />);

		// Check that dates are displayed (exact format may vary based on locale)
		expect(screen.getByText(/Start Date:/)).toBeInTheDocument();
		expect(screen.getByText(/End Date:/)).toBeInTheDocument();
		expect(screen.getByText(/Created:/)).toBeInTheDocument();
	});

	it("should handle fault without description", () => {
		const faultWithoutDescription = {
			...mockFault,
			description: undefined,
		};
		render(
			<FaultHeader
				{...defaultProps}
				fault={faultWithoutDescription}
			/>
		);

		expect(
			screen.queryByText("Test fault description")
		).not.toBeInTheDocument();
	});

	it("should handle fault without end date", () => {
		const faultWithoutEndDate = { ...mockFault, end_date: undefined };
		render(
			<FaultHeader
				{...defaultProps}
				fault={faultWithoutEndDate}
			/>
		);

		expect(screen.queryByText(/End Date:/)).not.toBeInTheDocument();
	});
});
