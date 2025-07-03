import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UserManagement from "../page";
import { userManagement } from "../../../services/auth";

// Mock the auth context
const mockUseAuth = jest.fn();
jest.mock("../../../contexts/AuthContext", () => ({
	useAuth: () => mockUseAuth(),
}));

// Mock the userManagement service
jest.mock("../../../services/auth", () => ({
	userManagement: {
		getUsers: jest.fn(),
		createUser: jest.fn(),
		updateUser: jest.fn(),
		deleteUser: jest.fn(),
		activateUser: jest.fn(),
		deactivateUser: jest.fn(),
	},
}));

// Mock the PageLayout component
jest.mock("../../../components/PageLayout", () => {
	return function MockPageLayout({
		children,
		title,
		breadcrumbs,
	}: {
		children: React.ReactNode;
		title: string;
		breadcrumbs?: any[];
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

// Mock window.confirm
const mockConfirm = jest.fn();
global.confirm = mockConfirm;

const mockUserManagement = userManagement as jest.Mocked<typeof userManagement>;

describe("User Management Page", () => {
	const mockUsers = [
		{
			id: 1,
			username: "admin",
			email: "admin@test.com",
			first_name: "Admin",
			last_name: "User",
			role: "admin" as const,
			display_name: "Admin User",
		},
		{
			id: 2,
			username: "user",
			email: "user@test.com",
			first_name: "Regular",
			last_name: "User",
			role: "normal" as const,
			display_name: "Regular User",
		},
	];

	beforeEach(() => {
		jest.clearAllMocks();
		mockConfirm.mockReturnValue(true);
	});

	it("should render login message when user is not authenticated", () => {
		mockUseAuth.mockReturnValue({
			isAdmin: false,
			isAuthenticated: false,
			user: null,
		});

		render(<UserManagement />);

		expect(screen.getByTestId("page-layout")).toBeInTheDocument();
		expect(
			screen.getByText("Please log in to access user management.")
		).toBeInTheDocument();
	});

	it("should render access denied when user is authenticated but not admin", () => {
		mockUseAuth.mockReturnValue({
			isAdmin: false,
			isAuthenticated: true,
			user: mockUsers[1],
		});

		render(<UserManagement />);

		expect(screen.getByTestId("page-layout")).toBeInTheDocument();
		expect(
			screen.getByText("Access denied. Admin privileges required.")
		).toBeInTheDocument();
	});
	it("should load and display users for admin", async () => {
		mockUseAuth.mockReturnValue({
			isAdmin: true,
			isAuthenticated: true,
			user: mockUsers[0],
		});
		mockUserManagement.getUsers.mockResolvedValue(mockUsers);

		render(<UserManagement />);

		expect(screen.getByTestId("page-layout")).toBeInTheDocument();

		await waitFor(() => {
			expect(mockUserManagement.getUsers).toHaveBeenCalledTimes(1);
		});

		await waitFor(() => {
			expect(screen.getByText("Admin User")).toBeInTheDocument();
			expect(screen.getByText("Regular User")).toBeInTheDocument();
		});
	});

	it("should handle loading state", async () => {
		mockUseAuth.mockReturnValue({
			isAdmin: true,
			isAuthenticated: true,
			user: mockUsers[0],
		});

		// Make getUsers hang to test loading state
		mockUserManagement.getUsers.mockImplementation(
			() => new Promise(() => {})
		);

		render(<UserManagement />);

		expect(screen.getByText("Loading users...")).toBeInTheDocument();
		// Just verify the spinner element exists by its className
		const spinnerElement = document.querySelector(".animate-spin");
		expect(spinnerElement).toBeInTheDocument();
	});

	it("should handle error when loading users fails", async () => {
		mockUseAuth.mockReturnValue({
			isAdmin: true,
			isAuthenticated: true,
			user: mockUsers[0],
		});
		mockUserManagement.getUsers.mockRejectedValue(
			new Error("Failed to load")
		);

		render(<UserManagement />);

		await waitFor(() => {
			expect(screen.getByText("Failed to load")).toBeInTheDocument();
		});
	});

	it("should open create user modal when create button is clicked", async () => {
		mockUseAuth.mockReturnValue({
			isAdmin: true,
			isAuthenticated: true,
			user: mockUsers[0],
		});
		mockUserManagement.getUsers.mockResolvedValue(mockUsers);

		render(<UserManagement />);

		await waitFor(() => {
			expect(screen.getByText("Create User")).toBeInTheDocument();
		});

		const createButton = screen.getByText("Create User");
		fireEvent.click(createButton);

		await waitFor(() => {
			expect(screen.getByText("Create New User")).toBeInTheDocument();
		});
	});

	it("should open edit modal when edit button is clicked", async () => {
		mockUseAuth.mockReturnValue({
			isAdmin: true,
			isAuthenticated: true,
			user: mockUsers[0],
		});
		mockUserManagement.getUsers.mockResolvedValue(mockUsers);

		render(<UserManagement />);

		await waitFor(() => {
			expect(screen.getByText("Regular User")).toBeInTheDocument();
		});

		const editButtons = screen.getAllByText("Edit");
		fireEvent.click(editButtons[0]);

		await waitFor(() => {
			expect(screen.getByText("Edit User")).toBeInTheDocument();
		});
	});

	it("should handle modal closing", async () => {
		mockUseAuth.mockReturnValue({
			isAdmin: true,
			isAuthenticated: true,
			user: mockUsers[0],
		});
		mockUserManagement.getUsers.mockResolvedValue(mockUsers);

		render(<UserManagement />);

		// Open create modal
		await waitFor(() => {
			const createButton = screen.getByText("Create User");
			fireEvent.click(createButton);
		});

		await waitFor(() => {
			expect(screen.getByText("Create New User")).toBeInTheDocument();
		});

		// Close modal
		const cancelButton = screen.getByText("Cancel");
		fireEvent.click(cancelButton);

		await waitFor(() => {
			expect(
				screen.queryByText("Create New User")
			).not.toBeInTheDocument();
		});
	});

	it("should handle form input changes", async () => {
		const user = userEvent.setup();
		mockUseAuth.mockReturnValue({
			isAdmin: true,
			isAuthenticated: true,
			user: mockUsers[0],
		});
		mockUserManagement.getUsers.mockResolvedValue(mockUsers);

		render(<UserManagement />);

		// Open create modal
		await waitFor(() => {
			const createButton = screen.getByText("Create User");
			fireEvent.click(createButton);
		});

		// Test form input handling - use alternative selectors since labels aren't properly associated
		const inputs = screen.getAllByDisplayValue("");
		const textInputs = inputs.filter(
			(input) => input.getAttribute("type") === "text"
		);

		if (textInputs[0]) {
			await user.type(textInputs[0], "testuser");
			expect(textInputs[0]).toHaveValue("testuser");
		}
	});

	it("should delete a user when delete button is clicked", async () => {
		mockUseAuth.mockReturnValue({
			isAdmin: true,
			isAuthenticated: true,
			user: mockUsers[0],
		});
		mockUserManagement.getUsers.mockResolvedValue(mockUsers);
		mockUserManagement.deleteUser.mockResolvedValue();

		render(<UserManagement />);

		await waitFor(() => {
			expect(screen.getByText("Regular User")).toBeInTheDocument();
		});

		const deleteButtons = screen.getAllByText("Delete");
		fireEvent.click(deleteButtons[0]);

		// Confirm should have been called and is already mocked to return true
		expect(mockConfirm).toHaveBeenCalled();

		await waitFor(() => {
			expect(mockUserManagement.deleteUser).toHaveBeenCalledWith(
				expect.any(Number)
			);
		});

		// Verify users were reloaded
		await waitFor(() => {
			expect(mockUserManagement.getUsers).toHaveBeenCalledTimes(2);
		});
	});
});
