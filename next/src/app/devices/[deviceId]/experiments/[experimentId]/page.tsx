interface ExperimentDetailPageProps {
	params: {
		deviceId: string;
		experimentId: string;
	};
}

export default function ExperimentDetailPage({
	params,
}: ExperimentDetailPageProps) {
	const { deviceId, experimentId } = params;

	return (
		<div data-testid='experiment-detail-page'>
			<h1>Experiment Details</h1>
			<p>Device ID: {deviceId}</p>
			<p>Experiment ID: {experimentId}</p>
			<p>Experiment management functionality coming soon...</p>
		</div>
	);
}
