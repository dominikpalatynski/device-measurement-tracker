"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PageLayout from "@/components/PageLayout";
import DeviceProtectedRoute from "@/components/DeviceProtectedRoute";
import {
	deviceApi,
	faultApi,
	Device,
	Fault,
	getAllMeasurements,
	getLatestMeasurement,
	getMeasurementStats,
	getUnassignedMeasurements,
	getMongoMeasurements,
	getUnknownDataSeriesList,
	Measurement,
	MeasurementStats,
	MeasurementData,
	measurementChannelApi,
	MeasurementChannel,
} from "@/services/api";
import { formatDate, formatDateShort } from "@/utils/dateUtils";
import AdvancedZoomChart from "@/components/AdvancedZoomChart";

export default function DeviceDetailPage() {
	const params = useParams();
	const router = useRouter();
	const deviceId = params.deviceId as string;

	const [device, setDevice] = useState<Device | null>(null);
	const [measurements, setMeasurements] = useState<Measurement[]>([]);
	const [latestMeasurement, setLatestMeasurement] =
		useState<Measurement | null>(null);
	const [stats, setStats] = useState<MeasurementStats | null>(null);
	const [activeFaults, setActiveFaults] = useState<Fault[]>([]);
	const [allFaults, setAllFaults] = useState<Fault[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<
		"overview" | "live-faults" | "data-explorer" | "channels"
	>("overview");
	// Unassigned data state
	const [unassignedData, setUnassignedData] = useState<MeasurementData[]>([]);
	const [unassignedDataLoading, setUnassignedDataLoading] = useState(false);
	const [activeChartTab, setActiveChartTab] = useState<string>("");

	// Date range state for filtering charts
	const [startDate, setStartDate] = useState<string>("");
	const [endDate, setEndDate] = useState<string>("");

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

	// Token regeneration state
	const [showTokenModal, setShowTokenModal] = useState(false);
	const [regeneratedToken, setRegeneratedToken] = useState<string | null>(
		null
	);
	const [tokenLoading, setTokenLoading] = useState(false);

	// Batch token state
	const [showBatchTokenModal, setShowBatchTokenModal] = useState(false);
	const [batchToken, setBatchToken] = useState<string | null>(null);
	const [batchTokenLoading, setBatchTokenLoading] = useState(false);

	// Unknown data series list state
	const [unknownDataSeriesList, setUnknownDataSeriesList] = useState<string[]>([]);
	const [unknownDataSeriesLoading, setUnknownDataSeriesLoading] = useState(false);
	const [unknownDataSeriesError, setUnknownDataSeriesError] = useState<string | null>(null);
	const [unknownDebugInfo, setUnknownDebugInfo] = useState<any>(null);



	// Fetch channels from backend
	const fetchChannels = async () => {
		setChannelsLoading(true);
		const data = await measurementChannelApi.getChannels();
		setChannels(data);
		setChannelsLoading(false);
	};

	// Load unknown data series list
	const loadUnknownDataSeriesList = async () => {
		if (!device) return;
		
		try {
			setUnknownDataSeriesLoading(true);
			setUnknownDataSeriesError(null);
			
			const response = await getUnknownDataSeriesList(device.device_id);
			
			if (response.success) {
				setUnknownDataSeriesList(response.data);
				setUnknownDebugInfo((response as any).debug_info);
				console.log("Unknown data series list loaded:", response.data);
				console.log("Debug info:", (response as any).debug_info);
			} else {
				setUnknownDataSeriesError(response.error || "Failed to load unknown data series list");
				setUnknownDebugInfo((response as any).debug_info);
				console.error("API Error:", response.error);
				console.error("Debug info:", (response as any).debug_info);
			}
		} catch (error) {
			setUnknownDataSeriesError(error instanceof Error ? error.message : "Unknown error");
			console.error("Error loading unknown data series list:", error);
		} finally {
			setUnknownDataSeriesLoading(false);
		}
	};


	// Fetch unassigned measurement data from MongoDB
	const fetchUnassignedData = async (
		useStartDate?: string,
		useEndDate?: string
	) => {
		if (!device) return;

		setUnassignedDataLoading(true);
		try {
			let timeRange: string | undefined;

			// Convert date range to time range if provided
			const filterStartDate = useStartDate || startDate;
			const filterEndDate = useEndDate || endDate;
			if (filterStartDate || filterEndDate) {
				const start = filterStartDate
					? new Date(filterStartDate).getTime() / 1000
					: 0;
				const end = filterEndDate
					? new Date(filterEndDate).getTime() / 1000
					: Date.now() / 1000;
				timeRange = `${start}-${end}`;
			}

			const response = await getMongoMeasurements(
				device.device_id, // deviceId
				undefined, // faultId - fetch unassigned data
				undefined, // conditionId - fetch unassigned data
				undefined, // dataSeriesId
				timeRange,
				1000, // limit
				0, // offset
				true // includeData
			);

			if (response.success && response.data) {
				// Convert MongoDB data to the format expected by the frontend
				const convertedData: MeasurementData[] = response.data.map(
					(item: any) => {
						// Safely handle timestamp conversion
						let timestamp: string;
						try {
							// Check if timestamp exists and is valid
							if (item.timestamp && !isNaN(item.timestamp)) {
								timestamp = new Date(item.timestamp * 1000).toISOString();
							} else {
								// Fallback to current timestamp if invalid
								timestamp = new Date().toISOString();
								console.warn('Invalid timestamp for item:', item._id, 'using current time');
							}
						} catch (error) {
							console.error('Error converting timestamp for item:', item._id, error);
							timestamp = new Date().toISOString();
						}

						return {
							data_id: item._id || "",
							device_id: item.deviceId || device.device_id,
							fault_id: item.faultId || null,
							condition_id: item.conditionId || null,
							timestamp: timestamp,
							data_payload: item.data_payload || {},
							upload_type: "batch",
							created_at: timestamp,
							updated_at: timestamp,
						};
					}
				);
				setUnassignedData(convertedData);
			} else {
				console.error(
					"Error fetching data from MongoDB:",
					response.error
				);
				setUnassignedData([]);
			}
		} catch (error) {
			console.error("Error fetching unassigned data:", error);
			setUnassignedData([]);
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
			loadUnknownDataSeriesList();
		}
	}, [device, activeTab]);

	// Extract and process chart data from unassigned measurements
	const getUnassignedChartData = () => {
		if (!unassignedData.length) return {};

		const chartData: Record<
			string,
			Array<{
				timestamp: number;
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
									timestamp: Date.parse(timestamp),
									value: val,
									timestampFormatted: `${timestampFormatted} [${arrayIndex}]`,
									index: measurementIndex * 1000 + arrayIndex,
								});
							}
						});
					} else if (typeof value === "number") {
						// If it's a single number, create one data point
						chartData[key].push({
							timestamp: Date.parse(timestamp),
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
			// Load active faults for this device
			const faultsData = await faultApi.getFaults();
			const deviceFaults = faultsData.filter(
				(fault) => fault.device_id === deviceData.device_id
			);
			const activeDeviceFaults = deviceFaults.filter(
				(fault) => fault.status === "Active"
			);

			setAllFaults(deviceFaults);
			setActiveFaults(activeDeviceFaults);

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
				setDevice({ ...device, status: "Inactive" });
			} else {
				console.log("Success:", success);
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

	const handleRegenerateToken = async () => {
		if (!device) return;

		setTokenLoading(true);
		try {
			const response = await deviceApi.regenerateToken(device.device_id);
			if (response.success && response.data) {
				setRegeneratedToken(response.data.verification_token);
				setShowTokenModal(true);
			} else {
				setError(response.error || "Failed to regenerate token");
			}
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to regenerate token"
			);
		} finally {
			setTokenLoading(false);
		}
	};

	const handleGenerateBatchToken = async () => {
		if (!device) return;

		setBatchTokenLoading(true);
		try {
			// Call backend API to generate a proper JWT batch token
			const response = await deviceApi.generateBatchToken(device.device_id);
			
			if (response.success && response.data) {
				setBatchToken(response.data.batch_token);
				setShowBatchTokenModal(true);
			} else {
				throw new Error(response.error || "Failed to generate batch token");
			}
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to generate batch token"
			);
		} finally {
			setBatchTokenLoading(false);
		}
	};
	const getStatusColor = (status: Device["status"]) => {
		switch (status) {
			case "Active":
				return "bg-green-100 text-green-800";
			case "Inactive":
				return "bg-red-100 text-red-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};
	const getStatusText = (status: Device["status"]) => {
		switch (status) {
			case "Active":
				return "Active";
			case "Inactive":
				return "Inactive";
			default:
				return status;
		}
	};
	const getDeviceIcon = (type: string) => {
		switch (type) {
			case "pmsm-mechanical-vibration":
				return "PMSM-MECHANICAL-VIBRATION";
			case "bldc-high-speed":
				return "BLDC-HIGH-SPEED";
			case "pmsm-torque-load":
				return "PMSM-TORQUE-LOAD";
			default:
				return "DEVICE";
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
		<DeviceProtectedRoute deviceId={deviceId}>
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
									<span className='text-xl mr-3 text-center text-gray-500'>
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
							{/* Activate Controls - For Inactive devices */}
							{device.status === "Inactive" && (
								<button
									onClick={handleActivateDevice}
									className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700'
								>
									✅ Activate Device
								</button>
							)}
							{/* Deactivate Controls - For Active devices */}
							{device.status === "Active" && (
								<button
									onClick={handleDeactivateDevice}
									className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700'
								>
									⏸️ Deactivate
								</button>
							)}{" "}
							{/* Fault Controls - Only for Active devices */}
							{device.status === "Active" && (
								<>
									{/* Always show option to create Offline fault */}{" "}
									<Link
										href={`/devices/${deviceId}/faults/create`}
										className='inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50'
									>
										Create Fault
									</Link>
								</>
							)}
							{/* BatchToken button */}
							<button
								onClick={handleGenerateBatchToken}
								disabled={batchTokenLoading}
								className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50'
							>
								{batchTokenLoading ? "..." : "🔑 BatchToken"}
							</button>
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
							<p className='text-gray-600'>
								{device.device_type}
							</p>
						</div>
						<div className='bg-white p-6 rounded-lg border border-gray-200'>
							<h3 className='text-lg font-medium text-gray-900 mb-2'>
								Last Updated
							</h3>
							<p className='text-gray-600'>
								{device.last_updated
									? new Date(
											device.last_updated
									  ).toLocaleString()
									: "N/A"}
							</p>
						</div>
					</div>{" "}
					{/* Tabs */}{" "}
					<div className='border-b border-gray-200 mb-6'>
						<nav className='-mb-px flex space-x-8'>
							{[
								"overview",
								"live-faults",
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
									{" "}
									{tab === "live-faults"
										? "Faults"
										: tab === "data-explorer"
										? "Unassigned Data Explorer"
										: tab === "channels"
										? "Channels"
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
											<div className='text-2xl mb-1'>
												<svg
													className='w-8 h-8 text-blue-500'
													fill='none'
													stroke='currentColor'
													viewBox='0 0 24 24'
												>
													<path
														strokeLinecap='round'
														strokeLinejoin='round'
														strokeWidth={2}
														d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
													/>
												</svg>
											</div>
											<div className='text-2xl font-bold text-blue-600'>
												{latestMeasurement.temperature}
												°C
											</div>
											<div className='text-sm text-gray-500'>
												Temperature
											</div>
										</div>
										<div className='text-center'>
											<div className='text-2xl mb-1'>
												<svg
													className='w-8 h-8 text-blue-500'
													fill='none'
													stroke='currentColor'
													viewBox='0 0 24 24'
												>
													<path
														strokeLinecap='round'
														strokeLinejoin='round'
														strokeWidth={2}
														d='M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM7 3H5v12a2 2 0 002 2 2 2 0 002-2V3z'
													/>
												</svg>
											</div>
											<div className='text-2xl font-bold text-blue-600'>
												{latestMeasurement.humidity}%
											</div>
											<div className='text-sm text-gray-500'>
												Humidity
											</div>
										</div>{" "}
										<div className='text-center'>
											<div className='text-2xl mb-1'>
												<svg
													className='w-8 h-8 text-blue-500'
													fill='none'
													stroke='currentColor'
													viewBox='0 0 24 24'
												>
													<path
														strokeLinecap='round'
														strokeLinejoin='round'
														strokeWidth={2}
														d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
													/>
												</svg>
											</div>
											<div className='text-2xl font-bold text-blue-600'>
												{latestMeasurement.pressure} hPa
											</div>
											<div className='text-sm text-gray-500'>
												Pressure
											</div>
										</div>
										<div className='text-center'>
											<div className='text-2xl mb-1'>
												<svg
													className='w-8 h-8 text-blue-500'
													fill='none'
													stroke='currentColor'
													viewBox='0 0 24 24'
												>
													<path
														strokeLinecap='round'
														strokeLinejoin='round'
														strokeWidth={2}
														d='M13 10V3L4 14h7v7l9-11h-7z'
													/>
												</svg>
											</div>
											<div className='text-2xl font-bold text-blue-600'>
												{
													latestMeasurement.battery_level
												}
												%
											</div>
											<div className='text-sm text-gray-500'>
												Battery
											</div>
										</div>
									</div>
									<p className='text-sm text-gray-500 mt-4'>
										Measured at:{" "}
										{latestMeasurement.measured_at}
									</p>
								</div>
							) : (
								<div className='bg-yellow-50 border border-yellow-200 rounded-lg p-6'>
									<h3 className='text-lg font-medium text-yellow-800 mb-2'>
										No Measurements
									</h3>
									<p className='text-yellow-700'>
										This device hasn't reported any
										measurements yet.
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
										<dd className='text-sm text-gray-500 font-mono'>
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
											Faults
										</dt>
										<dd className='text-sm text-gray-900'>
											{allFaults.length} total
											{activeFaults.length > 0
												? ` (${activeFaults.length} active)`
												: ""}
										</dd>
									</div>{" "}
								</dl>
							</div>

							{/* Fault Summary */}
							{allFaults.length > 0 && (
								<div className='bg-white p-6 rounded-lg border border-gray-200'>
									<h3 className='text-lg font-medium text-gray-900 mb-4'>
										Fault Summary
									</h3>{" "}
									<div className='grid grid-cols-1 md:grid-cols-6 gap-4'>
										<div className='text-center'>
											<div className='text-2xl mb-1'>
												🧪
											</div>
											<div className='text-2xl font-bold text-blue-600'>
												{allFaults.length}
											</div>
											<div className='text-sm text-gray-500'>
												Total
											</div>
										</div>
										<div className='text-center'>
											<div className='text-2xl mb-1'>
												🟢
											</div>
											<div className='text-2xl font-bold text-green-600'>
												{activeFaults.length}
											</div>
											<div className='text-sm text-gray-500'>
												Active
											</div>
										</div>
										<div className='text-center'>
											<div className='text-2xl mb-1'>
												�
											</div>
											<div className='text-2xl font-bold text-blue-600'>
												{allFaults.length}
											</div>
											<div className='text-sm text-gray-500'>
												Total Faults
											</div>
										</div>
										<div className='text-center'>
											<div className='text-2xl mb-1'>
												⏸️
											</div>
											<div className='text-2xl font-bold text-yellow-600'>
												{
													allFaults.filter(
														(fault) =>
															fault.status ===
															"Inactive"
													).length
												}
											</div>
											<div className='text-sm text-gray-500'>
												Inactive
											</div>
										</div>
									</div>
									{/* Quick Actions */}
									{/* <div className='mt-6 flex flex-wrap gap-3'>
									<Link
										href={`/devices/${deviceId}/faults/create`}
										className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700'
									>
										➕ Create New Fault
									</Link>
									{activeFaults.length > 0 && (
										<Link
											href={`/devices/${deviceId}/faults/${activeFaults[0].fault_id}`}
											className='inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50'
										>
											👁️ View Active Fault
										</Link>
									)}
								</div> */}
								</div>
							)}
						</div>
					)}
					{activeTab === "live-faults" && (
						<div className='space-y-6'>
							{/* Live Fault Management */}
							<div className='bg-white p-6 rounded-lg border border-gray-200'>
								<h3 className='text-lg font-medium text-gray-900 mb-4'>
									🧪 Live Fault Management
								</h3>

								{device.status !== "Active" ? (
									<div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4'>
										<div className='flex items-center justify-between'>
											<div className='flex items-center'>
												<div className='text-yellow-400 mr-3'>
													⚠️
												</div>
												<div>
													<h4 className='font-medium text-yellow-800'>
														Device Not Active
													</h4>
													<p className='text-sm text-yellow-700 mt-1'>
														The device must be
														active to start live
														faults.
													</p>
												</div>
											</div>
											{device.status === "Inactive" && (
												<button
													onClick={
														handleActivateDevice
													}
													className='inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700'
												>
													✅ Activate
												</button>
											)}
										</div>
									</div>
								) : (
									<>
										{/* Current Live Fault Status */}
										{activeFaults.filter(
											(fault) => fault.status === "Active"
										).length > 0 ? (
											<div className='bg-green-50 border border-green-200 rounded-lg p-4 mb-4'>
												<div className='flex justify-between items-center'>
													<div>
														<h4 className='font-medium text-green-800'>
															🟢 Live Fault Active
														</h4>
														{activeFaults
															.filter(
																(fault) =>
																	fault.status ===
																	"Active"
															)
															.map((fault) => (
																<div
																	key={
																		fault.fault_id
																	}
																	className='text-sm text-green-700 mt-1'
																>
																	{" "}
																	<div>
																		Name:{" "}
																		{fault.fault_name ||
																			fault.fault_id}
																	</div>
																	<div className='flex items-center space-x-2'>
																		<span>
																			Type:
																		</span>
																	</div>
																	<div>
																		Started:{" "}
																		{new Date(
																			fault.start_date
																		).toLocaleString()}
																	</div>
																</div>
															))}
													</div>
													<div className='space-x-2'>
														{activeFaults
															.filter(
																(fault) =>
																	fault.status ===
																	"Active"
															)
															.map((fault) => (
																<Link
																	key={
																		fault.fault_id
																	}
																	href={`/devices/${deviceId}/faults/${fault.fault_id}`}
																	className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700'
																>
																	Manage Fault
																</Link>
															))}
													</div>
												</div>
											</div>
										) : (
											<div className='bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4'>
												<h4 className='font-medium text-blue-800 mb-2'>
													No Active Live Faults
												</h4>
												<p className='text-sm text-blue-700'>
													View fault history below or
													create a new fault.
												</p>
											</div>
										)}
									</>
								)}
							</div>
							{/* Faults History */}
							<div className='bg-white p-6 rounded-lg border border-gray-200'>
								<h3 className='text-lg font-medium text-gray-900 mb-4'>
									📋 All Faults
								</h3>{" "}
								{allFaults.length > 0 ? (
									<div className='space-y-6'>
										{/* Previous Faults */}
										{allFaults.filter(
											(fault) =>
												!activeFaults.some(
													(active) =>
														active.fault_id ===
														fault.fault_id
												)
										).length > 0 && (
											<div>
												<h4 className='text-md font-medium text-gray-700 mb-3 flex items-center'>
													<span className='w-3 h-3 bg-gray-400 rounded-full mr-2'></span>
													Previous Faults (
													{
														allFaults.filter(
															(fault) =>
																!activeFaults.some(
																	(active) =>
																		active.fault_id ===
																		fault.fault_id
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
																	Fault
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
															{allFaults
																.filter(
																	(fault) =>
																		!activeFaults.some(
																			(
																				active
																			) =>
																				active.fault_id ===
																				fault.fault_id
																		)
																)
																.map(
																	(fault) => (
																		<tr
																			key={
																				fault.fault_id
																			}
																			className='opacity-75'
																		>
																			{" "}
																			<td className='px-6 py-4 whitespace-nowrap'>
																				<div className='text-sm font-medium text-gray-900'>
																					{fault.fault_name ||
																						fault.fault_id}
																				</div>
																				<div className='text-sm text-gray-500'>
																					{fault.description ||
																						"No description"}
																				</div>
																			</td>
																			<td className='px-6 py-4 whitespace-nowrap'>
																				<span
																					className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
																						fault.status ===
																						"Active"
																							? "bg-green-100 text-green-800"
																							: "bg-red-100 text-red-800"
																					}`}
																				>
																					{
																						fault.status
																					}
																				</span>
																			</td>
																			<td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
																				{new Date(
																					fault.start_date
																				).toLocaleDateString()}
																			</td>
																			<td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
																				{fault.end_date
																					? new Date(
																							fault.end_date
																					  ).toLocaleDateString()
																					: "-"}
																			</td>
																			<td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
																				<Link
																					href={`/devices/${deviceId}/faults/${fault.fault_id}`}
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
										<p>No faults found for this device.</p>
										<p className='text-sm'>
											Start your first live fault above.
										</p>
									</div>
								)}{" "}
							</div>
						</div>
					)}{" "}
					{activeTab === "data-explorer" && (
						<div className='space-y-6'>
							{" "}
							{/* Unassigned Data Header */}
							<div className='bg-white p-6 rounded-lg border border-gray-200'>
								<div className='flex justify-between items-center mb-4'>
									<div>
										<h3 className='text-lg font-medium text-gray-900'>
											📊 Unassigned Data Explorer
										</h3>
										<p className='text-sm text-gray-500'>
											Interactive visualization of
											measurement data not assigned to any
											fault
										</p>
									</div>{" "}
									<div className='flex items-center space-x-4'>
										<button
											onClick={() =>
												fetchUnassignedData()
											}
											disabled={unassignedDataLoading}
											className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50'
										>
											{unassignedDataLoading
												? "Loading..."
												: "Refresh Data"}
										</button>
										<button
											onClick={() =>
												loadUnknownDataSeriesList()
											}
											disabled={unknownDataSeriesLoading}
											className='px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50'
										>
											{unknownDataSeriesLoading
												? "Loading..."
												: "Refresh Unknown Series"}
										</button>
										<div className='text-sm text-gray-600'>
											{unassignedData.length} data points
										</div>
									</div>
								</div>
							</div>
							{/* Filter Controls - Always Visible */}
							<div className='bg-white p-6 rounded-lg border border-gray-200'>
								<div className='flex justify-between items-center mb-4'>
									<h4 className='text-lg font-medium text-gray-900'>
										Data Filters & Chart Controls
									</h4>
									<div className='flex items-center space-x-4'>
										{/* Date Range Selectors */}
										<div className='flex items-center space-x-2'>
											<label className='text-sm font-medium text-gray-700'>
												From:
											</label>
											<input
												type='datetime-local'
												value={startDate}
												onChange={(e) =>
													setStartDate(e.target.value)
												}
												className='px-2 py-1 border border-gray-300 rounded-md text-sm'
											/>
										</div>
										<div className='flex items-center space-x-2'>
											<label className='text-sm font-medium text-gray-700'>
												To:
											</label>
											<input
												type='datetime-local'
												value={endDate}
												onChange={(e) =>
													setEndDate(e.target.value)
												}
												className='px-2 py-1 border border-gray-300 rounded-md text-sm'
											/>
										</div>
										<button
											onClick={() =>
												fetchUnassignedData()
											}
											className='px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm'
										>
											Filter
										</button>
										<button
											onClick={() => {
												setStartDate("");
												setEndDate("");
												fetchUnassignedData("", "");
											}}
											className='px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm'
										>
											Clear
										</button>
									</div>
								</div>
							</div>{" "}

							{/* Unknown Data Series List */}
							<div className='bg-white p-6 rounded-lg border border-gray-200'>
								<h3 className='text-lg font-medium text-gray-900 mb-4'>
									📊 Unknown Data Series
								</h3>
								
								{unknownDataSeriesLoading ? (
									<div className='flex items-center justify-center py-8'>
										<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
										<span className='ml-2 text-gray-600'>Loading unknown data series...</span>
									</div>
								) : unknownDataSeriesError ? (
									<div className='bg-red-50 border border-red-200 rounded-lg p-4'>
										<div className='text-red-800 font-medium'>Error loading unknown data series</div>
										<div className='text-red-600 text-sm mt-1'>{unknownDataSeriesError}</div>
									</div>
								) : unknownDataSeriesList.length > 0 ? (
									<div className='space-y-4'>
										<div className='text-sm text-gray-600 mb-3'>
											Found {unknownDataSeriesList.length} unique data series for unknown conditions/faults:
										</div>
										<div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3'>
											{unknownDataSeriesList.map((seriesId, index) => (
												<div
													key={seriesId}
													onClick={() => {
														router.push(`/devices/${device?.device_id}/unassigned-data/${seriesId}`);
													}}
													className='bg-orange-50 border border-orange-200 rounded-lg p-3 transition-all hover:bg-orange-100 hover:border-orange-300 hover:shadow-md cursor-pointer'
												>
													<div className='text-center'>
														<div className='text-2xl mb-2'>🔍</div>
														<div className='font-medium text-orange-900 text-sm'>
															Series {seriesId}
														</div>
														<div className='text-xs text-orange-600 mt-1'>
															Click to view detailed analysis
														</div>
													</div>
												</div>
											))}
										</div>


										<div className='text-xs text-gray-500 mt-4'>
											💡 These data series are from measurements with unknown_condition and unknown_fault labels.
										</div>
									</div>
								) : (
									<div className='space-y-4'>
										<div className='text-center py-8 bg-gray-50 rounded-lg'>
											<div className='text-gray-400 text-4xl mb-4'>🔍</div>
											<h4 className='text-lg font-medium text-gray-600 mb-2'>
												No Unknown Data Series Found
											</h4>
											<p className='text-gray-500 mb-4'>
												No data series were found for unknown conditions/faults. This means:
											</p>
											<ul className='text-sm text-gray-400 space-y-1'>
												<li>• No measurements with unknown conditions have been recorded</li>
												<li>• All measurements are properly assigned to faults</li>
												<li>• Data might be stored under different identifiers</li>
											</ul>
										</div>
										
										{/* Debug Information */}
										{unknownDebugInfo && (
											<div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4'>
												<h5 className='text-sm font-medium text-yellow-800 mb-3'>🔍 Debug Information</h5>
												<div className='text-xs space-y-2'>
													{unknownDebugInfo.filter_conditions && (
														<div>
															<span className='font-medium text-yellow-800'>Search Filters:</span>
															<pre className='bg-yellow-100 p-2 rounded mt-1 text-xs overflow-auto'>
																{JSON.stringify(unknownDebugInfo.filter_conditions, null, 2)}
															</pre>
														</div>
													)}
													{unknownDebugInfo.sample_measurements && (
														<div>
															<span className='font-medium text-yellow-800'>Sample Measurements:</span>
															<pre className='bg-yellow-100 p-2 rounded mt-1 text-xs overflow-auto'>
																{typeof unknownDebugInfo.sample_measurements === 'string' 
																	? unknownDebugInfo.sample_measurements 
																	: JSON.stringify(unknownDebugInfo.sample_measurements, null, 2)}
															</pre>
														</div>
													)}
												</div>
											</div>
										)}
									</div>
								)}
							</div>

							{/* Charts Section */}
							{unassignedData.length > 0 ? (
								<div className='bg-white p-6 rounded-lg border border-gray-200'>
									<div className='flex justify-between items-center mb-6'>
										<h4 className='text-lg font-medium text-gray-900'>
											Interactive Charts
										</h4>
									</div>
									{/* Chart Tabs */}
									{(() => {
										const chartKeys =
											getUnassignedChartKeys();
										const currentKey =
											activeChartTab || chartKeys[0];
										const chartData =
											getUnassignedChartData();

										if (chartKeys.length === 0) {
											return (
												<div className='text-center py-8'>
													<p className='text-gray-500'>
														No numeric data
														available for charting
													</p>
												</div>
											);
										}

										return (
											<div>
												{/* Tab Navigation */}
												<div className='border-b border-gray-200 mb-6'>
													<nav className='-mb-px flex space-x-8'>
														{chartKeys.map(
															(key) => (
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
															)
														)}
													</nav>
												</div>

												{/* Advanced Chart Display */}
												{chartData[currentKey] && (
													<div className='space-y-6'>
														<AdvancedZoomChart
															data={
																chartData[
																	currentKey
																]
															}
															dataKey='value'
															xAxisKey='timestampFormatted'
															title={`${currentKey} - Advanced Data Analysis`}
															color='#2563eb'
															height={500}
															enableBrush={true}
															enableMagnifier={
																true
															}
															enableCrosshair={
																true
															}
															downsampleThreshold={
																10000
															}
														/>
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
																			(
																				d
																			) =>
																				d.value
																		)
																	).toFixed(
																		2
																	)}
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
																			(
																				d
																			) =>
																				d.value
																		)
																	).toFixed(
																		2
																	)}
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
													No unassigned measurement
													data found for this device.
												</p>
												<p className='text-sm text-gray-400 mt-2'>
													Data appears here when
													measurements are uploaded
													without being assigned to a
													fault.
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
									onClick={() =>
										setShowCreateChannelModal(true)
									}
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
													setShowCreateChannelModal(
														false
													)
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
												setShowCreateChannelModal(
													false
												);
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
																			e
																				.target
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
																			e
																				.target
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
																			e
																				.target
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
																			e
																				.target
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
																			e
																				.target
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
														{
															editingChannel.sensor_type
														}
													</dd>
													<dt className='font-medium text-gray-500'>
														Data Type
													</dt>
													<dd className='text-gray-900'>
														{
															editingChannel.data_type
														}
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
													if (!editChannelData)
														return;
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
					{/* Token Regeneration Modal */}
					{showTokenModal && regeneratedToken && (
						<div className='fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50'>
							<div className='bg-white rounded-lg max-w-md w-full p-6'>
								<div className='flex justify-between items-center mb-4'>
									<h4 className='text-lg font-bold text-gray-900'>
										New Verification Token Generated
									</h4>
									<button
										onClick={() => {
											setShowTokenModal(false);
											setRegeneratedToken(null);
										}}
										className='text-gray-500 hover:text-gray-700'
									>
										✕
									</button>
								</div>
								<div className='space-y-4'>
									<div className='bg-green-50 border border-green-200 rounded-lg p-4'>
										<div className='flex items-center'>
											<div className='text-green-400 mr-3'>
												✅
											</div>
											<div>
												<h4 className='font-medium text-green-800'>
													Token Generated Successfully
												</h4>
												<p className='text-sm text-green-700 mt-1'>
													Use this token to register
													your device. It will expire
													in 1 hour.
												</p>
											</div>
										</div>
									</div>
									<div className='space-y-2'>
										<label className='block text-sm font-medium text-gray-700'>
											Device ID
										</label>
										<div className='flex'>
											<input
												type='text'
												value={device?.device_id || ""}
												readOnly
												className='flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-sm font-mono text-gray-500'
											/>
											<button
												onClick={() =>
													navigator.clipboard.writeText(
														device?.device_id || ""
													)
												}
												className='px-3 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 text-sm'
											>
												Copy
											</button>
										</div>
									</div>
									<div className='space-y-2'>
										<label className='block text-sm font-medium text-gray-700'>
											Verification Token
										</label>
										<div className='flex'>
											<input
												type='text'
												value={regeneratedToken}
												readOnly
												className='flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-sm font-mono text-gray-500'
											/>
											<button
												onClick={() =>
													navigator.clipboard.writeText(
														regeneratedToken
													)
												}
												className='px-3 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 text-sm'
											>
												Copy
											</button>
										</div>
									</div>
									<div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
										<h5 className='font-medium text-blue-800 mb-2'>
											Registration Command
										</h5>
										<p className='text-sm text-blue-700 mb-2'>
											Use this command to register your
											device:
										</p>
										<div className='bg-gray-800 text-green-400 p-2 rounded text-xs font-mono overflow-x-auto'>
											{`python register_device.py --token ${regeneratedToken} --device-id ${device?.device_id}`}
										</div>
										<button
											onClick={() =>
												navigator.clipboard.writeText(
													`python register_device.py --token ${regeneratedToken} --device-id ${device?.device_id}`
												)
											}
											className='mt-2 text-xs text-blue-600 hover:text-blue-800'
										>
											📋 Copy command
										</button>
									</div>
								</div>
								<div className='flex justify-end mt-6'>
									<button
										onClick={() => {
											setShowTokenModal(false);
											setRegeneratedToken(null);
										}}
										className='px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md'
									>
										Close
									</button>
								</div>
							</div>
						</div>
					)}

					{/* Batch Token Modal */}
					{showBatchTokenModal && batchToken && (
						<div className='fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50'>
							<div className='bg-white rounded-lg max-w-lg w-full p-6'>
								<div className='flex justify-between items-center mb-4'>
									<h4 className='text-lg font-bold text-gray-900'>
										🔑 Batch Token Generated
									</h4>
									<button
										onClick={() => {
											setShowBatchTokenModal(false);
											setBatchToken(null);
										}}
										className='text-gray-500 hover:text-gray-700'
									>
										✕
									</button>
								</div>
								<div className='space-y-4'>
									<div className='bg-purple-50 border border-purple-200 rounded-lg p-4'>
										<div className='flex items-center'>
											<div className='text-purple-400 mr-3'>
												🔐
											</div>
											<div>
												<h4 className='font-medium text-purple-800'>
													Batch Token Generated Successfully
												</h4>
												<p className='text-sm text-purple-700 mt-1'>
													Use this JWT token for batch operations with this device. 
													Token expires in 1 hour.
												</p>
											</div>
										</div>
									</div>
									<div className='space-y-2'>
										<label className='block text-sm font-medium text-gray-700'>
											Device ID
										</label>
										<div className='flex'>
											<input
												type='text'
												value={device?.device_id || ""}
												readOnly
												className='flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-sm font-mono text-gray-500'
											/>
											<button
												onClick={() =>
													navigator.clipboard.writeText(
														device?.device_id || ""
													)
												}
												className='px-3 py-2 bg-purple-600 text-white rounded-r-md hover:bg-purple-700 text-sm'
											>
												Copy
											</button>
										</div>
									</div>
									<div className='space-y-2'>
										<label className='block text-sm font-medium text-gray-700'>
											JWT Batch Token
										</label>
										<div className='flex'>
											<textarea
												value={batchToken}
												readOnly
												rows={4}
												className='flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-xs font-mono text-gray-500 resize-none'
											/>
											<button
												onClick={() =>
													navigator.clipboard.writeText(
														batchToken
													)
												}
												className='px-3 py-2 bg-purple-600 text-white rounded-r-md hover:bg-purple-700 text-sm self-start'
											>
												Copy
											</button>
										</div>
									</div>
									<div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
										<h5 className='font-medium text-blue-800 mb-2'>
											Usage Information
										</h5>
										<p className='text-sm text-blue-700 mb-2'>
											Use this token in your batch operations:
										</p>
										<div className='space-y-2'>
											<div className='bg-gray-800 text-green-400 p-2 rounded text-xs font-mono overflow-x-auto'>
												{`Authorization: Bearer ${batchToken.substring(0, 50)}...`}
											</div>
											<div className='bg-gray-800 text-green-400 p-2 rounded text-xs font-mono overflow-x-auto'>
												{`curl -H "Authorization: Bearer ${batchToken.substring(0, 30)}..." \\`}<br />
												{`  -X POST http://your-api/batch-endpoint`}
											</div>
										</div>
										<button
											onClick={() =>
												navigator.clipboard.writeText(
													`Authorization: Bearer ${batchToken}`
												)
											}
											className='mt-2 text-xs text-blue-600 hover:text-blue-800'
										>
											📋 Copy authorization header
										</button>
									</div>
								</div>
								<div className='flex justify-end mt-6'>
									<button
										onClick={() => {
											setShowBatchTokenModal(false);
											setBatchToken(null);
										}}
										className='px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md'
									>
										Close
									</button>
								</div>
							</div>
						</div>
					)}
					{/* Remove old faults tab - replaced with live-faults and data-explorer */}
					<div className='space-y-6'>
						{/* Fault Creation Actions */}
						<div className='bg-white p-6 rounded-lg border border-gray-200'>
							<h3 className='text-lg font-medium text-gray-900 mb-4'>
								Create New Fault
							</h3>
							<div className='space-y-4'>
								{device.status === "Active" ? (
									<div className='grid grid-cols-1 gap-4'>
										{/* Offline Fault */}
										<div className='border border-gray-200 rounded-lg p-4'>
											<div className='flex items-center mb-3'>
												<div className='w-2 h-2 bg-blue-500 rounded-full mr-2'></div>
												<h4 className='text-lg font-medium text-gray-900'>
													Fault
												</h4>
											</div>
											<p className='text-sm text-gray-600 mb-4'>
												Create a new fault for data
												collection and analysis.
											</p>
											<Link
												href={`/devices/${deviceId}/faults/create`}
												className='w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700'
											>
												Create Fault
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
												</h4>{" "}
												<p className='text-sm text-yellow-700 mt-1'>
													This device must be
													activated before you can
													create faults.
												</p>
												{device.status ===
													"Inactive" && (
													<button
														onClick={
															handleActivateDevice
														}
														className='mt-3 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700'
													>
														✅ Activate Device
													</button>
												)}
											</div>
										</div>
									</div>
								)}
							</div>
						</div>
						{activeFaults.length === 0 && (
							<div className='bg-gray-50 border border-gray-200 rounded-lg p-6 text-center'>
								<h3 className='text-lg font-medium text-gray-900 mb-2'>
									No Active Faults
								</h3>{" "}
								<p className='text-gray-600'>
									This device doesn't have any active faults.
									Create one to start collecting data.
								</p>
							</div>
						)}{" "}
					</div>
				</div>
			</PageLayout>
		</DeviceProtectedRoute>
	);
}
