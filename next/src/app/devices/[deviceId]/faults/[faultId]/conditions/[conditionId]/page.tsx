"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import PageLayout from "@/components/PageLayout";
import DeviceProtectedRoute from "@/components/DeviceProtectedRoute";
import {
	deviceApi,
	faultApi,
	Device,
	Fault,
	ActiveCondition,
	getDataSeriesList,
} from "@/services/api";

export default function ConditionDetailPage() {
	const params = useParams();
	const deviceId = params.deviceId as string;
	const faultId = params.faultId as string;
	const conditionId = params.conditionId as string;
	
	const [device, setDevice] = useState<Device | null>(null);
	const [fault, setFault] = useState<Fault | null>(null);
	const [condition, setCondition] = useState<ActiveCondition | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Data series list state
	const [dataSeriesList, setDataSeriesList] = useState<string[]>([]);
	const [dataSeriesLoading, setDataSeriesLoading] = useState(false);
	const [dataSeriesError, setDataSeriesError] = useState<string | null>(null);
	const [debugInfo, setDebugInfo] = useState<any>(null);

	useEffect(() => {
		if (deviceId && faultId && conditionId) {
			loadConditionData();
		}
	}, [deviceId, faultId, conditionId]);

	// Load data series list when conditionId and faultId are available
	useEffect(() => {
		if (conditionId && faultId) {
			loadDataSeriesList();
		}
	}, [conditionId, faultId]);

	// Load data series list
	const loadDataSeriesList = async () => {
		if (!conditionId) return;
		
		try {
			setDataSeriesLoading(true);
			setDataSeriesError(null);
			
			const response = await getDataSeriesList(
				deviceId,
				conditionId,
				faultId
			);
			
			if (response.success) {
				setDataSeriesList(response.data);
				setDebugInfo((response as any).debug_info);
				console.log("Data series list loaded:", response.data);
				console.log("Condition info:", response.condition_info);
				console.log("Debug info:", (response as any).debug_info);
			} else {
				setDataSeriesError(response.error || "Failed to load data series list");
				setDebugInfo((response as any).debug_info);
				console.error("API Error:", response.error);
				console.error("Debug info:", (response as any).debug_info);
			}
		} catch (error) {
			setDataSeriesError(error instanceof Error ? error.message : "Unknown error");
			console.error("Error loading data series list:", error);
		} finally {
			setDataSeriesLoading(false);
		}
	};

	const loadConditionData = async () => {
		try {
			setLoading(true);
			setError(null);

			// Load device and fault data
			const [deviceData, faultsData] = await Promise.all([
				deviceApi.getDevice(deviceId),
				faultApi.getFaults(),
			]);

			if (!deviceData) {
				setError("Device not found");
				return;
			}
			setDevice(deviceData);

			const faultData = faultsData.find(
				(fault) => fault.fault_id === faultId
			);
			if (!faultData) {
				setError("Fault not found");
				return;
			}
			setFault(faultData);

			// Create a mock condition based on the ID
			const mockCondition: ActiveCondition = {
				condition_id: conditionId,
				name: conditionId,
				description: "Measurement condition",
				status: "Active",
				start_time: new Date().toISOString(),
				duration: 300,
			};
			setCondition(mockCondition);
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to load condition data"
			);
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<DeviceProtectedRoute deviceId={deviceId}>
				<div className='flex items-center justify-center min-h-screen'>
					<div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600'></div>
				</div>
			</DeviceProtectedRoute>
		);
	}

	if (error || !device || !fault || !condition) {
		return (
			<DeviceProtectedRoute deviceId={deviceId}>
				<PageLayout
					title='Condition Details'
					breadcrumbs={[
						{ label: "Home", href: "/" },
						{ label: "Devices", href: "/devices" },
						{
							label: device?.device_name || "Device",
							href: `/devices/${deviceId}`,
						},
						{
							label:
								fault?.fault_name || fault?.fault_id || "Fault",
							href: `/devices/${deviceId}/faults/${faultId}`,
						},
						{
							label: "Condition",
							href: `/devices/${deviceId}/faults/${faultId}/condition/${conditionId}`,
						},
					]}
				>
					<div className='bg-red-50 border border-red-200 rounded-lg p-6'>
						<h2 className='text-lg font-medium text-red-800 mb-2'>
							Error
						</h2>
						<p className='text-red-700'>
							{error || "Condition not found"}
						</p>
						<Link
							href={`/devices/${deviceId}/faults/${faultId}`}
							className='mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700'
						>
							← Back to Fault
						</Link>
					</div>
				</PageLayout>
			</DeviceProtectedRoute>
		);
	}

	return (
		<DeviceProtectedRoute deviceId={deviceId}>
			<PageLayout
				title={condition.name}
				breadcrumbs={[
					{ label: "Home", href: "/" },
					{ label: "Devices", href: "/devices" },
					{ label: device.device_name, href: `/devices/${deviceId}` },
					{
						label: fault.fault_name || fault.fault_id,
						href: `/devices/${deviceId}/faults/${faultId}`,
					},
					{
						label: condition.name,
						href: `/devices/${deviceId}/faults/${faultId}/condition/${conditionId}`,
					},
				]}
			>
				<div className='space-y-6'>
					{/* Condition Header */}
					<div className='bg-white p-6 rounded-lg border border-gray-200'>
						<div className='flex justify-between items-start mb-4'>
							<div>
								<h2 className='text-2xl font-bold text-gray-900 mb-2'>
									{condition.name}
								</h2>
								<p className='text-gray-600 mb-4'>
									{condition.description ||
										"No description provided"}
								</p>
								<div className='flex space-x-4 text-sm text-gray-500'>
									<span>Device: {device.device_name}</span>
									<span>
										Fault:{" "}
										{fault.fault_name || fault.fault_id}
									</span>
									<span>
										Started:{" "}
										{new Date(
											condition.start_time
										).toLocaleString()}
									</span>
									<span>
										Duration:{" "}
										{Math.floor(condition.duration / 60)}m{" "}
										{condition.duration % 60}s
									</span>
								</div>
							</div>
						</div>
					</div>

					{/* Data Series List */}
					<div className='bg-white p-6 rounded-lg border border-gray-200'>
						<h3 className='text-lg font-medium text-gray-900 mb-4'>
							📊 Available Data Series
						</h3>
						
						{dataSeriesLoading ? (
							<div className='flex items-center justify-center py-8'>
								<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
								<span className='ml-2 text-gray-600'>Loading data series...</span>
							</div>
						) : dataSeriesError ? (
							<div className='bg-red-50 border border-red-200 rounded-lg p-4'>
								<div className='text-red-800 font-medium'>Error loading data series</div>
								<div className='text-red-600 text-sm mt-1'>{dataSeriesError}</div>
							</div>
						) : dataSeriesList.length > 0 ? (
							<div className='space-y-4'>
								<div className='text-sm text-gray-600 mb-3'>
									Found {dataSeriesList.length} unique data series for this condition:
								</div>
								<div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3'>
									{dataSeriesList.map((seriesId, index) => (
										<Link
											key={seriesId}
											href={`/devices/${deviceId}/faults/${faultId}/conditions/${conditionId}/dataseries/${seriesId}`}
											className='group block'
										>
											<div className='bg-blue-50 border border-blue-200 rounded-lg p-3 transition-all hover:bg-blue-100 hover:border-blue-300 group-hover:shadow-md'>
												<div className='text-center'>
													<div className='text-2xl mb-2'>📈</div>
													<div className='font-medium text-blue-900 text-sm'>
														Series {seriesId}
													</div>
													<div className='text-xs text-blue-600 mt-1'>
														Click to view details
													</div>
												</div>
											</div>
										</Link>
									))}
								</div>
								<div className='text-xs text-gray-500 mt-4'>
									💡 Tip: Click on any data series to view detailed measurements and charts for that specific series.
								</div>
							</div>
						) : (
							<div className='space-y-4'>
								<div className='text-center py-8 bg-gray-50 rounded-lg'>
									<div className='text-gray-400 text-4xl mb-4'>📊</div>
									<h4 className='text-lg font-medium text-gray-600 mb-2'>
										No Data Series Found
									</h4>
									<p className='text-gray-500 mb-4'>
										No data series were found for this condition. This might mean:
									</p>
									<ul className='text-sm text-gray-400 space-y-1'>
										<li>• No measurements have been recorded yet</li>
										<li>• The condition name doesn't match recorded data</li>
										<li>• Data is stored under a different condition identifier</li>
									</ul>
								</div>
								
								{/* Debug Information */}
								{debugInfo && (
									<div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4'>
										<h5 className='text-sm font-medium text-yellow-800 mb-3'>🔍 Debug Information</h5>
										<div className='text-xs space-y-2'>
											{debugInfo.mysql_condition_found && (
												<div className='text-green-700'>✅ Condition found in MySQL</div>
											)}
											{debugInfo.mongodb_query_filters && (
												<div>
													<span className='font-medium text-yellow-800'>MongoDB Query Filters:</span>
													<pre className='bg-yellow-100 p-2 rounded mt-1 text-xs overflow-auto'>
														{JSON.stringify(debugInfo.mongodb_query_filters, null, 2)}
													</pre>
												</div>
											)}
											{debugInfo.sample_measurements && (
												<div>
													<span className='font-medium text-yellow-800'>Sample Measurements:</span>
													<pre className='bg-yellow-100 p-2 rounded mt-1 text-xs overflow-auto'>
														{typeof debugInfo.sample_measurements === 'string' 
															? debugInfo.sample_measurements 
															: JSON.stringify(debugInfo.sample_measurements, null, 2)}
													</pre>
												</div>
											)}
											{debugInfo.available_conditions && (
												<div>
													<span className='font-medium text-yellow-800'>Available Conditions in MySQL:</span>
													<pre className='bg-yellow-100 p-2 rounded mt-1 text-xs overflow-auto'>
														{JSON.stringify(debugInfo.available_conditions, null, 2)}
													</pre>
												</div>
											)}
										</div>
									</div>
								)}
							</div>
						)}
					</div>

					{/* Navigation Links */}
					<div className='bg-white p-6 rounded-lg border border-gray-200'>
						<h3 className='text-lg font-medium text-gray-900 mb-4'>
							Navigation
						</h3>
						<div className='flex space-x-4'>
							<Link
								href={`/devices/${deviceId}/faults/${faultId}`}
								className='text-blue-600 hover:text-blue-900'
							>
								← Back to Fault
							</Link>
							<Link
								href={`/devices/${deviceId}`}
								className='text-blue-600 hover:text-blue-900'
							>
								← Back to Device
							</Link>
							<Link
								href='/devices'
								className='text-blue-600 hover:text-blue-900'
							>
								← All Devices
							</Link>
						</div>
					</div>
				</div>
			</PageLayout>
		</DeviceProtectedRoute>
	);
}
