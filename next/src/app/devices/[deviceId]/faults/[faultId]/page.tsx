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
import DeviceProtectedRoute from "@/components/DeviceProtectedRoute";
import FaultHeader from "@/components/FaultDetail/FaultHeader";
import LiveFaultOverview from "@/components/FaultDetail/LiveFaultOverview";
import LiveConditionsControl from "@/components/FaultDetail/LiveConditionsControl";
import ConditionsManagement from "@/components/FaultDetail/ConditionsManagement";
import EditConditionModal from "@/components/FaultDetail/EditConditionModal";
import QuickActionsBar from "@/components/FaultDetail/QuickActionsBar";
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
			console.log("Offline conditions:", offlineConditionsData);

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
			<DeviceProtectedRoute deviceId={deviceId}>
				<div className='flex items-center justify-center min-h-screen'>
					<div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600'></div>
				</div>
			</DeviceProtectedRoute>
		);
	}

	if (error || !device || !fault) {
		return (
			<DeviceProtectedRoute deviceId={deviceId}>
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
						<p className='text-red-700'>
							{error || "Fault not found"}
						</p>
						<Link
							href={`/devices/${deviceId}`}
							className='mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700'
						>
							← Back to Device
						</Link>
					</div>
				</PageLayout>
			</DeviceProtectedRoute>
		);
	}

	console.log(offlineConditions);

	return (
		<DeviceProtectedRoute deviceId={deviceId}>
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
					<EditConditionModal
						condition={editingCondition}
						formData={editConditionForm}
						onFormChange={(field, value) =>
							setEditConditionForm((prev) => ({
								...prev,
								[field]: value,
							}))
						}
						onSave={handleUpdateCondition}
						onCancel={() => {
							setEditingCondition(null);
							setEditConditionForm({
								name: "",
								description: "",
								status: "Active",
							});
						}}
						loading={
							offlineConditionActionLoading ===
							editingCondition.condition_id
						}
					/>
				)}

				<div className='space-y-6'>
					{/* Quick Actions Bar */}
					<QuickActionsBar
						device={device}
						deviceId={deviceId}
						anyConditionActive={anyConditionActive}
					/>

					{/* Fault Header */}
					<FaultHeader
						device={device}
						fault={fault}
						faultActionLoading={faultActionLoading}
						onDeleteFault={handleDeleteFault}
						onUpdateFaultStatus={handleUpdateFaultStatus}
						copyToClipboard={copyToClipboard}
					/>

					{/* Live Fault Overview */}
					{liveFault && (
						<LiveFaultOverview
							device={device}
							liveFault={liveFault}
							conditionsData={conditionsData}
							autoRefresh={autoRefresh}
							onAutoRefreshChange={setAutoRefresh}
							onStopFault={handleStopFault}
							copyToClipboard={copyToClipboard}
						/>
					)}

					{/* Live Conditions Control */}
					{liveFault && (
						<LiveConditionsControl
							device={device}
							liveFault={liveFault}
							conditions={conditions}
							conditionsData={conditionsData}
							chartViewMode={chartViewMode}
							showConditionForm={showConditionForm}
							newConditionName={newConditionName}
							newConditionDescription={newConditionDescription}
							onChartViewModeChange={setChartViewMode}
							onToggleConditionForm={() =>
								setShowConditionForm(!showConditionForm)
							}
							onConditionNameChange={setNewConditionName}
							onConditionDescriptionChange={
								setNewConditionDescription
							}
							onStartCondition={handleStartCondition}
							onStopCondition={handleStopCondition}
						/>
					)}

					{/* Conditions Management */}
					<ConditionsManagement
						deviceId={deviceId}
						faultId={faultId}
						offlineConditions={offlineConditions}
						showOfflineConditionForm={showOfflineConditionForm}
						newOfflineConditionName={newOfflineConditionName}
						newOfflineConditionDescription={
							newOfflineConditionDescription
						}
						offlineConditionActionLoading={
							offlineConditionActionLoading
						}
						onToggleForm={() =>
							setShowOfflineConditionForm(
								!showOfflineConditionForm
							)
						}
						onNameChange={setNewOfflineConditionName}
						onDescriptionChange={setNewOfflineConditionDescription}
						onCreateCondition={handleCreateOfflineCondition}
						onStartCondition={handleStartOfflineCondition}
						onStopCondition={handleStopOfflineCondition}
						onFinishCondition={handleFinishOfflineCondition}
						onEditCondition={handleEditCondition}
						onDeleteCondition={handleDeleteOfflineCondition}
						copyToClipboard={copyToClipboard}
					/>
					{/* Static Fault Info and Analytics */}
					{!liveFault && fault.status === "Inactive" && (
						<div className='bg-white p-6 rounded-lg border border-gray-200'>
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
						</div>
					)}
				</div>
			</PageLayout>
		</DeviceProtectedRoute>
	);
}
