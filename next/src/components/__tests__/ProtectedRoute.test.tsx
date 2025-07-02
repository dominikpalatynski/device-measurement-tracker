import React from "react";
import { render, screen } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "../ProtectedRoute";
import { useAuth } from "../../contexts/AuthContext";

// Mock the AuthContext
jest.mock("../../contexts/AuthContext");
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock Next.js router
jest.mock("next/navigation", () => ({
	useRouter: jest.fn(),
}));

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockPush = jest.fn();

describe("ProtectedRoute", () => {
	const mockUser = {
		id: 1,
		username: "testuser",
		email: "test@example.com",
		first_name: "Test",
		last_name: "User",
		role: "normal" as const,
		display_name: "Test User",
	};

	const mockAdminUser = {
		...mockUser,
		role: "admin" as const,
	};

	beforeEach(() => {
		jest.clearAllMocks();
		mockUseRouter.mockReturnValue({
			push: mockPush,
			replace: jest.fn(),
			prefetch: jest.fn(),
			back: jest.fn(),
			forward: jest.fn(),
			refresh: jest.fn(),
		});
	});

	describe("Loading state", () => {
		it("should render loading spinner when loading is true", () => {
			mockUseAuth.mockReturnValue({
				user: null,
				loading: true,
				login: jest.fn(),
				logout: jest.fn(),
				isAuthenticated: false,
				isAdmin: false,
				refreshUser: jest.fn(),
			});

			render(
				<ProtectedRoute>
					<div>Protected Content</div>
				</ProtectedRoute>
			);

			const loadingSpinner = screen.getByTestId("loading-spinner");
			expect(loadingSpinner).toHaveClass("animate-spin");
			expect(
				screen.queryByText("Protected Content")
			).not.toBeInTheDocument();
		});
	});

	describe("Unauthenticated user", () => {
		beforeEach(() => {
			mockUseAuth.mockReturnValue({
				user: null,
				loading: false,
				login: jest.fn(),
				logout: jest.fn(),
				isAuthenticated: false,
				isAdmin: false,
				refreshUser: jest.fn(),
			});
		});

		it("should redirect to default path when user is not authenticated", () => {
			render(
				<ProtectedRoute>
					<div>Protected Content</div>
				</ProtectedRoute>
			);

			expect(mockPush).toHaveBeenCalledWith("/");
			expect(
				screen.queryByText("Protected Content")
			).not.toBeInTheDocument();
		});

		it("should redirect to custom path when specified", () => {
			render(
				<ProtectedRoute redirectTo='/login'>
					<div>Protected Content</div>
				</ProtectedRoute>
			);

			expect(mockPush).toHaveBeenCalledWith("/login");
			expect(
				screen.queryByText("Protected Content")
			).not.toBeInTheDocument();
		});
	});

	describe("Authenticated normal user", () => {
		beforeEach(() => {
			mockUseAuth.mockReturnValue({
				user: mockUser,
				loading: false,
				login: jest.fn(),
				logout: jest.fn(),
				isAuthenticated: true,
				isAdmin: false,
				refreshUser: jest.fn(),
			});
		});

		it("should render children for authenticated user without restrictions", () => {
			render(
				<ProtectedRoute>
					<div>Protected Content</div>
				</ProtectedRoute>
			);

			expect(screen.getByText("Protected Content")).toBeInTheDocument();
			expect(mockPush).not.toHaveBeenCalled();
		});

		it("should redirect when admin is required but user is not admin", () => {
			render(
				<ProtectedRoute requireAdmin={true}>
					<div>Admin Content</div>
				</ProtectedRoute>
			);

			expect(mockPush).toHaveBeenCalledWith("/");
			expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
		});

		it("should redirect when user role is not in allowed roles", () => {
			render(
				<ProtectedRoute allowedRoles={["admin", "manager"]}>
					<div>Manager Content</div>
				</ProtectedRoute>
			);

			expect(mockPush).toHaveBeenCalledWith("/");
			expect(
				screen.queryByText("Manager Content")
			).not.toBeInTheDocument();
		});

		it("should render when user role is in allowed roles", () => {
			render(
				<ProtectedRoute allowedRoles={["normal", "admin"]}>
					<div>Multi-Role Content</div>
				</ProtectedRoute>
			);

			expect(screen.getByText("Multi-Role Content")).toBeInTheDocument();
			expect(mockPush).not.toHaveBeenCalled();
		});

		it("should redirect to custom path when access denied", () => {
			render(
				<ProtectedRoute
					requireAdmin={true}
					redirectTo='/unauthorized'
				>
					<div>Admin Content</div>
				</ProtectedRoute>
			);

			expect(mockPush).toHaveBeenCalledWith("/unauthorized");
			expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
		});
	});

	describe("Authenticated admin user", () => {
		beforeEach(() => {
			mockUseAuth.mockReturnValue({
				user: mockAdminUser,
				loading: false,
				login: jest.fn(),
				logout: jest.fn(),
				isAuthenticated: true,
				isAdmin: true,
				refreshUser: jest.fn(),
			});
		});

		it("should render children for admin when admin is required", () => {
			render(
				<ProtectedRoute requireAdmin={true}>
					<div>Admin Content</div>
				</ProtectedRoute>
			);

			expect(screen.getByText("Admin Content")).toBeInTheDocument();
			expect(mockPush).not.toHaveBeenCalled();
		});

		it("should render children for admin when role is in allowed roles", () => {
			render(
				<ProtectedRoute allowedRoles={["admin"]}>
					<div>Admin Only Content</div>
				</ProtectedRoute>
			);

			expect(screen.getByText("Admin Only Content")).toBeInTheDocument();
			expect(mockPush).not.toHaveBeenCalled();
		});

		it("should redirect admin when not in allowed roles", () => {
			render(
				<ProtectedRoute allowedRoles={["manager", "supervisor"]}>
					<div>Manager Content</div>
				</ProtectedRoute>
			);

			expect(mockPush).toHaveBeenCalledWith("/");
			expect(
				screen.queryByText("Manager Content")
			).not.toBeInTheDocument();
		});
	});

	describe("Complex scenarios", () => {
		beforeEach(() => {
			mockUseAuth.mockReturnValue({
				user: mockAdminUser,
				loading: false,
				login: jest.fn(),
				logout: jest.fn(),
				isAuthenticated: true,
				isAdmin: true,
				refreshUser: jest.fn(),
			});
		});

		it("should handle both requireAdmin and allowedRoles together", () => {
			render(
				<ProtectedRoute
					requireAdmin={true}
					allowedRoles={["admin", "superuser"]}
				>
					<div>Super Admin Content</div>
				</ProtectedRoute>
			);

			expect(screen.getByText("Super Admin Content")).toBeInTheDocument();
			expect(mockPush).not.toHaveBeenCalled();
		});

		it("should render nested components correctly", () => {
			render(
				<ProtectedRoute>
					<div>
						<h1>Protected Page</h1>
						<p>This is protected content</p>
						<button>Protected Action</button>
					</div>
				</ProtectedRoute>
			);

			expect(screen.getByText("Protected Page")).toBeInTheDocument();
			expect(
				screen.getByText("This is protected content")
			).toBeInTheDocument();
			expect(screen.getByText("Protected Action")).toBeInTheDocument();
		});
	});

	describe("Edge cases", () => {
		it("should handle empty allowedRoles array", () => {
			mockUseAuth.mockReturnValue({
				user: mockUser,
				loading: false,
				login: jest.fn(),
				logout: jest.fn(),
				isAuthenticated: true,
				isAdmin: false,
				refreshUser: jest.fn(),
			});

			render(
				<ProtectedRoute allowedRoles={[]}>
					<div>Content for Any Role</div>
				</ProtectedRoute>
			);

			expect(
				screen.getByText("Content for Any Role")
			).toBeInTheDocument();
			expect(mockPush).not.toHaveBeenCalled();
		});

		it("should handle user without role when allowedRoles is specified", () => {
			const userWithoutRole = { ...mockUser, role: undefined as any };
			mockUseAuth.mockReturnValue({
				user: userWithoutRole,
				loading: false,
				login: jest.fn(),
				logout: jest.fn(),
				isAuthenticated: true,
				isAdmin: false,
				refreshUser: jest.fn(),
			});

			render(
				<ProtectedRoute allowedRoles={["admin"]}>
					<div>Admin Content</div>
				</ProtectedRoute>
			);

			expect(mockPush).toHaveBeenCalledWith("/");
			expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
		});

		it("should not redirect multiple times when state changes", () => {
			// Set up initial state where user is admin
			mockUseAuth.mockReturnValue({
				user: { ...mockUser, role: "admin" as const },
				loading: false,
				login: jest.fn(),
				logout: jest.fn(),
				isAuthenticated: true,
				isAdmin: true,
				refreshUser: jest.fn(),
			});

			const { rerender } = render(
				<ProtectedRoute requireAdmin={true}>
					<div>Admin Content</div>
				</ProtectedRoute>
			);

			// No redirect should happen initially since user is admin
			expect(mockPush).toHaveBeenCalledTimes(0);

			// Change to non-admin user
			mockUseAuth.mockReturnValue({
				user: mockUser,
				loading: false,
				login: jest.fn(),
				logout: jest.fn(),
				isAuthenticated: true,
				isAdmin: false,
				refreshUser: jest.fn(),
			});

			rerender(
				<ProtectedRoute requireAdmin={true}>
					<div>Admin Content</div>
				</ProtectedRoute>
			);

			// Should only call push once when access is denied
			expect(mockPush).toHaveBeenCalledTimes(1);
		});
	});
});
