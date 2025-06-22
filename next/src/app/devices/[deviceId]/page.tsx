"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PageLayout from "@/components/PageLayout";
import {
	deviceApi,
	experimentApi,
	Device,
	Experiment,
	getAllMeasurements,
	getLatestMeasurement,
	getMeasurementStats,
	getUnassignedMeasurements,
	Measurement,
	MeasurementStats,
	MeasurementData,
	measurementChannelApi,
	MeasurementChannel,
} from "@/services/api";
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
	AreaChart,
	Area,
	BarChart,
	Bar,
	ScatterChart,
	Scatter,
} from "recharts";

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
		"overview" | "live-experiments" | "data-explorer" | "channels"
	>("overview");

	// Unassigned data state
	const [unassignedData, setUnassignedData] = useState<MeasurementData[]>([]);
	const [unassignedDataLoading, setUnassignedDataLoading] = useState(false);
	const [chartType, setChartType] = useState<
		"line" | "area" | "bar" | "scatter"
	>("line");
	const [activeChartTab, setActiveChartTab] = useState<string>("");

	// Real channels state
	const [channels, setChannels] = useState<MeasurementChannel[]>([]);
	const [channelsLoading, setChannelsLoading] = useState(false);

	const [editingChannel, setEditingChannel] =
		useState<null | MeasurementChannel>(null);
	const [editMode, setEditMode] = useState(false);
	const [editChannelData, setEditChannelData] =
		useState<MeasurementChannel | null>(null);
	const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
	const [newChannelData, setNewChannelData] = useState<
		Partial<MeasurementChannel>
	>({
		channel_name: "",
		sensor_type: "",
		data_type: "",
		frame_offset: 0,
		samples_per_frame: 1,
		sampling_frequency: 1,
		physical_unit: "",
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

	// Fetch unassigned measurement data
	const fetchUnassignedData = async () => {
		if (!device) return;

		setUnassignedDataLoading(true);
		try {
			const response = await getUnassignedMeasurements(
				device.device_id,
				100
			);
			if (response.success) {
				setUnassignedData(response.data);
			}
		} catch (error) {
			console.error("Error fetching unassigned data:", error);
		} finally {
			setUnassignedDataLoading(false);
		}
	};
	useEffect(() => {
		fetchChannels();
	}, []);

	useEffect(() => {
		if (deviceId) {
			loadDeviceData();
		}
	}, [deviceId]);

	// Load unassigned data when device changes or when switching to data-explorer tab
	useEffect(() => {
		if (device && activeTab === "data-explorer") {
			fetchUnassignedData();
		}
	}, [device, activeTab]);

	// Extract and process chart data from unassigned measurements
	const getUnassignedChartData = () => {
		if (!unassignedData.length) return {};

		const chartData: Record<
			string,
			Array<{
				timestamp: string;
				value: number;
				timestampFormatted: string;
				index: number;
			}>
		> = {};
		const availableKeys = new Set<string>();

		// First pass: collect all possible keys from all payloads
		unassignedData.forEach((measurement) => {
			if (measurement.data_payload) {
				Object.keys(measurement.data_payload).forEach((key) => {
					const value = measurement.data_payload[key];
					// Check if the value is an array or a single numeric value
					if (Array.isArray(value) || typeof value === "number") {
						availableKeys.add(key);
					}
				});
			}
		});

		// Second pass: extract data for each key
		availableKeys.forEach((key) => {
			chartData[key] = [];

			unassignedData.forEach((measurement, measurementIndex) => {
				if (
					measurement.data_payload &&
					measurement.data_payload[key] !== undefined
				) {
					const value = measurement.data_payload[key];
					const timestamp = measurement.timestamp;
					const timestampFormatted = new Date(
						timestamp
					).toLocaleString();

					if (Array.isArray(value)) {
						// If it's an array, create multiple data points with indexed timestamps
						value.forEach((val, arrayIndex) => {
							if (typeof val === "number") {
								chartData[key].push({
									timestamp: `${timestamp}_${arrayIndex}`,
									value: val,
									timestampFormatted: `${timestampFormatted} [${arrayIndex}]`,
									index: measurementIndex * 1000 + arrayIndex,
								});
							}
						});
					} else if (typeof value === "number") {
						// If it's a single number, create one data point
						chartData[key].push({
							timestamp,
							value,
							timestampFormatted,
							index: measurementIndex,
						});
					}
				}
			});
		});

		return chartData;
	};

	// Get available chart keys for tabs
	const getUnassignedChartKeys = () => {
		const chartData = getUnassignedChartData();
		return Object.keys(chartData);
	};

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
				// Convert MeasurementData to Measurement format for backward compatibility
				const convertedMeasurements: Measurement[] =
					measurementsRes.value.data.map(
						(data: MeasurementData, index: number) => ({
							id: data.data_id,
							temperature: 0, // Default values since MeasurementData doesn't have these
							humidity: 0,
							pressure: 0,
							battery_level: 0,
							measured_at: data.timestamp,
							created_at: data.timestamp,
						})
					);
				setMeasurements(convertedMeasurements);
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
						)}{" "}
						{/* Experiment Controls - Only for Active devices */}
						{device.status === "Active" && (
							<>
								{/* Always show option to create Offline experiment */}{" "}
								<Link
									href={`/devices/${deviceId}/experiments/create`}
									className='inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50'
								>
									Create Experiment
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
				{/* Tabs */}{" "}
				<div className='border-b border-gray-200 mb-6'>
					<nav className='-mb-px flex space-x-8'>
						{[
							"overview",
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
								{tab === "live-experiments"
									? "🧪 Experiments"
									: tab === "data-explorer"
									? "📊 Unassigned Data Explorer"
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
								</div>{" "}
								<div>
									<dt className='text-sm font-medium text-gray-500'>
										Experiments
									</dt>
									<dd className='text-sm text-gray-900'>
										{allExperiments.length} total
										{activeExperiments.length > 0
											? ` (${activeExperiments.length} active)`
											: ""}
									</dd>
								</div>{" "}
							</dl>
						</div>

						{/* Experiment Summary */}
						{allExperiments.length > 0 && (
							<div className='bg-white p-6 rounded-lg border border-gray-200'>
								<h3 className='text-lg font-medium text-gray-900 mb-4'>
									📊 Experiment Summary
								</h3>{" "}
								<div className='grid grid-cols-1 md:grid-cols-6 gap-4'>
									<div className='text-center'>
										<div className='text-2xl mb-1'>🧪</div>
										<div className='text-2xl font-bold text-blue-600'>
											{allExperiments.length}
										</div>
										<div className='text-sm text-gray-500'>
											Total
										</div>
									</div>
									<div className='text-center'>
										<div className='text-2xl mb-1'>🟢</div>
										<div className='text-2xl font-bold text-green-600'>
											{activeExperiments.length}
										</div>
										<div className='text-sm text-gray-500'>
											Active
										</div>
									</div>
									<div className='text-center'>
										<div className='text-2xl mb-1'>🔄</div>
										<div className='text-2xl font-bold text-purple-600'>
											{
												allExperiments.filter(
													(exp) =>
														exp.type === "stream"
												).length
											}
										</div>
										<div className='text-sm text-gray-500'>
											Stream
										</div>
									</div>
									<div className='text-center'>
										<div className='text-2xl mb-1'>📦</div>
										<div className='text-2xl font-bold text-orange-600'>
											{
												allExperiments.filter(
													(exp) =>
														exp.type === "batch"
												).length
											}
										</div>
										<div className='text-sm text-gray-500'>
											Batch
										</div>
									</div>
									<div className='text-center'>
										<div className='text-2xl mb-1'>✅</div>
										<div className='text-2xl font-bold text-blue-600'>
											{
												allExperiments.filter(
													(exp) =>
														exp.status ===
														"Completed"
												).length
											}
										</div>
										<div className='text-sm text-gray-500'>
											Completed
										</div>
									</div>
									<div className='text-center'>
										<div className='text-2xl mb-1'>⏸️</div>
										<div className='text-2xl font-bold text-yellow-600'>
											{
												allExperiments.filter(
													(exp) =>
														exp.status ===
															"Paused" ||
														exp.status === "Failed"
												).length
											}
										</div>
										<div className='text-sm text-gray-500'>
											Paused/Failed
										</div>
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
										<div className='text-yellow-400 mr-3'>
											⚠️
										</div>
										<div>
											<h4 className='font-medium text-yellow-800'>
												Device Not Active
											</h4>
											<p className='text-sm text-yellow-700 mt-1'>
												The device must be active to
												start live experiments.
											</p>
										</div>
									</div>
								</div>
							) : (
								<>
									{/* Current Live Experiment Status */}
									{activeExperiments.filter(
										(exp) => exp.status === "Running"
									).length > 0 ? (
										<div className='bg-green-50 border border-green-200 rounded-lg p-4 mb-4'>
											<div className='flex justify-between items-center'>
												<div>
													<h4 className='font-medium text-green-800'>
														🟢 Live Experiment
														Active
													</h4>
													{activeExperiments
														.filter(
															(exp) =>
																exp.status ===
																"Running"
														)
														.map((exp) => (
															<div
																key={
																	exp.experiment_id
																}
																className='text-sm text-green-700 mt-1'
															>
																{" "}
																<div>
																	Name:{" "}
																	{exp.experiment_name ||
																		exp.experiment_id}
																</div>
																<div className='flex items-center space-x-2'>
																	<span>
																		Type:
																	</span>
																	<span
																		className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
																			exp.type ===
																			"stream"
																				? "bg-purple-100 text-purple-800"
																				: "bg-orange-100 text-orange-800"
																		}`}
																	>
																		{exp.type ===
																		"stream"
																			? "🔄 Stream"
																			: "📦 Batch"}
																	</span>
																</div>
																<div>
																	Started:{" "}
																	{new Date(
																		exp.start_date
																	).toLocaleString()}
																</div>
															</div>
														))}
												</div>
												<div className='space-x-2'>
													{activeExperiments
														.filter(
															(exp) =>
																exp.status ===
																"Running"
														)
														.map((exp) => (
															<Link
																key={
																	exp.experiment_id
																}
																href={`/devices/${deviceId}/experiments/${exp.experiment_id}`}
																className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700'
															>
																Manage
																Experiment
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
												View experiment history below or
												create a new experiment.
											</p>
										</div>
									)}
								</>
							)}
						</div>
						{/* Experiments History */}
						<div className='bg-white p-6 rounded-lg border border-gray-200'>
							<h3 className='text-lg font-medium text-gray-900 mb-4'>
								📋 All Experiments
							</h3>{" "}
							{allExperiments.length > 0 ? (
								<div className='space-y-6'>
									{/* Previous Experiments */}
									{allExperiments.filter(
										(exp) =>
											!activeExperiments.some(
												(active) =>
													active.experiment_id ===
													exp.experiment_id
											)
									).length > 0 && (
										<div>
											<h4 className='text-md font-medium text-gray-700 mb-3 flex items-center'>
												<span className='w-3 h-3 bg-gray-400 rounded-full mr-2'></span>
												Previous Experiments (
												{
													allExperiments.filter(
														(exp) =>
															!activeExperiments.some(
																(active) =>
																	active.experiment_id ===
																	exp.experiment_id
															)
													).length
												}
												)
											</h4>
											<div className='overflow-x-auto'>
												<table className='min-w-full divide-y divide-gray-200'>
													{" "}
													<thead className='bg-gray-50'>
														<tr>
															<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
																Experiment
															</th>
															<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
																Type
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
															.filter(
																(exp) =>
																	!activeExperiments.some(
																		(
																			active
																		) =>
																			active.experiment_id ===
																			exp.experiment_id
																	)
															)
															.map(
																(
																	experiment
																) => (
																	<tr
																		key={
																			experiment.experiment_id
																		}
																		className='opacity-75'
																	>
																		{" "}
																		<td className='px-6 py-4 whitespace-nowrap'>
																			<div className='text-sm font-medium text-gray-900'>
																				{experiment.experiment_name ||
																					experiment.experiment_id}
																			</div>
																			<div className='text-sm text-gray-500'>
																				{experiment.description ||
																					"No description"}
																			</div>
																		</td>
																		<td className='px-6 py-4 whitespace-nowrap'>
																			<span
																				className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
																					experiment.type ===
																					"stream"
																						? "bg-purple-100 text-purple-800"
																						: "bg-orange-100 text-orange-800"
																				}`}
																			>
																				{experiment.type ===
																				"stream"
																					? "🔄 Stream"
																					: "📦 Batch"}
																			</span>
																		</td>
																		<td className='px-6 py-4 whitespace-nowrap'>
																			<span
																				className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
																					experiment.status ===
																					"Completed"
																						? "bg-blue-100 text-blue-800"
																						: experiment.status ===
																						  "Failed"
																						? "bg-red-100 text-red-800"
																						: experiment.status ===
																						  "Paused"
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
																		<td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
																			{experiment.end_date
																				? new Date(
																						experiment.end_date
																				  ).toLocaleDateString()
																				: "-"}
																		</td>
																		<td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
																			<Link
																				href={`/devices/${deviceId}/experiments/${experiment.experiment_id}`}
																				className='text-blue-600 hover:text-blue-900'
																			>
																				View
																				Details
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
								</div>
							) : (
								<div className='text-center py-6 text-gray-500'>
									<div className='text-4xl mb-2'>🧪</div>
									<p>No experiments found for this device.</p>
									<p className='text-sm'>
										Start your first live experiment above.
									</p>
								</div>
							)}{" "}
						</div>
					</div>
				)}{" "}
				{activeTab === "data-explorer" && (
					<div className='space-y-6'>
						{/* Unassigned Data Header */}
						<div className='bg-white p-6 rounded-lg border border-gray-200'>
							<div className='flex justify-between items-center mb-4'>
								<div>
									<h3 className='text-lg font-medium text-gray-900'>
										📊 Unassigned Data Explorer
									</h3>
									<p className='text-sm text-gray-500'>
										Interactive visualization of measurement
										data not assigned to any experiment
									</p>
								</div>
								<div className='flex items-center space-x-4'>
									<button
										onClick={fetchUnassignedData}
										disabled={unassignedDataLoading}
										className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50'
									>
										{unassignedDataLoading
											? "Loading..."
											: "Refresh Data"}
									</button>
									<div className='text-sm text-gray-600'>
										{unassignedData.length} data points
									</div>
								</div>
							</div>
						</div>

						{/* Charts Section */}
						{unassignedData.length > 0 ? (
							<div className='bg-white p-6 rounded-lg border border-gray-200'>
								<div className='flex justify-between items-center mb-6'>
									<h4 className='text-lg font-medium text-gray-900'>
										Interactive Charts
									</h4>
									<div className='flex items-center space-x-4'>
										<select
											value={chartType}
											onChange={(e) =>
												setChartType(
													e.target
														.value as typeof chartType
												)
											}
											className='px-3 py-2 border border-gray-300 rounded-md text-sm'
										>
											<option value='line'>
												Line Chart
											</option>
											<option value='area'>
												Area Chart
											</option>
											<option value='bar'>
												Bar Chart
											</option>
											<option value='scatter'>
												Scatter Plot
											</option>
										</select>
									</div>
								</div>

								{/* Chart Tabs */}
								{(() => {
									const chartKeys = getUnassignedChartKeys();
									const currentKey =
										activeChartTab || chartKeys[0];
									const chartData = getUnassignedChartData();

									if (chartKeys.length === 0) {
										return (
											<div className='text-center py-8'>
												<p className='text-gray-500'>
													No numeric data available
													for charting
												</p>
											</div>
										);
									}

									return (
										<div>
											{/* Tab Navigation */}
											<div className='border-b border-gray-200 mb-6'>
												<nav className='-mb-px flex space-x-8'>
													{chartKeys.map((key) => (
														<button
															key={key}
															onClick={() =>
																setActiveChartTab(
																	key
																)
															}
															className={`py-2 px-1 border-b-2 font-medium text-sm ${
																(activeChartTab ||
																	chartKeys[0]) ===
																key
																	? "border-blue-500 text-blue-600"
																	: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
															}`}
														>
															{key}
														</button>
													))}
												</nav>
											</div>{" "}
											{/* Chart Display */}
											{chartData[currentKey] && (
												<div className='h-96'>
													<ResponsiveContainer
														width='100%'
														height='100%'
													>
														{(() => {
															switch (chartType) {
																case "area":
																	return (
																		<AreaChart
																			data={
																				chartData[
																					currentKey
																				]
																			}
																		>
																			<CartesianGrid strokeDasharray='3 3' />
																			<XAxis
																				dataKey='timestampFormatted'
																				angle={
																					-45
																				}
																				textAnchor='end'
																				height={
																					60
																				}
																			/>
																			<YAxis />
																			<Tooltip />
																			<Legend />
																			<Area
																				type='monotone'
																				dataKey='value'
																				stroke='#2563eb'
																				fill='#3b82f6'
																				fillOpacity={
																					0.3
																				}
																			/>
																		</AreaChart>
																	);
																case "bar":
																	return (
																		<BarChart
																			data={
																				chartData[
																					currentKey
																				]
																			}
																		>
																			<CartesianGrid strokeDasharray='3 3' />
																			<XAxis
																				dataKey='timestampFormatted'
																				angle={
																					-45
																				}
																				textAnchor='end'
																				height={
																					60
																				}
																			/>
																			<YAxis />
																			<Tooltip />
																			<Legend />
																			<Bar
																				dataKey='value'
																				fill='#3b82f6'
																			/>
																		</BarChart>
																	);
																case "scatter":
																	return (
																		<ScatterChart
																			data={
																				chartData[
																					currentKey
																				]
																			}
																		>
																			<CartesianGrid strokeDasharray='3 3' />
																			<XAxis
																				dataKey='index'
																				type='number'
																				domain={[
																					"auto",
																					"auto",
																				]}
																			/>
																			<YAxis dataKey='value' />
																			<Tooltip />
																			<Legend />
																			<Scatter
																				dataKey='value'
																				fill='#3b82f6'
																			/>
																		</ScatterChart>
																	);
																default:
																case "line":
																	return (
																		<LineChart
																			data={
																				chartData[
																					currentKey
																				]
																			}
																		>
																			<CartesianGrid strokeDasharray='3 3' />
																			<XAxis
																				dataKey='timestampFormatted'
																				angle={
																					-45
																				}
																				textAnchor='end'
																				height={
																					60
																				}
																			/>
																			<YAxis />
																			<Tooltip />
																			<Legend />
																			<Line
																				type='monotone'
																				dataKey='value'
																				stroke='#2563eb'
																				strokeWidth={
																					2
																				}
																				dot={{
																					r: 3,
																				}}
																			/>
																		</LineChart>
																	);
															}
														})()}
													</ResponsiveContainer>
												</div>
											)}
											{/* Data Summary */}
											<div className='mt-6 grid grid-cols-1 md:grid-cols-3 gap-4'>
												{chartData[currentKey] && (
													<>
														<div className='bg-gray-50 p-4 rounded-lg'>
															<div className='text-sm font-medium text-gray-500'>
																Data Points
															</div>
															<div className='text-2xl font-bold text-gray-900'>
																{
																	chartData[
																		currentKey
																	].length
																}
															</div>
														</div>
														<div className='bg-gray-50 p-4 rounded-lg'>
															<div className='text-sm font-medium text-gray-500'>
																Min Value
															</div>
															<div className='text-2xl font-bold text-gray-900'>
																{Math.min(
																	...chartData[
																		currentKey
																	].map(
																		(d) =>
																			d.value
																	)
																).toFixed(2)}
															</div>
														</div>
														<div className='bg-gray-50 p-4 rounded-lg'>
															<div className='text-sm font-medium text-gray-500'>
																Max Value
															</div>
															<div className='text-2xl font-bold text-gray-900'>
																{Math.max(
																	...chartData[
																		currentKey
																	].map(
																		(d) =>
																			d.value
																	)
																).toFixed(2)}
															</div>
														</div>
													</>
												)}
											</div>
										</div>
									);
								})()}
							</div>
						) : (
							<div className='bg-white p-6 rounded-lg border border-gray-200'>
								<div className='text-center py-8'>
									{unassignedDataLoading ? (
										<div>
											<div className='text-4xl mb-2'>
												⏳
											</div>
											<p className='text-gray-500'>
												Loading unassigned data...
											</p>
										</div>
									) : (
										<div>
											<div className='text-4xl mb-2'>
												📊
											</div>
											<p className='text-gray-500'>
												No unassigned measurement data
												found for this device.
											</p>
											<p className='text-sm text-gray-400 mt-2'>
												Data appears here when
												measurements are uploaded
												without being assigned to an
												experiment.
											</p>
										</div>
									)}
								</div>
							</div>
						)}
					</div>
				)}
				{activeTab === "channels" && (
					<div className='bg-white p-6 rounded-lg border border-gray-200'>
						<div className='flex items-center justify-between mb-4'>
							<h3 className='text-lg font-medium text-gray-900'>
								Measurement Channels
							</h3>
							<button
								onClick={() => setShowCreateChannelModal(true)}
								className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium'
							>
								+ Create Channel
							</button>
						</div>
						<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
							{channels.map((channel) => (
								<div
									key={channel.id}
									className='cursor-pointer p-4 border border-blue-200 rounded-lg shadow-sm hover:bg-blue-50 transition'
									onClick={() => {
										setEditingChannel(channel);
										setEditMode(false);
										setEditChannelData(channel);
									}}
								>
									<div className='text-xl font-bold text-blue-700 mb-2'>
										{channel.channel_name}
									</div>
									<div className='text-xs text-gray-500'>
										Channel ID: {channel.id}
									</div>
								</div>
							))}
						</div>

						{/* Create Channel Modal */}
						{showCreateChannelModal && (
							<div className='fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50'>
								<div className='bg-white rounded-lg max-w-md w-full p-6'>
									<div className='flex justify-between items-center mb-4'>
										<h4 className='text-lg font-bold text-gray-900'>
											Create Channel
										</h4>
										<button
											onClick={() =>
												setShowCreateChannelModal(false)
											}
											className='text-gray-500 hover:text-gray-700'
										>
											✕
										</button>
									</div>
									<form
										onSubmit={async (e) => {
											e.preventDefault();
											await measurementChannelApi.createChannel(
												newChannelData
											);
											setShowCreateChannelModal(false);
											setNewChannelData({
												channel_name: "",
												sensor_type: "",
												data_type: "",
												frame_offset: 0,
												samples_per_frame: 1,
												sampling_frequency: 1,
												physical_unit: "",
												measurement_range_min: 0,
												measurement_range_max: 0,
											});
											fetchChannels();
										}}
									>
										<div className='space-y-3 mb-4'>
											<label className='block text-sm font-medium text-gray-700'>
												Channel Name
												<input
													type='text'
													className='w-full px-2 py-1 border rounded'
													value={
														newChannelData.channel_name ||
														""
													}
													onChange={(e) =>
														setNewChannelData(
															(d) => ({
																...d,
																channel_name:
																	e.target
																		.value,
															})
														)
													}
													required
												/>
											</label>
											<label className='block text-sm font-medium text-gray-700'>
												Sensor Type
												<input
													type='text'
													className='w-full px-2 py-1 border rounded'
													value={
														newChannelData.sensor_type
													}
													onChange={(e) =>
														setNewChannelData(
															(d) => ({
																...d,
																sensor_type:
																	e.target
																		.value,
															})
														)
													}
												/>
											</label>
											<label className='block text-sm font-medium text-gray-700'>
												Data Type
												<input
													type='text'
													className='w-full px-2 py-1 border rounded'
													value={
														newChannelData.data_type
													}
													onChange={(e) =>
														setNewChannelData(
															(d) => ({
																...d,
																data_type:
																	e.target
																		.value,
															})
														)
													}
												/>
											</label>
											<label className='block text-sm font-medium text-gray-700'>
												Frame Offset
												<input
													type='number'
													className='w-full px-2 py-1 border rounded'
													value={
														newChannelData.frame_offset
													}
													onChange={(e) =>
														setNewChannelData(
															(d) => ({
																...d,
																frame_offset:
																	Number(
																		e.target
																			.value
																	),
															})
														)
													}
												/>
											</label>
											<label className='block text-sm font-medium text-gray-700'>
												Samples/Frame
												<input
													type='number'
													className='w-full px-2 py-1 border rounded'
													value={
														newChannelData.samples_per_frame
													}
													onChange={(e) =>
														setNewChannelData(
															(d) => ({
																...d,
																samples_per_frame:
																	Number(
																		e.target
																			.value
																	),
															})
														)
													}
												/>
											</label>
											<label className='block text-sm font-medium text-gray-700'>
												Sampling Frequency
												<input
													type='number'
													className='w-full px-2 py-1 border rounded'
													value={
														newChannelData.sampling_frequency
													}
													onChange={(e) =>
														setNewChannelData(
															(d) => ({
																...d,
																sampling_frequency:
																	Number(
																		e.target
																			.value
																	),
															})
														)
													}
												/>
											</label>
											<label className='block text-sm font-medium text-gray-700'>
												Physical Unit
												<input
													type='text'
													className='w-full px-2 py-1 border rounded'
													value={
														newChannelData.physical_unit
													}
													onChange={(e) =>
														setNewChannelData(
															(d) => ({
																...d,
																physical_unit:
																	e.target
																		.value,
															})
														)
													}
												/>
											</label>
											<label className='block text-sm font-medium text-gray-700'>
												Range Min
												<input
													type='number'
													className='w-full px-2 py-1 border rounded'
													value={
														newChannelData.measurement_range_min
													}
													onChange={(e) =>
														setNewChannelData(
															(d) => ({
																...d,
																measurement_range_min:
																	Number(
																		e.target
																			.value
																	),
															})
														)
													}
												/>
											</label>
											<label className='block text-sm font-medium text-gray-700'>
												Range Max
												<input
													type='number'
													className='w-full px-2 py-1 border rounded'
													value={
														newChannelData.measurement_range_max
													}
													onChange={(e) =>
														setNewChannelData(
															(d) => ({
																...d,
																measurement_range_max:
																	Number(
																		e.target
																			.value
																	),
															})
														)
													}
												/>
											</label>
										</div>
										<div className='flex justify-end space-x-2'>
											<button
												type='button'
												onClick={() =>
													setShowCreateChannelModal(
														false
													)
												}
												className='px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md'
											>
												Cancel
											</button>
											<button
												type='submit'
												className='px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md'
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
							<div className='fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50'>
								<div className='bg-white rounded-lg max-w-md w-full p-6'>
									<div className='flex justify-between items-center mb-4'>
										<h4 className='text-lg font-bold text-gray-900'>
											{editMode
												? "Edit Channel"
												: "Channel Details"}
										</h4>
										<button
											onClick={() => {
												setEditingChannel(null);
												setEditMode(false);
											}}
											className='text-gray-500 hover:text-gray-700'
										>
											✕
										</button>
									</div>
									{!editMode ? (
										<div>
											<dl className='grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 mb-4'>
												<dt className='font-medium text-gray-500'>
													Channel Name
												</dt>
												<dd className='text-gray-900'>
													{
														editingChannel.channel_name
													}
												</dd>
												<dt className='font-medium text-gray-500'>
													Sensor Type
												</dt>
												<dd className='text-gray-900'>
													{editingChannel.sensor_type}
												</dd>
												<dt className='font-medium text-gray-500'>
													Data Type
												</dt>
												<dd className='text-gray-900'>
													{editingChannel.data_type}
												</dd>
												<dt className='font-medium text-gray-500'>
													Frame Offset
												</dt>
												<dd className='text-gray-900'>
													{
														editingChannel.frame_offset
													}
												</dd>
												<dt className='font-medium text-gray-500'>
													Samples/Frame
												</dt>
												<dd className='text-gray-900'>
													{
														editingChannel.samples_per_frame
													}
												</dd>
												<dt className='font-medium text-gray-500'>
													Sampling Frequency
												</dt>
												<dd className='text-gray-900'>
													{
														editingChannel.sampling_frequency
													}
												</dd>
												<dt className='font-medium text-gray-500'>
													Physical Unit
												</dt>
												<dd className='text-gray-900'>
													{
														editingChannel.physical_unit
													}
												</dd>
												<dt className='font-medium text-gray-500'>
													Range Min
												</dt>
												<dd className='text-gray-900'>
													{
														editingChannel.measurement_range_min
													}
												</dd>
												<dt className='font-medium text-gray-500'>
													Range Max
												</dt>
												<dd className='text-gray-900'>
													{
														editingChannel.measurement_range_max
													}
												</dd>
											</dl>
											<div className='flex justify-end'>
												<button
													onClick={() => {
														setEditMode(true);
														setEditChannelData(
															editingChannel
														);
													}}
													className='px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md'
												>
													Edit
												</button>
											</div>
										</div>
									) : (
										<form
											onSubmit={async (e) => {
												e.preventDefault();
												if (!editChannelData) return;
												await measurementChannelApi.updateChannel(
													editChannelData.id,
													editChannelData
												);
												setEditingChannel({
													...editChannelData,
												});
												setEditMode(false);
												fetchChannels();
											}}
										>
											<div className='space-y-3 mb-4'>
												<label className='block text-sm font-medium text-gray-700'>
													Channel Name
													<input
														type='text'
														className='w-full px-2 py-1 border rounded'
														value={
															editChannelData?.channel_name ||
															""
														}
														onChange={(e) =>
															setEditChannelData(
																(d) =>
																	d
																		? {
																				...d,
																				channel_name:
																					e
																						.target
																						.value,
																		  }
																		: d
															)
														}
														required
													/>
												</label>
												<label className='block text-sm font-medium text-gray-700'>
													Sensor Type
													<input
														type='text'
														className='w-full px-2 py-1 border rounded'
														value={
															editChannelData?.sensor_type ||
															""
														}
														onChange={(e) =>
															setEditChannelData(
																(d) =>
																	d
																		? {
																				...d,
																				sensor_type:
																					e
																						.target
																						.value,
																		  }
																		: d
															)
														}
													/>
												</label>
												<label className='block text-sm font-medium text-gray-700'>
													Data Type
													<input
														type='text'
														className='w-full px-2 py-1 border rounded'
														value={
															editChannelData?.data_type ||
															""
														}
														onChange={(e) =>
															setEditChannelData(
																(d) =>
																	d
																		? {
																				...d,
																				data_type:
																					e
																						.target
																						.value,
																		  }
																		: d
															)
														}
													/>
												</label>
												<label className='block text-sm font-medium text-gray-700'>
													Frame Offset
													<input
														type='number'
														className='w-full px-2 py-1 border rounded'
														value={
															editChannelData?.frame_offset ??
															0
														}
														onChange={(e) =>
															setEditChannelData(
																(d) =>
																	d
																		? {
																				...d,
																				frame_offset:
																					Number(
																						e
																							.target
																							.value
																					),
																		  }
																		: d
															)
														}
													/>
												</label>
												<label className='block text-sm font-medium text-gray-700'>
													Samples/Frame
													<input
														type='number'
														className='w-full px-2 py-1 border rounded'
														value={
															editChannelData?.samples_per_frame ??
															0
														}
														onChange={(e) =>
															setEditChannelData(
																(d) =>
																	d
																		? {
																				...d,
																				samples_per_frame:
																					Number(
																						e
																							.target
																							.value
																					),
																		  }
																		: d
															)
														}
													/>
												</label>
												<label className='block text-sm font-medium text-gray-700'>
													Sampling Frequency
													<input
														type='number'
														className='w-full px-2 py-1 border rounded'
														value={
															editChannelData?.sampling_frequency ??
															0
														}
														onChange={(e) =>
															setEditChannelData(
																(d) =>
																	d
																		? {
																				...d,
																				sampling_frequency:
																					Number(
																						e
																							.target
																							.value
																					),
																		  }
																		: d
															)
														}
													/>
												</label>
												<label className='block text-sm font-medium text-gray-700'>
													Physical Unit
													<input
														type='text'
														className='w-full px-2 py-1 border rounded'
														value={
															editChannelData?.physical_unit ||
															""
														}
														onChange={(e) =>
															setEditChannelData(
																(d) =>
																	d
																		? {
																				...d,
																				physical_unit:
																					e
																						.target
																						.value,
																		  }
																		: d
															)
														}
													/>
												</label>
												<label className='block text-sm font-medium text-gray-700'>
													Range Min
													<input
														type='number'
														className='w-full px-2 py-1 border rounded'
														value={
															editChannelData?.measurement_range_min ??
															0
														}
														onChange={(e) =>
															setEditChannelData(
																(d) =>
																	d
																		? {
																				...d,
																				measurement_range_min:
																					Number(
																						e
																							.target
																							.value
																					),
																		  }
																		: d
															)
														}
													/>
												</label>
												<label className='block text-sm font-medium text-gray-700'>
													Range Max
													<input
														type='number'
														className='w-full px-2 py-1 border rounded'
														value={
															editChannelData?.measurement_range_max ??
															0
														}
														onChange={(e) =>
															setEditChannelData(
																(d) =>
																	d
																		? {
																				...d,
																				measurement_range_max:
																					Number(
																						e
																							.target
																							.value
																					),
																		  }
																		: d
															)
														}
													/>
												</label>
											</div>
											<div className='flex justify-end space-x-2'>
												<button
													type='button'
													onClick={() => {
														setEditMode(false);
														setEditChannelData(
															editingChannel
														);
													}}
													className='px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md'
												>
													Cancel
												</button>
												<button
													type='submit'
													className='px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md'
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
				)}{" "}
				{/* Remove old experiments tab - replaced with live-experiments and data-explorer */}
				<div className='space-y-6'>
					{/* Experiment Creation Actions */}
					<div className='bg-white p-6 rounded-lg border border-gray-200'>
						<h3 className='text-lg font-medium text-gray-900 mb-4'>
							Create New Experiment
						</h3>
						<div className='space-y-4'>
							{device.status === "Active" ? (
								<div className='grid grid-cols-1 gap-4'>
									{/* Offline Experiment */}
									<div className='border border-gray-200 rounded-lg p-4'>
										<div className='flex items-center mb-3'>
											<div className='w-2 h-2 bg-blue-500 rounded-full mr-2'></div>
											<h4 className='text-lg font-medium text-gray-900'>
												Experiment
											</h4>
										</div>
										<p className='text-sm text-gray-600 mb-4'>
											Create a new experiment for data
											collection and analysis.
										</p>
										<Link
											href={`/devices/${deviceId}/experiments/create`}
											className='w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700'
										>
											Create Experiment
										</Link>
									</div>
								</div>
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
												This device must be activated
												before you can create
												experiments.
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
					</div>
					{activeExperiments.length === 0 && (
						<div className='bg-gray-50 border border-gray-200 rounded-lg p-6 text-center'>
							<h3 className='text-lg font-medium text-gray-900 mb-2'>
								No Active Experiments
							</h3>{" "}
							<p className='text-gray-600'>
								This device doesn't have any active experiments.
								Create one to start collecting data.
							</p>
						</div>
					)}{" "}
				</div>
			</div>
		</PageLayout>
	);
}
