"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PageLayout from "@/components/PageLayout";
import { deviceApi, Device } from "@/services/api";
import { formatDate, formatDateShort } from "@/utils/dateUtils";

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

	const getStatusText = (status: Device["status"]) => {
		switch (status) {
			case "Active":
				return "Active";
			case "Pending-Registration":
				return "Pending Registration";
			case "Not-Active":
				return "Not Active";
			default:
				return "Unknown";
		}
	};
	const getDeviceIcon = (type: string) => {
		switch (type) {
			case "pmsm-mechanical-vibration":
				return (
					<svg
						className='w-6 h-6 text-blue-600'
						fill='currentColor'
						viewBox='0 0 20 20'
					>
						<path
							fillRule='evenodd'
							d='M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z'
							clipRule='evenodd'
						/>
					</svg>
				);
			case "bldc-high-speed":
				return (
					<svg
						className='w-6 h-6 text-green-600'
						fill='currentColor'
						viewBox='0 0 20 20'
					>
						<path
							fillRule='evenodd'
							d='M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z'
							clipRule='evenodd'
						/>
					</svg>
				);
			case "pmsm-torque-load":
				return (
					<svg
						className='w-6 h-6 text-purple-600'
						fill='currentColor'
						viewBox='0 0 20 20'
					>
						<path
							fillRule='evenodd'
							d='M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z'
							clipRule='evenodd'
						/>
					</svg>
				);
			default:
				return (
					<svg
						className='w-6 h-6 text-gray-600'
						fill='currentColor'
						viewBox='0 0 20 20'
					>
						<path
							fillRule='evenodd'
							d='M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z'
							clipRule='evenodd'
						/>
					</svg>
				);
		}
	};

	const getDeviceTypeName = (type: string) => {
		switch (type) {
			case "pmsm-mechanical-vibration":
				return "PMSM Mechanical Vibration";
			case "bldc-high-speed":
				return "BLDC High Speed";
			case "pmsm-torque-load":
				return "PMSM Torque Load";
			default:
				return type;
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

	const breadcrumbs = [
		{ label: "Home", href: "/" },
		{ label: "Devices", href: "/devices", current: true },
	];

	return (
		<PageLayout
			title='Devices'
			breadcrumbs={breadcrumbs}
		>
			{/* Header */}
			<div className='flex items-center justify-between mb-8'>
				<div>
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
			</div>{" "}
			{error && (
				<div className='mb-6 bg-red-50 border border-red-200 rounded-lg p-4'>
					<div className='flex items-center'>
						<svg
							className='w-5 h-5 text-red-400 mr-3'
							fill='currentColor'
							viewBox='0 0 20 20'
						>
							<path
								fillRule='evenodd'
								d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
								clipRule='evenodd'
							/>
						</svg>
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
			)}{" "}
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
						key={String(status)}
						onClick={() => setFilter(status)}
						className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
							filter === status
								? "bg-blue-100 text-blue-700 border border-blue-200"
								: "bg-gray-50 text-gray-600 hover:bg-gray-100"
						}`}
					>
						{status === "all"
							? "All Devices"
							: status === "Active"
							? "Active"
							: status === "Pending-Registration"
							? "Pending Registration"
							: "Not Active"}
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
				</div>{" "}
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
					<div className='text-sm text-yellow-600'>
						Pending Registration
					</div>
				</div>
				<div className='bg-red-50 border border-red-200 rounded-lg p-4'>
					<div className='text-2xl font-bold text-red-600'>
						{
							devices.filter((d) => d.status === "Not-Active")
								.length
						}
					</div>
					<div className='text-sm text-red-600'>Not Active</div>
				</div>
			</div>{" "}
			{/* Devices List */}
			{filteredDevices.length === 0 ? (
				<div className='text-center py-12'>
					<div className='w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center'>
						<svg
							className='w-8 h-8 text-gray-400'
							fill='currentColor'
							viewBox='0 0 20 20'
						>
							<path d='M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z' />
						</svg>
					</div>
					<h3 className='text-lg font-medium text-gray-900 mb-2'>
						{filter === "all"
							? "No devices found"
							: filter === "Active"
							? "No active devices"
							: filter === "Pending-Registration"
							? "No pending devices"
							: "No inactive devices"}
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
										Faults
									</th>
									<th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
										Actions
									</th>
								</tr>
							</thead>
							<tbody className='bg-white divide-y divide-gray-200'>
								{" "}
								{filteredDevices.map((device) => (
									<tr
										key={device.device_id}
										className='hover:bg-gray-50'
									>
										{" "}
										<td className='px-6 py-4 whitespace-nowrap'>
											<div className='flex items-center'>
												<div className='mr-3 flex items-center justify-center w-10 h-10 bg-gray-50 rounded-lg'>
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
											{getDeviceTypeName(
												device.device_type
											)}
										</td>
										<td className='px-6 py-4 whitespace-nowrap'>
											<span
												className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
													device.status
												)}`}
											>
												{getStatusText(device.status)}
											</span>
										</td>{" "}
										<td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
											{device.last_updated
												? formatDate(
														device.last_updated
												  )
												: "N/A"}
										</td>
										<td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
											{device.faults_count || 0} total
											{device.active_faults_count ? (
												<span className='text-green-600 ml-2'>
													(
													{device.active_faults_count}{" "}
													active)
												</span>
											) : null}
										</td>{" "}
										<td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
											{" "}
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
						</table>{" "}
					</div>
				</div>
			)}
		</PageLayout>
	);
}
