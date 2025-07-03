import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import EditConditionModal from "../EditConditionModal";
import { Condition } from "@/services/api";

// Mock data
const mockCondition: Condition = {
	id: 1,
	condition_id: "test-condition-1",
	name: "Test Condition",
	description: "Test Description",
	status: "Active" as const,
	fault_id: "1",
	created_at: "2023-01-01T00:00:00.000Z",
	updated_at: "2023-01-01T00:00:00.000Z",
};

const mockFormData = {
	name: "Test Condition",
	description: "Test Description",
	status: "Active" as const,
};

const defaultProps = {
	condition: mockCondition,
	formData: mockFormData,
	onFormChange: jest.fn(),
	onSave: jest.fn(),
	onCancel: jest.fn(),
	loading: false,
};

describe("EditConditionModal", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("renders modal with correct elements", () => {
		render(<EditConditionModal {...defaultProps} />);

		expect(screen.getByText("Edit Condition")).toBeInTheDocument();
		expect(screen.getByLabelText("Name")).toBeInTheDocument();
		expect(screen.getByLabelText("Description")).toBeInTheDocument();
		expect(screen.getByLabelText("Status")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Save Changes" })
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Cancel" })
		).toBeInTheDocument();
	});

	it("displays form data correctly", () => {
		render(<EditConditionModal {...defaultProps} />);

		const nameInput = screen.getByDisplayValue("Test Condition");
		const descriptionInput = screen.getByDisplayValue("Test Description");
		const statusSelect = screen.getByDisplayValue("Active");

		expect(nameInput).toBeInTheDocument();
		expect(descriptionInput).toBeInTheDocument();
		expect(statusSelect).toBeInTheDocument();
	});

	it("calls onFormChange when inputs change", () => {
		render(<EditConditionModal {...defaultProps} />);

		const nameInput = screen.getByLabelText("Name");
		const descriptionInput = screen.getByLabelText("Description");
		const statusSelect = screen.getByLabelText("Status");

		fireEvent.change(nameInput, { target: { value: "New Name" } });
		expect(defaultProps.onFormChange).toHaveBeenCalledWith(
			"name",
			"New Name"
		);

		fireEvent.change(descriptionInput, {
			target: { value: "New Description" },
		});
		expect(defaultProps.onFormChange).toHaveBeenCalledWith(
			"description",
			"New Description"
		);

		fireEvent.change(statusSelect, { target: { value: "Inactive" } });
		expect(defaultProps.onFormChange).toHaveBeenCalledWith(
			"status",
			"Inactive"
		);
	});

	it("calls onSave when save button is clicked", () => {
		render(<EditConditionModal {...defaultProps} />);

		const saveButton = screen.getByRole("button", { name: "Save Changes" });
		fireEvent.click(saveButton);

		expect(defaultProps.onSave).toHaveBeenCalled();
	});

	it("calls onCancel when cancel button is clicked", () => {
		render(<EditConditionModal {...defaultProps} />);

		const cancelButton = screen.getByRole("button", { name: "Cancel" });
		fireEvent.click(cancelButton);

		expect(defaultProps.onCancel).toHaveBeenCalled();
	});

	it("disables inputs and shows loading state when loading", () => {
		render(
			<EditConditionModal
				{...defaultProps}
				loading={true}
			/>
		);

		const nameInput = screen.getByLabelText("Name");
		const descriptionInput = screen.getByLabelText("Description");
		const statusSelect = screen.getByLabelText("Status");
		const saveButton = screen.getByRole("button", { name: "Saving..." });
		const cancelButton = screen.getByRole("button", { name: "Cancel" });

		expect(nameInput).toBeDisabled();
		expect(descriptionInput).toBeDisabled();
		expect(statusSelect).toBeDisabled();
		expect(saveButton).toBeDisabled();
		expect(cancelButton).toBeDisabled();
	});

	it("contains status options", () => {
		render(<EditConditionModal {...defaultProps} />);

		const statusSelect = screen.getByLabelText("Status");
		expect(statusSelect).toContainHTML(
			'<option value="Active">Active</option>'
		);
		expect(statusSelect).toContainHTML(
			'<option value="Inactive">Inactive</option>'
		);
	});

	it("renders modal overlay", () => {
		const { container } = render(<EditConditionModal {...defaultProps} />);

		const overlay = container.querySelector(
			".fixed.inset-0.bg-black.bg-opacity-50"
		);
		expect(overlay).toBeInTheDocument();
	});

	it("renders modal content box", () => {
		const { container } = render(<EditConditionModal {...defaultProps} />);

		const modal = container.querySelector(".bg-white.rounded-lg");
		expect(modal).toBeInTheDocument();
	});
});
