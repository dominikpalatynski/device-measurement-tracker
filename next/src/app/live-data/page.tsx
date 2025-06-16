"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PageLayout from "@/components/PageLayout";
import { getLatestMeasurementData, MeasurementData } from "@/services/api";

export default function LiveMeasurementDataPage() {
	const [measurements, setMeasurements] = useState<MeasurementData[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [autoRefresh, setAutoRefresh] = useState(true);
	const [lastUpdate, setLastUpdate] = useState<string | null>(null);
	const [filters, setFilters] = useState({
		deviceId: "",
		phenomenonId: "",
		limit: 50,
	});

	// Load measurement data
	const loadMeasurements = async () => {
		try {
			setError(null);
			const response = await getLatestMeasurementData(
				filters.limit,
				filters.deviceId || undefined,
				filters.phenomenonId || undefined
			);

			if (response.success) {
				setMeasurements(response.data);
				setLastUpdate(new Date().toLocaleTimeString());
			} else {
				setError(response.error || "Failed to load measurements");
			}
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to load measurements"
			);
		} finally {
			setLoading(false);
		}
	};

	// Initial load
	useEffect(() => {
		loadMeasurements();
	}, [filters]);

	// Auto-refresh
	useEffect(() => {
		if (!autoRefresh) return;

		const interval = setInterval(loadMeasurements, 5000); // Refresh every 5 seconds
		return () => clearInterval(interval);
	}, [autoRefresh, filters]);

	// Format data payload for display
	const formatDataPayload = (payload: any) => {
		if (!payload) return "No data";

		if (typeof payload === "string") {
			try {
				payload = JSON.parse(payload);
			} catch {
				return payload.substring(0, 50) + "...";
			}
		}

		if (typeof payload === "object") {
			const keys = Object.keys(payload);
			const summary = keys
				.map((key) => {
					const value = payload[key];
					if (Array.isArray(value)) {
						return `${key}:[${value.length} values]`;
					} else {
						return `${key}:${String(value).substring(0, 10)}`;
					}
				})
				.join(", ");

			return summary.length > 80
				? summary.substring(0, 80) + "..."
				: summary;
		}

		return String(payload).substring(0, 50) + "...";
	};

	return (
		<PageLayout
			title='Live Measurement Data'
			breadcrumbs={[
				{ label: "Home", href: "/" },
				{ label: "Live Data", href: "/live-data" },
			]}
		>
			<div className='space-y-6'>
				{/* Header and Controls */}
				<div className='bg-white p-6 rounded-lg border border-gray-200'>
					<div className='flex justify-between items-start mb-4'>
						<div>
							<h2 className='text-2xl font-bold text-gray-900 mb-2'>
								🔴 Live Measurement Data
							</h2>
							<p className='text-gray-600'>
								Real-time view of the latest measurements from
								the measurement_data table. Data refreshes
								automatically every 5 seconds.
							</p>
						</div>

						<div className='flex items-center space-x-4'>
							{/* Auto-refresh toggle */}
							<label className='flex items-center space-x-2'>
								<input
									type='checkbox'
									checked={autoRefresh}
									onChange={(e) =>
										setAutoRefresh(e.target.checked)
									}
									className='rounded'
								/>
								<span className='text-sm'>Auto-refresh</span>
							</label>

							{/* Manual refresh button */}
							<button
								onClick={loadMeasurements}
								disabled={loading}
								className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50'
							>
								{loading ? "Refreshing..." : "🔄 Refresh"}
							</button>
						</div>
					</div>

					{/* Status info */}
					<div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
						<div>
							<span className='font-medium'>Status:</span>{" "}
							{autoRefresh ? "🟢 Live" : "🔴 Paused"}
						</div>
						<div>
							<span className='font-medium'>Total Records:</span>{" "}
							{measurements.length}
						</div>
						<div>
							<span className='font-medium'>Last Update:</span>{" "}
							{lastUpdate || "Never"}
						</div>
						<div>
							<span className='font-medium'>Refresh Rate:</span> 5
							seconds
						</div>
					</div>
				</div>

				{/* Filters */}
				<div className='bg-white p-6 rounded-lg border border-gray-200'>
					<h3 className='text-lg font-medium text-gray-900 mb-4'>
						Filters
					</h3>
					<div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
						<div>
							<label className='block text-sm font-medium text-gray-700 mb-1'>
								Device ID
							</label>
							<input
								type='text'
								value={filters.deviceId}
								onChange={(e) =>
									setFilters((prev) => ({
										...prev,
										deviceId: e.target.value,
									}))
								}
								placeholder='e.g., DRONE_001_2025'
								className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
							/>
						</div>
						<div>
							<label className='block text-sm font-medium text-gray-700 mb-1'>
								Phenomenon ID
							</label>
							<input
								type='text'
								value={filters.phenomenonId}
								onChange={(e) =>
									setFilters((prev) => ({
										...prev,
										phenomenonId: e.target.value,
									}))
								}
								placeholder='e.g., phen_684f3b6a08caf'
								className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
							/>
						</div>
						<div>
							<label className='block text-sm font-medium text-gray-700 mb-1'>
								Limit
							</label>
							<select
								value={filters.limit}
								onChange={(e) =>
									setFilters((prev) => ({
										...prev,
										limit: parseInt(e.target.value),
									}))
								}
								className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
							>
								<option value={10}>10 records</option>
								<option value={25}>25 records</option>
								<option value={50}>50 records</option>
								<option value={100}>100 records</option>
								<option value={200}>200 records</option>
							</select>
						</div>
					</div>
				</div>

				{/* Error display */}
				{error && (
					<div className='bg-red-50 border border-red-200 rounded-lg p-4'>
						<div className='flex items-center'>
							<span className='text-red-600 mr-2'>❌</span>
							<span className='text-red-800'>{error}</span>
						</div>
					</div>
				)}

				{/* Data Table */}
				<div className='bg-white border border-gray-200 rounded-lg overflow-hidden'>
					<div className='px-6 py-4 border-b border-gray-200 bg-gray-50'>
						<h3 className='text-lg font-medium text-gray-900'>
							📊 Live Measurement Data ({measurements.length}{" "}
							records)
						</h3>
					</div>

					{loading && measurements.length === 0 ? (
						<div className='flex items-center justify-center py-12'>
							<div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
							<span className='ml-2 text-gray-600'>
								Loading measurements...
							</span>
						</div>
					) : measurements.length > 0 ? (
						<div className='overflow-x-auto'>
							<table className='min-w-full divide-y divide-gray-200'>
								<thead className='bg-gray-50'>
									<tr>
										<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
											Data ID
										</th>
										<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
											Device ID
										</th>
										<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
											Phenomenon ID
										</th>
										<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
											Data Payload
										</th>
										<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
											Timestamp
										</th>
									</tr>
								</thead>
								<tbody className='bg-white divide-y divide-gray-200'>
									{measurements.map((measurement, index) => (
										<tr
											key={measurement.data_id}
											className={
												index === 0 ? "bg-green-50" : ""
											}
										>
											<td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'>
												{measurement.data_id}
											</td>
											<td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
												{measurement.device_id}
											</td>
											<td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
												{measurement.phenomenon_id ||
													"N/A"}
											</td>
											<td className='px-6 py-4 text-sm text-gray-500 max-w-md'>
												<div
													className='truncate'
													title={JSON.stringify(
														measurement.data_payload
													)}
												>
													{formatDataPayload(
														measurement.data_payload
													)}
												</div>
											</td>
											<td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
												{new Date(
													measurement.timestamp
												).toLocaleString()}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					) : (
						<div className='text-center py-12'>
							<div className='text-gray-500'>
								<span className='text-4xl mb-4 block'>📊</span>
								<h3 className='text-lg font-medium text-gray-900 mb-2'>
									No measurements found
								</h3>
								<p className='text-gray-600'>
									No measurement data available with the
									current filters.
									{filters.deviceId || filters.phenomenonId
										? " Try adjusting your filters."
										: ""}
								</p>
							</div>
						</div>
					)}
				</div>

				{/* Navigation */}
				<div className='bg-white p-6 rounded-lg border border-gray-200'>
					<h3 className='text-lg font-medium text-gray-900 mb-4'>
						Navigation
					</h3>
					<div className='flex space-x-4'>
						<Link
							href='/devices'
							className='text-blue-600 hover:text-blue-900'
						>
							← Back to Devices
						</Link>
						<Link
							href='/'
							className='text-blue-600 hover:text-blue-900'
						>
							← Home
						</Link>
					</div>
				</div>
			</div>
		</PageLayout>
	);
}
