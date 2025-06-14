"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import PageLayout from "@/components/PageLayout";
import {
	deviceApi,
	experimentApi,
	onlineModeApi,
	Device,
	Experiment,
	ActivePhenomenon,
	getAllMeasurements,
	Measurement,
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
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Real-time data viewing
	const [autoRefresh, setAutoRefresh] = useState(false);
	const [viewMode, setViewMode] = useState<"chart" | "table" | "json">(
		"chart"
	);

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
			// Load recent measurements for this device
			const measurementRes = await getAllMeasurements(deviceId, 100);
			if (measurementRes.success) {
				setMeasurements(measurementRes.data);
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
						</h3>
						<div className='flex space-x-2'>
							{["chart", "table", "json"].map((mode) => (
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
									{mode === "chart"
										? "📈 Chart"
										: mode === "table"
										? "📋 Table"
										: "🔧 JSON"}
								</button>
							))}
						</div>
					</div>

					{/* Data Display */}
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
					)}

					{viewMode === "json" && (
						<div className='bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-96'>
							<pre className='text-sm'>
								{JSON.stringify(
									{
										phenomenon: phenomenon,
										measurements: measurements.slice(0, 10), // Show first 10 for preview
										total_measurements: measurements.length,
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
