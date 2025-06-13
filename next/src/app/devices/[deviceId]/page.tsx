"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
	deviceApi,
	Device,
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
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<
		"overview" | "measurements" | "stats"
	>("overview");

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

			// Load measurement data using device UUID
			const deviceUuid = deviceData.device_uuid;
			const [latestRes, measurementsRes, statsRes] =
				await Promise.allSettled([
					getLatestMeasurement(deviceUuid),
					getAllMeasurements(deviceUuid, 20),
					getMeasurementStats(deviceUuid),
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
			case "Pending-Registration":
				return "bg-yellow-100 text-yellow-800";
			case "Not-Active":
				return "bg-red-100 text-red-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	const getDeviceIcon = (type: Device["device_type"]) => {
		switch (type) {
			case "Drone":
				return "🚁";
			case "DSP":
				return "📡";
			case "IoT-Sensor":
				return "📏";
			case "Other":
				return "🔧";
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
		<div className='container mx-auto px-4 py-8'>
			{/* Header */}
			<div className='flex items-center justify-between mb-8'>
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
								</h1>
								<p className='text-gray-600'>
									ID: {device.device_id}
								</p>
							</div>
						</div>
					</div>
				</div>
				<div className='flex space-x-2'>
					{device.status === "Not-Active" && (
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
					<button
						onClick={handleDeleteDevice}
						className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700'
					>
						Delete
					</button>
				</div>
			</div>

			{/* Status and basic info */}
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
						{device.status}
					</span>
				</div>
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
						{new Date(device.last_updated).toLocaleString()}
					</p>
				</div>
			</div>

			{/* Tabs */}
			<div className='border-b border-gray-200 mb-6'>
				<nav className='-mb-px flex space-x-8'>
					{["overview", "measurements", "stats"].map((tab) => (
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
							{tab.charAt(0).toUpperCase() + tab.slice(1)}
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
						</h3>
						<dl className='grid grid-cols-1 md:grid-cols-2 gap-4'>
							<div>
								<dt className='text-sm font-medium text-gray-500'>
									Device UUID
								</dt>
								<dd className='text-sm text-gray-900 font-mono'>
									{device.device_uuid}
								</dd>
							</div>
							<div>
								<dt className='text-sm font-medium text-gray-500'>
									Created
								</dt>
								<dd className='text-sm text-gray-900'>
									{new Date(
										device.created_at
									).toLocaleString()}
								</dd>
							</div>
							{device.last_seen_at && (
								<div>
									<dt className='text-sm font-medium text-gray-500'>
										Last Seen
									</dt>
									<dd className='text-sm text-gray-900'>
										{new Date(
											device.last_seen_at
										).toLocaleString()}
									</dd>
								</div>
							)}
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
			)}

			{activeTab === "measurements" && (
				<div className='bg-white rounded-lg border border-gray-200 overflow-hidden'>
					<div className='px-6 py-4 border-b border-gray-200'>
						<h3 className='text-lg font-medium text-gray-900'>
							Recent Measurements
						</h3>
						<p className='text-sm text-gray-500'>
							Latest {measurements.length} measurements
						</p>
					</div>
					{measurements.length > 0 ? (
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
									{measurements.map((measurement) => (
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
					) : (
						<div className='p-6 text-center'>
							<p className='text-gray-500'>
								No measurements available for this device.
							</p>
						</div>
					)}
				</div>
			)}

			{activeTab === "stats" && (
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
													{stats.min_temperature}°C
												</div>
												<div className='text-xs text-gray-500'>
													Min
												</div>
											</div>
											<div>
												<div className='text-sm font-medium'>
													{stats.max_temperature}°C
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
												{stats.avg_humidity.toFixed(1)}%
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
												{stats.avg_pressure.toFixed(1)}{" "}
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
		</div>
	);
}
