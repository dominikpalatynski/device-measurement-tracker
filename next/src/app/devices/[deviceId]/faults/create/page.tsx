"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PageLayout from "@/components/PageLayout";
import DeviceProtectedRoute from "@/components/DeviceProtectedRoute";
import { faultApi } from "@/services/api";

export default function CreateFaultPage() {
	const params = useParams();
	const router = useRouter();
	const deviceId = params.deviceId as string;

	const [faultName, setFaultName] = useState("");
	const [faultDescription, setFaultDescription] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);

		try {
			const faultData = {
				fault_name: faultName.trim(),
				description: faultDescription.trim() || undefined,
				device_id: deviceId,
				type: "stream" as const,
				mode: "Offline" as const,
				status: "Inactive" as const,
			};

			const createdFault = await faultApi.createFault(faultData);

			if (createdFault) {
				// Redirect to the newly created fault's page
				router.push(
					`/devices/${deviceId}/faults/${createdFault.fault_id}`
				);
			} else {
				setError("Failed to create fault. Please try again.");
			}
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to create fault"
			);
		} finally {
			setLoading(false);
		}
	};

	const breadcrumbs = [
		{ label: "Home", href: "/" },
		{ label: "Devices", href: "/devices" },
		{ label: "Device", href: `/devices/${deviceId}` },
		{
			label: "Create Fault",
			href: `/devices/${deviceId}/faults/create`,
			current: true,
		},
	];

	return (
		<DeviceProtectedRoute deviceId={deviceId}>
			<PageLayout
				title='Create Fault'
				breadcrumbs={breadcrumbs}
			>
				{" "}
				<div className='max-w-2xl mx-auto'>
					<div className='mb-6'>
						<h2 className='text-2xl font-bold text-gray-900 mb-2'>
							Create New Fault
						</h2>
						<p className='text-gray-600'>
							Set up a new fault to organize and collect
							measurement data from your device.
						</p>
					</div>

					<div className='bg-white rounded-lg border border-gray-200 p-6'>
						{error && (
							<div className='mb-6 bg-red-50 border border-red-200 rounded-lg p-4'>
								<div className='flex items-center'>
									<span className='text-red-400 text-xl mr-3'>
										❌
									</span>
									<div>
										<h3 className='text-sm font-medium text-red-800'>
											Error
										</h3>
										<p className='text-sm text-red-700 mt-1'>
											{error}
										</p>
									</div>
								</div>
							</div>
						)}

						<form
							onSubmit={handleSubmit}
							className='space-y-6'
						>
							{" "}
							<div>
								<label
									htmlFor='faultName'
									className='block text-sm font-medium text-gray-700 mb-2'
								>
									Fault Name *
								</label>
								<input
									type='text'
									id='faultName'
									value={faultName}
									onChange={(e) =>
										setFaultName(e.target.value)
									}
									className='w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500'
									placeholder='Enter fault name...'
									required
								/>
							</div>
							{/* Hidden input for fault type - always stream */}
							<input
								type='hidden'
								name='faultType'
								value='stream'
							/>
							<div>
								<label
									htmlFor='faultDescription'
									className='block text-sm font-medium text-gray-700 mb-2'
								>
									Description
								</label>
								<textarea
									id='faultDescription'
									value={faultDescription}
									onChange={(e) =>
										setFaultDescription(e.target.value)
									}
									rows={4}
									className='w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500'
									placeholder='Enter fault description...'
								/>
							</div>
							<div className='flex items-center justify-between pt-6'>
								<Link
									href={`/devices/${deviceId}`}
									className='px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50'
								>
									Cancel
								</Link>
								<button
									type='submit'
									disabled={loading || !faultName.trim()}
									className='px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed'
								>
									{loading ? "Creating..." : "Create Fault"}
								</button>
							</div>
						</form>
					</div>
				</div>
			</PageLayout>
		</DeviceProtectedRoute>
	);
}
