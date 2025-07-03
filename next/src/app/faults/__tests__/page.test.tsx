import { render, screen } from "@testing-library/react";
import FaultsPage from "../page";

describe("FaultsPage", () => {
	it("should render the faults page with title", () => {
		render(<FaultsPage />);

		expect(screen.getByTestId("faults-page")).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: /faults/i })
		).toBeInTheDocument();
		expect(
			screen.getByText(/fault management functionality coming soon/i)
		).toBeInTheDocument();
	});

	it("should have correct accessibility structure", () => {
		render(<FaultsPage />);

		const heading = screen.getByRole("heading", { level: 1 });
		expect(heading).toHaveTextContent("Faults");
	});
});
