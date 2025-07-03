import { render, screen } from "@testing-library/react";
import FaultRegisterPage from "../page";

describe("FaultRegisterPage", () => {
	it("should render the fault register page with title", () => {
		render(<FaultRegisterPage />);

		expect(screen.getByTestId("fault-register-page")).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: /register fault/i })
		).toBeInTheDocument();
		expect(
			screen.getByText(/fault registration functionality coming soon/i)
		).toBeInTheDocument();
	});

	it("should have correct accessibility structure", () => {
		render(<FaultRegisterPage />);

		const heading = screen.getByRole("heading", { level: 1 });
		expect(heading).toHaveTextContent("Register Fault");
	});
});
