"use client";

import { useState, useEffect } from "react";
import PageLayout from "@/components/PageLayout";
import ExportButton from "@/components/ExportButton";
import { faultApi, exportFaultsData, Device } from "@/services/api";

export default function FaultsPage() {
	const [faults, setFaults] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Filters for export
	const [deviceFilter, setDeviceFilter] = useState<string>("");
	const [statusFilter, setStatusFilter] = useState<string>("");
	const [startDateFilter, setStartDateFilter] = useState<string>("");
	const [endDateFilter, setEndDateFilter] = useState<string>("");

	useEffect(() => {
		loadFaults();
	}, []);

	const loadFaults = async () => {
		try {
			setLoading(true);
			setError(null);
			const faultsData = await faultApi.getFaults();
			setFaults(faultsData);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to load faults"
			);
		} finally {
			setLoading(false);
		}
	};

	const handleExportFaults = async (filters: any) => {
		const currentFilters = {
			deviceId: deviceFilter,
			status: statusFilter,
			startDate: startDateFilter,
			endDate: endDateFilter,
			...filters,
		};

		// Remove empty filters
		Object.keys(currentFilters).forEach((key) => {
			if (!currentFilters[key]) {
				delete currentFilters[key];
			}
		});

		return await exportFaultsData(currentFilters);
	};

	if (loading) {
		return (
			<PageLayout
				title='Faults'
				breadcrumbs={[
					{ label: "Home", href: "/" },
					{ label: "Faults", href: "/faults" },
				]}
			>
				<div className='flex items-center justify-center min-h-screen'>
					<div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600'></div>
				</div>
			</PageLayout>
		);
	}

	return (
		<PageLayout
			title='Faults Management'
			breadcrumbs={[
				{ label: "Home", href: "/" },
				{ label: "Faults", href: "/faults" },
			]}
		>
			<div className='space-y-6'>
				{/* Header with Export */}
				<div className='bg-white p-6 rounded-lg border border-gray-200'>
					<div className='flex justify-between items-start mb-6'>
						<div>
							<h2 className='text-2xl font-bold text-gray-900 mb-2'>
								All Faults
							</h2>
							<p className='text-gray-600'>
								Manage and export fault data from all devices
							</p>
						</div>
						<ExportButton
							onExport={handleExportFaults}
							exportType='faults'
							context='all_devices'
							defaultFilters={{}}
							buttonText='Export Faults'
							size='md'
							variant='primary'
						/>
					</div>

					{/* Filters */}
					<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
						<div>
							<label className='block text-sm font-medium text-gray-700 mb-1'>
								Device ID
							</label>
							<input
								type='text'
								value={deviceFilter}
								onChange={(e) =>
									setDeviceFilter(e.target.value)
								}
								placeholder='Filter by device ID'
								className='w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
							/>
						</div>
						<div>
							<label className='block text-sm font-medium text-gray-700 mb-1'>
								Status
							</label>
							<select
								value={statusFilter}
								onChange={(e) =>
									setStatusFilter(e.target.value)
								}
								className='w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
							>
								<option value=''>All statuses</option>
								<option value='Active'>Active</option>
								<option value='Inactive'>Inactive</option>
								<option value='Completed'>Completed</option>
							</select>
						</div>
						<div>
							<label className='block text-sm font-medium text-gray-700 mb-1'>
								Start Date
							</label>
							<input
								type='date'
								value={startDateFilter}
								onChange={(e) =>
									setStartDateFilter(e.target.value)
								}
								className='w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
							/>
						</div>
						<div>
							<label className='block text-sm font-medium text-gray-700 mb-1'>
								End Date
							</label>
							<input
								type='date'
								value={endDateFilter}
								onChange={(e) =>
									setEndDateFilter(e.target.value)
								}
								className='w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
							/>
						</div>
					</div>

					{/* Summary */}
					<div className='text-sm text-gray-600'>
						{error ? (
							<div className='text-red-600'>Error: {error}</div>
						) : (
							<div>
								Total faults: {faults.length} | Active filters:{" "}
								{
									[
										deviceFilter,
										statusFilter,
										startDateFilter,
										endDateFilter,
									].filter(Boolean).length
								}
							</div>
						)}
					</div>
				</div>

				{/* Faults List */}
				<div className='bg-white rounded-lg border border-gray-200'>
					<div className='p-6'>
						<h3 className='text-lg font-medium text-gray-900 mb-4'>
							Fault List
						</h3>

						{error ? (
							<div className='bg-red-50 border border-red-200 rounded-lg p-4'>
								<div className='text-red-800 font-medium'>
									Error loading faults
								</div>
								<div className='text-red-600 text-sm mt-1'>
									{error}
								</div>
								<button
									onClick={loadFaults}
									className='mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700'
								>
									Retry
								</button>
							</div>
						) : faults.length === 0 ? (
							<div className='text-center py-8 text-gray-500'>
								<div className='text-4xl mb-4'>🔧</div>
								<h4 className='text-lg font-medium mb-2'>
									No faults found
								</h4>
								<p>No fault data is available at the moment.</p>
							</div>
						) : (
							<div className='space-y-4'>
								{faults.map((fault) => (
									<div
										key={fault.fault_id}
										className='border border-gray-200 rounded-lg p-4'
									>
										<div className='flex justify-between items-start'>
											<div className='flex-1'>
												<h4 className='font-medium text-gray-900'>
													{fault.fault_name ||
														fault.fault_id}
												</h4>
												<p className='text-sm text-gray-600 mt-1'>
													{fault.description ||
														"No description provided"}
												</p>
												<div className='flex space-x-4 text-xs text-gray-500 mt-2'>
													<span>
														Device:{" "}
														{fault.device_id}
													</span>
													<span>
														Status: {fault.status}
													</span>
													{fault.start_date && (
														<span>
															Started:{" "}
															{new Date(
																fault.start_date
															).toLocaleDateString()}
														</span>
													)}
													{fault.end_date && (
														<span>
															Ended:{" "}
															{new Date(
																fault.end_date
															).toLocaleDateString()}
														</span>
													)}
												</div>
											</div>
											<div className='flex space-x-2'>
												<ExportButton
													onExport={() =>
														exportFaultsData({
															deviceId:
																fault.device_id,
														})
													}
													exportType='faults'
													context={fault.device_id}
													buttonText='Export'
													size='sm'
													variant='outline'
												/>
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			</div>
		</PageLayout>
	);
}
