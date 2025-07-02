interface ExperimentCreatePageProps {
  params: {
    deviceId: string;
  };
}

export default function ExperimentCreatePage({ params }: ExperimentCreatePageProps) {
  const { deviceId } = params;
  
  return (
    <div data-testid="experiment-create-page">
      <h1>Create Experiment</h1>
      <p>Device ID: {deviceId}</p>
      <p>Experiment creation functionality coming soon...</p>
    </div>
  );
}