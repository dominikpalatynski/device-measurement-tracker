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
	measurementChannelApi,
	MeasurementChannel,
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
	const [allExperiments, setAllExperiments] = useState<Experiment[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<
		"overview" | "live-experiments" | "data-explorer" | "online" | "channels"
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

	// Real channels state
	const [channels, setChannels] = useState<MeasurementChannel[]>([]);
	const [channelsLoading, setChannelsLoading] = useState(false);

	const [editingChannel, setEditingChannel] = useState<null | MeasurementChannel>(null);
	const [editMode, setEditMode] = useState(false);
	const [editChannelData, setEditChannelData] = useState<MeasurementChannel | null>(null);
	const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
	const [newChannelData, setNewChannelData] = useState<Partial<MeasurementChannel>>({
		channel_name: '',
		sensor_type: '',
		data_type: '',
		frame_offset: 0,
		samples_per_frame: 1,
		sampling_frequency: 1,
		physical_unit: '',
		measurement_range_min: 0,
		measurement_range_max: 0,
	});

	// Fetch channels from backend
	const fetchChannels = async () => {
		setChannelsLoading(true);
		const data = await measurementChannelApi.getChannels();
		setChannels(data);
		setChannelsLoading(false);
	};
	useEffect(() => {
		fetchChannels();
	}, []);

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
				(exp) => exp.device_id === deviceData.device_id
			);
			const activeDeviceExperiments = deviceExperiments.filter(
				(exp) => exp.status === "Running" || exp.status === "Created"
			);
			
			setAllExperiments(deviceExperiments);
			setActiveExperiments(activeDeviceExperiments);

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
								) ? (									<Link
										href={`/devices/${deviceId}/experiments/${
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

								{/* Always show option to create Offline experiment */}								<Link
									href={`/devices/${deviceId}/experiments/create`}
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
							"channels",
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
									: tab === "channels"
									? "📡 Channels"
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
								</div>								<div>
									<dt className='text-sm font-medium text-gray-500'>
										Experiments
									</dt>
									<dd className='text-sm text-gray-900'>
										{allExperiments.length} total
										{activeExperiments.length > 0
											? ` (${activeExperiments.length} active)`
											: ""}
									</dd>
								</div>							</dl>
						</div>

						{/* Experiment Summary */}
						{allExperiments.length > 0 && (
							<div className='bg-white p-6 rounded-lg border border-gray-200'>
								<h3 className='text-lg font-medium text-gray-900 mb-4'>
									📊 Experiment Summary
								</h3>
								<div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
									<div className='text-center'>
										<div className='text-2xl mb-1'>🧪</div>
										<div className='text-2xl font-bold text-blue-600'>
											{allExperiments.length}
										</div>
										<div className='text-sm text-gray-500'>Total</div>
									</div>
									<div className='text-center'>
										<div className='text-2xl mb-1'>🟢</div>
										<div className='text-2xl font-bold text-green-600'>
											{activeExperiments.length}
										</div>
										<div className='text-sm text-gray-500'>Active</div>
									</div>
									<div className='text-center'>
										<div className='text-2xl mb-1'>✅</div>
										<div className='text-2xl font-bold text-blue-600'>
											{allExperiments.filter(exp => exp.status === "Completed").length}
										</div>
										<div className='text-sm text-gray-500'>Completed</div>
									</div>
									<div className='text-center'>
										<div className='text-2xl mb-1'>⏸️</div>
										<div className='text-2xl font-bold text-yellow-600'>
											{allExperiments.filter(exp => exp.status === "Paused" || exp.status === "Failed").length}
										</div>
										<div className='text-sm text-gray-500'>Paused/Failed</div>
									</div>
								</div>
								
								{/* Quick Actions */}
								{/* <div className='mt-6 flex flex-wrap gap-3'>
									<Link
										href={`/devices/${deviceId}/experiments/create`}
										className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700'
									>
										➕ Create New Experiment
									</Link>
									{activeExperiments.length > 0 && (
										<Link
											href={`/devices/${deviceId}/experiments/${activeExperiments[0].experiment_id}`}
											className='inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50'
										>
											👁️ View Active Experiment
										</Link>
									)}
								</div> */}
							</div>
						)}
					</div>
				)}
				{activeTab === "live-experiments" && (
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
						</div>						{/* Experiments History */}
						<div className='bg-white p-6 rounded-lg border border-gray-200'>
							<h3 className='text-lg font-medium text-gray-900 mb-4'>
								📋 All Experiments
							</h3>
							{allExperiments.length > 0 ? (
								<div className='space-y-6'>
									{/* Active Experiments */}
									{activeExperiments.length > 0 && (
										<div>
											<h4 className='text-md font-medium text-green-700 mb-3 flex items-center'>
												<span className='w-3 h-3 bg-green-500 rounded-full mr-2'></span>
												Active Experiments ({activeExperiments.length})
											</h4>
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
										</div>
									)}

									{/* Previous Experiments */}
									{allExperiments.filter(exp => !activeExperiments.some(active => active.experiment_id === exp.experiment_id)).length > 0 && (
										<div>
											<h4 className='text-md font-medium text-gray-700 mb-3 flex items-center'>
												<span className='w-3 h-3 bg-gray-400 rounded-full mr-2'></span>
												Previous Experiments ({allExperiments.filter(exp => !activeExperiments.some(active => active.experiment_id === exp.experiment_id)).length})
											</h4>
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
																Ended
															</th>
															<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
																Actions
															</th>
														</tr>
													</thead>
													<tbody className='bg-white divide-y divide-gray-200'>
														{allExperiments
															.filter(exp => !activeExperiments.some(active => active.experiment_id === exp.experiment_id))
															.map((experiment) => (
															<tr key={experiment.experiment_id} className='opacity-75'>
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
																		experiment.status === "Completed" 
																			? "bg-blue-100 text-blue-800"
																			: experiment.status === "Failed"
																			? "bg-red-100 text-red-800"
																			: experiment.status === "Paused"
																			? "bg-yellow-100 text-yellow-800"
																			: "bg-gray-100 text-gray-800"
																	}`}>
																		{experiment.status}
																	</span>
																</td>
																<td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
																	{new Date(experiment.start_date).toLocaleDateString()}
																</td>
																<td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
																	{experiment.end_date 
																		? new Date(experiment.end_date).toLocaleDateString()
																		: "-"
																	}
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
										</div>
									)}
								</div>
							) : (
								<div className='text-center py-6 text-gray-500'>
									<div className='text-4xl mb-2'>🧪</div>
									<p>No experiments found for this device.</p>
									<p className='text-sm'>Start your first live experiment above.</p>
								</div>
							)}						</div>
					</div>
				)}
				{activeTab === "data-explorer" && (
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
				{activeTab === "channels" && (
					<div className="bg-white p-6 rounded-lg border border-gray-200">
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-lg font-medium text-gray-900">Measurement Channels</h3>
							<button
								onClick={() => setShowCreateChannelModal(true)}
								className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
							>
								+ Create Channel
							</button>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
							{channels.map((channel) => (
								<div
									key={channel.id}
									className="cursor-pointer p-4 border border-blue-200 rounded-lg shadow-sm hover:bg-blue-50 transition"
									onClick={() => {
										setEditingChannel(channel);
										setEditMode(false);
										setEditChannelData(channel);
									}}
								>
									<div className="text-xl font-bold text-blue-700 mb-2">{channel.channel_name}</div>
									<div className="text-xs text-gray-500">Channel ID: {channel.id}</div>
								</div>
							))}
						</div>

						{/* Create Channel Modal */}
						{showCreateChannelModal && (
							<div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
								<div className="bg-white rounded-lg max-w-md w-full p-6">
									<div className="flex justify-between items-center mb-4">
										<h4 className="text-lg font-bold text-gray-900">Create Channel</h4>
										<button
											onClick={() => setShowCreateChannelModal(false)}
											className="text-gray-500 hover:text-gray-700"
										>
											✕
										</button>
									</div>
									<form
										onSubmit={async e => {
											e.preventDefault();
											await measurementChannelApi.createChannel(newChannelData);
											setShowCreateChannelModal(false);
											setNewChannelData({
												channel_name: '',
												sensor_type: '',
												data_type: '',
												frame_offset: 0,
												samples_per_frame: 1,
												sampling_frequency: 1,
												physical_unit: '',
												measurement_range_min: 0,
												measurement_range_max: 0,
											});
											fetchChannels();
										}}
									>
										<div className="space-y-3 mb-4">
											<label className="block text-sm font-medium text-gray-700">Channel Name
												<input type="text" className="w-full px-2 py-1 border rounded" value={newChannelData.channel_name || ''} onChange={e => setNewChannelData(d => ({ ...d, channel_name: e.target.value }))} required />
											</label>
											<label className="block text-sm font-medium text-gray-700">Sensor Type
												<input type="text" className="w-full px-2 py-1 border rounded" value={newChannelData.sensor_type} onChange={e => setNewChannelData(d => ({ ...d, sensor_type: e.target.value }))} />
											</label>
											<label className="block text-sm font-medium text-gray-700">Data Type
												<input type="text" className="w-full px-2 py-1 border rounded" value={newChannelData.data_type} onChange={e => setNewChannelData(d => ({ ...d, data_type: e.target.value }))} />
											</label>
											<label className="block text-sm font-medium text-gray-700">Frame Offset
												<input type="number" className="w-full px-2 py-1 border rounded" value={newChannelData.frame_offset} onChange={e => setNewChannelData(d => ({ ...d, frame_offset: Number(e.target.value) }))} />
											</label>
											<label className="block text-sm font-medium text-gray-700">Samples/Frame
												<input type="number" className="w-full px-2 py-1 border rounded" value={newChannelData.samples_per_frame} onChange={e => setNewChannelData(d => ({ ...d, samples_per_frame: Number(e.target.value) }))} />
											</label>
											<label className="block text-sm font-medium text-gray-700">Sampling Frequency
												<input type="number" className="w-full px-2 py-1 border rounded" value={newChannelData.sampling_frequency} onChange={e => setNewChannelData(d => ({ ...d, sampling_frequency: Number(e.target.value) }))} />
											</label>
											<label className="block text-sm font-medium text-gray-700">Physical Unit
												<input type="text" className="w-full px-2 py-1 border rounded" value={newChannelData.physical_unit} onChange={e => setNewChannelData(d => ({ ...d, physical_unit: e.target.value }))} />
											</label>
											<label className="block text-sm font-medium text-gray-700">Range Min
												<input type="number" className="w-full px-2 py-1 border rounded" value={newChannelData.measurement_range_min} onChange={e => setNewChannelData(d => ({ ...d, measurement_range_min: Number(e.target.value) }))} />
											</label>
											<label className="block text-sm font-medium text-gray-700">Range Max
												<input type="number" className="w-full px-2 py-1 border rounded" value={newChannelData.measurement_range_max} onChange={e => setNewChannelData(d => ({ ...d, measurement_range_max: Number(e.target.value) }))} />
											</label>
										</div>
										<div className="flex justify-end space-x-2">
											<button
												type="button"
												onClick={() => setShowCreateChannelModal(false)}
												className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
											>
												Cancel
											</button>
											<button
												type="submit"
												className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
											>
												Create
											</button>
										</div>
									</form>
								</div>
							</div>
						)}

						{/* Channel Details/Edit Modal */}
						{editingChannel && (
							<div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
								<div className="bg-white rounded-lg max-w-md w-full p-6">
									<div className="flex justify-between items-center mb-4">
										<h4 className="text-lg font-bold text-gray-900">{editMode ? "Edit Channel" : "Channel Details"}</h4>
										<button
											onClick={() => { setEditingChannel(null); setEditMode(false); }}
											className="text-gray-500 hover:text-gray-700"
										>
											✕
										</button>
									</div>
									{!editMode ? (
										<div>
											<dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 mb-4">
												<dt className="font-medium text-gray-500">Channel Name</dt>
												<dd className="text-gray-900">{editingChannel.channel_name}</dd>
												<dt className="font-medium text-gray-500">Sensor Type</dt>
												<dd className="text-gray-900">{editingChannel.sensor_type}</dd>
												<dt className="font-medium text-gray-500">Data Type</dt>
												<dd className="text-gray-900">{editingChannel.data_type}</dd>
												<dt className="font-medium text-gray-500">Frame Offset</dt>
												<dd className="text-gray-900">{editingChannel.frame_offset}</dd>
												<dt className="font-medium text-gray-500">Samples/Frame</dt>
												<dd className="text-gray-900">{editingChannel.samples_per_frame}</dd>
												<dt className="font-medium text-gray-500">Sampling Frequency</dt>
												<dd className="text-gray-900">{editingChannel.sampling_frequency}</dd>
												<dt className="font-medium text-gray-500">Physical Unit</dt>
												<dd className="text-gray-900">{editingChannel.physical_unit}</dd>
												<dt className="font-medium text-gray-500">Range Min</dt>
												<dd className="text-gray-900">{editingChannel.measurement_range_min}</dd>
												<dt className="font-medium text-gray-500">Range Max</dt>
												<dd className="text-gray-900">{editingChannel.measurement_range_max}</dd>
											</dl>
											<div className="flex justify-end">
												<button
													onClick={() => { setEditMode(true); setEditChannelData(editingChannel); }}
													className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
												>
													Edit
												</button>
											</div>
										</div>
									) : (
										<form
											onSubmit={async e => {
												e.preventDefault();
												if (!editChannelData) return;
												await measurementChannelApi.updateChannel(editChannelData.id, editChannelData);
												setEditingChannel({ ...editChannelData });
												setEditMode(false);
												fetchChannels();
											}}
										>
											<div className="space-y-3 mb-4">
												<label className="block text-sm font-medium text-gray-700">Channel Name
													<input type="text" className="w-full px-2 py-1 border rounded" value={editChannelData?.channel_name || ""} onChange={e => setEditChannelData(d => d ? { ...d, channel_name: e.target.value } : d)} required />
												</label>
												<label className="block text-sm font-medium text-gray-700">Sensor Type
													<input type="text" className="w-full px-2 py-1 border rounded" value={editChannelData?.sensor_type || ""} onChange={e => setEditChannelData(d => d ? { ...d, sensor_type: e.target.value } : d)} />
												</label>
												<label className="block text-sm font-medium text-gray-700">Data Type
													<input type="text" className="w-full px-2 py-1 border rounded" value={editChannelData?.data_type || ""} onChange={e => setEditChannelData(d => d ? { ...d, data_type: e.target.value } : d)} />
												</label>
												<label className="block text-sm font-medium text-gray-700">Frame Offset
													<input type="number" className="w-full px-2 py-1 border rounded" value={editChannelData?.frame_offset ?? 0} onChange={e => setEditChannelData(d => d ? { ...d, frame_offset: Number(e.target.value) } : d)} />
												</label>
												<label className="block text-sm font-medium text-gray-700">Samples/Frame
													<input type="number" className="w-full px-2 py-1 border rounded" value={editChannelData?.samples_per_frame ?? 0} onChange={e => setEditChannelData(d => d ? { ...d, samples_per_frame: Number(e.target.value) } : d)} />
												</label>
												<label className="block text-sm font-medium text-gray-700">Sampling Frequency
													<input type="number" className="w-full px-2 py-1 border rounded" value={editChannelData?.sampling_frequency ?? 0} onChange={e => setEditChannelData(d => d ? { ...d, sampling_frequency: Number(e.target.value) } : d)} />
												</label>
												<label className="block text-sm font-medium text-gray-700">Physical Unit
													<input type="text" className="w-full px-2 py-1 border rounded" value={editChannelData?.physical_unit || ""} onChange={e => setEditChannelData(d => d ? { ...d, physical_unit: e.target.value } : d)} />
												</label>
												<label className="block text-sm font-medium text-gray-700">Range Min
													<input type="number" className="w-full px-2 py-1 border rounded" value={editChannelData?.measurement_range_min ?? 0} onChange={e => setEditChannelData(d => d ? { ...d, measurement_range_min: Number(e.target.value) } : d)} />
												</label>
												<label className="block text-sm font-medium text-gray-700">Range Max
													<input type="number" className="w-full px-2 py-1 border rounded" value={editChannelData?.measurement_range_max ?? 0} onChange={e => setEditChannelData(d => d ? { ...d, measurement_range_max: Number(e.target.value) } : d)} />
												</label>
											</div>
											<div className="flex justify-end space-x-2">
												<button
													type="button"
													onClick={() => { setEditMode(false); setEditChannelData(editingChannel); }}
													className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
												>
													Cancel
												</button>
												<button
													type="submit"
													className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
												>
													Save
												</button>
											</div>
										</form>
									)}
								</div>
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
														<td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>															<Link
																href={`/devices/${deviceId}/experiments/${experiment.experiment_id}`}
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
												</p>												<Link
													href={`/devices/${deviceId}/experiments/create`}
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
											</div>										</div>
									</div>
								)}
							</div>
						</div>
						{activeExperiments.length === 0 && (
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
							</form>
						</div>
					</div>
				)}
			</div>
		</PageLayout>
	);
}
