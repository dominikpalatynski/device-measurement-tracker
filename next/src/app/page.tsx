"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PageLayout from "@/components/PageLayout";
import { deviceApi, testApiConnection, Device } from "@/services/api";

export default function Dashboard() {
	const [devices, setDevices] = useState<Device[]>([]);
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

			// Load devices
			const devicesData = await deviceApi.getDevices();
			setDevices(devicesData || []);
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
		<PageLayout title='Dashboard'>
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
						<div className='w-5 h-5 mr-3 bg-red-100 rounded-full flex items-center justify-center'>
							<svg
								className='w-3 h-3 text-red-600'
								fill='currentColor'
								viewBox='0 0 20 20'
							>
								<path
									fillRule='evenodd'
									d='M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z'
									clipRule='evenodd'
								/>
							</svg>
						</div>
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
			{/* Devices List */}
			<div className='bg-white rounded-lg border border-gray-200 p-6'>
				<div className='flex items-center justify-between mb-6'>
					<h2 className='text-2xl font-bold text-gray-900'>
						Devices
					</h2>
					<div className='flex space-x-3'>
						<Link
							href='/devices/register'
							className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700'
						>
							Register Device
						</Link>
						<Link
							href='/devices'
							className='text-blue-600 hover:text-blue-500 text-sm font-medium'
						>
							View All →
						</Link>
					</div>
				</div>

				{devices.length > 0 ? (
					<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
						{devices.map((device) => (
							<div
								key={device.device_id}
								className='border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow'
							>
								<div className='flex items-start justify-between mb-3'>
									<div className='flex items-center'>
										{" "}
										<span className='text-2xl mr-3'>
											{device.device_type === "Drone"
												? "🚁"
												: device.device_type === "DSP"
												? "📡"
												: device.device_type ===
												  "Linear Module"
												? "📏"
												: "🔧"}
										</span>
										<div>
											<h3 className='font-semibold text-gray-900'>
												{device.device_name}
											</h3>
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
								<div className='space-y-2 text-sm text-gray-600'>
									<div className='flex justify-between'>
										<span>Device ID:</span>
										<span className='font-mono text-xs'>
											{device.device_id}
										</span>
									</div>
									<div className='flex justify-between'>
										<span>Registration:</span>
										<span>
											{new Date(
												device.registration_date
											).toLocaleDateString()}
										</span>
									</div>
								</div>

								<div className='mt-4 flex space-x-2'>
									<Link
										href={`/devices/${device.device_id}`}
										className='flex-1 text-center px-3 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 text-sm font-medium'
									>
										View Details
									</Link>
									{device.status === "Active" && (
										<Link
											href={`/devices/${device.device_id}/experiments`}
											className='flex-1 text-center px-3 py-2 bg-green-50 text-green-600 rounded-md hover:bg-green-100 text-sm font-medium'
										>
											Experiments
										</Link>
									)}
								</div>
							</div>
						))}
					</div>
				) : (
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
							No devices registered yet
						</h3>
						<p className='text-gray-500 mb-6'>
							Get started by registering your first measurement
							device
						</p>
						<Link
							href='/devices/register'
							className='inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700'
						>
							Register First Device
						</Link>
					</div>
				)}
			</div>
		</PageLayout>
	);
}
