import React from "react";
import Link from "next/link";
import { Device } from "@/services/api";

interface QuickActionsBarProps {
	device: Device;
	deviceId: string;
	anyConditionActive: boolean;
}

export default function QuickActionsBar({
	device,
	deviceId,
	anyConditionActive,
}: QuickActionsBarProps) {
	return (
		<div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
			<div className='flex flex-wrap items-center justify-between gap-4'>
				<div className='flex items-center space-x-2'>
					<Link
						href={`/devices/${deviceId}`}
						className='text-blue-600 hover:text-blue-800 text-sm font-medium'
					>
						← Back to Device
					</Link>
					<span className='text-gray-300'>|</span>
					<Link
						href='/devices'
						className='text-blue-600 hover:text-blue-800 text-sm font-medium'
					>
						← All Devices
					</Link>
				</div>

				<div className='flex items-center space-x-2'>
					{anyConditionActive && (
						<span className='px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium flex items-center space-x-1'>
							<div className='w-2 h-2 bg-green-500 rounded-full animate-pulse'></div>
							<span>Active Condition Running</span>
						</span>
					)}
					<Link
						href={`/devices/${deviceId}/faults/create`}
						className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium'
					>
						+ New Fault
					</Link>
				</div>
			</div>
		</div>
	);
}
