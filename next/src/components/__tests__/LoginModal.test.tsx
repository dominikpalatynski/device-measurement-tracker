import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginModal from "../LoginModal";
import { useAuth } from "../../contexts/AuthContext";

// Mock the AuthContext
jest.mock("../../contexts/AuthContext");
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe("LoginModal", () => {
	const mockLogin = jest.fn();
	const mockOnClose = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		mockUseAuth.mockReturnValue({
			user: null,
			loading: false,
			login: mockLogin,
			logout: jest.fn(),
			isAuthenticated: false,
			isAdmin: false,
			refreshUser: jest.fn(),
		});
	});

	it("should not render when isOpen is false", () => {
		render(
			<LoginModal
				isOpen={false}
				onClose={mockOnClose}
			/>
		);

		expect(screen.queryByText("Login")).not.toBeInTheDocument();
	});

	it("should render when isOpen is true", () => {
		render(
			<LoginModal
				isOpen={true}
				onClose={mockOnClose}
			/>
		);

		expect(
			screen.getByRole("heading", { name: "Login" })
		).toBeInTheDocument();
		expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /^login$/i })
		).toBeInTheDocument();
	});

	it("should call onClose when close button is clicked", async () => {
		const user = userEvent.setup();
		render(
			<LoginModal
				isOpen={true}
				onClose={mockOnClose}
			/>
		);

		const closeButton = screen.getByRole("button", {
			name: /close modal/i,
		});
		await user.click(closeButton);

		expect(mockOnClose).toHaveBeenCalledTimes(1);
	});

	it("should update input values when typing", async () => {
		const user = userEvent.setup();
		render(
			<LoginModal
				isOpen={true}
				onClose={mockOnClose}
			/>
		);

		const usernameInput = screen.getByLabelText(/username/i);
		const passwordInput = screen.getByLabelText(/password/i);

		await user.type(usernameInput, "testuser");
		await user.type(passwordInput, "testpass");

		expect(usernameInput).toHaveValue("testuser");
		expect(passwordInput).toHaveValue("testpass");
	});

	it("should call login and close modal on successful login", async () => {
		const user = userEvent.setup();
		mockLogin.mockResolvedValueOnce(undefined);

		render(
			<LoginModal
				isOpen={true}
				onClose={mockOnClose}
			/>
		);

		const usernameInput = screen.getByLabelText(/username/i);
		const passwordInput = screen.getByLabelText(/password/i);
		const loginButton = screen.getByRole("button", { name: /^login$/i });

		await user.type(usernameInput, "testuser");
		await user.type(passwordInput, "testpass");
		await user.click(loginButton);

		await waitFor(() => {
			expect(mockLogin).toHaveBeenCalledWith("testuser", "testpass");
			expect(mockOnClose).toHaveBeenCalledTimes(1);
		});
	});

	it("should display error message on login failure", async () => {
		const user = userEvent.setup();
		const errorMessage = "Invalid credentials";
		mockLogin.mockRejectedValueOnce(new Error(errorMessage));

		render(
			<LoginModal
				isOpen={true}
				onClose={mockOnClose}
			/>
		);

		const usernameInput = screen.getByLabelText(/username/i);
		const passwordInput = screen.getByLabelText(/password/i);
		const loginButton = screen.getByRole("button", { name: /^login$/i });

		await user.type(usernameInput, "wronguser");
		await user.type(passwordInput, "wrongpass");
		await user.click(loginButton);

		await waitFor(() => {
			expect(screen.getByText(errorMessage)).toBeInTheDocument();
		});

		expect(mockOnClose).not.toHaveBeenCalled();
	});

	it("should show loading state during login", async () => {
		const user = userEvent.setup();
		let resolveLogin: () => void;
		const loginPromise = new Promise<void>((resolve) => {
			resolveLogin = resolve;
		});
		mockLogin.mockReturnValueOnce(loginPromise);

		render(
			<LoginModal
				isOpen={true}
				onClose={mockOnClose}
			/>
		);

		const usernameInput = screen.getByLabelText(/username/i);
		const passwordInput = screen.getByLabelText(/password/i);
		const loginButton = screen.getByRole("button", { name: /^login$/i });

		await user.type(usernameInput, "testuser");
		await user.type(passwordInput, "testpass");
		await user.click(loginButton);

		// Check that the button is disabled during loading
		expect(loginButton).toBeDisabled();

		// Resolve the login promise
		resolveLogin!();
		await waitFor(() => {
			expect(loginButton).not.toBeDisabled();
		});
	});

	it("should prevent form submission with empty fields", async () => {
		const user = userEvent.setup();
		render(
			<LoginModal
				isOpen={true}
				onClose={mockOnClose}
			/>
		);

		const loginButton = screen.getByRole("button", { name: /^login$/i });
		await user.click(loginButton);

		expect(mockLogin).not.toHaveBeenCalled();
	});

	it("should clear form fields after successful login", async () => {
		const user = userEvent.setup();
		mockLogin.mockResolvedValueOnce(undefined);

		render(
			<LoginModal
				isOpen={true}
				onClose={mockOnClose}
			/>
		);

		const usernameInput = screen.getByLabelText(/username/i);
		const passwordInput = screen.getByLabelText(/password/i);
		const loginButton = screen.getByRole("button", { name: /^login$/i });

		await user.type(usernameInput, "testuser");
		await user.type(passwordInput, "testpass");
		await user.click(loginButton);

		await waitFor(() => {
			expect(usernameInput).toHaveValue("");
			expect(passwordInput).toHaveValue("");
		});
	});

	it("should handle form submission via Enter key", async () => {
		const user = userEvent.setup();
		mockLogin.mockResolvedValueOnce(undefined);

		render(
			<LoginModal
				isOpen={true}
				onClose={mockOnClose}
			/>
		);

		const usernameInput = screen.getByLabelText(/username/i);
		const passwordInput = screen.getByLabelText(/password/i);

		await user.type(usernameInput, "testuser");
		await user.type(passwordInput, "testpass");
		await user.keyboard("{Enter}");

		await waitFor(() => {
			expect(mockLogin).toHaveBeenCalledWith("testuser", "testpass");
		});
	});
});
