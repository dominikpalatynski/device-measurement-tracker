import React from "react";
import { Device, Fault } from "@/services/api";

interface FaultHeaderProps {
	device: Device;
	fault: Fault;
	faultActionLoading: string | null;
	onDeleteFault: () => void;
	onUpdateFaultStatus: (status: "Active" | "Inactive") => void;
	copyToClipboard: (text: string, label: string) => void;
}

export default function FaultHeader({
	device,
	fault,
	faultActionLoading,
	onDeleteFault,
	onUpdateFaultStatus,
	copyToClipboard,
}: FaultHeaderProps) {
	return (
		<div className='bg-white p-6 rounded-lg border border-gray-200'>
			<div className='flex justify-between items-start mb-4'>
				<div className='flex-1'>
					<div className='flex items-center space-x-3 mb-3'>
						<h2 className='text-2xl font-bold text-gray-900'>
							{fault.fault_name || fault.fault_id}
						</h2>
						<span
							className={`px-3 py-1 rounded-full text-sm font-medium ${
								fault.status === "Active"
									? "bg-green-100 text-green-800"
									: "bg-gray-100 text-gray-800"
							}`}
						>
							{fault.status}
						</span>
					</div>

					<div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
						<div className='space-y-2'>
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
									Fault ID:
								</span>
								<span
									className='text-blue-600 cursor-pointer hover:text-blue-800'
									onClick={() =>
										copyToClipboard(
											fault.fault_id,
											"Fault ID"
										)
									}
								>
									{fault.fault_id}
								</span>
							</div>
							{fault.description && (
								<div className='flex items-start space-x-2'>
									<span className='font-medium text-gray-600'>
										Description:
									</span>
									<span className='text-gray-900'>
										{fault.description}
									</span>
								</div>
							)}
						</div>
						<div className='space-y-2'>
							{fault.start_date && (
								<div className='flex items-center space-x-2'>
									<span className='font-medium text-gray-600'>
										Start Date:
									</span>
									<span className='text-gray-900'>
										{new Date(
											fault.start_date
										).toLocaleString()}
									</span>
								</div>
							)}
							{fault.end_date && (
								<div className='flex items-center space-x-2'>
									<span className='font-medium text-gray-600'>
										End Date:
									</span>
									<span className='text-gray-900'>
										{new Date(
											fault.end_date
										).toLocaleString()}
									</span>
								</div>
							)}
							<div className='flex items-center space-x-2'>
								<span className='font-medium text-gray-600'>
									Created:
								</span>
								<span className='text-gray-900'>
									{new Date(
										fault.created_at
									).toLocaleString()}
								</span>
							</div>
						</div>
					</div>
				</div>

				<div className='flex flex-col space-y-2 ml-6'>
					<button
						onClick={() =>
							onUpdateFaultStatus(
								fault.status === "Active"
									? "Inactive"
									: "Active"
							)
						}
						disabled={!!faultActionLoading}
						className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
							fault.status === "Active"
								? "bg-yellow-600 text-white hover:bg-yellow-700"
								: "bg-green-600 text-white hover:bg-green-700"
						} disabled:opacity-50`}
					>
						{faultActionLoading === "status" ? (
							<div className='flex items-center space-x-2'>
								<div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white'></div>
								<span>Updating...</span>
							</div>
						) : fault.status === "Active" ? (
							"Deactivate"
						) : (
							"Activate"
						)}
					</button>

					<button
						onClick={onDeleteFault}
						disabled={!!faultActionLoading}
						className='px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium'
					>
						{faultActionLoading === "delete" ? (
							<div className='flex items-center space-x-2'>
								<div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white'></div>
								<span>Deleting...</span>
							</div>
						) : (
							"Delete Fault"
						)}
					</button>
				</div>
			</div>
		</div>
	);
}
