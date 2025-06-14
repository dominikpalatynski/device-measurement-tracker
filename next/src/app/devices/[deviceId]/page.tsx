"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PageLayout from "@/components/PageLayout";
import OnlineModeControl from "@/components/OnlineModeControl";
import {
	deviceApi,
	experimentApi,
	onlineModeApi,
	Device,
	Experiment,
	LiveExperiment,
	getAllMeasurements,
	getLatestMeasurement,
	getMeasurementStats,
	Measurement,
	MeasurementStats,
} from "@/services/api";

export default function DeviceDetailPage() {
	const params = useParams();
	const router = useRouter();
	const deviceId = params.deviceId as string;

	const [device, setDevice] = useState<Device | null>(null);
	const [measurements, setMeasurements] = useState<Measurement[]>([]);
	const [latestMeasurement, setLatestMeasurement] =
		useState<Measurement | null>(null);
	const [stats, setStats] = useState<MeasurementStats | null>(null);
	const [activeExperiments, setActiveExperiments] = useState<Experiment[]>(
		[]
	);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);	const [activeTab, setActiveTab] = useState<
		"overview" | "live-experiments" | "data-explorer" | "online"
	>("overview");

	// Online experiment creation state
	const [showLiveExperimentModal, setShowLiveExperimentModal] =
		useState(false);
	const [liveExperimentForm, setLiveExperimentForm] = useState({
		name: "",
		description: "",
	});
	const [experimentLoading, setExperimentLoading] = useState(false);
	const [experimentError, setExperimentError] = useState<string | null>(null);

	useEffect(() => {
		if (deviceId) {
			loadDeviceData();
		}
	}, [deviceId]);
	const loadDeviceData = async () => {
		try {
			setLoading(true);
			setError(null);

			// Load device information
			const deviceData = await deviceApi.getDevice(deviceId);
			if (!deviceData) {
				setError("Device not found");
				return;
			}
			setDevice(deviceData);

			// Load active experiments for this device
			const experimentsData = await experimentApi.getExperiments();
			const deviceExperiments = experimentsData.filter(
				(exp) =>
					exp.device_id === deviceData.device_id &&
					(exp.status === "Running" || exp.status === "Created")
			);
			setActiveExperiments(deviceExperiments);

			// Load measurement data using device ID
			const [latestRes, measurementsRes, statsRes] =
				await Promise.allSettled([
					getLatestMeasurement(deviceData.device_id),
					getAllMeasurements(deviceData.device_id, 20),
					getMeasurementStats(deviceData.device_id),
				]);

			if (latestRes.status === "fulfilled" && latestRes.value.success) {
				setLatestMeasurement(latestRes.value.data);
			}

			if (
				measurementsRes.status === "fulfilled" &&
				measurementsRes.value.success
			) {
				setMeasurements(measurementsRes.value.data);
			}

			if (statsRes.status === "fulfilled" && statsRes.value.success) {
				setStats(statsRes.value.data);
			}
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to load device data"
			);
		} finally {
			setLoading(false);
		}
	};
	const handleActivateDevice = async () => {
		if (!device) return;

		try {
			const success = await deviceApi.activateDevice(device.device_id);
			if (success) {
				setDevice({ ...device, status: "Active" });
			} else {
				setError("Failed to activate device");
			}
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to activate device"
			);
		}
	};

	const handleDeactivateDevice = async () => {
		if (!device) return;
		if (!confirm("Are you sure you want to deactivate this device?"))
			return;

		try {
			const success = await deviceApi.deactivateDevice(device.device_id);
			if (success) {
				setDevice({ ...device, status: "Not-Active" });
			} else {
				setError("Failed to deactivate device");
			}
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to deactivate device"
			);
		}
	};

	const handleDeleteDevice = async () => {
		if (!device) return;
		if (
			!confirm(
				"Are you sure you want to delete this device? This action cannot be undone."
			)
		)
			return;

		try {
			const success = await deviceApi.deleteDevice(device.device_id);
			if (success) {
				router.push("/devices");
			} else {
				setError("Failed to delete device");
			}
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to delete device"
			);
		}
	};
	const getStatusColor = (status: Device["status"]) => {
		switch (status) {
			case "Active":
				return "bg-green-100 text-green-800";
			case "Not-Active":
				return "bg-yellow-100 text-yellow-800";
			case "Pending-Registration":
				return "bg-gray-100 text-gray-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};
	const getStatusText = (status: Device["status"]) => {
		switch (status) {
			case "Active":
				return "Active";
			case "Not-Active":
				return "Not Active";
			case "Pending-Registration":
				return "Pending Registration";
			default:
				return status;
		}
	};

	const getDeviceIcon = (type: string) => {
		switch (type) {
			case "Drone":
				return "🚁";
			case "DSP":
				return "📡";
			case "Linear Module":
				return "📏";
			case "Scanner":
				return "🔍";
			default:
				return "📱";
		}
	};

	// Online mode - Start Live Experiment (Business Logic Path A)
	const handleStartLiveExperiment = () => {
		setLiveExperimentForm({
			name: `${
				device?.device_name || "Device"
			} - Live Experiment ${new Date().toLocaleDateString()}`,
			description: "",
		});
		setExperimentError(null);
		setShowLiveExperimentModal(true);
	};

	// Live Experiment Handlers
	const handleLiveExperimentInputChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
	) => {
		const { name, value } = e.target;
		setLiveExperimentForm(prev => ({
			...prev,
			[name]: value
		}));
	};

	const handleCreateLiveExperiment = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!device || !liveExperimentForm.name.trim()) return;

		try {
			setExperimentLoading(true);
			setExperimentError(null);
		// Create and start the live experiment
		const experiment = await onlineModeApi.startLiveExperiment(
			deviceId, 
			liveExperimentForm.name.trim()
		);

			// Close modal and reset form
			setShowLiveExperimentModal(false);
			setLiveExperimentForm({ name: "", description: "" });

			// Navigate to the experiment detail page
			router.push(`/devices/${deviceId}/experiments/${experiment.experiment_id}`);
		} catch (error) {
			setExperimentError(
				error instanceof Error 
					? error.message 
					: "Failed to start live experiment"
			);
		} finally {
			setExperimentLoading(false);
		}
	};

	const handleCancelLiveExperiment = () => {
		setShowLiveExperimentModal(false);
		setLiveExperimentForm({ name: "", description: "" });
		setExperimentError(null);
	};

	if (loading) {
		return (
			<div className='flex items-center justify-center min-h-screen'>
				<div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600'></div>
			</div>
		);
	}

	if (error || !device) {
		return (
			<div className='container mx-auto px-4 py-8'>
				<div className='bg-red-50 border border-red-200 rounded-lg p-6'>
					<h2 className='text-lg font-medium text-red-800 mb-2'>
						Error
					</h2>
					<p className='text-red-700'>
						{error || "Device not found"}
					</p>
					<Link
						href='/devices'
						className='mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700'
					>
						← Back to Devices
					</Link>
				</div>
			</div>
		);
	}
	return (
		<PageLayout
			title={device ? `${device.device_name}` : "Device Details"}
			breadcrumbs={[
				{ label: "Home", href: "/" },
				{ label: "Devices", href: "/devices" },
				{
					label: device ? device.device_name : "Device",
					href: `/devices/${deviceId}`,
				},
			]}
		>
			<div className='container mx-auto px-4 py-8'>
				{/* Header */}
				<div className='flex items-center justify-between mb-8'>
					{" "}
					<div className='flex items-center'>
						<Link
							href='/devices'
							className='text-blue-600 hover:text-blue-500 mr-4'
						>
							← Back to Devices
						</Link>
						<div>
							<div className='flex items-center'>
								<span className='text-3xl mr-3'>
									{getDeviceIcon(device.device_type)}
								</span>
								<div>
									<h1 className='text-3xl font-bold text-gray-900'>
										{device.device_name}
									</h1>{" "}
									<p className='text-gray-600'>
										ID: {device.device_id}
									</p>
								</div>
							</div>
						</div>
					</div>{" "}
					<div className='flex space-x-2'>
						{/* Activate/Deactivate Controls */}
						{device.status === "Pending-Registration" && (
							<button
								onClick={handleActivateDevice}
								className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700'
							>
								Activate
							</button>
						)}
						{device.status === "Active" && (
							<button
								onClick={handleDeactivateDevice}
								className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700'
							>
								Deactivate
							</button>
						)}

						{/* Experiment Controls - Only for Active devices */}
						{device.status === "Active" && (
							<>
								{/* Check if device has active Online experiment */}
								{activeExperiments.find(
									(exp) =>
										exp.mode === "Online" &&
										exp.status === "Running"
								) ? (
									<Link
										href={`/experiments/${
											activeExperiments.find(
												(exp) =>
													exp.mode === "Online" &&
													exp.status === "Running"
											)?.experiment_id
										}`}
										className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700'
									>
										View Active Experiment
									</Link>
								) : (
									<button
										onClick={handleStartLiveExperiment}
										className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700'
									>
										Start Live Experiment
									</button>
								)}

								{/* Always show option to create Offline experiment */}
								<Link
									href='/experiments/register'
									className='inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50'
								>
									Create Offline Experiment
								</Link>
							</>
						)}

						{/* Delete button */}
						<button
							onClick={handleDeleteDevice}
							className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700'
						>
							Delete
						</button>
					</div>
				</div>
				{/* Status and basic info */}{" "}
				<div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
					<div className='bg-white p-6 rounded-lg border border-gray-200'>
						<h3 className='text-lg font-medium text-gray-900 mb-2'>
							Status
						</h3>
						<span
							className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
								device.status
							)}`}
						>
							{getStatusText(device.status)}
						</span>
					</div>{" "}
					<div className='bg-white p-6 rounded-lg border border-gray-200'>
						<h3 className='text-lg font-medium text-gray-900 mb-2'>
							Type
						</h3>
						<p className='text-gray-600'>{device.device_type}</p>
					</div>
					<div className='bg-white p-6 rounded-lg border border-gray-200'>
						<h3 className='text-lg font-medium text-gray-900 mb-2'>
							Last Updated
						</h3>
						<p className='text-gray-600'>
							{device.last_updated
								? new Date(device.last_updated).toLocaleString()
								: "N/A"}
						</p>
					</div>
				</div>{" "}
				{/* Tabs */}{" "}				<div className='border-b border-gray-200 mb-6'>
					<nav className='-mb-px flex space-x-8'>
						{[
							"overview",
							"online",
							"live-experiments",
							"data-explorer",
						].map((tab) => (
							<button
								key={tab}
								onClick={() =>
									setActiveTab(tab as typeof activeTab)
								}
								className={`py-2 px-1 border-b-2 font-medium text-sm ${
									activeTab === tab
										? "border-blue-500 text-blue-600"
										: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
								}`}
							>
								{tab === "online"
									? "🔴 Live Mode"
									: tab === "live-experiments"
									? "🧪 Live Experiments"
									: tab === "data-explorer"
									? "📊 Data Explorer"
									: tab.charAt(0).toUpperCase() +
									  tab.slice(1)}
							</button>
						))}
					</nav>
				</div>
				{/* Tab content */}
				{activeTab === "overview" && (
					<div className='space-y-6'>
						{latestMeasurement ? (
							<div className='bg-white p-6 rounded-lg border border-gray-200'>
								<h3 className='text-lg font-medium text-gray-900 mb-4'>
									Latest Measurement
								</h3>
								<div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
									<div className='text-center'>
										<div className='text-2xl mb-1'>🌡️</div>
										<div className='text-2xl font-bold text-blue-600'>
											{latestMeasurement.temperature}°C
										</div>
										<div className='text-sm text-gray-500'>
											Temperature
										</div>
									</div>
									<div className='text-center'>
										<div className='text-2xl mb-1'>💧</div>
										<div className='text-2xl font-bold text-blue-600'>
											{latestMeasurement.humidity}%
										</div>
										<div className='text-sm text-gray-500'>
											Humidity
										</div>
									</div>
									<div className='text-center'>
										<div className='text-2xl mb-1'>🔄</div>
										<div className='text-2xl font-bold text-blue-600'>
											{latestMeasurement.pressure} hPa
										</div>
										<div className='text-sm text-gray-500'>
											Pressure
										</div>
									</div>
									<div className='text-center'>
										<div className='text-2xl mb-1'>🔋</div>
										<div className='text-2xl font-bold text-blue-600'>
											{latestMeasurement.battery_level}%
										</div>
										<div className='text-sm text-gray-500'>
											Battery
										</div>
									</div>
								</div>
								<p className='text-sm text-gray-500 mt-4'>
									Measured at: {latestMeasurement.measured_at}
								</p>
							</div>
						) : (
							<div className='bg-yellow-50 border border-yellow-200 rounded-lg p-6'>
								<h3 className='text-lg font-medium text-yellow-800 mb-2'>
									No Measurements
								</h3>
								<p className='text-yellow-700'>
									This device hasn't reported any measurements
									yet.
								</p>
							</div>
						)}

						<div className='bg-white p-6 rounded-lg border border-gray-200'>
							<h3 className='text-lg font-medium text-gray-900 mb-4'>
								Device Information
							</h3>{" "}
							<dl className='grid grid-cols-1 md:grid-cols-2 gap-4'>
								<div>
									<dt className='text-sm font-medium text-gray-500'>
										Device ID
									</dt>
									<dd className='text-sm text-gray-900 font-mono'>
										{device.device_id}
									</dd>
								</div>
								<div>
									<dt className='text-sm font-medium text-gray-500'>
										Registration Date
									</dt>
									<dd className='text-sm text-gray-900'>
										{new Date(
											device.registration_date
										).toLocaleString()}
									</dd>
								</div>
								<div>
									<dt className='text-sm font-medium text-gray-500'>
										Experiments
									</dt>
									<dd className='text-sm text-gray-900'>
										{device.experiments_count || 0} total
										{device.active_experiments_count
											? ` (${device.active_experiments_count} active)`
											: ""}
									</dd>
								</div>
							</dl>
						</div>
					</div>
				)}				{activeTab === "live-experiments" && (
					<div className='space-y-6'>
						{/* Live Experiment Management */}
						<div className='bg-white p-6 rounded-lg border border-gray-200'>
							<h3 className='text-lg font-medium text-gray-900 mb-4'>
								🧪 Live Experiment Management
							</h3>
							
							{device.status !== "Active" ? (
								<div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4'>
									<div className='flex items-center'>
										<div className='text-yellow-400 mr-3'>⚠️</div>
										<div>
											<h4 className='font-medium text-yellow-800'>Device Not Active</h4>
											<p className='text-sm text-yellow-700 mt-1'>
												The device must be active to start live experiments.
											</p>
										</div>
									</div>
								</div>
							) : (
								<>
									{/* Current Live Experiment Status */}
									{activeExperiments.filter(exp => exp.status === "Running").length > 0 ? (
										<div className='bg-green-50 border border-green-200 rounded-lg p-4 mb-4'>
											<div className='flex justify-between items-center'>
												<div>
													<h4 className='font-medium text-green-800'>
														🟢 Live Experiment Active
													</h4>
													{activeExperiments.filter(exp => exp.status === "Running").map(exp => (
														<div key={exp.experiment_id} className='text-sm text-green-700 mt-1'>
															<div>Name: {exp.name || exp.experiment_id}</div>
															<div>Started: {new Date(exp.start_date).toLocaleString()}</div>
														</div>
													))}
												</div>
												<div className='space-x-2'>
													{activeExperiments.filter(exp => exp.status === "Running").map(exp => (
														<Link
															key={exp.experiment_id}
															href={`/devices/${deviceId}/experiments/${exp.experiment_id}`}
															className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700'
														>
															Manage Experiment
														</Link>
													))}
												</div>
											</div>
										</div>
									) : (
										<div className='bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4'>
											<h4 className='font-medium text-blue-800 mb-2'>
												No Active Live Experiments
											</h4>
											<p className='text-sm text-blue-700'>
												Start a new live experiment to begin collecting real-time data.
											</p>
										</div>
									)}

									{/* Start New Live Experiment */}
									<div className='border-t pt-4'>
										<button
											onClick={() => setShowLiveExperimentModal(true)}
											className='px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium'
										>
											🚀 Start New Live Experiment
										</button>
									</div>
								</>
							)}
						</div>

						{/* Recent Live Experiments History */}
						<div className='bg-white p-6 rounded-lg border border-gray-200'>
							<h3 className='text-lg font-medium text-gray-900 mb-4'>
								📋 Recent Live Experiments
							</h3>
							{activeExperiments.length > 0 ? (
								<div className='overflow-x-auto'>
									<table className='min-w-full divide-y divide-gray-200'>
										<thead className='bg-gray-50'>
											<tr>
												<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
													Experiment
												</th>
												<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
													Status
												</th>
												<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
													Started
												</th>
												<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
													Actions
												</th>
											</tr>
										</thead>
										<tbody className='bg-white divide-y divide-gray-200'>
											{activeExperiments.map((experiment) => (
												<tr key={experiment.experiment_id}>
													<td className='px-6 py-4 whitespace-nowrap'>
														<div className='text-sm font-medium text-gray-900'>
															{experiment.name || experiment.experiment_id}
														</div>
														<div className='text-sm text-gray-500'>
															{experiment.description || "No description"}
														</div>
													</td>
													<td className='px-6 py-4 whitespace-nowrap'>
														<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
															experiment.status === "Running" 
																? "bg-green-100 text-green-800"
																: experiment.status === "Created"
																? "bg-yellow-100 text-yellow-800" 
																: "bg-gray-100 text-gray-800"
														}`}>
															{experiment.status}
														</span>
													</td>
													<td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
														{new Date(experiment.start_date).toLocaleDateString()}
													</td>
													<td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
														<Link
															href={`/devices/${deviceId}/experiments/${experiment.experiment_id}`}
															className='text-blue-600 hover:text-blue-900'
														>
															View Details
														</Link>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							) : (
								<div className='text-center py-6 text-gray-500'>
									<div className='text-4xl mb-2'>🧪</div>
									<p>No experiments found for this device.</p>
									<p className='text-sm'>Start your first live experiment above.</p>
								</div>
							)}
						</div>
					</div>
				)}				{activeTab === "data-explorer" && (
					<div className='bg-white p-6 rounded-lg border border-gray-200'>
						<h3 className='text-lg font-medium text-gray-900 mb-4'>
							Measurement Statistics
						</h3>
						{stats ? (
							<div className='space-y-6'>
								<div className='text-center'>
									<div className='text-3xl font-bold text-blue-600'>
										{stats.total_measurements}
									</div>
									<div className='text-sm text-gray-500'>
										Total Measurements
									</div>
								</div>

								<div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
									<div className='text-center'>
										<h4 className='text-lg font-medium text-gray-900 mb-3'>
											🌡️ Temperature
										</h4>
										<div className='space-y-2'>
											<div>
												<div className='text-xl font-semibold text-gray-900'>
													{stats.avg_temperature.toFixed(
														1
													)}
													°C
												</div>
												<div className='text-sm text-gray-500'>
													Average
												</div>
											</div>
											<div className='flex justify-between'>
												<div>
													<div className='text-sm font-medium'>
														{stats.min_temperature}
														°C
													</div>
													<div className='text-xs text-gray-500'>
														Min
													</div>
												</div>
												<div>
													<div className='text-sm font-medium'>
														{stats.max_temperature}
														°C
													</div>
													<div className='text-xs text-gray-500'>
														Max
													</div>
												</div>
											</div>
										</div>
									</div>

									<div className='text-center'>
										<h4 className='text-lg font-medium text-gray-900 mb-3'>
											💧 Humidity
										</h4>
										<div className='space-y-2'>
											<div>
												<div className='text-xl font-semibold text-gray-900'>
													{stats.avg_humidity.toFixed(
														1
													)}
													%
												</div>
												<div className='text-sm text-gray-500'>
													Average
												</div>
											</div>
											<div className='flex justify-between'>
												<div>
													<div className='text-sm font-medium'>
														{stats.min_humidity}%
													</div>
													<div className='text-xs text-gray-500'>
														Min
													</div>
												</div>
												<div>
													<div className='text-sm font-medium'>
														{stats.max_humidity}%
													</div>
													<div className='text-xs text-gray-500'>
														Max
													</div>
												</div>
											</div>
										</div>
									</div>

									<div className='text-center'>
										<h4 className='text-lg font-medium text-gray-900 mb-3'>
											🔄 Pressure
										</h4>
										<div className='space-y-2'>
											<div>
												<div className='text-xl font-semibold text-gray-900'>
													{stats.avg_pressure.toFixed(
														1
													)}{" "}
													hPa
												</div>
												<div className='text-sm text-gray-500'>
													Average
												</div>
											</div>
											<div className='flex justify-between'>
												<div>
													<div className='text-sm font-medium'>
														{stats.min_pressure} hPa
													</div>
													<div className='text-xs text-gray-500'>
														Min
													</div>
												</div>
												<div>
													<div className='text-sm font-medium'>
														{stats.max_pressure} hPa
													</div>
													<div className='text-xs text-gray-500'>
														Max
													</div>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						) : (
							<div className='text-center py-8'>
								<p className='text-gray-500'>
									No measurement statistics available for this
									device.
								</p>
							</div>
						)}
					</div>
				)}
				{/* Remove old experiments tab - replaced with live-experiments and data-explorer */}
					<div className='space-y-6'>
						{/* Active Experiments */}
						{activeExperiments.length > 0 && (
							<div className='bg-white rounded-lg border border-gray-200 overflow-hidden'>
								<div className='px-6 py-4 border-b border-gray-200'>
									<h3 className='text-lg font-medium text-gray-900'>
										Active Experiments
									</h3>
									<p className='text-sm text-gray-500'>
										Currently running experiments for this
										device
									</p>
								</div>
								<div className='overflow-x-auto'>
									<table className='min-w-full divide-y divide-gray-200'>
										<thead className='bg-gray-50'>
											<tr>
												<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
													Name
												</th>
												<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
													Mode
												</th>
												<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
													Status
												</th>
												<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
													Start Date
												</th>
												<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
													Actions
												</th>
											</tr>
										</thead>
										<tbody className='bg-white divide-y divide-gray-200'>
											{activeExperiments.map(
												(experiment) => (
													<tr
														key={
															experiment.experiment_id
														}
														className='hover:bg-gray-50'
													>
														<td className='px-6 py-4 whitespace-nowrap'>
															<div className='text-sm font-medium text-gray-900'>
																{
																	experiment.name
																}
															</div>
															{experiment.description && (
																<div className='text-sm text-gray-500'>
																	{
																		experiment.description
																	}
																</div>
															)}
														</td>
														<td className='px-6 py-4 whitespace-nowrap'>
															<span
																className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
																	experiment.mode ===
																	"Online"
																		? "bg-blue-100 text-blue-800"
																		: "bg-purple-100 text-purple-800"
																}`}
															>
																{
																	experiment.mode
																}
															</span>
														</td>
														<td className='px-6 py-4 whitespace-nowrap'>
															<span
																className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
																	experiment.status ===
																	"Running"
																		? "bg-green-100 text-green-800"
																		: experiment.status ===
																		  "Created"
																		? "bg-yellow-100 text-yellow-800"
																		: "bg-gray-100 text-gray-800"
																}`}
															>
																{
																	experiment.status
																}
															</span>
														</td>
														<td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
															{new Date(
																experiment.start_date
															).toLocaleDateString()}
														</td>
														<td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
															<Link
																href={`/experiments/${experiment.experiment_id}`}
																className='text-blue-600 hover:text-blue-900'
															>
																View Details
															</Link>
														</td>
													</tr>
												)
											)}
										</tbody>
									</table>
								</div>
							</div>
						)}

						{/* Experiment Creation Actions */}
						<div className='bg-white p-6 rounded-lg border border-gray-200'>
							<h3 className='text-lg font-medium text-gray-900 mb-4'>
								Create New Experiment
							</h3>
							<div className='space-y-4'>
								{device.status === "Active" ? (
									<>
										<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
											{/* Online Experiment */}
											<div className='border border-gray-200 rounded-lg p-4'>
												<div className='flex items-center mb-3'>
													<div className='w-2 h-2 bg-blue-500 rounded-full mr-2'></div>
													<h4 className='text-lg font-medium text-gray-900'>
														Online Mode
													</h4>
												</div>
												<p className='text-sm text-gray-600 mb-4'>
													Real-time experiment with
													immediate data collection.
													Device-centric workflow.
												</p>
												{activeExperiments.find(
													(exp) =>
														exp.mode === "Online" &&
														exp.status === "Running"
												) ? (
													<p className='text-sm text-yellow-600 font-medium mb-2'>
														⚠️ Device already has an
														active Online experiment
													</p>
												) : (
													<button
														onClick={
															handleStartLiveExperiment
														}
														className='w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700'
													>
														Start Live Experiment
													</button>
												)}
											</div>

											{/* Offline Experiment */}
											<div className='border border-gray-200 rounded-lg p-4'>
												<div className='flex items-center mb-3'>
													<div className='w-2 h-2 bg-purple-500 rounded-full mr-2'></div>
													<h4 className='text-lg font-medium text-gray-900'>
														Offline Mode
													</h4>
												</div>
												<p className='text-sm text-gray-600 mb-4'>
													Management panel experiment
													with manual data collection
													via scripts.
												</p>
												<Link
													href='/experiments/register'
													className='w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50'
												>
													Create Offline Experiment
												</Link>
											</div>
										</div>
									</>
								) : (
									<div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4'>
										<div className='flex'>
											<div className='text-yellow-400 mr-3'>
												⚠️
											</div>
											<div>
												<h4 className='text-lg font-medium text-yellow-800'>
													Device Not Active
												</h4>
												<p className='text-sm text-yellow-700 mt-1'>
													This device must be
													activated before you can
													create experiments.
												</p>
												{device.status ===
													"Pending-Registration" && (
													<button
														onClick={
															handleActivateDevice
														}
														className='mt-3 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700'
													>
														Activate Device
													</button>
												)}
											</div>
										</div>
									</div>
								)}
							</div>
						</div>						{activeExperiments.length === 0 && (
							<div className='bg-gray-50 border border-gray-200 rounded-lg p-6 text-center'>
								<h3 className='text-lg font-medium text-gray-900 mb-2'>
									No Active Experiments
								</h3>
								<p className='text-gray-600'>
									This device doesn't have any active
									experiments. Create one to start collecting
									data.
								</p>
							</div>
						)}
					</div>
				)}
				{activeTab === "online" && (
					<div className='space-y-6'>
						{device.status === "Active" ? (
							<OnlineModeControl
								deviceId={device.device_id}
								deviceName={device.device_name}
							/>
						) : (
							<div className='bg-yellow-50 border border-yellow-200 rounded-lg p-6'>
								<div className='flex items-center'>
									<div className='text-yellow-400 mr-3 text-2xl'>
										⚠️
									</div>
									<div>
										<h3 className='text-lg font-medium text-yellow-800 mb-2'>
											Device Not Active
										</h3>
										<p className='text-yellow-700'>
											The device must be active to use
											Online Mode. Please activate the
											device first.
										</p>
										{device.status ===
											"Pending-Registration" && (
											<button
												onClick={handleActivateDevice}
												className='mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700'
											>
												Activate Device
											</button>
										)}
									</div>
								</div>
							</div>
						)}
					</div>
				)}
				{/* Live Experiment Modal */}
				{showLiveExperimentModal && (
					<div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
						<div className='bg-white rounded-lg max-w-lg w-full p-6'>
							<div className='flex justify-between items-center mb-4'>
								<h3 className='text-xl font-bold text-gray-900'>
									Start Live Experiment
								</h3>
								<button
									onClick={handleCancelLiveExperiment}
									className='text-gray-500 hover:text-gray-700'
								>
									✕
								</button>
							</div>
							{experimentError && (
								<div className='mb-4 bg-red-50 border border-red-200 rounded-lg p-3'>
									<div className='text-sm text-red-800'>
										{experimentError}
									</div>
								</div>
							)}
							<form
								onSubmit={handleCreateLiveExperiment}
								className='space-y-4'
							>
								<div>
									<label
										htmlFor='name'
										className='block text-sm font-medium text-gray-700 mb-1'
									>
										Experiment Name *
									</label>
									<input
										type='text'
										id='name'
										name='name'
										value={liveExperimentForm.name}
										onChange={
											handleLiveExperimentInputChange
										}
										className='w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500'
										required
										disabled={experimentLoading}
									/>
								</div>

								<div>
									<label
										htmlFor='description'
										className='block text-sm font-medium text-gray-700 mb-1'
									>
										Description (Optional)
									</label>
									<textarea
										id='description'
										name='description'
										value={liveExperimentForm.description}
										onChange={
											handleLiveExperimentInputChange
										}
										rows={3}
										className='w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500'
										disabled={experimentLoading}
									/>
									<p className='mt-1 text-sm text-gray-500'>
										Briefly describe the purpose of this
										experiment
									</p>
								</div>

								<div className='bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4'>
									<h4 className='text-sm font-medium text-blue-800 mb-2'>
										Experiment Information
									</h4>
									<ul className='text-sm text-blue-700 space-y-1 list-disc list-inside'>
										<li>
											Device: {device?.device_name} (
											{device?.device_id})
										</li>
										<li>
											Starting now:{" "}
											{new Date().toLocaleString()}
										</li>
										<li>Mode: Online (Real-time)</li>
										<li>
											You can add phenomena after creating
											the experiment
										</li>
									</ul>
								</div>

								<div className='flex justify-end space-x-3 pt-4 border-t border-gray-200'>
									<button
										type='button'
										onClick={handleCancelLiveExperiment}
										className='px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md'
										disabled={experimentLoading}
									>
										Cancel
									</button>
									<button
										type='submit'
										className='px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:bg-blue-300'
										disabled={
											experimentLoading ||
											!liveExperimentForm.name.trim()
										}
									>
										{experimentLoading
											? "Creating..."
											: "Start Experiment"}
									</button>
								</div>
							</form>{" "}
						</div>
					</div>
				)}
			</div>
		</PageLayout>
	);
}
