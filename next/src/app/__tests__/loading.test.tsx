import React from "react";
import { render, screen } from "@testing-library/react";
import Loading from "../loading";

describe("Loading Component", () => {
	it("should render loading spinner and text", () => {
		render(<Loading />);

		expect(screen.getByText("Loading...")).toBeInTheDocument();
		expect(
			screen.getByRole("status", { hidden: true })
		).toBeInTheDocument();
	});

	it("should have proper styling classes", () => {
		const { container } = render(<Loading />);

		const loadingContainer = container.querySelector(".loading-container");
		expect(loadingContainer).toBeInTheDocument();

		const loadingSpinner = container.querySelector(".loading-spinner");
		expect(loadingSpinner).toBeInTheDocument();
	});

	it("should be accessible", () => {
		render(<Loading />);

		// The loading text should be visible to screen readers
		expect(screen.getByText("Loading...")).toBeInTheDocument();
	});
});
