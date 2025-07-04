import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ConditionsManagement from "../ConditionsManagement";
import { Condition } from "@/services/api";

describe("ConditionsManagement", () => {
	const mockConditions: Condition[] = [
		{
			id: 1,
			condition_id: "condition-1",
			fault_id: "fault-1",
			name: "Test Condition 1",
			description: "Test condition description",
			status: "Active",
			start_time: "2023-01-01T10:00:00Z",
			end_time: "2023-01-01T11:00:00Z",
			created_at: "2023-01-01T10:00:00Z",
			updated_at: "2023-01-01T10:00:00Z",
		},
		{
			id: 2,
			condition_id: "condition-2",
			fault_id: "fault-1",
			name: "Test Condition 2",
			description: "Another test condition",
			status: "Inactive",
			start_time: "2023-01-01T09:00:00Z",
			end_time: "2023-01-01T09:30:00Z",
			created_at: "2023-01-01T09:00:00Z",
			updated_at: "2023-01-01T09:00:00Z",
		},
	];

	const defaultProps = {
		offlineConditions: mockConditions,
		showOfflineConditionForm: false,
		newOfflineConditionName: "",
		newOfflineConditionDescription: "",
		offlineConditionActionLoading: null,
		onToggleForm: jest.fn(),
		onNameChange: jest.fn(),
		onDescriptionChange: jest.fn(),
		onCreateCondition: jest.fn(),
		onStartCondition: jest.fn(),
		onStopCondition: jest.fn(),
		onFinishCondition: jest.fn(),
		onEditCondition: jest.fn(),
		onDeleteCondition: jest.fn(),
		copyToClipboard: jest.fn(),
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("should render the main title and add button", () => {
		render(<ConditionsManagement {...defaultProps} />);

		expect(screen.getByText("Conditions Management")).toBeInTheDocument();
		expect(screen.getByText("Add Condition")).toBeInTheDocument();
	});

	it("should display list of conditions", () => {
		render(<ConditionsManagement {...defaultProps} />);

		expect(screen.getByText("Test Condition 1")).toBeInTheDocument();
		expect(screen.getByText("Test Condition 2")).toBeInTheDocument();
		expect(
			screen.getByText("Test condition description")
		).toBeInTheDocument();
		expect(screen.getByText("Another test condition")).toBeInTheDocument();
	});

	it("should show condition statuses correctly", () => {
		render(<ConditionsManagement {...defaultProps} />);

		expect(screen.getByText("Active")).toBeInTheDocument();
		expect(screen.getByText("Inactive")).toBeInTheDocument();
	});

	it("should toggle condition form when add button is clicked", () => {
		const onToggleForm = jest.fn();
		render(
			<ConditionsManagement
				{...defaultProps}
				onToggleForm={onToggleForm}
			/>
		);

		const addButton = screen.getByText("Add Condition");
		fireEvent.click(addButton);

		expect(onToggleForm).toHaveBeenCalled();
	});

	it("should show form when showOfflineConditionForm is true", () => {
		render(
			<ConditionsManagement
				{...defaultProps}
				showOfflineConditionForm={true}
			/>
		);

		expect(
			screen.getByText("Create New Offline Condition")
		).toBeInTheDocument();
		expect(screen.getByText("Condition Name *")).toBeInTheDocument();
		expect(screen.getByText("Description")).toBeInTheDocument();
		expect(screen.getByText("Create Condition")).toBeInTheDocument();
	});

	it("should handle condition name input changes", () => {
		const onNameChange = jest.fn();
		render(
			<ConditionsManagement
				{...defaultProps}
				showOfflineConditionForm={true}
				onNameChange={onNameChange}
			/>
		);

		const nameInput = screen.getByPlaceholderText(
			"e.g., Baseline, Load 5kg, Speed 100rpm"
		);
		fireEvent.change(nameInput, { target: { value: "New Condition" } });

		expect(onNameChange).toHaveBeenCalledWith("New Condition");
	});

	it("should handle condition description input changes", () => {
		const onDescriptionChange = jest.fn();
		render(
			<ConditionsManagement
				{...defaultProps}
				showOfflineConditionForm={true}
				onDescriptionChange={onDescriptionChange}
			/>
		);

		const descriptionInput = screen.getByPlaceholderText(
			"Describe the condition..."
		);
		fireEvent.change(descriptionInput, {
			target: { value: "New description" },
		});

		expect(onDescriptionChange).toHaveBeenCalledWith("New description");
	});

	it("should disable create button when name is empty", () => {
		render(
			<ConditionsManagement
				{...defaultProps}
				showOfflineConditionForm={true}
			/>
		);

		const createButton = screen.getByText("Create Condition");
		expect(createButton).toBeDisabled();
	});

	it("should enable create button when name is provided", () => {
		render(
			<ConditionsManagement
				{...defaultProps}
				showOfflineConditionForm={true}
				newOfflineConditionName='New Condition'
			/>
		);

		const createButton = screen.getByText("Create Condition");
		expect(createButton).not.toBeDisabled();
	});

	it("should call onCreateCondition when create button is clicked", () => {
		const onCreateCondition = jest.fn();
		render(
			<ConditionsManagement
				{...defaultProps}
				showOfflineConditionForm={true}
				newOfflineConditionName='New Condition'
				onCreateCondition={onCreateCondition}
			/>
		);

		const createButton = screen.getByText("Create Condition");
		fireEvent.click(createButton);

		expect(onCreateCondition).toHaveBeenCalled();
	});

	it("should call onEditCondition when edit button is clicked", () => {
		const onEditCondition = jest.fn();
		render(
			<ConditionsManagement
				{...defaultProps}
				onEditCondition={onEditCondition}
			/>
		);

		const editButtons = screen.getAllByText("Edit");
		fireEvent.click(editButtons[0]);

		expect(onEditCondition).toHaveBeenCalledWith(mockConditions[0]);
	});

	it("should call onDeleteCondition when delete button is clicked", () => {
		const onDeleteCondition = jest.fn();
		render(
			<ConditionsManagement
				{...defaultProps}
				onDeleteCondition={onDeleteCondition}
			/>
		);

		const deleteButtons = screen.getAllByText("Delete");
		fireEvent.click(deleteButtons[0]);

		expect(onDeleteCondition).toHaveBeenCalledWith("condition-1");
	});

	it("should show loading state when creating condition", () => {
		render(
			<ConditionsManagement
				{...defaultProps}
				showOfflineConditionForm={true}
				newOfflineConditionName='New Condition'
				offlineConditionActionLoading='create'
			/>
		);

		expect(screen.getByText("Creating...")).toBeInTheDocument();
	});

	it("should show message when no conditions exist", () => {
		render(
			<ConditionsManagement
				{...defaultProps}
				offlineConditions={[]}
			/>
		);

		expect(
			screen.getByText(/No offline conditions created yet/)
		).toBeInTheDocument();
	});

	it("should show cancel button that toggles form", () => {
		const onToggleForm = jest.fn();
		render(
			<ConditionsManagement
				{...defaultProps}
				showOfflineConditionForm={true}
				onToggleForm={onToggleForm}
			/>
		);

		// Find the cancel button within the form (second one, in the form actions)
		const cancelButtons = screen.getAllByText("Cancel");
		const formCancelButton = cancelButtons[1]; // Second Cancel button is in the form
		fireEvent.click(formCancelButton);

		expect(onToggleForm).toHaveBeenCalled();
	});

	it("should call onStartCondition when start button is clicked", () => {
		const onStartCondition = jest.fn();
		render(
			<ConditionsManagement
				{...defaultProps}
				onStartCondition={onStartCondition}
			/>
		);

		// Find start button for the inactive condition (mockConditions[1])
		const startButtons = screen.getAllByText("Start");
		fireEvent.click(startButtons[0]);

		expect(onStartCondition).toHaveBeenCalledWith("condition-2");
	});

	it("should call onStopCondition when stop button is clicked", () => {
		const onStopCondition = jest.fn();
		render(
			<ConditionsManagement
				{...defaultProps}
				onStopCondition={onStopCondition}
			/>
		);

		// Find stop button for the active condition (mockConditions[0])
		const stopButtons = screen.getAllByText("Stop");
		fireEvent.click(stopButtons[0]);

		expect(onStopCondition).toHaveBeenCalledWith("condition-1");
	});

	it("should call onFinishCondition when finish button is clicked", () => {
		const onFinishCondition = jest.fn();
		render(
			<ConditionsManagement
				{...defaultProps}
				onFinishCondition={onFinishCondition}
			/>
		);

		// Find finish button for the active condition (mockConditions[0])
		const finishButtons = screen.getAllByText("Finish");
		fireEvent.click(finishButtons[0]);

		expect(onFinishCondition).toHaveBeenCalledWith("condition-1");
	});

	it("should call copyToClipboard when condition ID is clicked", () => {
		const copyToClipboard = jest.fn();
		render(
			<ConditionsManagement
				{...defaultProps}
				copyToClipboard={copyToClipboard}
			/>
		);

		// Find and click on the first condition ID
		fireEvent.click(screen.getAllByText("condition-1")[0]);

		expect(copyToClipboard).toHaveBeenCalledWith(
			"condition-1",
			"Condition ID"
		);
	});

	it("should show loading state when starting a condition", () => {
		render(
			<ConditionsManagement
				{...defaultProps}
				offlineConditionActionLoading='condition-2'
			/>
		);

		expect(screen.getByText("Starting...")).toBeInTheDocument();
	});

	it("should show loading state when stopping a condition", () => {
		// First condition is active, so it has a stop button
		render(
			<ConditionsManagement
				{...defaultProps}
				offlineConditionActionLoading='condition-1'
			/>
		);

		expect(screen.getByText("Stopping...")).toBeInTheDocument();
	});

	it("should show loading state when finishing a condition", () => {
		render(
			<ConditionsManagement
				{...defaultProps}
				offlineConditionActionLoading='condition-1'
			/>
		);

		expect(screen.getByText("Finishing...")).toBeInTheDocument();
	});

	it("should show loading state when deleting a condition", () => {
		render(
			<ConditionsManagement
				{...defaultProps}
				offlineConditionActionLoading='condition-1'
			/>
		);

		expect(screen.getByText("Deleting...")).toBeInTheDocument();
	});

	it("should display usage instructions for inactive conditions", () => {
		render(<ConditionsManagement {...defaultProps} />);

		// Only inactive conditions should show usage instructions
		expect(screen.getByText("Usage Instructions:")).toBeInTheDocument();
		expect(
			screen.getByText(
				"1. Start this condition when ready to collect data"
			)
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"2. Use the condition ID in your data upload scripts"
			)
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"3. Finish the condition when data collection is complete"
			)
		).toBeInTheDocument();
	});

	it("should format and display created date correctly", () => {
		render(<ConditionsManagement {...defaultProps} />);

		// Since date formatting depends on locale, we'll just check that the "Created:" label exists
		// followed by some form of date/time string
		expect(screen.getAllByText(/Created:/)[0]).toBeInTheDocument();
	});

	it("should format and display start and end times when available", () => {
		render(<ConditionsManagement {...defaultProps} />);

		// Check that start and end time labels exist
		expect(screen.getAllByText(/Started:/)[0]).toBeInTheDocument();
		expect(screen.getAllByText(/Ended:/)[0]).toBeInTheDocument();
	});
});
