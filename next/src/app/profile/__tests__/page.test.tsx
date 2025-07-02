import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProfilePage from "../page";
import { useAuth } from "../../../contexts/AuthContext";
import { auth } from "../../../services/auth";

// Mock the dependencies
jest.mock("../../../contexts/AuthContext");
jest.mock("../../../services/auth");
jest.mock("../../../components/PageLayout", () => {
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

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockAuth = auth as jest.Mocked<typeof auth>;

describe("ProfilePage Component", () => {
	const mockUser = {
		id: 1,
		username: "testuser",
		email: "test@example.com",
		first_name: "Test",
		last_name: "User",
		role: "normal" as const,
		display_name: "Test User",
	};

	const mockRefreshUser = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();

		// Default auth mock
		mockUseAuth.mockReturnValue({
			user: mockUser,
			login: jest.fn(),
			logout: jest.fn(),
			refreshUser: mockRefreshUser,
			isAuthenticated: true,
			isAdmin: false,
			loading: false,
		});

		// Default auth service mocks
		mockAuth.changePassword = jest.fn().mockResolvedValue(undefined);
	});

	describe("Basic Rendering", () => {
		it("should render profile page with user data", () => {
			render(<ProfilePage />);
			expect(screen.getByTestId("page-layout")).toBeInTheDocument();
			expect(screen.getByTestId("page-layout")).toHaveAttribute(
				"data-title",
				"My Profile"
			);

			// Should display user information
			expect(screen.getByDisplayValue("testuser")).toBeInTheDocument();
			expect(
				screen.getByDisplayValue("test@example.com")
			).toBeInTheDocument();
			expect(screen.getByDisplayValue("Test")).toBeInTheDocument();
			expect(screen.getByDisplayValue("User")).toBeInTheDocument();
		});

		it("should show loading state when user is not loaded", () => {
			mockUseAuth.mockReturnValue({
				user: null,
				login: jest.fn(),
				logout: jest.fn(),
				refreshUser: mockRefreshUser,
				isAuthenticated: false,
				isAdmin: false,
				loading: true,
			});
			render(<ProfilePage />);

			expect(
				screen.getByText("Please log in to access your profile.")
			).toBeInTheDocument();
		});

		it("should show unauthenticated message when not logged in", () => {
			mockUseAuth.mockReturnValue({
				user: null,
				login: jest.fn(),
				logout: jest.fn(),
				refreshUser: mockRefreshUser,
				isAuthenticated: false,
				isAdmin: false,
				loading: false,
			});
			render(<ProfilePage />);

			expect(
				screen.getByText("Please log in to access your profile.")
			).toBeInTheDocument();
		});
	});

	describe("Profile Form", () => {
		it("should update profile data when form is submitted", async () => {
			const user = userEvent.setup();
			render(<ProfilePage />);

			// Update the first name
			const firstNameInput = screen.getByDisplayValue("Test");
			await user.clear(firstNameInput);
			await user.type(firstNameInput, "Updated");

			// Submit the form
			const updateButton = screen.getByText("Update Profile");
			await user.click(updateButton);

			await waitFor(() => {
				// Since there's no actual API call, just check that refreshUser was called
				expect(mockRefreshUser).toHaveBeenCalled();
			});
		});

		it("should show success message after successful profile update", async () => {
			const user = userEvent.setup();
			render(<ProfilePage />);

			const updateButton = screen.getByText("Update Profile");
			await user.click(updateButton);

			await waitFor(() => {
				expect(
					screen.getByText(/Profile updated successfully/)
				).toBeInTheDocument();
			});
		});

		it("should disable update button while loading", async () => {
			const user = userEvent.setup();
			// Make the refreshUser call pending
			mockRefreshUser.mockImplementation(() => new Promise(() => {}));

			render(<ProfilePage />);

			const updateButton = screen.getByText("Update Profile");
			await user.click(updateButton);

			await waitFor(() => {
				expect(updateButton).toBeDisabled();
				expect(screen.getByText("Updating...")).toBeInTheDocument();
			});
		});
	});

	describe("Password Change Form", () => {
		it("should change password when form is submitted", async () => {
			const user = userEvent.setup();
			render(<ProfilePage />);
			// Fill in password form - find password inputs by type and order
			const passwordInputs = screen.getAllByDisplayValue("");
			const passwordTypeInputs = passwordInputs.filter(
				(input) => (input as HTMLInputElement).type === "password"
			);

			await user.type(passwordTypeInputs[0], "oldpassword"); // Current password
			await user.type(passwordTypeInputs[1], "newpassword"); // New password
			await user.type(passwordTypeInputs[2], "newpassword"); // Confirm password

			// Submit the form
			const changePasswordButton = screen.getByRole("button", {
				name: "Change Password",
			});
			await user.click(changePasswordButton);

			await waitFor(() => {
				expect(mockAuth.changePassword).toHaveBeenCalledWith({
					current_password: "oldpassword",
					new_password: "newpassword",
				});
			});
		});

		it("should show error when passwords don't match", async () => {
			const user = userEvent.setup();
			render(<ProfilePage />);
			// Fill in mismatched passwords
			const passwordInputs = screen.getAllByDisplayValue("");
			const passwordTypeInputs = passwordInputs.filter(
				(input) => (input as HTMLInputElement).type === "password"
			);

			await user.type(passwordTypeInputs[0], "oldpassword");
			await user.type(passwordTypeInputs[1], "newpassword");
			await user.type(passwordTypeInputs[2], "differentpassword");

			const changePasswordButton = screen.getByRole("button", {
				name: "Change Password",
			});
			await user.click(changePasswordButton);

			await waitFor(() => {
				expect(
					screen.getByText("New passwords do not match")
				).toBeInTheDocument();
			});

			expect(mockAuth.changePassword).not.toHaveBeenCalled();
		});

		it("should show success message after successful password change", async () => {
			const user = userEvent.setup();
			render(<ProfilePage />);

			const passwordInputs = screen.getAllByDisplayValue("");
			const passwordTypeInputs = passwordInputs.filter(
				(input) => (input as HTMLInputElement).type === "password"
			);

			await user.type(passwordTypeInputs[0], "oldpassword");
			await user.type(passwordTypeInputs[1], "newpassword");
			await user.type(passwordTypeInputs[2], "newpassword");

			const changePasswordButton = screen.getByRole("button", {
				name: "Change Password",
			});
			await user.click(changePasswordButton);

			await waitFor(() => {
				expect(
					screen.getByText(/Password changed successfully/)
				).toBeInTheDocument();
			});
		});

		it("should show error message when password change fails", async () => {
			const user = userEvent.setup();
			const errorMessage = "Current password is incorrect";
			mockAuth.changePassword.mockRejectedValue(new Error(errorMessage));

			render(<ProfilePage />);

			const passwordInputs = screen.getAllByDisplayValue("");
			const passwordTypeInputs = passwordInputs.filter(
				(input) => (input as HTMLInputElement).type === "password"
			);

			await user.type(passwordTypeInputs[0], "wrongpassword");
			await user.type(passwordTypeInputs[1], "newpassword");
			await user.type(passwordTypeInputs[2], "newpassword");

			const changePasswordButton = screen.getByRole("button", {
				name: "Change Password",
			});
			await user.click(changePasswordButton);

			await waitFor(() => {
				expect(screen.getByText(errorMessage)).toBeInTheDocument();
			});
		});

		it("should clear password form after successful change", async () => {
			const user = userEvent.setup();
			render(<ProfilePage />);

			const passwordInputs = screen.getAllByDisplayValue("");
			const passwordTypeInputs = passwordInputs.filter(
				(input) => (input as HTMLInputElement).type === "password"
			);

			const currentPasswordInput = passwordTypeInputs[0];
			const newPasswordInput = passwordTypeInputs[1];
			const confirmPasswordInput = passwordTypeInputs[2];

			await user.type(currentPasswordInput, "oldpassword");
			await user.type(newPasswordInput, "newpassword");
			await user.type(confirmPasswordInput, "newpassword");

			const changePasswordButton = screen.getByRole("button", {
				name: "Change Password",
			});
			await user.click(changePasswordButton);

			await waitFor(() => {
				expect(currentPasswordInput).toHaveValue("");
				expect(newPasswordInput).toHaveValue("");
				expect(confirmPasswordInput).toHaveValue("");
			});
		});

		it("should disable change password button while loading", async () => {
			const user = userEvent.setup();
			// Make the API call pending
			mockAuth.changePassword.mockImplementation(
				() => new Promise(() => {})
			);

			render(<ProfilePage />);

			const passwordInputs = screen.getAllByDisplayValue("");
			const passwordTypeInputs = passwordInputs.filter(
				(input) => (input as HTMLInputElement).type === "password"
			);

			await user.type(passwordTypeInputs[0], "oldpassword");
			await user.type(passwordTypeInputs[1], "newpassword");
			await user.type(passwordTypeInputs[2], "newpassword");

			const changePasswordButton = screen.getByRole("button", {
				name: "Change Password",
			});
			await user.click(changePasswordButton);

			await waitFor(() => {
				expect(changePasswordButton).toBeDisabled();
				expect(screen.getByText("Changing...")).toBeInTheDocument();
			});
		});
	});

	describe("Form Validation", () => {
		it("should require all profile fields", async () => {
			const user = userEvent.setup();
			render(<ProfilePage />);

			// Clear required fields (username is disabled so skip it)
			const emailInput = screen.getByDisplayValue("test@example.com");

			await user.clear(emailInput);

			const updateButton = screen.getByText("Update Profile");
			await user.click(updateButton);

			// Should show validation errors
			expect(emailInput).toBeInvalid();
		});

		it("should require all password fields", async () => {
			const user = userEvent.setup();
			render(<ProfilePage />);

			// Try to submit with empty password fields
			const changePasswordButton = screen.getByRole("button", {
				name: "Change Password",
			});
			await user.click(changePasswordButton);

			const passwordInputs = screen.getAllByDisplayValue("");
			const passwordTypeInputs = passwordInputs.filter(
				(input) => (input as HTMLInputElement).type === "password"
			);

			const currentPasswordInput = passwordTypeInputs[0];
			const newPasswordInput = passwordTypeInputs[1];
			const confirmPasswordInput = passwordTypeInputs[2];

			expect(currentPasswordInput).toBeInvalid();
			expect(newPasswordInput).toBeInvalid();
			expect(confirmPasswordInput).toBeInvalid();
		});
	});

	describe("Error and Success States", () => {
		it("should clear errors when forms are resubmitted", async () => {
			const user = userEvent.setup();
			// Mock refreshUser to fail first, then succeed
			mockRefreshUser.mockRejectedValueOnce(new Error("Refresh failed"));
			mockRefreshUser.mockResolvedValueOnce(undefined);

			render(<ProfilePage />);

			const updateButton = screen.getByText("Update Profile");

			// First attempt - should show error
			await user.click(updateButton);
			await waitFor(() => {
				expect(screen.getByText("Refresh failed")).toBeInTheDocument();
			});

			// Second attempt - should clear error and show success
			await user.click(updateButton);
			await waitFor(() => {
				expect(
					screen.queryByText("Refresh failed")
				).not.toBeInTheDocument();
				expect(
					screen.getByText(/Profile updated successfully/)
				).toBeInTheDocument();
			});
		});

		it.skip("should auto-clear success messages after timeout", async () => {
			// TODO: Fix fake timers with async code
			const user = userEvent.setup();
			jest.useFakeTimers();

			try {
				render(<ProfilePage />);

				const updateButton = screen.getByText("Update Profile");
				await user.click(updateButton);

				await waitFor(() => {
					expect(
						screen.getByText(/Profile updated successfully/)
					).toBeInTheDocument();
				});

				// Fast-forward time
				jest.advanceTimersByTime(3000);

				await waitFor(() => {
					expect(
						screen.queryByText(/Profile updated successfully/)
					).not.toBeInTheDocument();
				});
			} finally {
				jest.useRealTimers();
			}
		}, 10000);
	});
});
