"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import PageLayout from "@/components/PageLayout";
import DeviceProtectedRoute from "@/components/DeviceProtectedRoute";
import AdvancedZoomChart from "@/components/AdvancedZoomChart";
import {
	deviceApi,
	faultApi,
	getMongoMeasurements,
	filterMeasurementsByNames,
	getDataSeriesList,
	Device,
	Fault,
	MeasurementData,
} from "@/services/api";
import { formatDate, formatDateShort } from "@/utils/dateUtils";

export default function DataSeriesDetailPage() {
	const params = useParams();
	const deviceId = params.deviceId as string;
	const faultId = params.faultId as string;
	const conditionId = params.conditionId as string;
	const dataseriesId = params.dataseriesId as string;

	// Basic data state
	const [device, setDevice] = useState<Device | null>(null);
	const [fault, setFault] = useState<Fault | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Measurement data state
	const [measurementData, setMeasurementData] = useState<MeasurementData[]>([]);
	const [measurementLoading, setMeasurementLoading] = useState(false);
	const [measurementError, setMeasurementError] = useState<string | null>(null);

	// Filter state
	const [startDate, setStartDate] = useState<string>("");
	const [endDate, setEndDate] = useState<string>("");
	const [autoRefresh, setAutoRefresh] = useState(false);

	// Chart state
	const [activeChartTab, setActiveChartTab] = useState<string>("");

	useEffect(() => {
		if (deviceId && faultId && conditionId && dataseriesId) {
			loadBasicData();
		}
	}, [deviceId, faultId, conditionId, dataseriesId]);

	useEffect(() => {
		if (device && fault) {
			loadMeasurements();
		}
	}, [device, fault, startDate, endDate]);

	// Auto-refresh measurements
	useEffect(() => {
		if (!autoRefresh || !device || !fault) return;

		const interval = setInterval(loadMeasurements, 5000);
		return () => clearInterval(interval);
	}, [autoRefresh, device, fault, startDate, endDate]);

	const loadBasicData = async () => {
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

		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to load basic data"
			);
		} finally {
			setLoading(false);
		}
	};

	const loadMeasurements = async () => {
		if (!device || !fault) return;

		try {
			setMeasurementLoading(true);
			setMeasurementError(null);
			
			// First, let's check what data series are available for this condition
			console.log("=== CHECKING AVAILABLE DATA SERIES ===");
			const dataSeriesResponse = await getDataSeriesList(deviceId, conditionId, faultId);
			console.log("Available data series:", dataSeriesResponse.data);
			console.log("Looking for data series:", dataseriesId, "type:", typeof dataseriesId);
			console.log("Data series types:", dataSeriesResponse.data.map(d => typeof d));
			
			// Convert dataseriesId to number for comparison since API returns numbers
			const dataSeriesIdNum = parseInt(dataseriesId);
			const dataSeriesExists = dataSeriesResponse.data.includes(dataSeriesIdNum);
			console.log("Data series exists:", dataSeriesExists);
			console.log("Data series list response:", dataSeriesResponse);

			if (!dataSeriesExists) {
				setMeasurementError(`Data series ${dataseriesId} not found. Available: ${dataSeriesResponse.data.join(', ')}`);
				setMeasurementData([]);
				return;
			}

			// Use the EXACT same approach as the working data-series-list endpoint
			// Create a custom request that mimics the successful data-series-list logic
			console.log("=== USING MYSQL CONDITION LOOKUP ===");
			
			// Calculate time range if dates are provided
			let timeRange: string | undefined;
			if (startDate || endDate) {
				const start = startDate
					? new Date(startDate).getTime() / 1000
					: 0;
				const end = endDate
					? new Date(endDate).getTime() / 1000
					: Date.now() / 1000;
				timeRange = `${start}-${end}`;
			}

			// Use the exact same method as condition page but add dataSeriesId filter
			const response = await getMongoMeasurements(
				deviceId, // deviceId
				undefined, // faultId - not used, relying on fault_name
				undefined, // conditionId - not used, relying on condition_name  
				dataseriesId, // dataSeriesId - filter by specific data series
				timeRange,
				1000, // limit
				0, // offset
				true, // includeData
				dataSeriesResponse.condition_info?.condition_name, // Use the condition name from MySQL lookup
				dataSeriesResponse.condition_info?.fault_name, // Use the fault name from MySQL lookup
				undefined // dataSeriesValue
			);
			
			console.log("MongoDB query with:", {
				deviceId: deviceId,
				dataSeriesId: dataseriesId,
				conditionName: dataSeriesResponse.condition_info?.condition_name,
				faultName: dataSeriesResponse.condition_info?.fault_name,
				timeRange: timeRange
			});

			if (response.success && response.data.length > 0) {
				// Convert the response to MeasurementData format
				const convertedData: MeasurementData[] = response.data.map(
					(item: any, index: number) => ({
						data_id: item._id || index.toString(),
						device_id: item.deviceId || deviceId,
						fault_id: item.faultId || faultId,
						condition_id: item.conditionId || conditionId,
						data_payload: item.data || item.data_payload || {},
						upload_type: "batch",
						timestamp: item.timestamp_unix
							? new Date(item.timestamp_unix * 1000).toISOString()
							: new Date(item.timestamp).toISOString(),
						created_at: item.created_at
							? new Date(item.created_at * 1000).toISOString()
							: new Date().toISOString(),
						updated_at: item.created_at
							? new Date(item.created_at * 1000).toISOString()
							: new Date().toISOString(),
					})
				);

				setMeasurementData(convertedData);
				console.log("Data series measurements loaded:", convertedData.length);
				console.log("MongoDB response:", response);
			} else {
				console.log(
					"No measurements found for data series:",
					dataseriesId
				);
				console.log("API response:", response);
				setMeasurementData([]);
			}
		} catch (error) {
			console.error("Error loading measurements:", error);
			setMeasurementError(error instanceof Error ? error.message : "Unknown error");
			setMeasurementData([]);
		} finally {
			setMeasurementLoading(false);
		}
	};

	// Extract and process chart data from measurement data
	const getChartDataFromPayloads = () => {
		if (!measurementData.length) return {};

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
		measurementData.forEach((measurement) => {
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

			measurementData.forEach((measurement, measurementIndex) => {
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

	// Calculate statistics for current chart
	const getChartStatistics = (key: string) => {
		if (!chartData[key] || chartData[key].length === 0) {
			return { min: 0, max: 0, avg: 0, latest: 0, count: 0 };
		}

		const values = chartData[key].map((d) => d.value);
		const min = Math.min(...values);
		const max = Math.max(...values);
		const avg = values.reduce((a, b) => a + b, 0) / values.length;
		const latest = values[values.length - 1];

		return { min, max, avg, latest, count: values.length };
	};

	const handleFilterSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		loadMeasurements();
	};

	const handleClearFilters = () => {
		setStartDate("");
		setEndDate("");
		loadMeasurements();
	};

	if (loading) {
		return (
			<DeviceProtectedRoute deviceId={deviceId}>
				<div className='flex items-center justify-center min-h-screen'>
					<div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600'></div>
				</div>
			</DeviceProtectedRoute>
		);
	}

	if (error) {
		return (
			<DeviceProtectedRoute deviceId={deviceId}>
				<PageLayout title="Error">
					<div className='text-center py-12'>
						<div className='text-red-600 text-xl mb-4'>⚠️ {error}</div>
						<Link
							href={`/devices/${deviceId}/faults/${faultId}/conditions/${conditionId}`}
							className='text-blue-600 hover:text-blue-900'
						>
							← Back to Condition
						</Link>
					</div>
				</PageLayout>
			</DeviceProtectedRoute>
		);
	}

	return (
		<DeviceProtectedRoute deviceId={deviceId}>
			<PageLayout
				title={`Data Series ${dataseriesId}`}
				breadcrumbs={[
					{ label: "Home", href: "/" },
					{ label: "Devices", href: "/devices" },
					{ label: device?.device_name || "Device", href: `/devices/${deviceId}` },
					{
						label: fault?.fault_name || fault?.fault_id || "Fault",
						href: `/devices/${deviceId}/faults/${faultId}`,
					},
					{
						label: conditionId,
						href: `/devices/${deviceId}/faults/${faultId}/conditions/${conditionId}`,
					},
					{
						label: `Series ${dataseriesId}`,
						href: `/devices/${deviceId}/faults/${faultId}/conditions/${conditionId}/dataseries/${dataseriesId}`,
					},
				]}
			>
				<div className='space-y-6'>
					{/* Header */}
					<div className='bg-white p-6 rounded-lg border border-gray-200'>
						<div className='flex justify-between items-start mb-4'>
							<div>
								<h2 className='text-2xl font-bold text-gray-900 mb-2'>
									Data Series {dataseriesId}
								</h2>
								<p className='text-gray-600 mb-4'>
									Detailed measurement analysis for data series {dataseriesId}
								</p>
								<div className='flex space-x-4 text-sm text-gray-500'>
									<span>📱 Device: {device?.device_name}</span>
									<span>🔧 Fault: {fault?.fault_name || fault?.fault_id}</span>
									<span>📊 Condition: {conditionId}</span>
									<span>🔢 Series: {dataseriesId}</span>
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
							</div>
						</div>
					</div>

					{/* Data Filters & Chart Controls */}
					<div className='bg-white p-6 rounded-lg border border-gray-200'>
						<h3 className='text-lg font-medium text-gray-900 mb-4'>
							🎛️ Data Filters & Chart Controls
						</h3>

						{/* Active Filters Display */}
						<div className='bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6'>
							<h4 className='text-sm font-medium text-blue-800 mb-3'>Active Filters</h4>
							<div className='grid grid-cols-1 md:grid-cols-3 gap-4 text-sm'>
								<div className='flex items-center space-x-2'>
									<span className='text-blue-600'>🏷️</span>
									<span className='font-medium'>Condition:</span>
									<span className='text-blue-800'>{conditionId}</span>
								</div>
								<div className='flex items-center space-x-2'>
									<span className='text-blue-600'>📋</span>
									<span className='font-medium'>Fault:</span>
									<span className='text-blue-800'>{fault?.fault_name}</span>
								</div>
								<div className='flex items-center space-x-2'>
									<span className='text-blue-600'>🖥️</span>
									<span className='font-medium'>Device:</span>
									<span className='text-blue-800'>{device?.device_name}</span>
								</div>
							</div>
							<div className='text-xs text-blue-600 mt-2'>
								Filtering uses condition_name and fault_name from database for improved accuracy
							</div>
						</div>

						{/* Date Range Filter */}
						<form onSubmit={handleFilterSubmit} className='space-y-4'>
							<div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>
										From:
									</label>
									<input
										type='datetime-local'
										value={startDate}
										onChange={(e) => setStartDate(e.target.value)}
										className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500'
										placeholder='dd/mm/yyyy, --:--'
									/>
								</div>
								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>
										To:
									</label>
									<input
										type='datetime-local'
										value={endDate}
										onChange={(e) => setEndDate(e.target.value)}
										className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500'
										placeholder='dd/mm/yyyy, --:--'
									/>
								</div>
								<div className='flex space-x-2 items-end'>
									<button
										type='submit'
										disabled={measurementLoading}
										className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50'
									>
										{measurementLoading ? 'Loading...' : 'Filter'}
									</button>
									<button
										type='button'
										onClick={handleClearFilters}
										className='px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300'
									>
										Clear
									</button>
								</div>
							</div>
						</form>
					</div>

					{/* Chart Data Keys */}
					{chartKeys.length > 0 && (
						<div className='bg-white p-6 rounded-lg border border-gray-200'>
							<h4 className='text-lg font-medium text-gray-900 mb-4'>
								📊 Available Data Channels
							</h4>
							<div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3'>
								{chartKeys.map((key) => {
									const stats = getChartStatistics(key);
									return (
										<button
											key={key}
											onClick={() => setActiveChartTab(key)}
											className={`p-3 rounded-lg border text-center transition-all ${
												activeChartTab === key
													? 'border-blue-500 bg-blue-50 text-blue-700'
													: 'border-gray-200 hover:border-gray-300 bg-white'
											}`}
										>
											<div className='font-medium'>{key}</div>
											<div className='text-xs text-gray-500 mt-1'>
												({stats.count} points)
											</div>
										</button>
									);
								})}
							</div>
						</div>
					)}

					{/* Advanced Chart Visualization */}
					{activeChartTab && chartData[activeChartTab] && (
						<div className='bg-white p-6 rounded-lg border border-gray-200'>
							<h4 className='text-lg font-medium text-gray-900 mb-2'>
								📈 {activeChartTab} Data Visualization
							</h4>
							<div className='text-sm text-green-600 mb-4'>
								Advanced Chart Mode Enabled - Professional zoom & analysis tools active
							</div>
							
							{/* Chart Container */}
							<div className='bg-gray-50 border border-gray-200 rounded-lg p-4'>
								<AdvancedZoomChart
									data={chartData[activeChartTab].map((item) => ({
										...item,
										timestamp: Date.parse(item.timestamp) || item.index,
									}))}
									dataKey='value'
									xAxisKey='timestampFormatted'
									title={`${activeChartTab} - Advanced Data Analysis`}
									color='#3B82F6'
									height={400}
									enableBrush={true}
									enableMagnifier={true}
									enableCrosshair={true}
									downsampleThreshold={10000}
								/>
							</div>

							{/* Chart Statistics */}
							<div className='mt-6 grid grid-cols-2 md:grid-cols-4 gap-4'>
								{(() => {
									const stats = getChartStatistics(activeChartTab);
									return [
										{
											label: "Average",
											value: stats.avg.toFixed(3),
											icon: "Avg",
										},
										{
											label: "Minimum",
											value: stats.min.toFixed(3),
											icon: "Min",
										},
										{
											label: "Maximum",
											value: stats.max.toFixed(3),
											icon: "Max",
										},
										{
											label: "Latest",
											value: stats.latest?.toFixed(3) || "N/A",
											icon: "Latest",
										},
									].map((stat, index) => (
										<div
											key={index}
											className='bg-gray-50 p-3 rounded border'
										>
											<div className='flex items-center space-x-2'>
												<span className='text-lg'>{stat.icon}</span>
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

					{/* No Data State */}
					{measurementLoading && (
						<div className='bg-white p-6 rounded-lg border border-gray-200 text-center'>
							<div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4'></div>
							<p className='text-gray-600'>Loading measurement data...</p>
						</div>
					)}

					{!measurementLoading && measurementData.length === 0 && (
						<div className='bg-white p-6 rounded-lg border border-gray-200 text-center'>
							<div className='text-gray-400 text-4xl mb-4'>📊</div>
							<h4 className='text-lg font-medium text-gray-600 mb-2'>
								No Measurement Data Found
							</h4>
							<p className='text-gray-500 mb-4'>
								No measurement data was found for data series {dataseriesId}.
							</p>
							<div className='text-sm text-gray-400'>
								<p>This might mean:</p>
								<ul className='mt-2 space-y-1'>
									<li>• No measurements have been recorded for this data series</li>
									<li>• The data series ID doesn't match recorded data</li>
									<li>• Try adjusting the date range filters</li>
								</ul>
							</div>
						</div>
					)}

					{measurementError && (
						<div className='bg-red-50 border border-red-200 rounded-lg p-4'>
							<div className='text-red-800 font-medium'>Error Loading Data</div>
							<div className='text-red-600 text-sm mt-1'>{measurementError}</div>
						</div>
					)}

					{/* Navigation Links */}
					<div className='bg-white p-6 rounded-lg border border-gray-200'>
						<h3 className='text-lg font-medium text-gray-900 mb-4'>
							Navigation
						</h3>
						<div className='flex space-x-4'>
							<Link
								href={`/devices/${deviceId}/faults/${faultId}/conditions/${conditionId}`}
								className='text-blue-600 hover:text-blue-900'
							>
								← Back to Condition
							</Link>
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
		</DeviceProtectedRoute>
	);
}
