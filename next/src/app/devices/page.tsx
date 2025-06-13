"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { deviceApi, Device } from "@/services/api";

export default function DevicesPage() {
	const [devices, setDevices] = useState<Device[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [filter, setFilter] = useState<
		"all" | "Active" | "Pending-Registration" | "Not-Active"
	>("all");

	useEffect(() => {
		loadDevices();
	}, []);

	const loadDevices = async () => {
		try {
			setLoading(true);
			setError(null);
			const response = await deviceApi.getDevices();
			setDevices(Array.isArray(response) ? response : []);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to load devices"
			);
		} finally {
			setLoading(false);
		}
	};

	const handleActivateDevice = async (deviceId: string) => {
		try {
			await deviceApi.activateDevice(deviceId);
			await loadDevices(); // Reload devices
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to activate device"
			);
		}
	};

	const handleDeactivateDevice = async (deviceId: string) => {
		if (!confirm("Are you sure you want to deactivate this device?"))
			return;

		try {
			await deviceApi.deactivateDevice(deviceId);
			await loadDevices(); // Reload devices
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to deactivate device"
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
				return "�";
			default:
				return "�";
		}
	};

	const filteredDevices =
		filter === "all"
			? devices
			: devices.filter((device) => device.status === filter);

	if (loading) {
		return (
			<div className='container mx-auto px-4 py-8'>
				<div className='animate-pulse'>
					<div className='h-8 bg-gray-200 rounded w-1/4 mb-6'></div>
					<div className='space-y-4'>
						{[...Array(3)].map((_, i) => (
							<div
								key={i}
								className='h-20 bg-gray-200 rounded'
							></div>
						))}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className='container mx-auto px-4 py-8'>
			{/* Header */}
			<div className='flex items-center justify-between mb-8'>
				<div>
					<h1 className='text-3xl font-bold text-gray-900'>
						Devices
					</h1>
					<p className='text-gray-600 mt-1'>
						Manage and monitor your measurement devices
					</p>
				</div>
				<Link
					href='/devices/register'
					className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700'
				>
					+ Register Device
				</Link>
			</div>

			{error && (
				<div className='mb-6 bg-red-50 border border-red-200 rounded-lg p-4'>
					<div className='flex items-center'>
						<span className='text-red-400 text-xl mr-3'>❌</span>
						<div>
							<h3 className='text-sm font-medium text-red-800'>
								Error
							</h3>
							<p className='text-sm text-red-700 mt-1'>{error}</p>
						</div>
						<button
							onClick={loadDevices}
							className='ml-auto bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm'
						>
							Try Again
						</button>
					</div>
				</div>
			)}

			{/* Filters */}
			<div className='flex space-x-4 mb-6'>
				{(
					[
						"all",
						"Active",
						"Pending-Registration",
						"Not-Active",
					] as const
				).map((status) => (
					<button
						key={status}
						onClick={() => setFilter(status)}
						className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
							filter === status
								? "bg-blue-100 text-blue-700 border border-blue-200"
								: "bg-gray-50 text-gray-600 hover:bg-gray-100"
						}`}
					>
						{status === "all"
							? "All Devices"
							: status.replace("-", " ")}
						{status !== "all" && (
							<span className='ml-2 bg-white px-2 py-0.5 rounded-full text-xs'>
								{
									devices.filter((d) => d.status === status)
										.length
								}
							</span>
						)}
					</button>
				))}
			</div>

			{/* Device Stats */}
			<div className='grid grid-cols-1 md:grid-cols-4 gap-4 mb-8'>
				<div className='bg-white border border-gray-200 rounded-lg p-4'>
					<div className='text-2xl font-bold text-gray-900'>
						{devices.length}
					</div>
					<div className='text-sm text-gray-500'>Total Devices</div>
				</div>
				<div className='bg-green-50 border border-green-200 rounded-lg p-4'>
					<div className='text-2xl font-bold text-green-600'>
						{devices.filter((d) => d.status === "Active").length}
					</div>
					<div className='text-sm text-green-600'>Active</div>
				</div>
				<div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4'>
					<div className='text-2xl font-bold text-yellow-600'>
						{
							devices.filter(
								(d) => d.status === "Pending-Registration"
							).length
						}
					</div>
					<div className='text-sm text-yellow-600'>Pending</div>
				</div>
				<div className='bg-red-50 border border-red-200 rounded-lg p-4'>
					<div className='text-2xl font-bold text-red-600'>
						{
							devices.filter((d) => d.status === "Not-Active")
								.length
						}
					</div>
					<div className='text-sm text-red-600'>Inactive</div>
				</div>
			</div>

			{/* Devices List */}
			{filteredDevices.length === 0 ? (
				<div className='text-center py-12'>
					<div className='text-gray-400 text-6xl mb-4'>📱</div>
					<h3 className='text-lg font-medium text-gray-900 mb-2'>
						{filter === "all"
							? "No devices found"
							: `No ${filter
									.replace("-", " ")
									.toLowerCase()} devices`}
					</h3>
					<p className='text-gray-500 mb-6'>
						{filter === "all"
							? "Get started by registering your first device"
							: "Try adjusting your filter or register a new device"}
					</p>
					<Link
						href='/devices/register'
						className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700'
					>
						Register Device
					</Link>
				</div>
			) : (
				<div className='bg-white border border-gray-200 rounded-lg overflow-hidden'>
					<div className='overflow-x-auto'>
						<table className='min-w-full divide-y divide-gray-200'>
							<thead className='bg-gray-50'>
								<tr>
									<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
										Device
									</th>
									<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
										Type
									</th>
									<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
										Status
									</th>
									<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
										Last Updated
									</th>
									<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
										Experiments
									</th>
									<th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
										Actions
									</th>
								</tr>
							</thead>
							<tbody className='bg-white divide-y divide-gray-200'>
								{filteredDevices.map((device) => (
									<tr
										key={device.device_id}
										className='hover:bg-gray-50'
									>
										<td className='px-6 py-4 whitespace-nowrap'>
											<div className='flex items-center'>
												<div className='text-2xl mr-3'>
													{getDeviceIcon(
														device.device_type
													)}
												</div>
												<div>
													<div className='text-sm font-medium text-gray-900'>
														<Link
															href={`/devices/${device.device_id}`}
															className='hover:text-blue-600'
														>
															{device.device_name}
														</Link>
													</div>
													<div className='text-sm text-gray-500'>
														ID: {device.device_id}
													</div>
												</div>
											</div>
										</td>
										<td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
											{device.device_type}
										</td>
										<td className='px-6 py-4 whitespace-nowrap'>
											<span
												className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
													device.status
												)}`}
											>
												{device.status}
											</span>
										</td>
										<td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
											{new Date(
												device.last_updated
											).toLocaleDateString()}
										</td>
										<td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
											{device.experiments_count || 0}{" "}
											total
											{device.active_experiments_count ? (
												<span className='text-green-600 ml-2'>
													(
													{
														device.active_experiments_count
													}{" "}
													active)
												</span>
											) : null}
										</td>
										<td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
											<div className='flex items-center justify-end space-x-2'>
												<Link
													href={`/devices/${device.device_id}`}
													className='text-blue-600 hover:text-blue-500'
												>
													View
												</Link>
												{device.status ===
													"Pending-Registration" && (
													<button
														onClick={() =>
															handleActivateDevice(
																device.device_id
															)
														}
														className='text-green-600 hover:text-green-500'
													>
														Activate
													</button>
												)}
												{device.status === "Active" && (
													<button
														onClick={() =>
															handleDeactivateDevice(
																device.device_id
															)
														}
														className='text-red-600 hover:text-red-500'
													>
														Deactivate
													</button>
												)}
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	);
}
