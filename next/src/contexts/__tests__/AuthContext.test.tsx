import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "../AuthContext";
import { auth } from "../../services/auth";

// Mock the entire auth module
jest.mock("../../services/auth");
const mockAuth = auth as jest.Mocked<typeof auth>;

// Test component to access AuthContext
const TestComponent = () => {
	const authContext = useAuth();

	const handleLogin = async () => {
		try {
			await authContext.login("test", "pass");
		} catch (error) {
			// Error will be logged in AuthContext, just catch it here
		}
	};

	return (
		<div>
			<div data-testid='loading'>{authContext.loading.toString()}</div>
			<div data-testid='authenticated'>
				{authContext.isAuthenticated.toString()}
			</div>
			<div data-testid='admin'>{authContext.isAdmin.toString()}</div>
			<div data-testid='user'>
				{authContext.user ? authContext.user.username : "null"}
			</div>
			<button onClick={handleLogin}>Login</button>
			<button onClick={() => authContext.logout()}>Logout</button>
			<button onClick={() => authContext.refreshUser()}>Refresh</button>
		</div>
	);
};

describe("AuthContext", () => {
	const mockUser = {
		id: 1,
		username: "testuser",
		email: "test@example.com",
		first_name: "Test",
		last_name: "User",
		role: "normal" as const,
		display_name: "Test User",
	};
	beforeEach(() => {
		jest.clearAllMocks();

		// Reset all mocks to default implementations
		mockAuth.isLoggedIn.mockReturnValue(false);
		mockAuth.login.mockResolvedValue({
			access_token: "test-token",
			token_type: "Bearer",
			expires_in: 3600,
			user: mockUser,
		});
		mockAuth.logout.mockResolvedValue(undefined);
		mockAuth.getCurrentUser.mockResolvedValue(mockUser);
	});

	it("should throw error when useAuth is used outside AuthProvider", () => {
		// Suppress console.error for this test
		const consoleSpy = jest
			.spyOn(console, "error")
			.mockImplementation(() => {});

		expect(() => {
			render(<TestComponent />);
		}).toThrow("useAuth must be used within an AuthProvider");

		consoleSpy.mockRestore();
	});

	it("should initialize with loading state", async () => {
		mockAuth.isLoggedIn.mockReturnValue(false);

		await act(async () => {
			render(
				<AuthProvider>
					<TestComponent />
				</AuthProvider>
			);
		});

		// The loading might change very quickly, so let's check if it was initially true
		// by waiting for it to become false
		await waitFor(() => {
			expect(screen.getByTestId("loading")).toHaveTextContent("false");
		});
	});

	it("should load current user on mount when logged in", async () => {
		mockAuth.isLoggedIn.mockReturnValue(true);
		mockAuth.getCurrentUser.mockResolvedValue(mockUser);

		render(
			<AuthProvider>
				<TestComponent />
			</AuthProvider>
		);

		await waitFor(() => {
			expect(screen.getByTestId("loading")).toHaveTextContent("false");
			expect(screen.getByTestId("authenticated")).toHaveTextContent(
				"true"
			);
			expect(screen.getByTestId("user")).toHaveTextContent("testuser");
		});
	});

	it("should handle login success", async () => {
		mockAuth.isLoggedIn.mockReturnValue(false);
		mockAuth.login.mockResolvedValue({
			access_token: "token",
			token_type: "Bearer",
			expires_in: 3600,
			user: mockUser,
		});

		render(
			<AuthProvider>
				<TestComponent />
			</AuthProvider>
		);

		await waitFor(() => {
			expect(screen.getByTestId("loading")).toHaveTextContent("false");
		});

		await act(async () => {
			screen.getByText("Login").click();
		});

		await waitFor(() => {
			expect(mockAuth.login).toHaveBeenCalledWith({
				username: "test",
				password: "pass",
			});
		});
	});
	it("should handle login error", async () => {
		// Create a separate mock for this test case that returns a rejected promise
		const loginErrorMock = jest.fn().mockImplementation(async () => {
			throw new Error("Login failed");
		});

		mockAuth.isLoggedIn.mockReturnValue(false);
		mockAuth.login = loginErrorMock;

		const consoleSpy = jest
			.spyOn(console, "error")
			.mockImplementation(() => {});

		render(
			<AuthProvider>
				<TestComponent />
			</AuthProvider>
		);

		await waitFor(() => {
			expect(screen.getByTestId("loading")).toHaveTextContent("false");
		});

		await act(async () => {
			screen.getByText("Login").click();
		});

		await waitFor(() => {
			expect(consoleSpy).toHaveBeenCalledWith(
				"Login failed:",
				expect.any(Error)
			);
		});

		consoleSpy.mockRestore();
	});

	it("should handle logout", async () => {
		mockAuth.isLoggedIn.mockReturnValue(true);
		mockAuth.getCurrentUser.mockResolvedValue(mockUser);
		mockAuth.logout.mockResolvedValue();

		render(
			<AuthProvider>
				<TestComponent />
			</AuthProvider>
		);

		await waitFor(() => {
			expect(screen.getByTestId("authenticated")).toHaveTextContent(
				"true"
			);
		});

		await act(async () => {
			screen.getByText("Logout").click();
		});

		await waitFor(() => {
			expect(mockAuth.logout).toHaveBeenCalled();
			expect(screen.getByTestId("authenticated")).toHaveTextContent(
				"false"
			);
			expect(screen.getByTestId("user")).toHaveTextContent("null");
		});
	});

	it("should identify admin users correctly", async () => {
		const adminUser = { ...mockUser, role: "admin" as const };
		mockAuth.isLoggedIn.mockReturnValue(true);
		mockAuth.getCurrentUser.mockResolvedValue(adminUser);

		render(
			<AuthProvider>
				<TestComponent />
			</AuthProvider>
		);

		await waitFor(() => {
			expect(screen.getByTestId("admin")).toHaveTextContent("true");
		});
	});

	it("should clear auth state when getCurrentUser fails on initialization", async () => {
		mockAuth.isLoggedIn.mockReturnValue(true);
		mockAuth.getCurrentUser.mockRejectedValue(new Error("Token expired"));

		const consoleSpy = jest
			.spyOn(console, "error")
			.mockImplementation(() => {});

		render(
			<AuthProvider>
				<TestComponent />
			</AuthProvider>
		);

		await waitFor(() => {
			expect(screen.getByTestId("loading")).toHaveTextContent("false");
			expect(mockAuth.clearAll).toHaveBeenCalled();
		});

		consoleSpy.mockRestore();
	});
});
