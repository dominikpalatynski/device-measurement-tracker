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
	experimentApi,
	onlineModeApi,
	Device,
	Experiment,
	ActivePhenomenon,
	getAllMeasurements,
	getPhenomenonMeasurements,
	Measurement,
	MeasurementData,
} from "@/services/api";

export default function PhenomenonDetailPage() {
	const params = useParams();
	const deviceId = params.deviceId as string;
	const experimentId = params.experimentId as string;
	const phenomenonId = params.phenomenonId as string;
	const [device, setDevice] = useState<Device | null>(null);
	const [experiment, setExperiment] = useState<Experiment | null>(null);
	const [phenomenon, setPhenomenon] = useState<ActivePhenomenon | null>(null);
	const [measurements, setMeasurements] = useState<Measurement[]>([]);
	const [phenomenonMeasurements, setPhenomenonMeasurements] = useState<
		MeasurementData[]
	>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null); // Real-time data viewing
	const [autoRefresh, setAutoRefresh] = useState(false);
	const [viewMode, setViewMode] = useState<
		"chart" | "table" | "json" | "phenomenon-data" | "charts"
	>("phenomenon-data");
	const [activeChartTab, setActiveChartTab] = useState<string>("");
	const [chartType, setChartType] = useState<
		"line" | "area" | "bar" | "scatter"
	>("line");
	const [autoZoom, setAutoZoom] = useState(true);

	useEffect(() => {
		if (deviceId && experimentId && phenomenonId) {
			loadPhenomenonData();
		}
	}, [deviceId, experimentId, phenomenonId]);

	// Auto-refresh for live data
	useEffect(() => {
		if (!autoRefresh || !phenomenon) return;

		const interval = setInterval(loadMeasurements, 2000);
		return () => clearInterval(interval);
	}, [autoRefresh, phenomenon]);

	const loadPhenomenonData = async () => {
		try {
			setLoading(true);
			setError(null);

			// Load device and experiment data
			const [deviceData, experimentsData] = await Promise.all([
				deviceApi.getDevice(deviceId),
				experimentApi.getExperiments(),
			]);

			if (!deviceData) {
				setError("Device not found");
				return;
			}
			setDevice(deviceData);

			const experimentData = experimentsData.find(
				(exp) => exp.experiment_id === experimentId
			);
			if (!experimentData) {
				setError("Experiment not found");
				return;
			}
			setExperiment(experimentData);

			// For now, create a mock phenomenon based on the ID
			// In a real implementation, this would come from the API
			const mockPhenomenon: ActivePhenomenon = {
				phenomenon_id: phenomenonId,
				name: `Phenomenon ${phenomenonId}`,
				description: "Measurement condition",
				status: "Active",
				start_time: new Date().toISOString(),
				duration: 300, // 5 minutes
			};
			setPhenomenon(mockPhenomenon);

			// Load measurements
			await loadMeasurements();
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to load phenomenon data"
			);
		} finally {
			setLoading(false);
		}
	};
	const loadMeasurements = async () => {
		try {
			// Load recent measurements for this device (general measurements)
			const measurementRes = await getAllMeasurements(deviceId, 100);
			if (measurementRes.success) {
				setMeasurements(measurementRes.data);
			}

			// Load phenomenon-specific measurements from measurement_data table
			const phenomenonMeasurementRes = await getPhenomenonMeasurements(
				phenomenonId
			);
			if (phenomenonMeasurementRes.success) {
				setPhenomenonMeasurements(phenomenonMeasurementRes.data);
			}
		} catch (error) {
			console.error("Error loading measurements:", error);
		}
	};

	const downloadJSON = () => {
		const dataToDownload = {
			device: device,
			experiment: experiment,
			phenomenon: phenomenon,
			measurements: measurements,
			exported_at: new Date().toISOString(),
		};

		const blob = new Blob([JSON.stringify(dataToDownload, null, 2)], {
			type: "application/json",
		});

		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${device?.device_name}_${experiment?.name}_${phenomenon?.name}_data.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	// Extract and process chart data from phenomenon measurements for Recharts
	const getChartDataFromPayloads = () => {
		if (!phenomenonMeasurements.length) return {};

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
		phenomenonMeasurements.forEach((measurement) => {
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

			phenomenonMeasurements.forEach((measurement, measurementIndex) => {
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

	if (error || !device || !experiment || !phenomenon) {
		return (
			<PageLayout
				title='Phenomenon Details'
				breadcrumbs={[
					{ label: "Home", href: "/" },
					{ label: "Devices", href: "/devices" },
					{
						label: device?.device_name || "Device",
						href: `/devices/${deviceId}`,
					},
					{
						label: experiment?.name || "Experiment",
						href: `/devices/${deviceId}/experiments/${experimentId}`,
					},
					{
						label: "Phenomenon",
						href: `/devices/${deviceId}/experiments/${experimentId}/phenomena/${phenomenonId}`,
					},
				]}
			>
				<div className='bg-red-50 border border-red-200 rounded-lg p-6'>
					<h2 className='text-lg font-medium text-red-800 mb-2'>
						Error
					</h2>
					<p className='text-red-700'>
						{error || "Phenomenon not found"}
					</p>
					<Link
						href={`/devices/${deviceId}/experiments/${experimentId}`}
						className='mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700'
					>
						← Back to Experiment
					</Link>
				</div>
			</PageLayout>
		);
	}

	return (
		<PageLayout
			title={phenomenon.name}
			breadcrumbs={[
				{ label: "Home", href: "/" },
				{ label: "Devices", href: "/devices" },
				{ label: device.device_name, href: `/devices/${deviceId}` },
				{
					label: experiment.name || experiment.experiment_id,
					href: `/devices/${deviceId}/experiments/${experimentId}`,
				},
				{
					label: phenomenon.name,
					href: `/devices/${deviceId}/experiments/${experimentId}/phenomena/${phenomenonId}`,
				},
			]}
		>
			<div className='space-y-6'>
				{/* Phenomenon Header */}
				<div className='bg-white p-6 rounded-lg border border-gray-200'>
					<div className='flex justify-between items-start mb-4'>
						<div>
							<h2 className='text-2xl font-bold text-gray-900 mb-2'>
								🔬 {phenomenon.name}
							</h2>
							<p className='text-gray-600 mb-4'>
								{phenomenon.description ||
									"No description provided"}
							</p>
							<div className='flex space-x-4 text-sm text-gray-500'>
								<span>Device: {device.device_name}</span>
								<span>
									Experiment:{" "}
									{experiment.name ||
										experiment.experiment_id}
								</span>
								<span>
									Started:{" "}
									{new Date(
										phenomenon.start_time
									).toLocaleString()}
								</span>
								<span>
									Duration:{" "}
									{Math.floor(phenomenon.duration / 60)}m{" "}
									{phenomenon.duration % 60}s
								</span>
							</div>
						</div>

						<div className='flex space-x-2'>
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
							<button
								onClick={downloadJSON}
								className='px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700'
							>
								📥 Download JSON
							</button>
						</div>
					</div>
				</div>

				{/* Data View Controls */}
				<div className='bg-white p-6 rounded-lg border border-gray-200'>
					<div className='flex justify-between items-center mb-4'>
						<h3 className='text-lg font-medium text-gray-900'>
							📊 Measurement Data
						</h3>{" "}
						<div className='flex space-x-2'>
							{[
								"phenomenon-data",
								"charts",
								"chart",
								"table",
								"json",
							].map((mode) => (
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
									{mode === "phenomenon-data"
										? "🔬 Phenomenon Data"
										: mode === "charts"
										? "📊 Interactive Charts"
										: mode === "chart"
										? "📈 Device Chart"
										: mode === "table"
										? "📋 Device Table"
										: "🔧 JSON"}
								</button>
							))}{" "}
						</div>
					</div>
					{/* Data Display */}
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
								</p>
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
																	icon: "📈",
																	name: "Line",
																},
																{
																	type: "area" as const,
																	icon: "📊",
																	name: "Area",
																},
																{
																	type: "bar" as const,
																	icon: "📊",
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
																icon: "📊",
															},
															{
																label: "Minimum",
																value: min.toFixed(
																	3
																),
																icon: "📉",
															},
															{
																label: "Maximum",
																value: max.toFixed(
																	3
																),
																icon: "📈",
															},
															{
																label: "Latest",
																value:
																	latest?.toFixed(
																		3
																	) || "N/A",
																icon: "🕐",
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
																data
															</div>
														</div>
													</div>
												)}
												{/* Raw Data Table for Active Chart */}
												<div className='mt-6'>
													<h6 className='text-md font-medium text-gray-800 mb-3'>
														Raw Data for{" "}
														{activeChartTab} (
														{
															chartData[
																activeChartTab
															].length
														}{" "}
														points)
													</h6>
													<div className='max-h-64 overflow-y-auto border border-gray-200 rounded'>
														<table className='min-w-full text-sm'>
															<thead className='bg-gray-50 sticky top-0'>
																<tr>
																	<th className='px-4 py-2 text-left font-medium text-gray-700'>
																		Timestamp
																	</th>
																	<th className='px-4 py-2 text-left font-medium text-gray-700'>
																		Value
																	</th>
																</tr>
															</thead>
															<tbody className='divide-y divide-gray-200'>
																{chartData[
																	activeChartTab
																]
																	.slice(
																		0,
																		100
																	)
																	.map(
																		(
																			point,
																			index
																		) => (
																			<tr
																				key={
																					index
																				}
																				className='hover:bg-gray-50'
																			>
																				<td className='px-4 py-2 text-gray-600'>
																					{
																						point.timestampFormatted
																					}
																				</td>
																				<td className='px-4 py-2 font-medium text-gray-900'>
																					{
																						point.value
																					}
																				</td>
																			</tr>
																		)
																	)}
															</tbody>
														</table>
													</div>
												</div>
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
												for this phenomenon
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
					{viewMode === "chart" && (
						<div className='bg-gray-50 border border-gray-200 rounded-lg p-8'>
							<div className='text-center text-gray-500'>
								<div className='text-4xl mb-4'>📈</div>
								<h4 className='text-lg font-medium mb-2'>
									Chart Visualization
								</h4>
								<p>
									Real-time charts showing temperature,
									humidity, pressure, and battery over time
								</p>
								<p className='text-sm mt-2'>
									{measurements.length} data points available
								</p>
								{autoRefresh && (
									<div className='mt-4 text-green-600'>
										🔄 Auto-refreshing every 2 seconds
									</div>
								)}
							</div>
						</div>
					)}
					{viewMode === "table" && (
						<div className='overflow-x-auto'>
							{measurements.length > 0 ? (
								<table className='min-w-full divide-y divide-gray-200'>
									<thead className='bg-gray-50'>
										<tr>
											<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
												Timestamp
											</th>
											<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
												Temperature (°C)
											</th>
											<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
												Humidity (%)
											</th>
											<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
												Pressure (hPa)
											</th>
											<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
												Battery (%)
											</th>
										</tr>
									</thead>
									<tbody className='bg-white divide-y divide-gray-200'>
										{measurements
											.slice(0, 50)
											.map((measurement) => (
												<tr
													key={measurement.id}
													className='hover:bg-gray-50'
												>
													<td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
														{
															measurement.measured_at
														}
													</td>
													<td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
														{
															measurement.temperature
														}
													</td>
													<td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
														{measurement.humidity}
													</td>
													<td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
														{measurement.pressure}
													</td>
													<td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
														{
															measurement.battery_level
														}
													</td>
												</tr>
											))}
									</tbody>
								</table>
							) : (
								<div className='text-center py-8 text-gray-500'>
									No measurement data available
								</div>
							)}
						</div>
					)}{" "}
					{viewMode === "phenomenon-data" && (
						<div className='space-y-4'>
							<div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
								<h4 className='text-lg font-medium text-blue-800 mb-2'>
									🔬 Phenomenon-Specific Measurements
								</h4>
								<p className='text-blue-700 text-sm mb-4'>
									This data is specifically collected during
									this phenomenon from the measurement_data
									table. It includes detailed sensor readings
									and experimental parameters.
								</p>
								<div className='grid grid-cols-1 md:grid-cols-3 gap-4 text-sm'>
									<div>
										<span className='font-medium'>
											Total Records:
										</span>{" "}
										{phenomenonMeasurements.length}
									</div>
									<div>
										<span className='font-medium'>
											Phenomenon ID:
										</span>{" "}
										{phenomenonId}
									</div>
									<div>
										<span className='font-medium'>
											Data Source:
										</span>{" "}
										measurement_data table
									</div>
								</div>
							</div>

							{phenomenonMeasurements.length > 0 ? (
								<div className='overflow-x-auto'>
									<table className='min-w-full divide-y divide-gray-200'>
										<thead className='bg-gray-50'>
											<tr>
												<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
													Timestamp
												</th>
												<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
													Data ID
												</th>
												<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
													Device ID
												</th>
												<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
													Data Payload
												</th>
											</tr>
										</thead>
										<tbody className='bg-white divide-y divide-gray-200'>
											{phenomenonMeasurements
												.slice(0, 50)
												.map((measurement, index) => (
													<tr
														key={`${measurement.data_id}-${index}`}
														className='hover:bg-gray-50'
													>
														<td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
															{new Date(
																measurement.timestamp
															).toLocaleString()}
														</td>
														<td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium'>
															{
																measurement.data_id
															}
														</td>
														<td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
															{
																measurement.device_id
															}
														</td>
														<td className='px-6 py-4 text-sm text-gray-600 max-w-xs'>
															<div className='truncate'>
																{typeof measurement.data_payload ===
																"object"
																	? JSON.stringify(
																			measurement.data_payload
																	  )
																	: measurement.data_payload}
															</div>
														</td>
													</tr>
												))}
										</tbody>
									</table>
								</div>
							) : (
								<div className='text-center py-12 bg-gray-50 rounded-lg'>
									<div className='text-gray-400 text-4xl mb-4'>
										📊
									</div>
									<h4 className='text-lg font-medium text-gray-600 mb-2'>
										No Phenomenon Data Available
									</h4>
									<p className='text-gray-500 mb-4'>
										No measurements have been recorded for
										this specific phenomenon yet.
									</p>
									<div className='text-sm text-gray-400'>
										<p>Data will appear here when:</p>
										<ul className='mt-2 space-y-1'>
											<li>
												• The phenomenon is actively
												collecting data
											</li>
											<li>
												• Measurements are stored in the
												measurement_data table
											</li>
											<li>
												• The phenomenon_id matches this
												phenomenon
											</li>
										</ul>
									</div>
								</div>
							)}

							{/* Phenomenon Data Summary */}
							{phenomenonMeasurements.length > 0 && (
								<div className='bg-gray-50 border border-gray-200 rounded-lg p-4'>
									<h4 className='text-lg font-medium text-gray-800 mb-3'>
										📈 Data Summary
									</h4>
									<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
										{(() => {
											const latestMeasurement =
												phenomenonMeasurements[
													phenomenonMeasurements.length -
														1
												];
											const oldestMeasurement =
												phenomenonMeasurements[0];

											return [
												{
													label: "Total Records",
													value: phenomenonMeasurements.length.toString(),
													icon: "📊",
												},
												{
													label: "Device ID",
													value:
														phenomenonMeasurements[0]
															?.device_id ||
														"N/A",
													icon: "�",
												},
												{
													label: "Latest Data ID",
													value:
														latestMeasurement?.data_id?.toString() ||
														"N/A",
													icon: "🆔",
												},
												{
													label: "Time Range",
													value:
														latestMeasurement &&
														oldestMeasurement
															? `${Math.round(
																	(new Date(
																		latestMeasurement.timestamp
																	).getTime() -
																		new Date(
																			oldestMeasurement.timestamp
																		).getTime()) /
																		1000 /
																		60
															  )}m`
															: "N/A",
													icon: "⏱️",
												},
											].map((stat, index) => (
												<div
													key={index}
													className='bg-white p-3 rounded border'
												>
													<div className='flex items-center space-x-2'>
														<span className='text-lg'>
															{stat.icon}
														</span>
														<div>
															<p className='text-sm text-gray-600'>
																{stat.label}
															</p>
															<p className='text-lg font-semibold text-gray-900'>
																{stat.value}
															</p>
														</div>
													</div>
												</div>
											));
										})()}
									</div>
								</div>
							)}

							{/* Detailed Data Payload View */}
							{phenomenonMeasurements.length > 0 && (
								<div className='bg-white border border-gray-200 rounded-lg p-4'>
									<h4 className='text-lg font-medium text-gray-800 mb-3'>
										🔍 Detailed Data Payloads (Latest 5
										Records)
									</h4>
									<div className='space-y-3'>
										{phenomenonMeasurements
											.slice(-5)
											.reverse()
											.map((measurement, index) => (
												<div
													key={`detail-${measurement.data_id}-${index}`}
													className='bg-gray-50 border border-gray-200 rounded p-3'
												>
													<div className='flex justify-between items-start mb-2'>
														<span className='text-sm font-medium text-gray-700'>
															Data ID:{" "}
															{
																measurement.data_id
															}
														</span>
														<span className='text-xs text-gray-500'>
															{new Date(
																measurement.timestamp
															).toLocaleString()}
														</span>
													</div>
													<pre className='text-xs bg-gray-900 text-green-400 p-2 rounded overflow-x-auto'>
														{JSON.stringify(
															measurement.data_payload,
															null,
															2
														)}
													</pre>
												</div>
											))}
									</div>
								</div>
							)}
						</div>
					)}
					{viewMode === "json" && (
						<div className='bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-96'>
							<pre className='text-sm'>
								{JSON.stringify(
									{
										phenomenon: phenomenon,
										measurements: measurements.slice(0, 10), // Show first 10 for preview
										phenomenonMeasurements:
											phenomenonMeasurements.slice(0, 10),
										total_measurements: measurements.length,
										total_phenomenon_measurements:
											phenomenonMeasurements.length,
									},
									null,
									2
								)}
							</pre>
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
							href={`/devices/${deviceId}/experiments/${experimentId}`}
							className='text-blue-600 hover:text-blue-900'
						>
							← Back to Experiment
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
