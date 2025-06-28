"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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
import PageLayout from "@/components/PageLayout";
import {
	deviceApi,
	faultApi,
	onlineModeApi,
	Device,
	Fault,
	ActiveCondition,
	getAllMeasurements,
	getLiveConditionMeasurements,
	getLatestConditionMeasurement,
	getLatestMeasurementData,
	getConditionMeasurements,
	Measurement,
	MeasurementData,
} from "@/services/api";
import { formatDate, formatDateShort } from "@/utils/dateUtils";

export default function ConditionDetailPage() {
	const params = useParams();
	const deviceId = params.deviceId as string;
	const faultId = params.faultId as string;
	const conditionId = params.conditionId as string;
	const [device, setDevice] = useState<Device | null>(null);
	const [fault, setFault] = useState<Fault | null>(null);
	const [condition, setCondition] = useState<ActiveCondition | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null); // Real-time data viewing
	const [autoRefresh, setAutoRefresh] = useState(false);
	const [liveMode, setLiveMode] = useState(false); // New live mode toggle
	const [latestMeasurement, setLatestMeasurement] =
		useState<MeasurementData | null>(null);
	const [liveDataBuffer, setLiveDataBuffer] = useState<MeasurementData[]>([]);
	const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);
	const [viewMode, setViewMode] = useState<"charts" | "live">("charts");
	const [activeChartTab, setActiveChartTab] = useState<string>("");
	const [chartType, setChartType] = useState<
		"line" | "area" | "bar" | "scatter"
	>("line");
	const [autoZoom, setAutoZoom] = useState(true);

	// Date range state for filtering charts
	const [startDate, setStartDate] = useState<string>("");
	const [endDate, setEndDate] = useState<string>("");
	useEffect(() => {
		if (deviceId && faultId && conditionId) {
			loadConditionData();
		}
	}, [deviceId, faultId, conditionId]); // Define loadMeasurements function before using it in effects
	const loadMeasurements = async () => {
		try {
			if (!conditionId) return;

			// Load measurements for the condition with date filtering
			const response = await getConditionMeasurements(
				conditionId,
				startDate || undefined,
				endDate || undefined
			);
			if (response.success && response.data.length > 0) {
				// Convert the response data to MeasurementData format
				const measurementData: MeasurementData[] = response.data.map(
					(payload: any, index: number) => ({
						data_id: index, // Since we don't have real IDs from the payload
						device_id: deviceId,
						fault_id: faultId,
						condition_id: conditionId,
						data_payload: payload,
						upload_type: "batch",
						timestamp: new Date().toISOString(), // You might want to get real timestamps
					})
				);

				setLiveDataBuffer(measurementData);
			}
		} catch (error) {
			console.error("Error loading measurements:", error);
		}
	};

	// Auto-refresh for live data
	useEffect(() => {
		if (!autoRefresh || !condition) return;

		const interval = setInterval(loadMeasurements, 2000);
		return () => clearInterval(interval);
	}, [autoRefresh, condition]);

	// Live data polling for real-time measurements
	useEffect(() => {
		if (!liveMode || !condition) return;

		const pollLiveData = async () => {
			try {
				// Get the latest measurement data since last update
				const response = await getLiveConditionMeasurements(
					conditionId,
					100, // Get last 100 measurements
					lastUpdateTime || undefined
				);

				if (response.success && response.data.length > 0) {
					// Sort by timestamp to ensure chronological order
					const sortedData = response.data.sort(
						(a, b) =>
							new Date(a.timestamp).getTime() -
							new Date(b.timestamp).getTime()
					);

					// Update latest measurement
					setLatestMeasurement(sortedData[sortedData.length - 1]);

					// Add new data to buffer, keeping only recent data (last 1000 points)
					setLiveDataBuffer((prev) => {
						const combined = [...prev, ...sortedData];
						return combined
							.sort(
								(a, b) =>
									new Date(a.timestamp).getTime() -
									new Date(b.timestamp).getTime()
							)
							.slice(-1000); // Keep only last 1000 measurements
					});

					// Update last update time
					setLastUpdateTime(
						sortedData[sortedData.length - 1].timestamp
					);
				}
			} catch (error) {
				console.error("Error polling live data:", error);
			}
		};

		// Initial load
		pollLiveData();
		// Poll every 5 seconds (adjust based on your data frequency)
		const interval = setInterval(pollLiveData, 5000);
		return () => clearInterval(interval);
	}, [liveMode, conditionId, lastUpdateTime]);

	// Automatically enable/disable live mode when switching view modes
	useEffect(() => {
		if (viewMode === "live" && !liveMode) {
			setLiveMode(true);
		} else if (viewMode !== "live" && liveMode) {
			setLiveMode(false);
		}
	}, [viewMode, liveMode]);

	const loadConditionData = async () => {
		try {
			setLoading(true);
			setError(null);

			// Load device and fault data
			const [deviceData, faultsData] = await Promise.all([
				deviceApi.getDevice(deviceId),
				faultApi.getFaults(),
			]);

			if (!deviceData) {
				setError("Device not found");
				return;
			}
			setDevice(deviceData);

			const faultData = faultsData.find(
				(fault) => fault.fault_id === faultId
			);
			if (!faultData) {
				setError("Fault not found");
				return;
			}
			setFault(faultData);

			// For now, create a mock condition based on the ID
			// In a real implementation, this would come from the API
			const mockCondition: ActiveCondition = {
				condition_id: conditionId,
				name: `Condition ${conditionId}`,
				description: "Measurement condition",
				status: "Active",
				start_time: new Date().toISOString(),
				duration: 300, // 5 minutes
			};
			setCondition(mockCondition); // Load measurements
			await loadMeasurements();
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to load condition data"
			);
		} finally {
			setLoading(false);
		}
	};
	// Extract and process chart data from live data buffer for Recharts
	const getChartDataFromPayloads = () => {
		if (!liveDataBuffer.length) return {};

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
		liveDataBuffer.forEach((measurement) => {
			if (
				measurement.data_payload &&
				typeof measurement.data_payload === "object"
			) {
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

			liveDataBuffer.forEach((measurement, measurementIndex) => {
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
						// If it's a single number
						chartData[key].push({
							timestamp,
							value,
							timestampFormatted,
							index: measurementIndex,
						});
					}
				}
			});

			// Sort by index to ensure proper chronological order
			chartData[key].sort((a, b) => a.index - b.index);
		});

		return chartData;
	};

	const chartData = getChartDataFromPayloads();
	const chartKeys = Object.keys(chartData);

	// Set initial active tab if not set
	if (!activeChartTab && chartKeys.length > 0) {
		setActiveChartTab(chartKeys[0]);
	}
	// Data sampling and auto-zoom utilities
	const sampleData = (
		data: Array<{
			timestamp: string;
			value: number;
			timestampFormatted: string;
			index: number;
		}>,
		maxPoints: number = 1000
	) => {
		if (data.length <= maxPoints) return data;

		const step = Math.ceil(data.length / maxPoints);
		const sampled = [];

		// Always include first and last points
		sampled.push(data[0]);

		// Sample intermediate points
		for (let i = step; i < data.length - 1; i += step) {
			sampled.push(data[i]);
		}

		// Always include last point
		if (data.length > 1) {
			sampled.push(data[data.length - 1]);
		}

		return sampled;
	};
	const calculateOptimalDomain = (data: Array<{ value: number }>) => {
		if (!data.length) return ["dataMin", "dataMax"];

		// If auto-zoom is disabled, use full range
		if (!autoZoom) {
			return ["dataMin", "dataMax"];
		}

		const values = data.map((d) => d.value);
		const min = Math.min(...values);
		const max = Math.max(...values);
		const range = max - min;
		const absMin = Math.abs(min);
		const absMax = Math.abs(max);
		const avgAbsValue = (absMin + absMax) / 2;

		// Calculate standard deviation to detect concentration
		const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
		const variance =
			values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
			values.length;
		const standardDeviation = Math.sqrt(variance);

		// If all values are exactly the same
		if (range === 0) {
			const padding = Math.max(Math.abs(min) * 0.1, 0.1); // 10% padding or 0.1 minimum
			return [min - padding, max + padding];
		}

		// If range is very small compared to the values (concentrated data)
		// Use multiple criteria to detect concentration
		const relativeRange = avgAbsValue > 0 ? range / avgAbsValue : 1;
		const coefficientOfVariation =
			mean !== 0 ? standardDeviation / Math.abs(mean) : 1;

		// Highly concentrated data detection
		if (relativeRange < 0.001 || coefficientOfVariation < 0.01) {
			// Very concentrated - use large padding relative to range
			const padding = Math.max(range * 5, Math.abs(mean) * 0.001, 0.001);
			return [min - padding, max + padding];
		}
		// Moderately concentrated data
		else if (relativeRange < 0.01 || coefficientOfVariation < 0.05) {
			// Moderately concentrated - use medium padding
			const padding = Math.max(range * 2, Math.abs(mean) * 0.01, 0.01);
			return [min - padding, max + padding];
		}
		// Slightly concentrated data
		else if (relativeRange < 0.1 || coefficientOfVariation < 0.1) {
			// Slightly concentrated - use small padding
			const padding = Math.max(range * 0.5, Math.abs(mean) * 0.02);
			return [min - padding, max + padding];
		}
		// Normal spread data
		else {
			// Normal range - standard 5% padding
			const padding = range * 0.05;
			return [min - padding, max + padding];
		}
	};

	// Render chart based on selected type with auto-zoom and sampling
	const renderChart = (
		rawData: Array<{
			timestamp: string;
			value: number;
			timestampFormatted: string;
			index: number;
		}>,
		dataKey: string
	) => {
		if (!rawData.length) return null;

		// Sample data if too many points
		const data = sampleData(rawData, 1000);
		const yDomain = calculateOptimalDomain(data);

		const chartProps = {
			width: 800,
			height: 400,
			data: data,
			margin: { top: 20, right: 30, left: 20, bottom: 5 },
		};

		// Calculate tick count for X-axis based on data size
		const maxXTicks = Math.min(
			10,
			Math.max(3, Math.floor(data.length / 10))
		);

		switch (chartType) {
			case "area":
				return (
					<ResponsiveContainer
						width='100%'
						height={400}
					>
						<AreaChart {...chartProps}>
							<CartesianGrid strokeDasharray='3 3' />
							<XAxis
								dataKey='timestampFormatted'
								angle={-45}
								textAnchor='end'
								height={100}
								interval='preserveStartEnd'
								tick={{ fontSize: 12 }}
								tickCount={maxXTicks}
							/>
							<YAxis
								domain={yDomain}
								tick={{ fontSize: 12 }}
								tickCount={8}
								tickFormatter={(value) => {
									if (Math.abs(value) >= 1000000) {
										return `${(value / 1000000).toFixed(
											1
										)}M`;
									} else if (Math.abs(value) >= 1000) {
										return `${(value / 1000).toFixed(1)}K`;
									} else if (
										Math.abs(value) < 0.01 &&
										value !== 0
									) {
										return value.toExponential(2);
									} else {
										return value.toFixed(3);
									}
								}}
							/>
							<Tooltip
								labelFormatter={(label) => `Time: ${label}`}
								formatter={(value: number) => [
									typeof value === "number"
										? value.toFixed(6)
										: value,
									dataKey,
								]}
							/>
							<Legend />
							<Area
								type='monotone'
								dataKey='value'
								stroke='#3B82F6'
								fill='#3B82F6'
								fillOpacity={0.3}
								name={dataKey}
								dot={false} // Disable dots for performance
							/>
						</AreaChart>
					</ResponsiveContainer>
				);
			case "bar":
				return (
					<ResponsiveContainer
						width='100%'
						height={400}
					>
						<BarChart {...chartProps}>
							<CartesianGrid strokeDasharray='3 3' />
							<XAxis
								dataKey='timestampFormatted'
								angle={-45}
								textAnchor='end'
								height={100}
								interval='preserveStartEnd'
								tick={{ fontSize: 12 }}
								tickCount={maxXTicks}
							/>
							<YAxis
								domain={yDomain}
								tick={{ fontSize: 12 }}
								tickCount={8}
								tickFormatter={(value) => {
									if (Math.abs(value) >= 1000000) {
										return `${(value / 1000000).toFixed(
											1
										)}M`;
									} else if (Math.abs(value) >= 1000) {
										return `${(value / 1000).toFixed(1)}K`;
									} else if (
										Math.abs(value) < 0.01 &&
										value !== 0
									) {
										return value.toExponential(2);
									} else {
										return value.toFixed(3);
									}
								}}
							/>
							<Tooltip
								labelFormatter={(label) => `Time: ${label}`}
								formatter={(value: number) => [
									typeof value === "number"
										? value.toFixed(6)
										: value,
									dataKey,
								]}
							/>
							<Legend />
							<Bar
								dataKey='value'
								fill='#3B82F6'
								name={dataKey}
							/>
						</BarChart>
					</ResponsiveContainer>
				);
			case "scatter":
				return (
					<ResponsiveContainer
						width='100%'
						height={400}
					>
						<ScatterChart {...chartProps}>
							<CartesianGrid strokeDasharray='3 3' />
							<XAxis
								type='number'
								dataKey='index'
								name='sequence'
								domain={["dataMin", "dataMax"]}
								tick={{ fontSize: 12 }}
							/>
							<YAxis
								dataKey='value'
								name={dataKey}
								domain={yDomain}
								tick={{ fontSize: 12 }}
								tickCount={8}
								tickFormatter={(value) => {
									if (Math.abs(value) >= 1000000) {
										return `${(value / 1000000).toFixed(
											1
										)}M`;
									} else if (Math.abs(value) >= 1000) {
										return `${(value / 1000).toFixed(1)}K`;
									} else if (
										Math.abs(value) < 0.01 &&
										value !== 0
									) {
										return value.toExponential(2);
									} else {
										return value.toFixed(3);
									}
								}}
							/>
							<Tooltip
								cursor={{ strokeDasharray: "3 3" }}
								formatter={(
									value: number,
									name,
									props: any
								) => [
									typeof value === "number"
										? value.toFixed(6)
										: value,
									dataKey,
									props.payload.timestampFormatted,
								]}
							/>
							<Legend />
							<Scatter
								dataKey='value'
								fill='#3B82F6'
								name={dataKey}
							/>
						</ScatterChart>
					</ResponsiveContainer>
				);
			case "line":
			default:
				return (
					<ResponsiveContainer
						width='100%'
						height={400}
					>
						<LineChart {...chartProps}>
							<CartesianGrid strokeDasharray='3 3' />
							<XAxis
								dataKey='timestampFormatted'
								angle={-45}
								textAnchor='end'
								height={100}
								interval='preserveStartEnd'
								tick={{ fontSize: 12 }}
								tickCount={maxXTicks}
							/>
							<YAxis
								domain={yDomain}
								tick={{ fontSize: 12 }}
								tickCount={8}
								tickFormatter={(value) => {
									if (Math.abs(value) >= 1000000) {
										return `${(value / 1000000).toFixed(
											1
										)}M`;
									} else if (Math.abs(value) >= 1000) {
										return `${(value / 1000).toFixed(1)}K`;
									} else if (
										Math.abs(value) < 0.01 &&
										value !== 0
									) {
										return value.toExponential(2);
									} else {
										return value.toFixed(3);
									}
								}}
							/>
							<Tooltip
								labelFormatter={(label) => `Time: ${label}`}
								formatter={(value: number) => [
									typeof value === "number"
										? value.toFixed(6)
										: value,
									dataKey,
								]}
							/>
							<Legend />
							<Line
								type='monotone'
								dataKey='value'
								stroke='#3B82F6'
								strokeWidth={2}
								dot={data.length <= 50} // Only show dots for small datasets
								name={dataKey}
							/>
						</LineChart>
					</ResponsiveContainer>
				);
		}
	};

	if (loading) {
		return (
			<div className='flex items-center justify-center min-h-screen'>
				<div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600'></div>
			</div>
		);
	}

	if (error || !device || !fault || !condition) {
		return (
			<PageLayout
				title='Condition Details'
				breadcrumbs={[
					{ label: "Home", href: "/" },
					{ label: "Devices", href: "/devices" },
					{
						label: device?.device_name || "Device",
						href: `/devices/${deviceId}`,
					},
					{
						label: fault?.fault_name || fault?.fault_id || "Fault",
						href: `/devices/${deviceId}/faults/${faultId}`,
					},
					{
						label: "Condition",
						href: `/devices/${deviceId}/faults/${faultId}/condition/${conditionId}`,
					},
				]}
			>
				<div className='bg-red-50 border border-red-200 rounded-lg p-6'>
					<h2 className='text-lg font-medium text-red-800 mb-2'>
						Error
					</h2>
					<p className='text-red-700'>
						{error || "Condition not found"}
					</p>
					<Link
						href={`/devices/${deviceId}/faults/${faultId}`}
						className='mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700'
					>
						← Back to Fault
					</Link>
				</div>
			</PageLayout>
		);
	}

	return (
		<PageLayout
			title={condition.name}
			breadcrumbs={[
				{ label: "Home", href: "/" },
				{ label: "Devices", href: "/devices" },
				{ label: device.device_name, href: `/devices/${deviceId}` },
				{
					label: fault.fault_name || fault.fault_id,
					href: `/devices/${deviceId}/faults/${faultId}`,
				},
				{
					label: condition.name,
					href: `/devices/${deviceId}/faults/${faultId}/condition/${conditionId}`,
				},
			]}
		>
			<div className='space-y-6'>
				{/* Condition Header */}
				<div className='bg-white p-6 rounded-lg border border-gray-200'>
					<div className='flex justify-between items-start mb-4'>
						<div>
							{" "}
							<h2 className='text-2xl font-bold text-gray-900 mb-2'>
								{condition.name}
							</h2>
							<p className='text-gray-600 mb-4'>
								{condition.description ||
									"No description provided"}
							</p>
							<div className='flex space-x-4 text-sm text-gray-500'>
								<span>Device: {device.device_name}</span>{" "}
								<span>
									Fault: {fault.fault_name || fault.fault_id}
								</span>
								<span>
									Started:{" "}
									{new Date(
										condition.start_time
									).toLocaleString()}
								</span>
								<span>
									Duration:{" "}
									{Math.floor(condition.duration / 60)}m{" "}
									{condition.duration % 60}s
								</span>
							</div>
						</div>

						<div className='flex space-x-2'>
							{" "}
							<label className='flex items-center space-x-2'>
								<input
									type='checkbox'
									checked={autoRefresh}
									onChange={(e) =>
										setAutoRefresh(e.target.checked)
									}
									className='rounded'
								/>
								<span className='text-sm'>Auto-refresh</span>
							</label>
						</div>
					</div>
				</div>

				{/* Data View Controls */}
				<div className='bg-white p-6 rounded-lg border border-gray-200'>
					<div className='flex justify-between items-center mb-4'>
						{" "}
						<h3 className='text-lg font-medium text-gray-900'>
							Measurement Data
						</h3>{" "}
						<div className='flex space-x-2'>
							{["live", "charts"].map((mode) => (
								<button
									key={mode}
									onClick={() =>
										setViewMode(mode as typeof viewMode)
									}
									className={`px-3 py-1 rounded text-sm ${
										viewMode === mode
											? "bg-blue-600 text-white"
											: "bg-gray-200 text-gray-700 hover:bg-gray-300"
									}`}
								>
									{mode === "live"
										? "Live Data"
										: "Interactive Charts"}
								</button>
							))}{" "}
						</div>{" "}
					</div>
					{/* Data Display */}
					{viewMode === "live" && (
						<div className='space-y-6'>
							{/* Live Data Header */}
							<div className='bg-red-50 border border-red-200 rounded-lg p-4'>
								<div className='flex items-center justify-between'>
									<div>
										{" "}
										<h4 className='text-lg font-medium text-red-800 mb-2'>
											Live Data Stream
										</h4>
										<p className='text-red-700 text-sm'>
											Real-time measurement data from the
											measurement_data table. Updates
											every 5 seconds.
										</p>
									</div>
									<div className='text-right'>
										<div className='text-sm text-red-600'>
											<div>
												{" "}
												Status:{" "}
												{liveMode
													? "Active"
													: "Inactive"}
											</div>
											<div>
												Buffer: {liveDataBuffer.length}{" "}
												measurements
											</div>
											{lastUpdateTime && (
												<div>
													Last Update:{" "}
													{new Date(
														lastUpdateTime
													).toLocaleTimeString()}
												</div>
											)}
										</div>
									</div>
								</div>
							</div>

							{/* Latest Measurement Display */}
							{latestMeasurement && (
								<div className='bg-white border border-gray-200 rounded-lg p-6'>
									<h5 className='text-lg font-medium text-gray-900 mb-4'>
										⏱️ Latest Measurement
									</h5>
									<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
										<div>
											<div className='text-sm text-gray-600 mb-2'>
												<strong>Data ID:</strong>{" "}
												{latestMeasurement.data_id}
											</div>
											<div className='text-sm text-gray-600 mb-2'>
												<strong>Device:</strong>{" "}
												{latestMeasurement.device_id}
											</div>
											<div className='text-sm text-gray-600 mb-2'>
												<strong>Timestamp:</strong>{" "}
												{new Date(
													latestMeasurement.timestamp
												).toLocaleString()}
											</div>
										</div>
										<div>
											<div className='text-sm text-gray-600 mb-2'>
												<strong>
													Data Payload Keys:
												</strong>
											</div>
											{typeof latestMeasurement.data_payload ===
												"object" &&
												latestMeasurement.data_payload && (
													<div className='flex flex-wrap gap-2'>
														{Object.keys(
															latestMeasurement.data_payload
														).map((key) => (
															<span
																key={key}
																className='px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs'
															>
																{key}:{" "}
																{Array.isArray(
																	latestMeasurement
																		.data_payload[
																		key
																	]
																)
																	? `${latestMeasurement.data_payload[key].length} values`
																	: typeof latestMeasurement
																			.data_payload[
																			key
																	  ]}
															</span>
														))}
													</div>
												)}
										</div>
									</div>{" "}
								</div>
							)}

							{/* Live Data Stream */}
							<div className='bg-white border border-gray-200 rounded-lg p-6'>
								<h5 className='text-lg font-medium text-gray-900 mb-4'>
									📊 Live Data Stream ({liveDataBuffer.length}{" "}
									measurements)
								</h5>

								{liveDataBuffer.length > 0 ? (
									<div className='space-y-4'>
										{/* Data Parameters Overview */}
										<div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'>
											{(() => {
												const allKeys =
													new Set<string>();
												liveDataBuffer.forEach(
													(measurement) => {
														if (
															typeof measurement.data_payload ===
																"object" &&
															measurement.data_payload
														) {
															Object.keys(
																measurement.data_payload
															).forEach((key) =>
																allKeys.add(key)
															);
														}
													}
												);

												return Array.from(allKeys).map(
													(key) => (
														<div
															key={key}
															className='bg-gray-50 p-3 rounded border'
														>
															<div className='text-sm font-medium text-gray-800'>
																{key}
															</div>
															<div className='text-xs text-gray-600'>
																{(() => {
																	const latestValue =
																		latestMeasurement
																			?.data_payload?.[
																			key
																		];
																	if (
																		Array.isArray(
																			latestValue
																		)
																	) {
																		return `Array of ${latestValue.length} values`;
																	} else if (
																		typeof latestValue ===
																		"number"
																	) {
																		return `Latest: ${latestValue}`;
																	} else {
																		return `Type: ${typeof latestValue}`;
																	}
																})()}
															</div>
														</div>
													)
												);
											})()}{" "}
										</div>

										{/* Live Data Chart */}
										<div className='bg-white border border-gray-200 rounded-lg p-6 mb-6'>
											<h5 className='text-lg font-medium text-gray-900 mb-4'>
												📈 Live Data Chart
											</h5>
											{(() => {
												// Prepare chart data from liveDataBuffer
												if (
													liveDataBuffer.length === 0
												) {
													return (
														<div className='text-center py-8 text-gray-500'>
															No data available
															for chart
														</div>
													);
												}

												// Extract all numeric data from payloads
												const chartData: Record<
													string,
													Array<{
														timestamp: string;
														value: number;
														timestampFormatted: string;
													}>
												> = {};

												// Collect all possible keys
												const allKeys =
													new Set<string>();
												liveDataBuffer.forEach(
													(measurement) => {
														if (
															typeof measurement.data_payload ===
																"object" &&
															measurement.data_payload
														) {
															Object.keys(
																measurement.data_payload
															).forEach((key) =>
																allKeys.add(key)
															);
														}
													}
												);

												// Process data for each key
												allKeys.forEach((key) => {
													chartData[key] = [];
													liveDataBuffer.forEach(
														(measurement) => {
															if (
																measurement.data_payload &&
																measurement
																	.data_payload[
																	key
																] !== undefined
															) {
																const value =
																	measurement
																		.data_payload[
																		key
																	];
																if (
																	Array.isArray(
																		value
																	)
																) {
																	// For arrays, take the first value or average
																	const numericValue =
																		value.length >
																		0
																			? value[0]
																			: 0;
																	if (
																		typeof numericValue ===
																		"number"
																	) {
																		chartData[
																			key
																		].push({
																			timestamp:
																				measurement.timestamp,
																			value: numericValue,
																			timestampFormatted:
																				new Date(
																					measurement.timestamp
																				).toLocaleTimeString(),
																		});
																	}
																} else if (
																	typeof value ===
																	"number"
																) {
																	chartData[
																		key
																	].push({
																		timestamp:
																			measurement.timestamp,
																		value: value,
																		timestampFormatted:
																			new Date(
																				measurement.timestamp
																			).toLocaleTimeString(),
																	});
																}
															}
														}
													);
												});

												// Get the first key with data for display
												const firstKeyWithData =
													Object.keys(chartData).find(
														(key) =>
															chartData[key]
																.length > 0
													);

												if (!firstKeyWithData) {
													return (
														<div className='text-center py-8 text-gray-500'>
															No numeric data
															available for
															charting
														</div>
													);
												}

												return (
													<div className='space-y-4'>
														{/* Chart for first data parameter */}
														<ResponsiveContainer
															width='100%'
															height={300}
														>
															<LineChart
																data={
																	chartData[
																		firstKeyWithData
																	]
																}
															>
																<CartesianGrid strokeDasharray='3 3' />
																<XAxis
																	dataKey='timestampFormatted'
																	tick={{
																		fontSize: 12,
																	}}
																	interval='preserveStartEnd'
																/>
																<YAxis
																	tick={{
																		fontSize: 12,
																	}}
																/>
																<Tooltip
																	labelFormatter={(
																		label
																	) =>
																		`Time: ${label}`
																	}
																	formatter={(
																		value: any
																	) => [
																		value,
																		firstKeyWithData,
																	]}
																/>
																<Legend />
																<Line
																	type='monotone'
																	dataKey='value'
																	stroke='#3B82F6'
																	strokeWidth={
																		2
																	}
																	dot={{
																		r: 4,
																	}}
																	name={
																		firstKeyWithData
																	}
																/>
															</LineChart>
														</ResponsiveContainer>

														{/* Chart info */}
														<div className='flex justify-between items-center text-sm text-gray-600'>
															<span>
																Showing:{" "}
																{
																	firstKeyWithData
																}{" "}
																(
																{
																	chartData[
																		firstKeyWithData
																	].length
																}{" "}
																data points)
															</span>
															<span>
																Total parameters
																available:{" "}
																{
																	Object.keys(
																		chartData
																	).length
																}
															</span>
														</div>

														{/* Additional charts for other parameters */}
														{Object.keys(chartData)
															.slice(1, 3)
															.map((key) => (
																<div
																	key={key}
																	className='mt-6'
																>
																	<h6 className='text-md font-medium text-gray-800 mb-2'>
																		{key}{" "}
																		Parameter
																	</h6>
																	<ResponsiveContainer
																		width='100%'
																		height={
																			200
																		}
																	>
																		<LineChart
																			data={
																				chartData[
																					key
																				]
																			}
																		>
																			<CartesianGrid strokeDasharray='3 3' />
																			<XAxis
																				dataKey='timestampFormatted'
																				tick={{
																					fontSize: 10,
																				}}
																				interval='preserveStartEnd'
																			/>
																			<YAxis
																				tick={{
																					fontSize: 10,
																				}}
																			/>
																			<Tooltip
																				labelFormatter={(
																					label
																				) =>
																					`Time: ${label}`
																				}
																				formatter={(
																					value: any
																				) => [
																					value,
																					key,
																				]}
																			/>
																			<Line
																				type='monotone'
																				dataKey='value'
																				stroke='#10B981'
																				strokeWidth={
																					2
																				}
																				dot={{
																					r: 3,
																				}}
																				name={
																					key
																				}
																			/>
																		</LineChart>
																	</ResponsiveContainer>
																</div>
															))}
													</div>
												);
											})()}
										</div>

										{/* Recent Measurements Table */}
										<div className='overflow-x-auto'>
											<table className='min-w-full divide-y divide-gray-200'>
												<thead className='bg-gray-50'>
													<tr>
														<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
															Data ID
														</th>
														<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
															Timestamp
														</th>
														<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
															Data Keys
														</th>
														<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
															Data Summary
														</th>
													</tr>
												</thead>
												<tbody className='bg-white divide-y divide-gray-200'>
													{liveDataBuffer
														.slice(-20)
														.reverse()
														.map((measurement) => (
															<tr
																key={
																	measurement.data_id
																}
																className={
																	measurement.data_id ===
																	latestMeasurement?.data_id
																		? "bg-green-50"
																		: ""
																}
															>
																<td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'>
																	{
																		measurement.data_id
																	}
																</td>
																<td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
																	{new Date(
																		measurement.timestamp
																	).toLocaleTimeString()}
																</td>
																<td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
																	{typeof measurement.data_payload ===
																		"object" &&
																	measurement.data_payload
																		? Object.keys(
																				measurement.data_payload
																		  ).join(
																				", "
																		  )
																		: "No data"}
																</td>
																<td className='px-6 py-4 text-sm text-gray-500'>
																	{typeof measurement.data_payload ===
																		"object" &&
																		measurement.data_payload && (
																			<div className='max-w-xs truncate'>
																				{Object.entries(
																					measurement.data_payload
																				).map(
																					([
																						key,
																						value,
																					]) => (
																						<span
																							key={
																								key
																							}
																							className='inline-block mr-2'
																						>
																							{
																								key
																							}

																							:{" "}
																							{Array.isArray(
																								value
																							)
																								? `[${value.length}]`
																								: String(
																										value
																								  ).substring(
																										0,
																										10
																								  )}
																						</span>
																					)
																				)}
																			</div>
																		)}
																</td>
															</tr>
														))}
												</tbody>
											</table>
										</div>
									</div>
								) : (
									<div className='text-center py-8 text-gray-500'>
										No live data available. Waiting for
										measurements...
									</div>
								)}
							</div>
						</div>
					)}{" "}
					{viewMode === "charts" && (
						<div className='space-y-6'>
							<div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
								<h4 className='text-lg font-medium text-blue-800 mb-2'>
									📊 Interactive Data Charts
								</h4>
								<p className='text-blue-700 text-sm mb-4'>
									Interactive charts generated from data
									payload objects. Each key in the payload
									becomes a separate chart.
								</p>{" "}
								<div className='grid grid-cols-1 md:grid-cols-3 gap-4 text-sm'>
									<div>
										<span className='font-medium'>
											Available Parameters:
										</span>{" "}
										{chartKeys.length}
									</div>
									<div>
										<span className='font-medium'>
											Total Data Points:
										</span>{" "}
										{Object.values(chartData).reduce(
											(sum, data) => sum + data.length,
											0
										)}
									</div>
									<div>
										<span className='font-medium'>
											Source:
										</span>{" "}
										data_payload fields
									</div>
								</div>
							</div>

							{/* Date Range Filter Controls - Always Visible */}
							<div className='bg-white border border-gray-200 rounded-lg p-4'>
								<h4 className='text-lg font-medium text-gray-900 mb-4'>
									🔍 Data Filters & Chart Controls
								</h4>
								<div className='flex items-center justify-between'>
									<div className='flex items-center space-x-4'>
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
									</div>
									<div className='flex items-center space-x-2'>
										<button
											onClick={() => {
												// Reload data with date filtering
												loadMeasurements();
											}}
											className='px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm'
										>
											Filter
										</button>
										<button
											onClick={() => {
												setStartDate("");
												setEndDate("");
												loadMeasurements();
											}}
											className='px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm'
										>
											Clear
										</button>
									</div>
								</div>
							</div>

							{chartKeys.length > 0 ? (
								<div>
									{/* Chart Tabs */}
									<div className='flex flex-wrap gap-2 mb-6 p-4 bg-gray-50 rounded-lg'>
										{chartKeys.map((key) => (
											<button
												key={key}
												onClick={() =>
													setActiveChartTab(key)
												}
												className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
													activeChartTab === key
														? "bg-blue-600 text-white shadow-sm"
														: "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
												}`}
											>
												{key} ({chartData[key].length}{" "}
												points)
											</button>
										))}
									</div>{" "}
									{/* Active Chart Display */}
									{activeChartTab &&
										chartData[activeChartTab] && (
											<div className='bg-white border border-gray-200 rounded-lg p-6'>
												{" "}
												<div className='flex justify-between items-center mb-4'>
													<h5 className='text-lg font-medium text-gray-900'>
														📈 {activeChartTab} Data
														Visualization
													</h5>

													{/* Chart Controls */}
													<div className='flex items-center space-x-4'>
														{/* Auto-zoom Toggle */}
														<div className='flex items-center space-x-2'>
															<label className='text-sm text-gray-700'>
																Auto-zoom:
															</label>
															<button
																onClick={() =>
																	setAutoZoom(
																		!autoZoom
																	)
																}
																className={`px-2 py-1 rounded text-xs ${
																	autoZoom
																		? "bg-green-600 text-white"
																		: "bg-gray-200 text-gray-700 hover:bg-gray-300"
																}`}
																title={
																	autoZoom
																		? "Auto-zoom enabled: Charts will zoom to show data variation clearly"
																		: "Auto-zoom disabled: Charts will show full data range"
																}
															>
																🔍{" "}
																{autoZoom
																	? "ON"
																	: "OFF"}
															</button>
														</div>{" "}
														{/* Chart Type Selector */}
														<div className='flex space-x-2'>
															{[
																{
																	type: "line" as const,
																	icon: "Line",
																	name: "Line",
																},
																{
																	type: "area" as const,
																	icon: "Area",
																	name: "Area",
																},
																{
																	type: "bar" as const,
																	icon: "Bar",
																	name: "Bar",
																},
																{
																	type: "scatter" as const,
																	icon: "•",
																	name: "Scatter",
																},
															].map(
																({
																	type,
																	icon,
																	name,
																}) => (
																	<button
																		key={
																			type
																		}
																		onClick={() =>
																			setChartType(
																				type
																			)
																		}
																		className={`px-3 py-1 rounded text-sm ${
																			chartType ===
																			type
																				? "bg-blue-600 text-white"
																				: "bg-gray-200 text-gray-700 hover:bg-gray-300"
																		}`}
																	>
																		{icon}{" "}
																		{name}
																	</button>
																)
															)}
														</div>
													</div>
												</div>
												{/* Recharts Chart */}
												<div className='bg-gray-50 border border-gray-200 rounded-lg p-4'>
													{renderChart(
														chartData[
															activeChartTab
														],
														activeChartTab
													)}
												</div>{" "}
												{/* Chart Statistics */}
												<div className='mt-6 grid grid-cols-2 md:grid-cols-4 gap-4'>
													{(() => {
														const values =
															chartData[
																activeChartTab
															].map(
																(d) => d.value
															);
														const avg =
															values.reduce(
																(a, b) => a + b,
																0
															) / values.length;
														const min = Math.min(
															...values
														);
														const max = Math.max(
															...values
														);
														const latest =
															values[
																values.length -
																	1
															];

														return [
															{
																label: "Average",
																value: avg.toFixed(
																	3
																),
																icon: "Avg",
															},
															{
																label: "Minimum",
																value: min.toFixed(
																	3
																),
																icon: "Min",
															},
															{
																label: "Maximum",
																value: max.toFixed(
																	3
																),
																icon: "Max",
															},
															{
																label: "Latest",
																value:
																	latest?.toFixed(
																		3
																	) || "N/A",
																icon: "Latest",
															},
														].map((stat, index) => (
															<div
																key={index}
																className='bg-gray-50 p-3 rounded border'
															>
																<div className='flex items-center space-x-2'>
																	<span className='text-lg'>
																		{
																			stat.icon
																		}
																	</span>
																	<div>
																		<p className='text-sm text-gray-600'>
																			{
																				stat.label
																			}
																		</p>
																		<p className='text-lg font-semibold text-gray-900'>
																			{
																				stat.value
																			}
																		</p>
																	</div>
																</div>
															</div>
														));
													})()}
												</div>{" "}
												{/* Zoom Information Panel */}
												{autoZoom && (
													<div className='mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3'>
														<div className='flex items-center justify-between'>
															<div className='flex items-center space-x-2'>
																<span className='text-blue-600'>
																	🔍
																</span>
																<div className='text-sm text-blue-800'>
																	{(() => {
																		const values =
																			chartData[
																				activeChartTab
																			].map(
																				(
																					d
																				) =>
																					d.value
																			);
																		if (
																			values.length ===
																			0
																		)
																			return "No data to analyze";

																		const min =
																			Math.min(
																				...values
																			);
																		const max =
																			Math.max(
																				...values
																			);
																		const range =
																			max -
																			min;
																		const mean =
																			values.reduce(
																				(
																					sum,
																					val
																				) =>
																					sum +
																					val,
																				0
																			) /
																			values.length;
																		const avgAbsValue =
																			(Math.abs(
																				min
																			) +
																				Math.abs(
																					max
																				)) /
																			2;
																		const relativeRange =
																			avgAbsValue >
																			0
																				? range /
																				  avgAbsValue
																				: 1;

																		if (
																			range ===
																			0
																		) {
																			return (
																				<span>
																					<strong>
																						Auto-zoom
																						active:
																					</strong>{" "}
																					All
																					values
																					are
																					identical
																					(
																					{min.toFixed(
																						6
																					)}
																					).
																					Showing
																					padded
																					view
																					for
																					better
																					visualization.
																				</span>
																			);
																		} else if (
																			relativeRange <
																			0.001
																		) {
																			return (
																				<span>
																					<strong>
																						Auto-zoom
																						active:
																					</strong>{" "}
																					Very
																					concentrated
																					data
																					detected.
																					Data
																					range:{" "}
																					{range.toExponential(
																						3
																					)}{" "}
																					(
																					{(
																						(range /
																							Math.abs(
																								mean
																							)) *
																						100
																					).toFixed(
																						3
																					)}

																					%
																					of
																					mean
																					value)
																				</span>
																			);
																		} else if (
																			relativeRange <
																			0.01
																		) {
																			return (
																				<span>
																					<strong>
																						Auto-zoom
																						active:
																					</strong>{" "}
																					Concentrated
																					data
																					detected.
																					Data
																					range:{" "}
																					{range.toFixed(
																						6
																					)}{" "}
																					(
																					{(
																						(range /
																							Math.abs(
																								mean
																							)) *
																						100
																					).toFixed(
																						2
																					)}

																					%
																					of
																					mean
																					value)
																				</span>
																			);
																		} else if (
																			relativeRange <
																			0.1
																		) {
																			return (
																				<span>
																					<strong>
																						Auto-zoom
																						active:
																					</strong>{" "}
																					Slightly
																					concentrated
																					data.
																					Data
																					range:{" "}
																					{range.toFixed(
																						3
																					)}{" "}
																					(
																					{(
																						(range /
																							Math.abs(
																								mean
																							)) *
																						100
																					).toFixed(
																						1
																					)}

																					%
																					of
																					mean
																					value)
																				</span>
																			);
																		} else {
																			return (
																				<span>
																					<strong>
																						Auto-zoom
																						active:
																					</strong>{" "}
																					Normal
																					data
																					spread.
																					Data
																					range:{" "}
																					{range.toFixed(
																						3
																					)}
																				</span>
																			);
																		}
																	})()}
																</div>
															</div>
															<div className='text-xs text-blue-600'>
																💡 Turn off
																auto-zoom to see
																full data range
															</div>
														</div>
													</div>
												)}
												{!autoZoom && (
													<div className='mt-4 bg-gray-50 border border-gray-200 rounded-lg p-3'>
														<div className='flex items-center justify-between'>
															<div className='flex items-center space-x-2'>
																<span className='text-gray-600'>
																	📏
																</span>
																<div className='text-sm text-gray-700'>
																	<strong>
																		Full
																		range
																		view:
																	</strong>{" "}
																	Showing
																	complete
																	data range
																	without zoom
																	optimization
																</div>
															</div>
															<div className='text-xs text-gray-600'>
																💡 Turn on
																auto-zoom for
																better
																visualization of
																concentrated
																data{" "}
															</div>
														</div>
													</div>
												)}
											</div>
										)}
								</div>
							) : (
								<div className='text-center py-12 bg-gray-50 rounded-lg'>
									<div className='text-gray-400 text-4xl mb-4'>
										📊
									</div>
									<h4 className='text-lg font-medium text-gray-600 mb-2'>
										No Chart Data Available
									</h4>
									<p className='text-gray-500 mb-4'>
										No numeric data found in the
										data_payload fields to generate charts.
									</p>
									<div className='text-sm text-gray-400'>
										<p>Charts will appear when:</p>
										<ul className='mt-2 space-y-1'>
											<li>
												• The data_payload contains
												numeric values or arrays
											</li>
											<li>
												• Measurement data is available
												for this condition
											</li>
											<li>
												• Keys in the payload have
												chartable data types
											</li>
										</ul>
									</div>
								</div>
							)}
						</div>
					)}
				</div>

				{/* Navigation Links */}
				<div className='bg-white p-6 rounded-lg border border-gray-200'>
					<h3 className='text-lg font-medium text-gray-900 mb-4'>
						Navigation
					</h3>
					<div className='flex space-x-4'>
						<Link
							href={`/devices/${deviceId}/faults/${faultId}`}
							className='text-blue-600 hover:text-blue-900'
						>
							← Back to Fault
						</Link>
						<Link
							href={`/devices/${deviceId}`}
							className='text-blue-600 hover:text-blue-900'
						>
							← Back to Device
						</Link>
						<Link
							href='/devices'
							className='text-blue-600 hover:text-blue-900'
						>
							← All Devices
						</Link>
					</div>
				</div>
			</div>
		</PageLayout>
	);
}
