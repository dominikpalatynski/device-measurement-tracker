import { render, screen } from "@testing-library/react";
import ExperimentCreatePage from "../page";

describe("ExperimentCreatePage", () => {
	const mockProps = {
		params: {
			deviceId: "test-device-123",
		},
	};

	it("should render the experiment create page with title", () => {
		render(<ExperimentCreatePage {...mockProps} />);

		expect(
			screen.getByTestId("experiment-create-page")
		).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: /create experiment/i })
		).toBeInTheDocument();
		expect(
			screen.getByText(/experiment creation functionality coming soon/i)
		).toBeInTheDocument();
	});

	it("should display the device ID", () => {
		render(<ExperimentCreatePage {...mockProps} />);

		expect(
			screen.getByText(/device id: test-device-123/i)
		).toBeInTheDocument();
	});

	it("should have correct accessibility structure", () => {
		render(<ExperimentCreatePage {...mockProps} />);

		const heading = screen.getByRole("heading", { level: 1 });
		expect(heading).toHaveTextContent("Create Experiment");
	});
});
