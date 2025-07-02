import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorBoundary from "../error";

// Mock console.error to avoid noise in tests
const mockConsoleError = jest.fn();
beforeAll(() => {
	jest.spyOn(console, "error").mockImplementation(mockConsoleError);
});

afterAll(() => {
	jest.restoreAllMocks();
});

describe("ErrorBoundary Component", () => {
	const mockReset = jest.fn();
	const mockError = new Error("Test error message");

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("should render error message and reset button", () => {
		render(
			<ErrorBoundary
				error={mockError}
				reset={mockReset}
			/>
		);

		expect(screen.getByText("Something went wrong!")).toBeInTheDocument();
		expect(screen.getByText("Test error message")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Try again" })
		).toBeInTheDocument();
	});

	it("should display default message when error has no message", () => {
		const errorWithoutMessage = {} as Error;
		render(
			<ErrorBoundary
				error={errorWithoutMessage}
				reset={mockReset}
			/>
		);

		expect(
			screen.getByText("An unexpected error occurred")
		).toBeInTheDocument();
	});

	it("should call reset function when Try again button is clicked", async () => {
		const user = userEvent.setup();
		render(
			<ErrorBoundary
				error={mockError}
				reset={mockReset}
			/>
		);

		const tryAgainButton = screen.getByRole("button", {
			name: "Try again",
		});
		await user.click(tryAgainButton);

		expect(mockReset).toHaveBeenCalledTimes(1);
	});

	it("should log error to console on mount", () => {
		render(
			<ErrorBoundary
				error={mockError}
				reset={mockReset}
			/>
		);

		expect(mockConsoleError).toHaveBeenCalledWith(
			"Application error:",
			mockError
		);
	});

	it("should have proper styling classes", () => {
		const { container } = render(
			<ErrorBoundary
				error={mockError}
				reset={mockReset}
			/>
		);

		const errorContainer = container.querySelector(".error-container");
		expect(errorContainer).toBeInTheDocument();
	});

	it("should handle error with digest property", () => {
		const errorWithDigest = { ...mockError, digest: "abc123" };
		render(
			<ErrorBoundary
				error={errorWithDigest}
				reset={mockReset}
			/>
		);

		expect(screen.getByText("Something went wrong!")).toBeInTheDocument();
		expect(
			screen.getByText("An unexpected error occurred")
		).toBeInTheDocument();
		expect(mockConsoleError).toHaveBeenCalledWith(
			"Application error:",
			errorWithDigest
		);
	});

	it("should be accessible", () => {
		render(
			<ErrorBoundary
				error={mockError}
				reset={mockReset}
			/>
		);

		const button = screen.getByRole("button", { name: "Try again" });
		expect(button).toBeInTheDocument();
		expect(button).not.toBeDisabled();

		// Heading should be properly marked
		const heading = screen.getByRole("heading", {
			name: "Something went wrong!",
		});
		expect(heading).toBeInTheDocument();
	});
});
