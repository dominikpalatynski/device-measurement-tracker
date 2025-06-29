"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
} from "recharts";
import PageLayout from "@/components/PageLayout";
import {
	deviceApi,
	faultApi,
	onlineModeApi,
	conditionsApi,
	getAllMeasurements,
	getLatestMeasurementData,
	getMongoMeasurements,
	Device,
	Fault,
	LiveFault,
	ActiveCondition,
	Condition,
	Measurement,
	MeasurementData,
	MongoMeasurementData,
} from "@/services/api";
import { formatDate, formatDateShort, formatDuration } from "@/utils/dateUtils";

export default function FaultDetailPage() {
	const params = useParams();
	const router = useRouter();
	const deviceId = params.deviceId as string;
	const faultId = params.faultId as string;

	const [device, setDevice] = useState<Device | null>(null);
	const [fault, setFault] = useState<Fault | null>(null);
	const [liveFault, setLiveFault] = useState<LiveFault | null>(null);
	const [conditions, setConditions] = useState<ActiveCondition[]>([]);
	const [offlineConditions, setOfflineConditions] = useState<Condition[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	// Live data chart functionality
	const [liveData, setLiveData] = useState<Measurement[]>([]);
	const [conditionsData, setConditionsData] = useState<
		MongoMeasurementData[]
	>([]);
	const [autoRefresh, setAutoRefresh] = useState(false);
	const [chartViewMode, setChartViewMode] = useState<"chart" | "stats">(
		"chart"
	);
	const [dataRefreshInterval, setDataRefreshInterval] =
		useState<NodeJS.Timeout | null>(null);

	// Live condition creation
	const [newConditionName, setNewConditionName] = useState("");
	const [newConditionDescription, setNewConditionDescription] = useState("");
	const [showConditionForm, setShowConditionForm] = useState(false);

	// Offline condition creation
	const [showOfflineConditionForm, setShowOfflineConditionForm] =
		useState(false);
	const [newOfflineConditionName, setNewOfflineConditionName] = useState("");
	const [newOfflineConditionDescription, setNewOfflineConditionDescription] =
		useState("");
	// Fault management actions
	const [faultActionLoading, setFaultActionLoading] = useState<string | null>(
		null
	);

	// Condition management for offline mode
	const [offlineConditionActionLoading, setOfflineConditionActionLoading] =
		useState<string | null>(null);

	// All conditions for editing/management
	const [allConditions, setAllConditions] = useState<Condition[]>([]);
	const [editingCondition, setEditingCondition] = useState<Condition | null>(
		null
	);
	const [editConditionForm, setEditConditionForm] = useState({
		name: "",
		description: "",
		status: "Active" as "Active" | "Inactive",
	});

	useEffect(() => {
		if (deviceId && faultId) {
			loadFaultData();
		}
	}, [deviceId, faultId]);

	// Auto-refresh effect for live data
	useEffect(() => {
		if (autoRefresh && liveFault && device) {
			loadLiveData();
			const interval = setInterval(loadLiveData, 3000); // Refresh every 3 seconds
			setDataRefreshInterval(interval);
			return () => {
				clearInterval(interval);
				setDataRefreshInterval(null);
			};
		} else if (dataRefreshInterval) {
			clearInterval(dataRefreshInterval);
			setDataRefreshInterval(null);
		}
	}, [autoRefresh, liveFault, device]);

	// Auto-enable live data monitoring when live fault starts
	useEffect(() => {
		if (liveFault && device && !autoRefresh) {
			setAutoRefresh(true); // Automatically enable auto-refresh for live faults
			loadLiveData(); // Load initial data immediately
		}
	}, [liveFault, device]);

	// Clean up interval on unmount
	useEffect(() => {
		return () => {
			if (dataRefreshInterval) {
				clearInterval(dataRefreshInterval);
			}
		};
	}, []);
	const loadLiveData = async () => {
		if (!device || !fault) return;

		try {
			// Load latest measurement data for this fault using name-based filtering
			const conditionsRes = await getMongoMeasurements(
				device.device_id,
				undefined, // faultId - not used, relying on fault_name
				undefined, // conditionId - not used, relying on conditionName
				undefined, // dataSeriesId
				undefined, // timeRange
				50, // limit
				0, // offset
				true, // includeData
				undefined, // conditionName - don't filter by specific condition
				fault.fault_name, // faultName - primary filter using fault name from DB
				undefined // dataSeriesValue
			);
			if (conditionsRes.success && conditionsRes.data) {
				setConditionsData(conditionsRes.data);
				// Also update liveData for backward compatibility
				setLiveData(conditionsRes.data as any);
			}
		} catch (error) {
			console.error("Error loading live data:", error);
		}
	};

	const loadFaultData = async () => {
		try {
			setLoading(true);
			setError(null);
			console.log("Fault status:");

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
				(f: Fault) => f.fault_id === faultId
			);
			if (!faultData) {
				setError("Fault not found");
				return;
			}
			setFault(faultData); // Check if this is a live fault
			if (faultData.status === "Active") {
				const liveFaultData = await onlineModeApi.getLiveFault(
					deviceId
				);
				if (liveFaultData && liveFaultData.fault_id === faultId) {
					setLiveFault(liveFaultData);
				}
			}

			// Load offline conditions for this fault
			const offlineConditionsData =
				await conditionsApi.getConditionsForFault(faultId);
			setOfflineConditions(offlineConditionsData);

			// Load all conditions for comprehensive management
			const allConditionsData = await conditionsApi.getConditions();
			setAllConditions(allConditionsData);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to load fault data"
			);
		} finally {
			setLoading(false);
		}
	};

	const handleStartCondition = async () => {
		if (!newConditionName.trim() || !liveFault) return;

		try {
			const condition = await onlineModeApi.startCondition(deviceId, {
				name: newConditionName.trim(),
				description: newConditionDescription.trim() || undefined,
			});

			setConditions((prev) => [...prev, condition]);
			setNewConditionName("");
			setNewConditionDescription("");
			setShowConditionForm(false);

			// Refresh live fault data
			const updatedLiveFault = await onlineModeApi.getLiveFault(deviceId);
			if (updatedLiveFault) {
				setLiveFault(updatedLiveFault);
			}
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: "Failed to start condition"
			);
		}
	};

	const handleStopCondition = async (conditionId: string) => {
		try {
			await onlineModeApi.stopCondition(deviceId, conditionId);

			// Remove from local state
			setConditions((prev) =>
				prev.filter((c) => c.condition_id !== conditionId)
			);

			// Refresh live fault data
			const updatedLiveFault = await onlineModeApi.getLiveFault(deviceId);
			if (updatedLiveFault) {
				setLiveFault(updatedLiveFault);
			}
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: "Failed to stop condition"
			);
		}
	};

	const handleStopFault = async () => {
		if (!liveFault) return;

		try {
			await onlineModeApi.stopLiveFault(deviceId);
			console.log("Fault stopped");
			router.push(`/devices/${deviceId}`);
		} catch (error) {
			console.log("Error stopping fault:", error);
			setError(
				error instanceof Error ? error.message : "Failed to stop fault"
			);
		}
	};

	const handleCreateOfflineCondition = async () => {
		if (!newOfflineConditionName.trim() || !fault) return;

		try {
			const condition = await conditionsApi.createCondition({
				fault_id: faultId,
				name: newOfflineConditionName.trim(),
				description: newOfflineConditionDescription.trim() || undefined,
			});

			if (condition) {
				setOfflineConditions((prev) => [...prev, condition]);
				setNewOfflineConditionName("");
				setNewOfflineConditionDescription("");
				setShowOfflineConditionForm(false);
			}
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: "Failed to create condition"
			);
		}
	};
	const handleDeleteOfflineCondition = async (conditionId: string) => {
		if (!confirm("Are you sure you want to delete this condition?")) return;

		try {
			setOfflineConditionActionLoading(conditionId);
			const success = await conditionsApi.deleteCondition(conditionId);
			if (success) {
				setOfflineConditions((prev) =>
					prev.filter((c) => c.condition_id !== conditionId)
				);
				// Also update allConditions
				setAllConditions((prev) =>
					prev.filter((c) => c.condition_id !== conditionId)
				);
			} else {
				setError("Failed to delete condition");
			}
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: "Failed to delete condition"
			);
		} finally {
			setOfflineConditionActionLoading(null);
		}
	};

	// Fault management functions
	const handleDeleteFault = async () => {
		if (!fault) return;
		if (
			!confirm(
				`Are you sure you want to delete fault "${
					fault.fault_name || fault.fault_id
				}"? This action cannot be undone and will delete all associated conditions.`
			)
		)
			return;

		try {
			setFaultActionLoading("delete");
			const success = await faultApi.deleteFault(faultId);
			if (success) {
				router.push(`/devices/${deviceId}`);
			} else {
				setError("Failed to delete fault");
			}
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: "Failed to delete fault"
			);
		} finally {
			setFaultActionLoading(null);
		}
	};
	const handleUpdateFaultStatus = async (
		newStatus: "Active" | "Inactive"
	) => {
		if (!fault) return;

		try {
			setFaultActionLoading("status");
			const updatedFault = await faultApi.updateFault(faultId, {
				status: newStatus,
			});
			if (updatedFault) {
				setFault(updatedFault);
			} else {
				setError("Failed to update fault status");
			}
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: "Failed to update fault status"
			);
		} finally {
			setFaultActionLoading(null);
		}
	};

	// Condition management functions
	const handleStartOfflineCondition = async (conditionId: string) => {
		try {
			setOfflineConditionActionLoading(conditionId);
			const updatedCondition = await conditionsApi.startCondition(
				conditionId
			);
			if (updatedCondition) {
				setOfflineConditions((prev) =>
					prev.map((c) =>
						c.condition_id === conditionId ? updatedCondition : c
					)
				);
			} else {
				setError("Failed to start condition");
			}
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: "Failed to start condition"
			);
		} finally {
			setOfflineConditionActionLoading(null);
		}
	};

	const handleStopOfflineCondition = async (conditionId: string) => {
		try {
			setOfflineConditionActionLoading(conditionId);
			const updatedCondition = await conditionsApi.stopCondition(
				conditionId
			);
			if (updatedCondition) {
				setOfflineConditions((prev) =>
					prev.map((c) =>
						c.condition_id === conditionId ? updatedCondition : c
					)
				);
			} else {
				setError("Failed to stop condition");
			}
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: "Failed to stop condition"
			);
		} finally {
			setOfflineConditionActionLoading(null);
		}
	};

	const handleFinishOfflineCondition = async (conditionId: string) => {
		try {
			setOfflineConditionActionLoading(conditionId);
			const updatedCondition = await conditionsApi.finishCondition(
				conditionId
			);
			if (updatedCondition) {
				setOfflineConditions((prev) =>
					prev.map((c) =>
						c.condition_id === conditionId ? updatedCondition : c
					)
				);
			} else {
				setError("Failed to finish condition");
			}
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: "Failed to finish condition"
			);
		} finally {
			setOfflineConditionActionLoading(null);
		}
	};

	const handleEditCondition = (condition: Condition) => {
		setEditingCondition(condition);
		setEditConditionForm({
			name: condition.name,
			description: condition.description || "",
			status: condition.status,
		});
	};

	const handleUpdateCondition = async () => {
		if (!editingCondition) return;

		try {
			setOfflineConditionActionLoading(editingCondition.condition_id);
			const updatedCondition = await conditionsApi.updateCondition(
				editingCondition.condition_id,
				editConditionForm
			);
			if (updatedCondition) {
				setOfflineConditions((prev) =>
					prev.map((c) =>
						c.condition_id === editingCondition.condition_id
							? updatedCondition
							: c
					)
				);
				setEditingCondition(null);
			} else {
				setError("Failed to update condition");
			}
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: "Failed to update condition"
			);
		} finally {
			setOfflineConditionActionLoading(null);
		}
	};

	const copyToClipboard = (text: string, label: string) => {
		navigator.clipboard.writeText(text).then(() => {
			alert(`${label} copied to clipboard!`);
		});
	};

	// Utility to check if any condition is active
	const anyConditionActive =
		conditions.some((c) => c.status === "Active") ||
		offlineConditions.some((c) => c.status === "Active");

	if (loading) {
		return (
			<div className='flex items-center justify-center min-h-screen'>
				<div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600'></div>
			</div>
		);
	}

	if (error || !device || !fault) {
		return (
			<PageLayout
				title='Fault Details'
				breadcrumbs={[
					{ label: "Home", href: "/" },
					{ label: "Devices", href: "/devices" },
					{
						label: device?.device_name || "Device",
						href: `/devices/${deviceId}`,
					},
					{
						label: "Fault",
						href: `/devices/${deviceId}/faults/${faultId}`,
					},
				]}
			>
				<div className='bg-red-50 border border-red-200 rounded-lg p-6'>
					<h2 className='text-lg font-medium text-red-800 mb-2'>
						Error
					</h2>
					<p className='text-red-700'>{error || "Fault not found"}</p>
					<Link
						href={`/devices/${deviceId}`}
						className='mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700'
					>
						← Back to Device
					</Link>
				</div>
			</PageLayout>
		);
	}

	return (
		<PageLayout
			title={fault.fault_name || fault.fault_id}
			breadcrumbs={[
				{ label: "Home", href: "/" },
				{ label: "Devices", href: "/devices" },
				{ label: device.device_name, href: `/devices/${deviceId}` },
				{
					label: fault.fault_name || fault.fault_id,
					href: `/devices/${deviceId}/faults/${faultId}`,
				},
			]}
		>
			{/* Edit Condition Modal */}
			{editingCondition && (
				<div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
					<div className='bg-white rounded-lg p-6 w-full max-w-md'>
						<h3 className='text-lg font-medium text-gray-900 mb-4'>
							Edit Condition
						</h3>
						<div className='space-y-4'>
							<div>
								<label className='block text-sm font-medium text-gray-700 mb-1'>
									Name *
								</label>
								<input
									type='text'
									value={editConditionForm.name}
									onChange={(e) =>
										setEditConditionForm((prev) => ({
											...prev,
											name: e.target.value,
										}))
									}
									className='w-full px-3 py-2 border border-gray-300 rounded-md'
									placeholder='Condition name'
								/>
							</div>
							<div>
								<label className='block text-sm font-medium text-gray-700 mb-1'>
									Description
								</label>
								<textarea
									value={editConditionForm.description}
									onChange={(e) =>
										setEditConditionForm((prev) => ({
											...prev,
											description: e.target.value,
										}))
									}
									className='w-full px-3 py-2 border border-gray-300 rounded-md'
									rows={3}
									placeholder='Describe the condition...'
								/>
							</div>
							<div>
								<label className='block text-sm font-medium text-gray-700 mb-1'>
									Status
								</label>
								<select
									value={editConditionForm.status}
									onChange={(e) =>
										setEditConditionForm((prev) => ({
											...prev,
											status: e.target.value as
												| "Active"
												| "Inactive",
										}))
									}
									className='w-full px-3 py-2 border border-gray-300 rounded-md'
								>
									<option value='Active'>Active</option>
									<option value='Inactive'>Inactive</option>
								</select>
							</div>
						</div>
						<div className='flex space-x-3 mt-6'>
							<button
								onClick={handleUpdateCondition}
								disabled={
									!editConditionForm.name.trim() ||
									offlineConditionActionLoading ===
										editingCondition.condition_id
								}
								className='flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400'
							>
								{offlineConditionActionLoading ===
								editingCondition.condition_id
									? "Updating..."
									: "Update"}
							</button>
							<button
								onClick={() => {
									setEditingCondition(null);
									setEditConditionForm({
										name: "",
										description: "",
										status: "Active",
									});
								}}
								className='flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400'
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}

			<div className='space-y-6'>
				{/* Quick Actions Bar */}
				<div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
					<div className='flex flex-wrap items-center justify-between gap-4'>
						<div className='flex items-center space-x-2'>
							<span className='text-sm font-medium text-blue-900'>
								Quick Actions:
							</span>{" "}
							<div className='flex flex-wrap gap-2'>
								<button
									onClick={() =>
										setShowOfflineConditionForm(
											!showOfflineConditionForm
										)
									}
									className='px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700'
								>
									Add Condition
								</button>
								{offlineConditions.length > 0 && (
									<button
										onClick={() => {
											const exportData = {
												fault: {
													id: fault.fault_id,
													name: fault.fault_name,
													device: device.device_name,
													mode: fault.mode,
												},
												conditions:
													offlineConditions.map(
														(c) => ({
															id: c.condition_id,
															name: c.name,
															status: c.status,
														})
													),
											};
											navigator.clipboard.writeText(
												JSON.stringify(
													exportData,
													null,
													2
												)
											);
											alert(
												"Fault configuration copied to clipboard!"
											);
										}}
										className='px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700'
									>
										Export Config
									</button>
								)}
								{fault.status === "Active" && (
									<button
										onClick={() =>
											setShowConditionForm(
												!showConditionForm
											)
										}
										className='px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700'
									>
										Add Live Condition
									</button>
								)}
								<button
									onClick={() =>
										copyToClipboard(
											fault.fault_id,
											"Fault ID"
										)
									}
									className='px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700'
								>
									Copy Fault ID
								</button>
							</div>
						</div>

						<div className='flex items-center space-x-2'>
							<span className='text-sm text-blue-700'>
								{fault.mode} Mode • {fault.status}
							</span>{" "}
							{liveFault && (
								<span className='px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium'>
									<span className='inline-block w-2 h-2 bg-red-500 rounded-full mr-1'></span>
									LIVE
								</span>
							)}
						</div>
					</div>
				</div>
				{/* Fault Header */}
				<div className='bg-white p-6 rounded-lg border border-gray-200'>
					<div className='flex justify-between items-start mb-4'>
						<div className='flex-1'>
							<div className='flex items-center space-x-4 mb-2'>
								<h2 className='text-2xl font-bold text-gray-900'>
									{fault.fault_name ||
										`Fault ${fault.fault_id}`}
								</h2>{" "}
								<div className='flex space-x-2'>
									{" "}
									<button
										onClick={() =>
											copyToClipboard(
												fault.fault_id,
												"Fault ID"
											)
										}
										className='px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200'
										title='Copy fault ID'
									>
										Copy ID
									</button>
									<span
										className={`px-2 py-1 rounded-full text-xs ${
											fault.status === "Active"
												? "bg-green-100 text-green-800"
												: "bg-gray-100 text-gray-800"
										}`}
									>
										{fault.status}
									</span>
									{/* Fault type removed - no longer distinguishing between batch/stream */}
								</div>
							</div>
							<p className='text-gray-600 mb-4'>
								{fault.description || "No description provided"}
							</p>{" "}
							<div className='grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500'>
								<div>
									<span className='font-medium'>Device:</span>
									<Link
										href={`/devices/${deviceId}`}
										className='ml-1 text-blue-600 hover:text-blue-800'
									>
										{device.device_name}
									</Link>
								</div>
								<div>
									<span className='font-medium'>
										Started:
									</span>{" "}
									{formatDate(fault.start_date)}
								</div>
								{fault.end_date && (
									<div>
										<span className='font-medium'>
											Ended:
										</span>{" "}
										{formatDate(fault.end_date)}
									</div>
								)}{" "}
								<div>
									<span className='font-medium'>Mode:</span>
									<span
										className={`ml-1 px-2 py-0.5 rounded text-xs ${
											fault.mode === "Online"
												? "bg-green-100 text-green-800"
												: "bg-orange-100 text-orange-800"
										}`}
									>
										{fault.mode || "Unknown"}
									</span>
								</div>
								<div>
									<span className='font-medium'>
										Conditions:
									</span>
									<span className='ml-1 font-mono'>
										{offlineConditions.length}
									</span>
									{liveFault && (
										<span className='ml-1 text-green-600'>
											({liveFault.conditions_count} live)
										</span>
									)}
								</div>{" "}
								{liveFault && (
									<div>
										<span className='font-medium'>
											Session Duration:
										</span>{" "}
										<span className='font-mono'>
											{formatDuration(liveFault.duration)}
										</span>
									</div>
								)}
								<div>
									<span className='font-medium'>
										Created:
									</span>{" "}
									{fault.created_at
										? formatDate(fault.created_at)
										: "N/A"}
								</div>
								{fault.updated_at &&
									fault.updated_at !== fault.created_at && (
										<div>
											<span className='font-medium'>
												Updated:
											</span>{" "}
											{formatDate(fault.updated_at)}
										</div>
									)}
								<div>
									<span className='font-medium'>
										Device Status:
									</span>
									<span
										className={`ml-1 px-2 py-0.5 rounded text-xs ${
											device.status === "Active"
												? "bg-green-100 text-green-800"
												: "bg-red-100 text-red-800"
										}`}
									>
										{device.status}
									</span>
								</div>
							</div>
						</div>{" "}
						{/* Fault Actions */}
						<div className='flex flex-col space-y-2 ml-6'>
							{liveFault ? (
								<>
									<div className='text-right text-sm text-gray-500'>
										<div className='text-green-600 font-medium'>
											Live Session Active
										</div>
									</div>
									<button
										onClick={handleStopFault}
										className='px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700'
									>
										Stop Fault
									</button>
								</>
							) : (
								<>
									{/* Fault Status Controls removed - simplified unified status model */}{" "}
									{/* Navigation Actions */}
									<div className='flex flex-col space-y-1'>
										{" "}
										<Link
											href={`/devices/${deviceId}`}
											className='px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 text-center'
										>
											Device View
										</Link>
										{fault.mode === "Offline" && (
											<Link
												href={`/devices/${deviceId}/faults/create`}
												className='px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 text-center'
											>
												Create New
											</Link>
										)}
									</div>
									{/* Danger Zone */}
									<div className='border-t pt-2'>
										<button
											onClick={handleDeleteFault}
											disabled={
												faultActionLoading === "delete"
											}
											className='px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 disabled:bg-gray-400 w-full'
										>
											{" "}
											{faultActionLoading === "delete"
												? "Deleting..."
												: "Delete"}
										</button>
									</div>
								</>
							)}
						</div>{" "}
					</div>
				</div>{" "}
				{/* Live Fault Overview */}
				{liveFault && (
					<div className='bg-gradient-to-r from-blue-50 via-purple-50 to-green-50 border-2 border-blue-200 rounded-lg p-6'>
						{" "}
						<div className='flex items-center justify-between mb-6'>
							<div className='flex items-center space-x-3'>
								<div className='flex items-center space-x-2'>
									<div className='w-4 h-4 bg-red-500 rounded-full animate-pulse'></div>{" "}
									<h3 className='text-2xl font-bold text-gray-900'>
										<span className='inline-block w-3 h-3 bg-red-500 rounded-full mr-2'></span>
										LIVE FAULT
									</h3>
								</div>
								<span className='px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium'>
									STREAMING
								</span>
							</div>
						</div>
						{/* Live Stats Grid */}
						<div className='grid grid-cols-1 md:grid-cols-4 gap-4 mb-6'>
							<div className='bg-white border border-blue-200 rounded-lg p-4'>
								<div className='flex items-center space-x-3'>
									{" "}
									<div className='w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center'>
										<svg
											className='w-6 h-6 text-blue-600'
											fill='currentColor'
											viewBox='0 0 20 20'
										>
											<path
												fillRule='evenodd'
												d='M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z'
												clipRule='evenodd'
											/>
										</svg>
									</div>{" "}
									<div>
										<div className='text-blue-600 text-2xl font-bold'>
											{formatDuration(liveFault.duration)}
										</div>
										<div className='text-blue-800 text-sm font-medium'>
											Session Duration
										</div>
									</div>
								</div>
							</div>
							<div className='bg-white border border-green-200 rounded-lg p-4'>
								<div className='flex items-center space-x-3'>
									{" "}
									<div className='w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center'>
										<svg
											className='w-6 h-6 text-green-600'
											fill='currentColor'
											viewBox='0 0 20 20'
										>
											<path d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' />
										</svg>
									</div>
									<div>
										<div className='text-green-600 text-2xl font-bold'>
											{liveFault.conditions_count || 0}
										</div>
										<div className='text-green-800 text-sm font-medium'>
											Total Conditions
										</div>
									</div>
								</div>
							</div>
							<div className='bg-white border border-purple-200 rounded-lg p-4'>
								<div className='flex items-center space-x-3'>
									{" "}
									<div className='w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center'>
										<svg
											className='w-6 h-6 text-purple-600'
											fill='currentColor'
											viewBox='0 0 20 20'
										>
											<path d='M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z' />
										</svg>
									</div>{" "}
									<div>
										<div className='text-purple-600 text-2xl font-bold'>
											{conditionsData.length}
										</div>
										<div className='text-purple-800 text-sm font-medium'>
											Data Points
										</div>
									</div>
								</div>
							</div>
						</div>
						{/* Quick Status Info */}
						<div className='bg-white rounded-lg border border-gray-200 p-4'>
							<div className='flex items-center justify-between'>
								<div className='flex items-center space-x-6'>
									<div className='flex items-center space-x-2'>
										<span className='text-sm font-medium text-gray-600'>
											Current Status:
										</span>
										<span className='px-2 py-1 bg-green-100 text-green-800 rounded text-sm font-medium'>
											{liveFault.current_condition
												? "Recording Data"
												: "Ready for Conditions"}
										</span>
									</div>
									<div className='flex items-center space-x-2'>
										<span className='text-sm font-medium text-gray-600'>
											Device:
										</span>
										<span className='text-sm text-gray-900 font-mono'>
											{device.device_name}
										</span>
									</div>
									<div className='flex items-center space-x-2'>
										<span className='text-sm font-medium text-gray-600'>
											Started:
										</span>
										<span className='text-sm text-gray-900 font-mono'>
											{formatDate(fault.start_date)}
										</span>
									</div>
								</div>
								{autoRefresh && (
									<div className='flex items-center space-x-2 text-green-600'>
										<div className='w-2 h-2 bg-green-500 rounded-full animate-pulse'></div>
										<span className='text-sm font-medium'>
											Auto-refreshing data
										</span>
									</div>
								)}
							</div>
						</div>
					</div>
				)}{" "}
				{/* Live Conditions Control */}
				{liveFault && (
					<div className='bg-white p-6 rounded-lg border border-gray-200'>
						<div className='flex justify-between items-center mb-4'>
							{" "}
							<h3 className='text-lg font-medium text-gray-900'>
								Live Conditions Control
							</h3>
							<button
								onClick={() =>
									setShowConditionForm(!showConditionForm)
								}
								className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400'
								disabled={anyConditionActive}
								title={
									anyConditionActive
										? "Cannot add new condition while another is Active"
										: ""
								}
							>
								{showConditionForm ? "Cancel" : "Add Condition"}
							</button>
						</div>{" "}
						{/* Current Active Condition with Live Data */}
						{liveFault.current_condition && (
							<div className='bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200 rounded-lg p-6 mb-6'>
								{/* Condition Header */}
								<div className='flex justify-between items-start mb-4'>
									<div className='flex-1'>
										<div className='flex items-center space-x-3 mb-2'>
											<div className='flex items-center space-x-2'>
												<div className='w-3 h-3 bg-green-500 rounded-full animate-pulse'></div>
												<h4 className='text-xl font-semibold text-green-800'>
													{
														liveFault
															.current_condition
															.name
													}
												</h4>
											</div>
											<span className='px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium'>
												LIVE
											</span>
										</div>
										{liveFault.current_condition
											.description && (
											<p className='text-sm text-green-700 mb-2'>
												{
													liveFault.current_condition
														.description
												}
											</p>
										)}{" "}
										<div className='flex items-center space-x-4 text-sm text-green-600'>
											<div>
												<span className='font-medium'>
													Duration:
												</span>{" "}
												{formatDuration(
													liveFault.current_condition
														.duration
												)}
											</div>{" "}
											<div>
												<span className='font-medium'>
													Data Points:
												</span>{" "}
												<span className='font-mono'>
													{conditionsData.length}
												</span>
											</div>
											<div>
												<span className='font-medium'>
													ID:
												</span>{" "}
												<code className='bg-green-100 px-1 py-0.5 rounded text-xs'>
													{
														liveFault
															.current_condition
															.condition_id
													}
												</code>
											</div>
										</div>
									</div>

									{/* Control Actions */}
									<div className='flex items-center space-x-2 ml-4'>
										<label className='flex items-center space-x-2 bg-white px-3 py-2 rounded-md border border-green-200'>
											<input
												type='checkbox'
												checked={autoRefresh}
												onChange={(e) =>
													setAutoRefresh(
														e.target.checked
													)
												}
												className='rounded text-green-600'
											/>
											<span className='text-sm text-green-700 font-medium'>
												Auto-refresh
											</span>
											{autoRefresh && (
												<div className='w-2 h-2 bg-green-500 rounded-full animate-pulse'></div>
											)}
										</label>

										<div className='flex space-x-1'>
											{" "}
											<button
												onClick={() => {
													navigator.clipboard.writeText(
														liveFault.current_condition!
															.condition_id
													);
													alert(
														"Active condition ID copied to clipboard!"
													);
												}}
												className='px-3 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 text-sm'
												title='Copy active condition ID'
											>
												Copy ID
											</button>{" "}
											<Link
												href={`/devices/${deviceId}/faults/${faultId}/conditions/${
													liveFault.current_condition!
														.condition_id
												}`}
												className='px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm'
												title='View detailed data analysis'
											>
												View Detail
											</Link>
											<button
												onClick={() =>
													handleStopCondition(
														liveFault.current_condition!
															.condition_id
													)
												}
												className='px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm'
											>
												Stop
											</button>
										</div>
									</div>
								</div>

								{/* Live Data Visualization */}
								<div className='bg-white rounded-lg border border-green-200 p-4'>
									<div className='flex justify-between items-center mb-4'>
										{" "}
										<h5 className='text-lg font-medium text-gray-900'>
											Live Data Stream
										</h5>{" "}
										<div className='flex space-x-2'>
											{["chart", "stats"].map((mode) => (
												<button
													key={mode}
													onClick={() =>
														setChartViewMode(
															mode as typeof chartViewMode
														)
													}
													className={`px-3 py-1 rounded text-sm ${
														chartViewMode === mode
															? "bg-green-600 text-white"
															: "bg-gray-200 text-gray-700 hover:bg-gray-300"
													}`}
												>
													{" "}
													{mode === "chart"
														? "Chart View"
														: "Stats View"}
												</button>
											))}
										</div>
									</div>{" "}
									{/* Active Filters Indicator */}
									{fault && (
										<div className='bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4'>
											<h4 className='text-lg font-medium text-blue-800 mb-2'>
												Active Data Filters
											</h4>
											<div className='flex flex-wrap gap-2'>
												<div className='bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm'>
													<span className='font-medium'>
														Device:
													</span>{" "}
													{device?.device_name ||
														deviceId}
												</div>
												<div className='bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm'>
													<span className='font-medium'>
														Fault:
													</span>{" "}
													{fault.fault_name}
												</div>
												<div className='bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm'>
													<span className='font-medium'>
														Mode:
													</span>{" "}
													Name-based filtering
												</div>
												<div className='bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm'>
													<span className='font-medium'>
														Data:
													</span>{" "}
													Latest{" "}
													{conditionsData.length}{" "}
													measurements
												</div>
											</div>
											<p className='text-blue-700 text-sm mt-2'>
												Measurements are filtered by
												fault name "
												<strong>
													{fault.fault_name}
												</strong>
												" using the improved filtering
												system.
											</p>
										</div>
									)}
									{/* Chart View */}
									{chartViewMode === "chart" && (
										<div className='bg-gray-50 border border-gray-200 rounded-lg p-6'>
											{conditionsData.length > 0 ? (
												<>
													{" "}
													<div className='text-center mb-6'>
														<div className='w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center'>
															<svg
																className='w-8 h-8 text-blue-600'
																fill='currentColor'
																viewBox='0 0 20 20'
															>
																<path d='M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z' />
																<path d='M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z' />
															</svg>
														</div>
														<h6 className='text-lg font-medium mb-2 text-gray-800'>
															Real-time
															Measurement Data
														</h6>
														<p className='text-gray-600 mb-4'>
															Live data from the
															current condition -
															showing interactive
															charts for all
															measurement
															parameters
														</p>{" "}
													</div>
													{/* Latest measurement data display */}
													{(() => {
														const latestData =
															conditionsData[
																conditionsData.length -
																	1
															];
														if (
															!latestData?.data_payload
														)
															return null;

														// Get all keys from data_payload (dynamic fields)
														const dataKeys =
															Object.keys(
																latestData.data_payload
															);
														const colors = [
															"blue",
															"green",
															"purple",
															"orange",
															"red",
															"yellow",
														];

														return (
															<div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'>
																{dataKeys
																	.slice(0, 8)
																	.map(
																		(
																			key,
																			index
																		) => {
																			const color =
																				colors[
																					index %
																						colors.length
																				];
																			const value =
																				latestData
																					.data_payload[
																					key
																				];
																			const displayValue =
																				typeof value ===
																				"number"
																					? value.toFixed(
																							2
																					  )
																					: String(
																							value
																					  );

																			return (
																				<div
																					key={
																						key
																					}
																					className={`bg-${color}-50 border border-${color}-200 rounded-lg p-3`}
																				>
																					<div
																						className={`text-${color}-600 text-lg font-bold`}
																					>
																						{
																							displayValue
																						}
																					</div>
																					<div
																						className={`text-${color}-800 text-xs font-medium`}
																					>
																						{key
																							.replace(
																								/_/g,
																								" "
																							)
																							.replace(
																								/\b\w/g,
																								(
																									l
																								) =>
																									l.toUpperCase()
																							)}
																					</div>
																				</div>
																			);
																		}
																	)}

																{/* Data points count */}
																<div className='bg-gray-50 border border-gray-200 rounded-lg p-3'>
																	<div className='text-gray-600 text-lg font-bold'>
																		{
																			conditionsData.length
																		}
																	</div>
																	<div className='text-gray-800 text-xs font-medium'>
																		Data
																		Points
																	</div>
																</div>

																{/* Last update time */}
																<div className='bg-indigo-50 border border-indigo-200 rounded-lg p-3'>
																	<div className='text-indigo-600 text-lg font-bold'>
																		{latestData.timestamp
																			? new Date(
																					latestData.timestamp
																			  ).toLocaleTimeString()
																			: new Date().toLocaleTimeString()}
																	</div>
																	<div className='text-indigo-800 text-xs font-medium'>
																		Last
																		Update
																	</div>
																</div>
															</div>
														);
													})()}
													{/* Multi-chart visualization - same logic as condition details */}
													{(() => {
														if (
															conditionsData.length <
															2
														)
															return null;

														// Prepare chart data from conditionsData
														const chartData: Record<
															string,
															Array<{
																timestamp: string;
																value: number;
																timestampFormatted: string;
																index: number;
															}>
														> = {};

														// Extract all numeric data from payloads
														const allKeys =
															new Set<string>();
														conditionsData.forEach(
															(
																measurement: any
															) => {
																if (
																	typeof measurement.data_payload ===
																		"object" &&
																	measurement.data_payload
																) {
																	Object.keys(
																		measurement.data_payload
																	).forEach(
																		(key) =>
																			allKeys.add(
																				key
																			)
																	);
																}
															}
														);

														// Process data for each key
														allKeys.forEach(
															(key) => {
																chartData[key] =
																	[];
																conditionsData.forEach(
																	(
																		measurement: any,
																		index: any
																	) => {
																		if (
																			measurement.data_payload &&
																			measurement
																				.data_payload[
																				key
																			] !==
																				undefined
																		) {
																			const value =
																				measurement
																					.data_payload[
																					key
																				];
																			if (
																				Array.isArray(
																					value
																				)
																			) {
																				// For arrays, take the first value or average
																				const numericValue =
																					value.length >
																					0
																						? value[0]
																						: 0;
																				if (
																					typeof numericValue ===
																					"number"
																				) {
																					chartData[
																						key
																					].push(
																						{
																							timestamp:
																								measurement.timestamp,
																							value: numericValue,
																							timestampFormatted:
																								new Date(
																									measurement.timestamp
																								).toLocaleTimeString(),
																							index: index,
																						}
																					);
																				}
																			} else if (
																				typeof value ===
																				"number"
																			) {
																				chartData[
																					key
																				].push(
																					{
																						timestamp:
																							measurement.timestamp,
																						value: value,
																						timestampFormatted:
																							new Date(
																								measurement.timestamp
																							).toLocaleTimeString(),
																						index: index,
																					}
																				);
																			}
																		}
																	}
																);
															}
														);

														// Filter out keys with no data
														const chartKeys =
															Object.keys(
																chartData
															).filter(
																(key) =>
																	chartData[
																		key
																	].length > 0
															);

														if (
															chartKeys.length ===
															0
														) {
															return (
																<div className='text-center py-8 text-gray-500'>
																	No numeric
																	data
																	available
																	for charting
																</div>
															);
														}

														return (
															<div className='space-y-6'>
																{/* Chart info */}
																<div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
																	{" "}
																	<h4 className='text-lg font-medium text-blue-800 mb-2'>
																		Interactive
																		Data
																		Charts
																	</h4>
																	<p className='text-blue-700 text-sm mb-4'>
																		Interactive
																		charts
																		generated
																		from
																		data
																		payload
																		objects.
																		Each key
																		in the
																		payload
																		becomes
																		a
																		separate
																		chart.
																	</p>
																	<div className='grid grid-cols-1 md:grid-cols-3 gap-4 text-sm'>
																		<div>
																			<span className='font-medium'>
																				Available
																				Parameters:
																			</span>{" "}
																			{
																				chartKeys.length
																			}
																		</div>
																		<div>
																			<span className='font-medium'>
																				Total
																				Data
																				Points:
																			</span>{" "}
																			{Object.values(
																				chartData
																			).reduce(
																				(
																					sum,
																					data
																				) =>
																					sum +
																					data.length,
																				0
																			)}
																		</div>
																		<div>
																			<span className='font-medium'>
																				Measurements:
																			</span>{" "}
																			{
																				conditionsData.length
																			}
																		</div>
																	</div>
																</div>

																{/* Primary chart for first parameter */}
																{chartKeys.length >
																	0 && (
																	<div className='bg-white border border-gray-200 rounded-lg p-6'>
																		{" "}
																		<h5 className='text-lg font-medium text-gray-900 mb-4'>
																			Primary
																			Chart
																			-{" "}
																			{
																				chartKeys[0]
																			}
																		</h5>
																		<ResponsiveContainer
																			width='100%'
																			height={
																				400
																			}
																		>
																			<LineChart
																				data={
																					chartData[
																						chartKeys[0]
																					]
																				}
																			>
																				<CartesianGrid strokeDasharray='3 3' />
																				<XAxis
																					dataKey='timestampFormatted'
																					angle={
																						-45
																					}
																					textAnchor='end'
																					height={
																						100
																					}
																					interval='preserveStartEnd'
																					tick={{
																						fontSize: 12,
																					}}
																				/>
																				<YAxis
																					tick={{
																						fontSize: 12,
																					}}
																					tickCount={
																						8
																					}
																					tickFormatter={(
																						value
																					) => {
																						if (
																							Math.abs(
																								value
																							) >=
																							1000000
																						) {
																							return `${(
																								value /
																								1000000
																							).toFixed(
																								1
																							)}M`;
																						} else if (
																							Math.abs(
																								value
																							) >=
																							1000
																						) {
																							return `${(
																								value /
																								1000
																							).toFixed(
																								1
																							)}K`;
																						} else if (
																							Math.abs(
																								value
																							) <
																								0.01 &&
																							value !==
																								0
																						) {
																							return value.toExponential(
																								2
																							);
																						} else {
																							return value.toFixed(
																								2
																							);
																						}
																					}}
																				/>
																				<Tooltip
																					labelFormatter={(
																						label
																					) =>
																						`Time: ${label}`
																					}
																					formatter={(
																						value: number
																					) => [
																						typeof value ===
																						"number"
																							? value.toFixed(
																									2
																							  )
																							: value,
																						chartKeys[0],
																					]}
																				/>
																				<Legend />
																				<Line
																					type='monotone'
																					dataKey='value'
																					stroke='#3B82F6'
																					strokeWidth={
																						2
																					}
																					dot={
																						chartData[
																							chartKeys[0]
																						]
																							.length <=
																						50
																					}
																					name={
																						chartKeys[0]
																					}
																				/>
																			</LineChart>
																		</ResponsiveContainer>
																	</div>
																)}

																{/* Additional charts for other parameters */}
																{chartKeys
																	.slice(1, 4)
																	.map(
																		(
																			key,
																			index
																		) => (
																			<div
																				key={
																					key
																				}
																				className='bg-white border border-gray-200 rounded-lg p-6'
																			>
																				{" "}
																				<h5 className='text-lg font-medium text-gray-900 mb-4'>
																					Chart{" "}
																					{index +
																						2}{" "}
																					-{" "}
																					{
																						key
																					}
																				</h5>
																				<ResponsiveContainer
																					width='100%'
																					height={
																						300
																					}
																				>
																					<LineChart
																						data={
																							chartData[
																								key
																							]
																						}
																					>
																						<CartesianGrid strokeDasharray='3 3' />
																						<XAxis
																							dataKey='timestampFormatted'
																							angle={
																								-45
																							}
																							textAnchor='end'
																							height={
																								80
																							}
																							interval='preserveStartEnd'
																							tick={{
																								fontSize: 10,
																							}}
																						/>
																						<YAxis
																							tick={{
																								fontSize: 10,
																							}}
																							tickCount={
																								6
																							}
																							tickFormatter={(
																								value
																							) => {
																								if (
																									Math.abs(
																										value
																									) >=
																									1000000
																								) {
																									return `${(
																										value /
																										1000000
																									).toFixed(
																										1
																									)}M`;
																								} else if (
																									Math.abs(
																										value
																									) >=
																									1000
																								) {
																									return `${(
																										value /
																										1000
																									).toFixed(
																										1
																									)}K`;
																								} else if (
																									Math.abs(
																										value
																									) <
																										0.01 &&
																									value !==
																										0
																								) {
																									return value.toExponential(
																										2
																									);
																								} else {
																									return value.toFixed(
																										2
																									);
																								}
																							}}
																						/>
																						<Tooltip
																							labelFormatter={(
																								label
																							) =>
																								`Time: ${label}`
																							}
																							formatter={(
																								value: number
																							) => [
																								typeof value ===
																								"number"
																									? value.toFixed(
																											2
																									  )
																									: value,
																								key,
																							]}
																						/>
																						<Legend />
																						<Line
																							type='monotone'
																							dataKey='value'
																							stroke={
																								[
																									"#10B981",
																									"#8B5CF6",
																									"#F59E0B",
																								][
																									index %
																										3
																								]
																							}
																							strokeWidth={
																								2
																							}
																							dot={
																								chartData[
																									key
																								]
																									.length <=
																								50
																							}
																							name={
																								key
																							}
																						/>
																					</LineChart>
																				</ResponsiveContainer>
																			</div>
																		)
																	)}

																{/* Show notification if there are more charts available */}
																{chartKeys.length >
																	4 && (
																	<div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center'>
																		{" "}
																		<p className='text-yellow-800'>
																			{chartKeys.length -
																				4}{" "}
																			more
																			chart
																			{chartKeys.length -
																				4 >
																			1
																				? "s"
																				: ""}{" "}
																			available
																			for
																			parameters:{" "}
																			{chartKeys
																				.slice(
																					4
																				)
																				.join(
																					", "
																				)}
																		</p>
																		<p className='text-yellow-700 text-sm mt-2'>
																			Visit
																			the
																			condition
																			details
																			page
																			to
																			view
																			all
																			charts
																		</p>
																	</div>
																)}

																<p className='text-sm text-gray-500 mt-4 text-center'>
																	Showing{" "}
																	{
																		conditionsData.length
																	}{" "}
																	recent
																	measurements
																	with{" "}
																	{
																		chartKeys.length
																	}{" "}
																	chart
																	{chartKeys.length >
																	1
																		? "s"
																		: ""}
																	{autoRefresh && (
																		<span className='text-green-600 ml-2'>
																			Auto-refresh
																			active
																			-
																			every
																			3
																			seconds
																		</span>
																	)}
																</p>
															</div>
														);
													})()}
												</>
											) : (
												<div className='text-center'>
													<div className='w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center'>
														<svg
															className='w-8 h-8 text-gray-400'
															fill='currentColor'
															viewBox='0 0 20 20'
														>
															<path d='M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z' />
														</svg>
													</div>
													<h6 className='text-lg font-medium mb-2 text-gray-600'>
														Waiting for measurement
														data...
													</h6>
													<p className='text-gray-500'>
														Live measurement data
														will appear here once
														the condition starts
														collecting data
													</p>{" "}
													{autoRefresh && (
														<div className='mt-4 text-green-600'>
															Auto-refresh active
															- every 3 seconds
														</div>
													)}
												</div>
											)}
										</div>
									)}
									{/* Stats View */}
									{chartViewMode === "stats" && (
										<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
											{(conditionsData.length > 0 &&
												(() => {
													const latestData =
														conditionsData[
															conditionsData.length -
																1
														];
													if (
														!latestData?.data_payload
													)
														return null;

													// Get numeric fields from the latest measurement
													const numericFields =
														Object.keys(
															latestData.data_payload
														).filter(
															(key) =>
																typeof latestData
																	.data_payload[
																	key
																] === "number"
														);

													if (
														numericFields.length ===
														0
													) {
														return (
															<div className='col-span-2 text-center py-8 text-gray-500'>
																<div className='w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center'>
																	<svg
																		className='w-8 h-8 text-gray-400'
																		fill='currentColor'
																		viewBox='0 0 20 20'
																	>
																		<path d='M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z' />
																	</svg>
																</div>
																<p>
																	No numeric
																	data
																	available
																	for
																	statistics
																</p>
																<p className='text-sm mt-2'>
																	Statistics
																	require
																	numeric
																	measurements
																</p>
															</div>
														);
													}

													const colors = [
														"blue",
														"green",
														"purple",
														"orange",
														"red",
														"yellow",
													];
													const icons = [
														"TEMP",
														"FLOW",
														"LOAD",
														"VOLT",
														"CURR",
														"FREQ",
														"SIG",
														"VAL",
													];

													return numericFields
														.slice(0, 6)
														.map((field, index) => {
															const color =
																colors[
																	index %
																		colors.length
																];
															const icon =
																icons[
																	index %
																		icons.length
																];

															// Calculate statistics for this field
															const values =
																conditionsData
																	.map(
																		(d) =>
																			d
																				.data_payload?.[
																				field
																			]
																	)
																	.filter(
																		(v) =>
																			typeof v ===
																			"number"
																	);

															if (
																values.length ===
																0
															)
																return null;

															const current =
																values[
																	values.length -
																		1
																];
															const average =
																values.reduce(
																	(sum, v) =>
																		sum + v,
																	0
																) /
																values.length;
															const min =
																Math.min(
																	...values
																);
															const max =
																Math.max(
																	...values
																);

															const fieldName =
																field
																	.replace(
																		/_/g,
																		" "
																	)
																	.replace(
																		/\b\w/g,
																		(l) =>
																			l.toUpperCase()
																	);

															return (
																<div
																	key={field}
																	className={`bg-${color}-50 border border-${color}-200 rounded-lg p-4`}
																>
																	{" "}
																	<h6
																		className={`text-${color}-800 font-medium mb-2`}
																	>
																		<span
																			className={`inline-block w-8 h-6 text-xs font-bold bg-${color}-200 text-${color}-800 rounded px-1 mr-2`}
																		>
																			{
																				icon
																			}
																		</span>
																		{
																			fieldName
																		}
																	</h6>
																	<div className='space-y-1 text-sm'>
																		<div className='flex justify-between'>
																			<span>
																				Current:
																			</span>
																			<span className='font-mono'>
																				{current.toFixed(
																					2
																				)}
																			</span>
																		</div>
																		<div className='flex justify-between'>
																			<span>
																				Average:
																			</span>
																			<span className='font-mono'>
																				{average.toFixed(
																					2
																				)}
																			</span>
																		</div>
																		<div className='flex justify-between'>
																			<span>
																				Min:
																			</span>
																			<span className='font-mono'>
																				{min.toFixed(
																					2
																				)}
																			</span>
																		</div>
																		<div className='flex justify-between'>
																			<span>
																				Max:
																			</span>
																			<span className='font-mono'>
																				{max.toFixed(
																					2
																				)}
																			</span>
																		</div>
																		<div className='flex justify-between'>
																			<span>
																				Range:
																			</span>
																			<span className='font-mono'>
																				{(
																					max -
																					min
																				).toFixed(
																					2
																				)}
																			</span>
																		</div>
																	</div>
																</div>
															);
														});
												})()) || (
												<div className='col-span-2 text-center py-8 text-gray-500'>
													<div className='w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center'>
														<svg
															className='w-8 h-8 text-gray-400'
															fill='currentColor'
															viewBox='0 0 20 20'
														>
															<path d='M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z' />
														</svg>
													</div>
													<p>
														No statistics available
														yet
													</p>
													<p className='text-sm mt-2'>
														Statistics will appear
														once measurement data is
														captured
													</p>
												</div>
											)}
										</div>
									)}
								</div>
							</div>
						)}
						{/* Add New Condition Form */}
						{showConditionForm && (
							<div className='bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4'>
								<h4 className='font-medium text-gray-900 mb-3'>
									Start New Condition
								</h4>
								<div className='space-y-3'>
									<div>
										<label className='block text-sm font-medium text-gray-700 mb-1'>
											Condition Name *
										</label>
										<input
											type='text'
											value={newConditionName}
											onChange={(e) =>
												setNewConditionName(
													e.target.value
												)
											}
											className='w-full px-3 py-2 border border-gray-300 rounded-md'
											placeholder='e.g., Baseline, Load 5kg, Speed 100rpm'
										/>
									</div>
									<div>
										<label className='block text-sm font-medium text-gray-700 mb-1'>
											Description
										</label>
										<textarea
											value={newConditionDescription}
											onChange={(e) =>
												setNewConditionDescription(
													e.target.value
												)
											}
											className='w-full px-3 py-2 border border-gray-300 rounded-md'
											rows={2}
											placeholder='Describe the condition...'
										/>
									</div>
									<div className='flex space-x-2'>
										<button
											onClick={handleStartCondition}
											disabled={!newConditionName.trim()}
											className='px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300'
										>
											Start Condition
										</button>
										<button
											onClick={() =>
												setShowConditionForm(false)
											}
											className='px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400'
										>
											Cancel
										</button>
									</div>
								</div>
							</div>
						)}
						{/* Conditions History */}
						<div>
							<h4 className='font-medium text-gray-900 mb-3'>
								Conditions History
							</h4>
							{liveFault.conditions_count > 0 ? (
								<div className='space-y-2'>
									{conditions.map((condition, index: any) => (
										<div
											key={condition.condition_id}
											className='bg-gray-50 border border-gray-200 rounded-lg p-3'
										>
											<div className='flex justify-between items-center'>
												<div>
													<h5 className='font-medium text-gray-900'>
														{condition.name}
													</h5>
													{condition.description && (
														<p className='text-sm text-gray-600'>
															{
																condition.description
															}
														</p>
													)}
													<p className='text-xs text-gray-500'>
														Started:{" "}
														{formatDateShort(
															condition.start_time
														)}
													</p>
												</div>{" "}
												<div className='flex justify-between items-center'>
													<div>
														<h5 className='font-medium text-gray-900'>
															{condition.name}
														</h5>
														{condition.description && (
															<p className='text-sm text-gray-600'>
																{
																	condition.description
																}
															</p>
														)}{" "}
														<p className='text-xs text-gray-500'>
															Started:{" "}
															{formatDateShort(
																condition.start_time
															)}
														</p>
													</div>
													<div className='flex space-x-2'>
														<button
															onClick={() => {
																navigator.clipboard.writeText(
																	condition.condition_id
																);
																alert(
																	"Condition ID copied to clipboard!"
																);
															}}
															className='px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200'
															title='Copy condition ID'
														>
															Copy ID
														</button>
														<Link
															href={`/devices/${deviceId}/faults/${faultId}/conditions/${condition.condition_id}`}
															className='px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200'
															title='View detailed data and analytics'
														>
															View Data
														</Link>
													</div>
												</div>
											</div>
										</div>
									))}
								</div>
							) : (
								<div className='text-center py-4 text-gray-500'>
									No conditions recorded yet. Add one to start
									measuring specific conditions.
								</div>
							)}
						</div>
					</div>
				)}{" "}
				{/* Conditions Management */}
				<div className='bg-white p-6 rounded-lg border border-gray-200'>
					<div className='flex justify-between items-center mb-4'>
						{" "}
						<h3 className='text-lg font-medium text-gray-900'>
							Conditions Management
						</h3>
						<button
							onClick={() =>
								setShowOfflineConditionForm(
									!showOfflineConditionForm
								)
							}
							className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700'
						>
							{showOfflineConditionForm
								? "Cancel"
								: "Add Condition"}
						</button>
					</div>

					{/* Add New Offline Condition Form */}
					{showOfflineConditionForm && (
						<div className='bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4'>
							<h4 className='font-medium text-blue-900 mb-3'>
								Create New Offline Condition
							</h4>
							<div className='space-y-3'>
								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>
										Condition Name *
									</label>
									<input
										type='text'
										value={newOfflineConditionName}
										onChange={(e) =>
											setNewOfflineConditionName(
												e.target.value
											)
										}
										className='w-full px-3 py-2 border border-gray-300 rounded-md'
										placeholder='e.g., Baseline, Load 5kg, Speed 100rpm'
									/>
								</div>
								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>
										Description
									</label>
									<textarea
										value={newOfflineConditionDescription}
										onChange={(e) =>
											setNewOfflineConditionDescription(
												e.target.value
											)
										}
										className='w-full px-3 py-2 border border-gray-300 rounded-md'
										rows={2}
										placeholder='Describe the condition...'
									/>
								</div>
								<div className='flex space-x-2'>
									<button
										onClick={handleCreateOfflineCondition}
										disabled={
											!newOfflineConditionName.trim()
										}
										className='px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300'
									>
										Create Condition
									</button>
									<button
										onClick={() =>
											setShowOfflineConditionForm(false)
										}
										className='px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400'
									>
										Cancel
									</button>
								</div>
							</div>
						</div>
					)}

					{/* Offline Conditions List */}
					<div>
						<h4 className='font-medium text-gray-900 mb-3'>
							Conditions for Data Upload
						</h4>
						{offlineConditions.length > 0 ? (
							<div className='space-y-3'>
								{offlineConditions.map((condition) => (
									<div
										key={condition.condition_id}
										className='bg-gray-50 border border-gray-200 rounded-lg p-4'
									>
										<div className='flex justify-between items-start'>
											<div className='flex-1'>
												<div className='flex items-center space-x-2 mb-2'>
													<h5 className='font-medium text-gray-900'>
														{condition.name}
													</h5>
													<span
														className={`px-2 py-1 rounded-full text-xs ${
															condition.status ===
															"Active"
																? "bg-green-100 text-green-800"
																: "bg-gray-100 text-gray-800"
														}`}
													>
														{condition.status}
													</span>
												</div>
												{condition.description && (
													<p className='text-sm text-gray-600 mb-2'>
														{condition.description}
													</p>
												)}
												<div className='text-xs text-gray-500 space-y-1'>
													<div>
														ID:{" "}
														{condition.condition_id}
													</div>
													{condition.created_at && (
														<div>
															Created:{" "}
															{formatDateShort(
																condition.created_at
															)}
														</div>
													)}
													{condition.start_time && (
														<div>
															Started:{" "}
															{formatDateShort(
																condition.start_time
															)}
														</div>
													)}
												</div>
											</div>{" "}
											<div className='flex space-x-2 ml-4'>
												{/* Status Action Buttons */}
												{condition.status ===
													"Inactive" && (
													<button
														onClick={() =>
															handleStartOfflineCondition(
																condition.condition_id
															)
														}
														disabled={
															offlineConditionActionLoading ===
															condition.condition_id
														}
														className='px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:bg-gray-400'
													>
														{" "}
														{offlineConditionActionLoading ===
														condition.condition_id
															? "..."
															: "Start"}
													</button>
												)}{" "}
												{condition.status ===
													"Active" && (
													<>
														<button
															onClick={() =>
																handleStopOfflineCondition(
																	condition.condition_id
																)
															}
															disabled={
																offlineConditionActionLoading ===
																condition.condition_id
															}
															className='px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 disabled:bg-gray-400'
														>
															{" "}
															{offlineConditionActionLoading ===
															condition.condition_id
																? "..."
																: "Stop"}
														</button>
													</>
												)}
												{/* Management Actions */}
												<button
													onClick={() =>
														handleEditCondition(
															condition
														)
													}
													className='px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200'
													title='Edit condition details'
												>
													✏️ Edit
												</button>{" "}
												<button
													onClick={() => {
														navigator.clipboard.writeText(
															condition.condition_id
														);
														alert(
															"Condition ID copied to clipboard!"
														);
													}}
													className='px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200'
													title='Copy condition ID for scripts'
												>
													Copy ID
												</button>
												{/* Navigation to Detail Page */}{" "}
												<Link
													href={`/devices/${deviceId}/faults/${faultId}/conditions/${condition.condition_id}`}
													className='px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200'
													title='View condition details and data'
												>
													View
												</Link>
												{/* Delete Action */}
												<button
													onClick={() =>
														handleDeleteOfflineCondition(
															condition.condition_id
														)
													}
													disabled={
														offlineConditionActionLoading ===
														condition.condition_id
													}
													className='px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 disabled:bg-gray-400'
												>
													{" "}
													{offlineConditionActionLoading ===
													condition.condition_id
														? "..."
														: "Delete"}
												</button>
											</div>
										</div>

										{/* Usage Instructions */}
										{condition.status === "Inactive" && (
											<div className='mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm'>
												{" "}
												<div className='font-medium text-blue-900 mb-1'>
													Usage Instructions:
												</div>
												<div className='text-blue-800 space-y-1'>
													<div>
														1. Use condition ID:{" "}
														<code className='bg-blue-100 px-1 rounded'>
															{
																condition.condition_id
															}
														</code>
													</div>
													<div>
														2. Update your script
														config with this ID
													</div>
													<div>
														3. Run:{" "}
														<code className='bg-blue-100 px-1 rounded'>
															python
															batch_processor.py
															--config
															your_config.json
														</code>
													</div>
												</div>
											</div>
										)}
									</div>
								))}
							</div>
						) : (
							<div className='text-center py-6 text-gray-500 bg-gray-50 border border-gray-200 rounded-lg'>
								<div className='mb-2'>
									No offline conditions created yet.
								</div>
								<div className='text-sm'>
									Create conditions to prepare for data upload
									via scripts.
								</div>
							</div>
						)}
					</div>
				</div>
				{/* Static Fault Info and Analytics */}
				{!liveFault && fault.status === "Inactive" && (
					<div className='bg-white p-6 rounded-lg border border-gray-200'>
						{" "}
						<h3 className='text-lg font-medium text-gray-900 mb-4'>
							Fault Summary & Analytics
						</h3>
						<div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-4'>
							<div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
								<div className='text-blue-600 text-2xl font-bold'>
									{offlineConditions.length}
								</div>
								<div className='text-blue-800 text-sm font-medium'>
									Total Conditions
								</div>
							</div>
							<div className='bg-green-50 border border-green-200 rounded-lg p-4'>
								<div className='text-green-600 text-2xl font-bold'>
									{
										offlineConditions.filter(
											(p) => p.status === "Inactive"
										).length
									}
								</div>
								<div className='text-green-800 text-sm font-medium'>
									Completed
								</div>
							</div>
							<div className='bg-orange-50 border border-orange-200 rounded-lg p-4'>
								<div className='text-orange-600 text-2xl font-bold'>
									{fault.end_date && fault.start_date
										? Math.ceil(
												(new Date(
													fault.end_date
												).getTime() -
													new Date(
														fault.start_date
													).getTime()) /
													(1000 * 60 * 60 * 24)
										  )
										: "N/A"}
								</div>
								<div className='text-orange-800 text-sm font-medium'>
									Duration (days)
								</div>
							</div>
						</div>
						{/* Conditions Status Breakdown */}
						{offlineConditions.length > 0 && (
							<div className='mb-4'>
								<h4 className='text-md font-medium text-gray-800 mb-2'>
									Conditions Status Breakdown
								</h4>
								<div className='flex flex-wrap gap-2'>
									{["Active", "Inactive"].map((status) => {
										const count = offlineConditions.filter(
											(p) => p.status === status
										).length;
										if (count === 0) return null;
										return (
											<span
												key={status}
												className={`px-3 py-1 rounded-full text-sm ${
													status === "Active"
														? "bg-blue-100 text-blue-800"
														: "bg-gray-100 text-gray-800"
												}`}
											>
												{status}: {count}
											</span>
										);
									})}
								</div>
							</div>
						)}
						<div className='bg-gray-50 border border-gray-200 rounded-lg p-4'>
							<p className='text-gray-600 text-center py-2'>
								Fault completed. Navigate to individual
								conditions for detailed data analysis.
							</p>
							<div className='flex justify-center space-x-4 mt-4'>
								<Link
									href={`/devices/${deviceId}`}
									className='text-blue-600 hover:text-blue-900'
								>
									← Back to Device Overview
								</Link>
								<Link
									href='/faults'
									className='text-blue-600 hover:text-blue-900'
								>
									All Faults →
								</Link>
							</div>
						</div>
					</div>
				)}
				{/* Basic Static Fault Info (for non-completed faults) */}
				{!liveFault && fault.status !== "Inactive" && (
					<div className='bg-white p-6 rounded-lg border border-gray-200'>
						{" "}
						<h3 className='text-lg font-medium text-gray-900 mb-4'>
							Fault Status
						</h3>
						<div className='bg-gray-50 border border-gray-200 rounded-lg p-4'>
							{" "}
							<div className='text-center py-4'>
								<p className='text-gray-700 font-medium mb-2'>
									Fault Status: {fault.status}
								</p>
								<p className='text-gray-600 text-sm'>
									{fault.status === "Active"
										? "Fault is currently active. You can manage conditions and monitor progress."
										: "Fault is inactive. You can view historical data and manage conditions."}
								</p>
							</div>
							<div className='text-center mt-4'>
								<Link
									href={`/devices/${deviceId}`}
									className='text-blue-600 hover:text-blue-900'
								>
									← Back to Device Overview
								</Link>
							</div>
						</div>
					</div>
				)}
				{error && (
					<div className='bg-red-50 border border-red-200 rounded-lg p-4'>
						<div className='text-red-800'>{error}</div>
					</div>
				)}{" "}
				{/* Stopped conditions section removed - simplified status model */}
				{/* Completed Conditions List */}
				{offlineConditions.filter((p) => p.status === "Inactive")
					.length > 0 ? (
					<div className='mt-8'>
						<h4 className='font-medium text-green-900 mb-3'>
							Completed Conditions
						</h4>
						<div className='space-y-2'>
							{offlineConditions
								.filter((p) => p.status === "Inactive")
								.map((condition) => (
									<div
										key={condition.condition_id}
										className='bg-green-50 border border-green-200 rounded-lg p-3'
									>
										<div className='flex justify-between items-center'>
											<div>
												<h5 className='font-medium text-green-900'>
													{condition.name}
												</h5>
												{condition.description && (
													<p className='text-sm text-green-700'>
														{condition.description}
													</p>
												)}
												<p className='text-xs text-gray-500'>
													Started:{" "}
													{formatDateShort(
														condition.start_time
													)}
													<br />
													Ended:{" "}
													{formatDateShort(
														condition.end_time
													)}
												</p>
											</div>
											<div className='flex space-x-2'>
												<button
													onClick={() => {
														navigator.clipboard.writeText(
															condition.condition_id
														);
														alert(
															"Condition ID copied to clipboard!"
														);
													}}
													className='px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200'
													title='Copy condition ID'
												>
													📋 Copy ID
												</button>
												<Link
													href={`/devices/${deviceId}/faults/${faultId}/conditions/${condition.condition_id}`}
													className='px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200'
													title='View detailed data and analytics'
												>
													👁️ View Data
												</Link>
											</div>
										</div>
									</div>
								))}
						</div>
					</div>
				) : (
					<div className='mt-8 text-center text-gray-500'>
						No completed conditions yet.
					</div>
				)}
			</div>
		</PageLayout>
	);
}
