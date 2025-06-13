"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
	deviceApi,
	experimentApi,
	testApiConnection,
	Device,
	Experiment,
	getAllMeasurements,
	getLatestMeasurement,
	Measurement,
} from "@/services/api";

export default function Dashboard() {
	const [devices, setDevices] = useState<Device[]>([]);
	const [experiments, setExperiments] = useState<Experiment[]>([]);
	const [recentMeasurements, setRecentMeasurements] = useState<Measurement[]>(
		[]
	);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [apiStatus, setApiStatus] = useState<{
		success: boolean;
		message?: string;
		time?: string;
	} | null>(null);

	useEffect(() => {
		loadDashboardData();
	}, []);

	const loadDashboardData = async () => {
		try {
			setLoading(true);
			setError(null);

			// Test API connection first
			const apiResult = await testApiConnection(
				"Dashboard connection test"
			);
			setApiStatus(apiResult);

			// Load devices and experiments in parallel
			const [devicesData, experimentsData] = await Promise.all([
				deviceApi.getDevices(),
				experimentApi.getExperiments(),
			]);

			setDevices(devicesData || []);
			setExperiments(experimentsData || []);

			// Load recent measurements from the first active device
			const activeDevice = devicesData?.find(
				(d) => d.status === "Active"
			);
			if (activeDevice) {
				try {
					const measurementsResponse = await getAllMeasurements(
						activeDevice.device_uuid,
						5
					);
					if (measurementsResponse.success) {
						setRecentMeasurements(measurementsResponse.data);
					}
				} catch (err) {
					console.warn("Failed to load recent measurements:", err);
				}
			}
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to load dashboard data"
			);
			setApiStatus({
				success: false,
				message: `Dashboard load failed: ${
					err instanceof Error ? err.message : "Unknown error"
				}`,
			});
		} finally {
			setLoading(false);
		}
	};

	const getDeviceStatusCounts = () => {
		return {
			total: devices.length,
			active: devices.filter((d) => d.status === "Active").length,
			pending: devices.filter((d) => d.status === "Pending-Registration")
				.length,
			inactive: devices.filter((d) => d.status === "Not-Active").length,
		};
	};

	const getExperimentStatusCounts = () => {
		return {
			total: experiments.length,
			active: experiments.filter((e) => e.status === "Active").length,
			completed: experiments.filter((e) => e.status === "Completed")
				.length,
			draft: experiments.filter((e) => e.status === "Draft").length,
		};
	};

	if (loading) {
		return (
			<div className='flex items-center justify-center min-h-screen'>
				<div className='text-center'>
					<div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4'></div>
					<p className='text-gray-600'>Loading dashboard...</p>
				</div>
			</div>
		);
	}

	return (
		<div className='container mx-auto px-4 py-8'>
			{/* Header */}
			<div className='mb-8'>
				<h1 className='text-4xl font-bold text-gray-900 mb-2'>
					📊 Device Measurement Tracker
				</h1>
				<p className='text-xl text-gray-600'>
					Monitor your devices, experiments, and measurements in
					real-time
				</p>
			</div>

			{/* API Status Banner */}
			{apiStatus && (
				<div
					className={`mb-6 rounded-lg p-4 ${
						apiStatus.success
							? "bg-green-50 border border-green-200 text-green-800"
							: "bg-red-50 border border-red-200 text-red-800"
					}`}
				>
					<div className='flex items-center'>
						<span className='text-2xl mr-3'>
							{apiStatus.success ? "✅" : "❌"}
						</span>
						<div>
							<div className='font-medium'>
								API Status:{" "}
								{apiStatus.success
									? "Connected"
									: "Disconnected"}
							</div>
							{apiStatus.message && (
								<div className='text-sm opacity-90'>
									{apiStatus.message}
								</div>
							)}
							{apiStatus.time && (
								<div className='text-sm opacity-75'>
									Server time: {apiStatus.time}
								</div>
							)}
						</div>
						{!apiStatus.success && (
							<button
								onClick={loadDashboardData}
								className='ml-auto px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm'
							>
								Retry
							</button>
						)}
					</div>
				</div>
			)}

			{error && (
				<div className='mb-6 bg-red-50 border border-red-200 rounded-lg p-4'>
					<div className='flex items-center'>
						<span className='text-red-400 text-xl mr-3'>⚠️</span>
						<div>
							<h3 className='text-sm font-medium text-red-800'>
								Dashboard Error
							</h3>
							<p className='text-sm text-red-700 mt-1'>{error}</p>
						</div>
						<button
							onClick={loadDashboardData}
							className='ml-auto text-red-600 hover:text-red-500 text-sm'
						>
							Refresh
						</button>
					</div>
				</div>
			)}

			{/* Quick Stats */}
			<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
				<div className='bg-white rounded-lg border border-gray-200 p-6'>
					<div className='flex items-center'>
						<div className='p-2 bg-blue-100 rounded-lg'>
							<span className='text-2xl'>📱</span>
						</div>
						<div className='ml-4'>
							<h3 className='text-sm font-medium text-gray-500'>
								Total Devices
							</h3>
							<p className='text-2xl font-bold text-blue-600'>
								{getDeviceStatusCounts().total}
							</p>
							<p className='text-xs text-gray-500'>
								{getDeviceStatusCounts().active} active,{" "}
								{getDeviceStatusCounts().pending} pending
							</p>
						</div>
					</div>
				</div>

				<div className='bg-white rounded-lg border border-gray-200 p-6'>
					<div className='flex items-center'>
						<div className='p-2 bg-green-100 rounded-lg'>
							<span className='text-2xl'>🧪</span>
						</div>
						<div className='ml-4'>
							<h3 className='text-sm font-medium text-gray-500'>
								Experiments
							</h3>
							<p className='text-2xl font-bold text-green-600'>
								{getExperimentStatusCounts().total}
							</p>
							<p className='text-xs text-gray-500'>
								{getExperimentStatusCounts().active} active,{" "}
								{getExperimentStatusCounts().completed}{" "}
								completed
							</p>
						</div>
					</div>
				</div>

				<div className='bg-white rounded-lg border border-gray-200 p-6'>
					<div className='flex items-center'>
						<div className='p-2 bg-purple-100 rounded-lg'>
							<span className='text-2xl'>�</span>
						</div>
						<div className='ml-4'>
							<h3 className='text-sm font-medium text-gray-500'>
								Measurements
							</h3>
							<p className='text-2xl font-bold text-purple-600'>
								{recentMeasurements.length}
							</p>
							<p className='text-xs text-gray-500'>
								Recent readings
							</p>
						</div>
					</div>
				</div>

				<div className='bg-white rounded-lg border border-gray-200 p-6'>
					<div className='flex items-center'>
						<div className='p-2 bg-yellow-100 rounded-lg'>
							<span className='text-2xl'>⚡</span>
						</div>
						<div className='ml-4'>
							<h3 className='text-sm font-medium text-gray-500'>
								System Status
							</h3>
							<p className='text-2xl font-bold text-yellow-600'>
								{apiStatus?.success ? "Online" : "Offline"}
							</p>
							<p className='text-xs text-gray-500'>
								API Connection
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* Main Content Grid */}
			<div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
				{/* Recent Devices */}
				<div className='bg-white rounded-lg border border-gray-200 p-6'>
					<div className='flex items-center justify-between mb-4'>
						<h2 className='text-xl font-bold text-gray-900'>
							Recent Devices
						</h2>
						<Link
							href='/devices'
							className='text-blue-600 hover:text-blue-500 text-sm font-medium'
						>
							View All →
						</Link>
					</div>
					{devices.length > 0 ? (
						<div className='space-y-3'>
							{devices.slice(0, 5).map((device) => (
								<div
									key={device.device_id}
									className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'
								>
									<div className='flex items-center'>
										<span className='text-xl mr-3'>
											{device.device_type === "Drone"
												? "🚁"
												: device.device_type === "DSP"
												? "📡"
												: device.device_type ===
												  "IoT-Sensor"
												? "📏"
												: "🔧"}
										</span>
										<div>
											<p className='font-medium text-gray-900'>
												{device.device_name}
											</p>
											<p className='text-sm text-gray-500'>
												{device.device_type}
											</p>
										</div>
									</div>
									<span
										className={`px-2 py-1 rounded-full text-xs font-medium ${
											device.status === "Active"
												? "bg-green-100 text-green-800"
												: device.status ===
												  "Pending-Registration"
												? "bg-yellow-100 text-yellow-800"
												: "bg-red-100 text-red-800"
										}`}
									>
										{device.status}
									</span>
								</div>
							))}
						</div>
					) : (
						<div className='text-center py-8'>
							<span className='text-4xl mb-3 block'>📱</span>
							<p className='text-gray-500 mb-4'>
								No devices registered yet
							</p>
							<Link
								href='/devices/register'
								className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700'
							>
								Register First Device
							</Link>
						</div>
					)}
				</div>

				{/* Recent Experiments */}
				<div className='bg-white rounded-lg border border-gray-200 p-6'>
					<div className='flex items-center justify-between mb-4'>
						<h2 className='text-xl font-bold text-gray-900'>
							Recent Experiments
						</h2>
						<Link
							href='/experiments'
							className='text-blue-600 hover:text-blue-500 text-sm font-medium'
						>
							View All →
						</Link>
					</div>
					{experiments.length > 0 ? (
						<div className='space-y-3'>
							{experiments.slice(0, 5).map((experiment) => (
								<div
									key={experiment.experiment_id}
									className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'
								>
									<div className='flex items-center'>
										<span className='text-xl mr-3'>
											{experiment.status === "Active"
												? "🟢"
												: experiment.status ===
												  "Completed"
												? "✅"
												: experiment.status === "Paused"
												? "⏸️"
												: "📝"}
										</span>
										<div>
											<p className='font-medium text-gray-900'>
												{experiment.name}
											</p>
											<p className='text-sm text-gray-500'>
												{experiment.device_ids
													?.length || 0}{" "}
												devices
											</p>
										</div>
									</div>
									<span
										className={`px-2 py-1 rounded-full text-xs font-medium ${
											experiment.status === "Active"
												? "bg-green-100 text-green-800"
												: experiment.status ===
												  "Completed"
												? "bg-blue-100 text-blue-800"
												: experiment.status === "Paused"
												? "bg-yellow-100 text-yellow-800"
												: "bg-gray-100 text-gray-800"
										}`}
									>
										{experiment.status}
									</span>
								</div>
							))}
						</div>
					) : (
						<div className='text-center py-8'>
							<span className='text-4xl mb-3 block'>🧪</span>
							<p className='text-gray-500 mb-4'>
								No experiments created yet
							</p>
							<Link
								href='/experiments/register'
								className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700'
							>
								Create First Experiment
							</Link>
						</div>
					)}
				</div>
			</div>

			{/* Recent Measurements */}
			{recentMeasurements.length > 0 && (
				<div className='mt-8 bg-white rounded-lg border border-gray-200 p-6'>
					<h2 className='text-xl font-bold text-gray-900 mb-4'>
						Recent Measurements
					</h2>
					<div className='overflow-x-auto'>
						<table className='min-w-full divide-y divide-gray-200'>
							<thead className='bg-gray-50'>
								<tr>
									<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
										Time
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
								{recentMeasurements.map((measurement) => (
									<tr
										key={measurement.id}
										className='hover:bg-gray-50'
									>
										<td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
											{measurement.measured_at}
										</td>
										<td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
											{measurement.temperature}
										</td>
										<td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
											{measurement.humidity}
										</td>
										<td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
											{measurement.pressure}
										</td>
										<td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
											{measurement.battery_level}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{/* Quick Actions */}
			<div className='mt-8 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6'>
				<h2 className='text-xl font-bold text-gray-900 mb-4'>
					Quick Actions
				</h2>
				<div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
					<Link
						href='/devices/register'
						className='flex items-center p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all'
					>
						<span className='text-3xl mr-4'>📱</span>
						<div>
							<h3 className='font-medium text-gray-900'>
								Register Device
							</h3>
							<p className='text-sm text-gray-500'>
								Add a new measurement device
							</p>
						</div>
					</Link>
					<Link
						href='/experiments/register'
						className='flex items-center p-4 bg-white rounded-lg border border-gray-200 hover:border-green-300 hover:shadow-md transition-all'
					>
						<span className='text-3xl mr-4'>🧪</span>
						<div>
							<h3 className='font-medium text-gray-900'>
								New Experiment
							</h3>
							<p className='text-sm text-gray-500'>
								Create a measurement experiment
							</p>
						</div>
					</Link>
					<button
						onClick={loadDashboardData}
						className='flex items-center p-4 bg-white rounded-lg border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all'
					>
						<span className='text-3xl mr-4'>🔄</span>
						<div>
							<h3 className='font-medium text-gray-900'>
								Refresh Data
							</h3>
							<p className='text-sm text-gray-500'>
								Update dashboard information
							</p>
						</div>
					</button>
				</div>
			</div>
		</div>
	);
}
