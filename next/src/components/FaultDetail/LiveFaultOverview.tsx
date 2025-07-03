import React from "react";
import { Device, LiveFault, MongoMeasurementData } from "@/services/api";

interface LiveFaultOverviewProps {
	device: Device;
	liveFault: LiveFault;
	conditionsData: MongoMeasurementData[];
	autoRefresh: boolean;
	onAutoRefreshChange: (value: boolean) => void;
	onStopFault: () => void;
	copyToClipboard: (text: string, label: string) => void;
}

export default function LiveFaultOverview({
	device,
	liveFault,
	conditionsData,
	autoRefresh,
	onAutoRefreshChange,
	onStopFault,
	copyToClipboard,
}: LiveFaultOverviewProps) {
	// Get latest measurement for display
	const latestMeasurement =
		conditionsData.length > 0 ? conditionsData[0] : null;
	const measurementCount = conditionsData.length;

	return (
		<div className='bg-gradient-to-r from-blue-50 via-purple-50 to-green-50 border-2 border-blue-200 rounded-lg p-6'>
			<div className='flex items-center justify-between mb-6'>
				<div className='flex items-center space-x-3'>
					<div className='w-3 h-3 bg-green-500 rounded-full animate-pulse'></div>
					<h3 className='text-xl font-bold text-blue-900'>
						🔥 Live Fault Active
					</h3>
					<span className='px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium'>
						Recording
					</span>
				</div>
				<div className='flex items-center space-x-4'>
					<label className='flex items-center space-x-2'>
						<input
							type='checkbox'
							checked={autoRefresh}
							onChange={(e) =>
								onAutoRefreshChange(e.target.checked)
							}
							className='rounded text-blue-600'
						/>
						<span className='text-sm font-medium text-blue-800'>
							Auto-refresh data
						</span>
					</label>
					<button
						onClick={onStopFault}
						className='px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium'
					>
						Stop Fault
					</button>
				</div>
			</div>

			{/* Live Stats Grid */}
			<div className='grid grid-cols-1 md:grid-cols-4 gap-4 mb-6'>
				<div className='bg-white rounded-lg border border-blue-200 p-4'>
					<div className='text-blue-600 text-2xl font-bold'>
						{liveFault.conditions_count || 0}
					</div>
					<div className='text-blue-800 text-sm font-medium'>
						Conditions Recorded
					</div>
				</div>
				<div className='bg-white rounded-lg border border-green-200 p-4'>
					<div className='text-green-600 text-2xl font-bold'>
						{measurementCount}
					</div>
					<div className='text-green-800 text-sm font-medium'>
						Data Points
					</div>
				</div>
				<div className='bg-white rounded-lg border border-purple-200 p-4'>
					<div className='text-purple-600 text-2xl font-bold'>
						{liveFault.start_time
							? Math.floor(
									(Date.now() -
										new Date(
											liveFault.start_time
										).getTime()) /
										(1000 * 60)
							  )
							: 0}
					</div>
					<div className='text-purple-800 text-sm font-medium'>
						Minutes Running
					</div>
				</div>
				<div className='bg-white rounded-lg border border-orange-200 p-4'>
					<div className='text-orange-600 text-lg font-bold'>
						{latestMeasurement
							? new Date(
									latestMeasurement.timestamp ||
										(latestMeasurement as any)
											.timestamp_unix * 1000
							  ).toLocaleTimeString()
							: "No data"}
					</div>
					<div className='text-orange-800 text-sm font-medium'>
						Last Measurement
					</div>
				</div>
			</div>

			{/* Quick Status Info */}
			<div className='bg-white rounded-lg border border-gray-200 p-4'>
				<div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
					<div className='space-y-2'>
						<div className='flex items-center space-x-2'>
							<span className='font-medium text-gray-600'>
								Live Fault ID:
							</span>
							<span
								className='text-blue-600 cursor-pointer hover:text-blue-800'
								onClick={() =>
									copyToClipboard(
										liveFault.fault_id,
										"Live Fault ID"
									)
								}
							>
								{liveFault.fault_id}
							</span>
						</div>
						<div className='flex items-center space-x-2'>
							<span className='font-medium text-gray-600'>
								Device:
							</span>
							<span className='text-gray-900'>
								{device.device_name}
							</span>
						</div>
						<div className='flex items-center space-x-2'>
							<span className='font-medium text-gray-600'>
								Status:
							</span>
							<span className='text-green-600 font-medium'>
								Active
							</span>
						</div>
					</div>
					<div className='space-y-2'>
						<div className='flex items-center space-x-2'>
							<span className='font-medium text-gray-600'>
								Started:
							</span>
							<span className='text-gray-900'>
								{liveFault.start_time
									? new Date(
											liveFault.start_time
									  ).toLocaleString()
									: "Unknown"}
							</span>
						</div>
						<div className='flex items-center space-x-2'>
							<span className='font-medium text-gray-600'>
								Current Condition:
							</span>
							<span className='text-blue-600 font-medium'>
								{liveFault.current_condition?.name || "None"}
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
