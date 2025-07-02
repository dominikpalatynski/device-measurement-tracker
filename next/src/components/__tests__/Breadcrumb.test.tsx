import React from "react";
import { render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import Breadcrumb from "../Breadcrumb";

// Mock Next.js navigation hooks
jest.mock("next/navigation", () => ({
	usePathname: jest.fn(),
}));

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

// Mock Next.js Link component
jest.mock("next/link", () => {
	return ({ children, href, className }: any) => (
		<a
			href={href}
			className={className}
		>
			{children}
		</a>
	);
});

describe("Breadcrumb", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("should render custom breadcrumb items when provided", () => {
		mockUsePathname.mockReturnValue("/test");

		const customItems = [
			{ label: "Home", href: "/" },
			{ label: "Test Page", href: "/test", current: true },
		];

		render(<Breadcrumb items={customItems} />);

		expect(screen.getByRole("navigation")).toBeInTheDocument();
		expect(screen.getByText("Test Page")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /home/i })).toBeInTheDocument();
	});

	it("should generate breadcrumbs from pathname when no items provided", () => {
		mockUsePathname.mockReturnValue("/devices/register");

		render(<Breadcrumb />);

		expect(screen.getByRole("navigation")).toBeInTheDocument();
		expect(screen.getByText("Devices")).toBeInTheDocument();
		expect(screen.getByText("Register")).toBeInTheDocument();
	});

	it("should handle root path correctly", () => {
		mockUsePathname.mockReturnValue("/");

		render(<Breadcrumb />);

		expect(screen.getByRole("navigation")).toBeInTheDocument();
		// Should only show home link
		const homeLink = screen.getByRole("link", { name: /home/i });
		expect(homeLink).toBeInTheDocument();
		expect(homeLink).toHaveAttribute("href", "/");
	});

	it("should handle deep nested paths", () => {
		mockUsePathname.mockReturnValue("/devices/device-123/settings");

		render(<Breadcrumb />);

		expect(screen.getByText("Devices")).toBeInTheDocument();
		expect(screen.getByText("Device-123")).toBeInTheDocument();
		expect(screen.getByText("Settings")).toBeInTheDocument();
	});

	it("should handle fault IDs correctly", () => {
		mockUsePathname.mockReturnValue("/faults/flt_1234567890123");

		render(<Breadcrumb />);

		expect(screen.getByText("Faults")).toBeInTheDocument();
		expect(screen.getByText("Fault 12345678...")).toBeInTheDocument();
	});

	it("should truncate long IDs", () => {
		mockUsePathname.mockReturnValue("/devices/very-long-device-id-12345");

		render(<Breadcrumb />);

		expect(screen.getByText("Devices")).toBeInTheDocument();
		expect(screen.getByText("very-lon...")).toBeInTheDocument();
	});

	it("should capitalize single word segments", () => {
		mockUsePathname.mockReturnValue("/profile");

		render(<Breadcrumb />);

		expect(screen.getByText("Profile")).toBeInTheDocument();
	});

	it("should show current page without link", () => {
		mockUsePathname.mockReturnValue("/devices/register");

		render(<Breadcrumb />);

		const registerElement = screen.getByText("Register");
		expect(registerElement).toBeInTheDocument();
		expect(registerElement.tagName).toBe("SPAN");
		expect(registerElement).toHaveAttribute("aria-current", "page");
	});

	it("should render breadcrumb separators", () => {
		mockUsePathname.mockReturnValue("/devices/register");

		render(<Breadcrumb />);

		// Should have separator between Home and Devices, and between Devices and Register
		const separators = screen.getAllByText("›");
		expect(separators).toHaveLength(2);
	});

	it("should have proper ARIA labels", () => {
		mockUsePathname.mockReturnValue("/devices");

		render(<Breadcrumb />);

		const navigation = screen.getByRole("navigation");
		expect(navigation).toHaveAttribute("aria-label", "Breadcrumb");
	});

	it("should handle empty pathname segments", () => {
		mockUsePathname.mockReturnValue("/devices//register");

		render(<Breadcrumb />);

		// Should filter out empty segments
		expect(screen.getByText("Devices")).toBeInTheDocument();
		expect(screen.getByText("Register")).toBeInTheDocument();
		// Should not have extra separators
		const separators = screen.getAllByText("›");
		expect(separators).toHaveLength(2);
	});

	it("should generate correct href for each breadcrumb item", () => {
		mockUsePathname.mockReturnValue("/devices/register");

		render(<Breadcrumb />);

		const homeLink = screen.getByRole("link", { name: /home/i });
		expect(homeLink).toHaveAttribute("href", "/");

		const devicesLink = screen.getByRole("link", { name: "Devices" });
		expect(devicesLink).toHaveAttribute("href", "/devices");
	});
});
