import React from "react";
import { render, screen } from "@testing-library/react";
import PageLayout from "../PageLayout";
import { useAuth } from "../../contexts/AuthContext";

// Mock the AuthContext
jest.mock("../../contexts/AuthContext");
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock the components
jest.mock("../Breadcrumb", () => {
	return ({ items }: { items?: any[] }) => (
		<nav
			data-testid='breadcrumb'
			data-items={JSON.stringify(items)}
		>
			Breadcrumb Component
		</nav>
	);
});

jest.mock("../AuthHeader", () => {
	return () => <div data-testid='auth-header'>Auth Header Component</div>;
});

// Mock Next.js navigation hooks for Breadcrumb component
jest.mock("next/navigation", () => ({
	usePathname: () => "/test",
}));

describe("PageLayout", () => {
	beforeEach(() => {
		jest.clearAllMocks();
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

	describe("Basic rendering", () => {
		it("should render children content", () => {
			render(
				<PageLayout>
					<div>Test Content</div>
				</PageLayout>
			);

			expect(screen.getByText("Test Content")).toBeInTheDocument();
		});

		it("should render breadcrumb and auth header components", () => {
			render(
				<PageLayout>
					<div>Content</div>
				</PageLayout>
			);

			expect(screen.getByTestId("breadcrumb")).toBeInTheDocument();
			expect(screen.getByTestId("auth-header")).toBeInTheDocument();
		});

		it("should have proper layout structure with correct CSS classes", () => {
			const { container } = render(
				<PageLayout>
					<div>Content</div>
				</PageLayout>
			);

			const mainWrapper = container.firstChild as HTMLElement;
			expect(mainWrapper).toHaveClass("min-h-screen", "bg-gray-50");

			const mainContent = screen.getByRole("main");
			expect(mainContent).toHaveClass(
				"max-w-7xl",
				"mx-auto",
				"px-4",
				"sm:px-6",
				"lg:px-8",
				"py-8"
			);
		});
	});

	describe("Title prop", () => {
		it("should render title when provided", () => {
			render(
				<PageLayout title='Test Page Title'>
					<div>Content</div>
				</PageLayout>
			);

			const title = screen.getByRole("heading", { level: 1 });
			expect(title).toBeInTheDocument();
			expect(title).toHaveTextContent("Test Page Title");
			expect(title).toHaveClass(
				"mt-2",
				"text-2xl",
				"font-bold",
				"text-gray-900"
			);
		});

		it("should not render title element when title is not provided", () => {
			render(
				<PageLayout>
					<div>Content</div>
				</PageLayout>
			);

			expect(
				screen.queryByRole("heading", { level: 1 })
			).not.toBeInTheDocument();
		});

		it("should render empty string title", () => {
			render(
				<PageLayout title=''>
					<div>Content</div>
				</PageLayout>
			);

			// Empty string is falsy, so title should not be rendered
			expect(
				screen.queryByRole("heading", { level: 1 })
			).not.toBeInTheDocument();
		});
	});

	describe("Breadcrumbs prop", () => {
		it("should pass breadcrumbs to Breadcrumb component when provided", () => {
			const breadcrumbs = [
				{ label: "Home", href: "/" },
				{ label: "Devices", href: "/devices" },
				{ label: "Device 123", href: "/devices/123", current: true },
			];

			render(
				<PageLayout breadcrumbs={breadcrumbs}>
					<div>Content</div>
				</PageLayout>
			);

			const breadcrumbComponent = screen.getByTestId("breadcrumb");
			expect(breadcrumbComponent).toHaveAttribute(
				"data-items",
				JSON.stringify(breadcrumbs)
			);
		});

		it("should pass undefined to Breadcrumb when no breadcrumbs provided", () => {
			render(
				<PageLayout>
					<div>Content</div>
				</PageLayout>
			);

			const breadcrumbComponent = screen.getByTestId("breadcrumb");
			expect(breadcrumbComponent).not.toHaveAttribute("data-items");
		});
	});

	describe("ClassName prop", () => {
		it("should apply custom className along with default classes", () => {
			const { container } = render(
				<PageLayout className='custom-class another-class'>
					<div>Content</div>
				</PageLayout>
			);

			const mainWrapper = container.firstChild as HTMLElement;
			expect(mainWrapper).toHaveClass(
				"min-h-screen",
				"bg-gray-50",
				"custom-class",
				"another-class"
			);
		});

		it("should apply default classes when no className provided", () => {
			const { container } = render(
				<PageLayout>
					<div>Content</div>
				</PageLayout>
			);

			const mainWrapper = container.firstChild as HTMLElement;
			expect(mainWrapper).toHaveClass("min-h-screen", "bg-gray-50");
			expect(mainWrapper.className).toBe("min-h-screen bg-gray-50 ");
		});

		it("should handle empty string className", () => {
			const { container } = render(
				<PageLayout className=''>
					<div>Content</div>
				</PageLayout>
			);

			const mainWrapper = container.firstChild as HTMLElement;
			expect(mainWrapper).toHaveClass("min-h-screen", "bg-gray-50");
		});
	});

	describe("Complex content", () => {
		it("should render complex nested content", () => {
			render(
				<PageLayout
					title='Dashboard'
					breadcrumbs={[{ label: "Home", href: "/" }]}
				>
					<div>
						<h2>Section Title</h2>
						<p>Some description text</p>
						<button>Action Button</button>
						<div>
							<span>Nested content</span>
						</div>
					</div>
				</PageLayout>
			);

			expect(screen.getByText("Section Title")).toBeInTheDocument();
			expect(
				screen.getByText("Some description text")
			).toBeInTheDocument();
			expect(screen.getByText("Action Button")).toBeInTheDocument();
			expect(screen.getByText("Nested content")).toBeInTheDocument();
			expect(screen.getByText("Dashboard")).toBeInTheDocument();
		});

		it("should handle multiple children elements", () => {
			render(
				<PageLayout>
					<div>First Child</div>
					<div>Second Child</div>
					<span>Third Child</span>
				</PageLayout>
			);

			expect(screen.getByText("First Child")).toBeInTheDocument();
			expect(screen.getByText("Second Child")).toBeInTheDocument();
			expect(screen.getByText("Third Child")).toBeInTheDocument();
		});

		it("should render with all props provided", () => {
			const breadcrumbs = [
				{ label: "Home", href: "/" },
				{ label: "Current", href: "/current", current: true },
			];

			render(
				<PageLayout
					title='Complete Page'
					breadcrumbs={breadcrumbs}
					className='test-layout'
				>
					<div>Complete content</div>
				</PageLayout>
			);

			expect(screen.getByText("Complete Page")).toBeInTheDocument();
			expect(screen.getByText("Complete content")).toBeInTheDocument();
			expect(screen.getByTestId("breadcrumb")).toHaveAttribute(
				"data-items",
				JSON.stringify(breadcrumbs)
			);

			const mainWrapper = screen
				.getByText("Complete content")
				.closest(".min-h-screen");
			expect(mainWrapper).toHaveClass("test-layout");
		});
	});

	describe("Layout structure", () => {
		it("should have correct header structure", () => {
			render(
				<PageLayout title='Test'>
					<div>Content</div>
				</PageLayout>
			);

			// Check header structure
			const headerDiv = screen
				.getByTestId("breadcrumb")
				.closest(".bg-white");
			expect(headerDiv).toHaveClass(
				"bg-white",
				"shadow-sm",
				"border-b",
				"border-gray-200"
			);
		});

		it("should position breadcrumb and title correctly relative to auth header", () => {
			render(
				<PageLayout title='Test Title'>
					<div>Content</div>
				</PageLayout>
			);

			const breadcrumb = screen.getByTestId("breadcrumb");
			const title = screen.getByText("Test Title");
			const authHeader = screen.getByTestId("auth-header");

			// All should be in the document
			expect(breadcrumb).toBeInTheDocument();
			expect(title).toBeInTheDocument();
			expect(authHeader).toBeInTheDocument();

			// Title should have margin-top class
			expect(title).toHaveClass("mt-2");
		});
	});

	describe("Edge cases", () => {
		it("should handle null children gracefully", () => {
			render(<PageLayout>{null}</PageLayout>);

			expect(screen.getByTestId("breadcrumb")).toBeInTheDocument();
			expect(screen.getByTestId("auth-header")).toBeInTheDocument();
		});

		it("should handle undefined children gracefully", () => {
			render(<PageLayout>{undefined}</PageLayout>);

			expect(screen.getByTestId("breadcrumb")).toBeInTheDocument();
			expect(screen.getByTestId("auth-header")).toBeInTheDocument();
		});

		it("should handle conditional children", () => {
			const showContent = true;

			render(
				<PageLayout>
					{showContent && <div>Conditional Content</div>}
				</PageLayout>
			);

			expect(screen.getByText("Conditional Content")).toBeInTheDocument();
		});
	});
});
