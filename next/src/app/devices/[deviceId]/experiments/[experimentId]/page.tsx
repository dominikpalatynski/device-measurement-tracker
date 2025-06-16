"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PageLayout from "@/components/PageLayout";
import {
	deviceApi,
	experimentApi,
	onlineModeApi,
	phenomenaApi,
	getAllMeasurements,
	Device,
	Experiment,
	LiveExperiment,
	ActivePhenomenon,
	Phenomenon,
	Measurement,
} from "@/services/api";

export default function ExperimentDetailPage() {
	const params = useParams();
	const router = useRouter();
	const deviceId = params.deviceId as string;
	const experimentId = params.experimentId as string;

	const [device, setDevice] = useState<Device | null>(null);
	const [experiment, setExperiment] = useState<Experiment | null>(null);
	const [liveExperiment, setLiveExperiment] = useState<LiveExperiment | null>(
		null
	);
	const [phenomena, setPhenomena] = useState<ActivePhenomenon[]>([]);
	const [offlinePhenomena, setOfflinePhenomena] = useState<Phenomenon[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Live data chart functionality
	const [liveData, setLiveData] = useState<Measurement[]>([]);
	const [autoRefresh, setAutoRefresh] = useState(false);
	const [chartViewMode, setChartViewMode] = useState<
		"chart" | "table" | "stats"
	>("chart");
	const [dataRefreshInterval, setDataRefreshInterval] =
		useState<NodeJS.Timeout | null>(null);

	// Live phenomenon creation
	const [newPhenomenonName, setNewPhenomenonName] = useState("");
	const [newPhenomenonDescription, setNewPhenomenonDescription] =
		useState("");
	const [showPhenomenonForm, setShowPhenomenonForm] = useState(false);

	// Offline phenomenon creation
	const [showOfflinePhenomenonForm, setShowOfflinePhenomenonForm] =
		useState(false);
	const [newOfflinePhenomenonName, setNewOfflinePhenomenonName] =
		useState("");
	const [
		newOfflinePhenomenonDescription,
		setNewOfflinePhenomenonDescription,
	] = useState("");

	// Experiment management actions
	const [experimentActionLoading, setExperimentActionLoading] = useState<
		string | null
	>(null);

	// Device management
	const [deviceActionLoading, setDeviceActionLoading] = useState<
		string | null
	>(null);

	// Phenomenon management for offline mode
	const [offlinePhenomenonActionLoading, setOfflinePhenomenonActionLoading] =
		useState<string | null>(null);

	// All phenomena for editing/management
	const [allPhenomena, setAllPhenomena] = useState<Phenomenon[]>([]);
	const [editingPhenomenon, setEditingPhenomenon] =
		useState<Phenomenon | null>(null);
	const [editPhenomenonForm, setEditPhenomenonForm] = useState({
		name: "",
		description: "",
		status: "Pending" as "Pending" | "Active" | "Stopped" | "Finished",
	});

	useEffect(() => {
		if (deviceId && experimentId) {
			loadExperimentData();
		}
	}, [deviceId, experimentId]);

	// Auto-refresh effect for live data
	useEffect(() => {
		if (autoRefresh && liveExperiment && device) {
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
	}, [autoRefresh, liveExperiment, device]);

	// Auto-enable live data monitoring when live experiment starts
	useEffect(() => {
		if (liveExperiment && device && !autoRefresh) {
			setAutoRefresh(true); // Automatically enable auto-refresh for live experiments
			loadLiveData(); // Load initial data immediately
		}
	}, [liveExperiment, device]);

	// Clean up interval on unmount
	useEffect(() => {
		return () => {
			if (dataRefreshInterval) {
				clearInterval(dataRefreshInterval);
			}
		};
	}, []);

	const loadLiveData = async () => {
		if (!device) return;

		try {
			// Load recent measurements for live data visualization
			const measurementRes = await getAllMeasurements(
				device.device_id,
				50
			);
			if (measurementRes.success) {
				setLiveData(measurementRes.data);
			}
		} catch (error) {
			console.error("Error loading live data:", error);
		}
	};

	const loadExperimentData = async () => {
		try {
			setLoading(true);
			setError(null);
			console.log("Experiment status:");

			// Load device and experiment data
			const [deviceData, experimentsData] = await Promise.all([
				deviceApi.getDevice(deviceId),
				experimentApi.getExperiments(),
			]);

			if (!deviceData) {
				setError("Device not found");
				return;
			}
			setDevice(deviceData);

			const experimentData = experimentsData.find(
				(exp) => exp.experiment_id === experimentId
			);
			if (!experimentData) {
				setError("Experiment not found");
				return;
			}
			setExperiment(experimentData); // Check if this is a live experiment
			if (experimentData.status === "Running") {
				const liveExp = await onlineModeApi.getLiveExperiment(deviceId);
				if (liveExp && liveExp.experiment_id === experimentId) {
					setLiveExperiment(liveExp);
				}
			}

			// Load offline phenomena for this experiment
			const offlinePhenomenaData =
				await phenomenaApi.getPhenomenaForExperiment(experimentId);
			setOfflinePhenomena(offlinePhenomenaData);

			// Load all phenomena for comprehensive management
			const allPhenomenaData = await phenomenaApi.getPhenomena();
			setAllPhenomena(allPhenomenaData);
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to load experiment data"
			);
		} finally {
			setLoading(false);
		}
	};

	const handleStartPhenomenon = async () => {
		if (!newPhenomenonName.trim() || !liveExperiment) return;

		try {
			const phenomenon = await onlineModeApi.startPhenomenon(deviceId, {
				name: newPhenomenonName.trim(),
				description: newPhenomenonDescription.trim() || undefined,
			});

			setPhenomena((prev) => [...prev, phenomenon]);
			setNewPhenomenonName("");
			setNewPhenomenonDescription("");
			setShowPhenomenonForm(false);

			// Refresh live experiment data
			const updatedLiveExp = await onlineModeApi.getLiveExperiment(
				deviceId
			);
			if (updatedLiveExp) {
				setLiveExperiment(updatedLiveExp);
			}
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: "Failed to start phenomenon"
			);
		}
	};

	const handleStopPhenomenon = async (phenomenonId: string) => {
		try {
			await onlineModeApi.stopPhenomenon(deviceId, phenomenonId);

			// Remove from local state
			setPhenomena((prev) =>
				prev.filter((p) => p.phenomenon_id !== phenomenonId)
			);

			// Refresh live experiment data
			const updatedLiveExp = await onlineModeApi.getLiveExperiment(
				deviceId
			);
			if (updatedLiveExp) {
				setLiveExperiment(updatedLiveExp);
			}
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: "Failed to stop phenomenon"
			);
		}
	};

	const handleStopExperiment = async () => {
		if (!liveExperiment) return;

		try {
			await onlineModeApi.stopLiveExperiment(deviceId);
			router.push(`/devices/${deviceId}`);
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: "Failed to stop experiment"
			);
		}
	};

	const handleCreateOfflinePhenomenon = async () => {
		if (!newOfflinePhenomenonName.trim() || !experiment) return;

		try {
			const phenomenon = await phenomenaApi.createPhenomenon({
				experiment_id: experimentId,
				name: newOfflinePhenomenonName.trim(),
				description:
					newOfflinePhenomenonDescription.trim() || undefined,
			});

			if (phenomenon) {
				setOfflinePhenomena((prev) => [...prev, phenomenon]);
				setNewOfflinePhenomenonName("");
				setNewOfflinePhenomenonDescription("");
				setShowOfflinePhenomenonForm(false);
			}
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: "Failed to create phenomenon"
			);
		}
	};
	const handleDeleteOfflinePhenomenon = async (phenomenonId: string) => {
		if (!confirm("Are you sure you want to delete this phenomenon?"))
			return;

		try {
			setOfflinePhenomenonActionLoading(phenomenonId);
			const success = await phenomenaApi.deletePhenomenon(phenomenonId);
			if (success) {
				setOfflinePhenomena((prev) =>
					prev.filter((p) => p.phenomenon_id !== phenomenonId)
				);
				// Also update allPhenomena
				setAllPhenomena((prev) =>
					prev.filter((p) => p.phenomenon_id !== phenomenonId)
				);
			} else {
				setError("Failed to delete phenomenon");
			}
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: "Failed to delete phenomenon"
			);
		} finally {
			setOfflinePhenomenonActionLoading(null);
		}
	};

	// Experiment management functions
	const handleDeleteExperiment = async () => {
		if (!experiment) return;
		if (
			!confirm(
				`Are you sure you want to delete experiment "${
					experiment.name || experiment.experiment_id
				}"? This action cannot be undone and will delete all associated phenomena.`
			)
		)
			return;

		try {
			setExperimentActionLoading("delete");
			const success = await experimentApi.deleteExperiment(experimentId);
			if (success) {
				router.push(`/devices/${deviceId}`);
			} else {
				setError("Failed to delete experiment");
			}
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: "Failed to delete experiment"
			);
		} finally {
			setExperimentActionLoading(null);
		}
	};
	const handleUpdateExperimentStatus = async (
		newStatus: "Created" | "Running" | "Paused" | "Completed" | "Failed"
	) => {
		if (!experiment) return;

		try {
			setExperimentActionLoading("status");
			const updatedExperiment = await experimentApi.updateExperiment(
				experimentId,
				{
					status: newStatus,
				}
			);
			if (updatedExperiment) {
				setExperiment(updatedExperiment);
			} else {
				setError("Failed to update experiment status");
			}
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: "Failed to update experiment status"
			);
		} finally {
			setExperimentActionLoading(null);
		}
	};

	// Device management functions
	const handleActivateDevice = async () => {
		if (!device) return;

		try {
			setDeviceActionLoading("activate");
			const success = await deviceApi.activateDevice(device.device_id);
			if (success) {
				setDevice({ ...device, status: "Active" });
			} else {
				setError("Failed to activate device");
			}
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: "Failed to activate device"
			);
		} finally {
			setDeviceActionLoading(null);
		}
	};

	const handleDeactivateDevice = async () => {
		if (!device) return;
		if (!confirm("Are you sure you want to deactivate this device?"))
			return;

		try {
			setDeviceActionLoading("deactivate");
			const success = await deviceApi.deactivateDevice(device.device_id);
			if (success) {
				setDevice({ ...device, status: "Not-Active" });
			} else {
				setError("Failed to deactivate device");
			}
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: "Failed to deactivate device"
			);
		} finally {
			setDeviceActionLoading(null);
		}
	};

	// Phenomenon management functions
	const handleStartOfflinePhenomenon = async (phenomenonId: string) => {
		try {
			setOfflinePhenomenonActionLoading(phenomenonId);
			const updatedPhenomenon = await phenomenaApi.startPhenomenon(
				phenomenonId
			);
			if (updatedPhenomenon) {
				setOfflinePhenomena((prev) =>
					prev.map((p) =>
						p.phenomenon_id === phenomenonId ? updatedPhenomenon : p
					)
				);
			} else {
				setError("Failed to start phenomenon");
			}
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: "Failed to start phenomenon"
			);
		} finally {
			setOfflinePhenomenonActionLoading(null);
		}
	};

	const handleStopOfflinePhenomenon = async (phenomenonId: string) => {
		try {
			setOfflinePhenomenonActionLoading(phenomenonId);
			const updatedPhenomenon = await phenomenaApi.stopPhenomenon(
				phenomenonId
			);
			if (updatedPhenomenon) {
				setOfflinePhenomena((prev) =>
					prev.map((p) =>
						p.phenomenon_id === phenomenonId ? updatedPhenomenon : p
					)
				);
			} else {
				setError("Failed to stop phenomenon");
			}
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: "Failed to stop phenomenon"
			);
		} finally {
			setOfflinePhenomenonActionLoading(null);
		}
	};

	const handleFinishOfflinePhenomenon = async (phenomenonId: string) => {
		try {
			setOfflinePhenomenonActionLoading(phenomenonId);
			const updatedPhenomenon = await phenomenaApi.finishPhenomenon(
				phenomenonId
			);
			if (updatedPhenomenon) {
				setOfflinePhenomena((prev) =>
					prev.map((p) =>
						p.phenomenon_id === phenomenonId ? updatedPhenomenon : p
					)
				);
			} else {
				setError("Failed to finish phenomenon");
			}
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: "Failed to finish phenomenon"
			);
		} finally {
			setOfflinePhenomenonActionLoading(null);
		}
	};

	const handleEditPhenomenon = (phenomenon: Phenomenon) => {
		setEditingPhenomenon(phenomenon);
		setEditPhenomenonForm({
			name: phenomenon.name,
			description: phenomenon.description || "",
			status: phenomenon.status as
				| "Pending"
				| "Active"
				| "Stopped"
				| "Finished",
		});
	};

	const handleUpdatePhenomenon = async () => {
		if (!editingPhenomenon) return;

		try {
			setOfflinePhenomenonActionLoading(editingPhenomenon.phenomenon_id);
			const updatedPhenomenon = await phenomenaApi.updatePhenomenon(
				editingPhenomenon.phenomenon_id,
				editPhenomenonForm
			);
			if (updatedPhenomenon) {
				setOfflinePhenomena((prev) =>
					prev.map((p) =>
						p.phenomenon_id === editingPhenomenon.phenomenon_id
							? updatedPhenomenon
							: p
					)
				);
				setEditingPhenomenon(null);
			} else {
				setError("Failed to update phenomenon");
			}
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: "Failed to update phenomenon"
			);
		} finally {
			setOfflinePhenomenonActionLoading(null);
		}
	};

	const copyToClipboard = (text: string, label: string) => {
		navigator.clipboard.writeText(text).then(() => {
			alert(`${label} copied to clipboard!`);
		});
	};

	// Utility to check if any phenomenon is active
	const anyPhenomenonActive =
		phenomena.some((p) => p.status === "Active") ||
		offlinePhenomena.some((p) => p.status === "Active");

	if (loading) {
		return (
			<div className='flex items-center justify-center min-h-screen'>
				<div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600'></div>
			</div>
		);
	}

	if (error || !device || !experiment) {
		return (
			<PageLayout
				title='Experiment Details'
				breadcrumbs={[
					{ label: "Home", href: "/" },
					{ label: "Devices", href: "/devices" },
					{
						label: device?.device_name || "Device",
						href: `/devices/${deviceId}`,
					},
					{
						label: "Experiment",
						href: `/devices/${deviceId}/experiments/${experimentId}`,
					},
				]}
			>
				<div className='bg-red-50 border border-red-200 rounded-lg p-6'>
					<h2 className='text-lg font-medium text-red-800 mb-2'>
						Error
					</h2>
					<p className='text-red-700'>
						{error || "Experiment not found"}
					</p>
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
			title={experiment.name || experiment.experiment_id}
			breadcrumbs={[
				{ label: "Home", href: "/" },
				{ label: "Devices", href: "/devices" },
				{ label: device.device_name, href: `/devices/${deviceId}` },
				{
					label: experiment.name || experiment.experiment_id,
					href: `/devices/${deviceId}/experiments/${experimentId}`,
				},
			]}
		>
			{/* Edit Phenomenon Modal */}
			{editingPhenomenon && (
				<div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
					<div className='bg-white rounded-lg p-6 w-full max-w-md'>
						<h3 className='text-lg font-medium text-gray-900 mb-4'>
							Edit Phenomenon
						</h3>
						<div className='space-y-4'>
							<div>
								<label className='block text-sm font-medium text-gray-700 mb-1'>
									Name *
								</label>
								<input
									type='text'
									value={editPhenomenonForm.name}
									onChange={(e) =>
										setEditPhenomenonForm((prev) => ({
											...prev,
											name: e.target.value,
										}))
									}
									className='w-full px-3 py-2 border border-gray-300 rounded-md'
									placeholder='Phenomenon name'
								/>
							</div>
							<div>
								<label className='block text-sm font-medium text-gray-700 mb-1'>
									Description
								</label>
								<textarea
									value={editPhenomenonForm.description}
									onChange={(e) =>
										setEditPhenomenonForm((prev) => ({
											...prev,
											description: e.target.value,
										}))
									}
									className='w-full px-3 py-2 border border-gray-300 rounded-md'
									rows={3}
									placeholder='Describe the experimental condition...'
								/>
							</div>
							<div>
								<label className='block text-sm font-medium text-gray-700 mb-1'>
									Status
								</label>
								<select
									value={editPhenomenonForm.status}
									onChange={(e) =>
										setEditPhenomenonForm((prev) => ({
											...prev,
											status: e.target.value as
												| "Pending"
												| "Active"
												| "Stopped"
												| "Finished",
										}))
									}
									className='w-full px-3 py-2 border border-gray-300 rounded-md'
								>
									<option value='Pending'>Pending</option>
									<option value='Active'>Active</option>
									<option value='Stopped'>Stopped</option>
									<option value='Finished'>Finished</option>
								</select>
							</div>
						</div>
						<div className='flex space-x-3 mt-6'>
							<button
								onClick={handleUpdatePhenomenon}
								disabled={
									!editPhenomenonForm.name.trim() ||
									offlinePhenomenonActionLoading ===
										editingPhenomenon.phenomenon_id
								}
								className='flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400'
							>
								{offlinePhenomenonActionLoading ===
								editingPhenomenon.phenomenon_id
									? "Updating..."
									: "Update"}
							</button>
							<button
								onClick={() => {
									setEditingPhenomenon(null);
									setEditPhenomenonForm({
										name: "",
										description: "",
										status: "Pending",
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
							</span>
							<div className='flex flex-wrap gap-2'>
								{experiment.mode === "Offline" && (
									<>
										<button
											onClick={() =>
												setShowOfflinePhenomenonForm(
													!showOfflinePhenomenonForm
												)
											}
											className='px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-400'
											disabled={anyPhenomenonActive}
											title={anyPhenomenonActive ? 'Cannot add new phenomenon while another is Active' : ''}
										>
											➕ Add Phenomenon
										</button>
										{offlinePhenomena.length > 0 && (
											<button
												onClick={() => {
													const exportData = {
														experiment: {
															id: experiment.experiment_id,
															name: experiment.name,
															device: device.device_name,
															mode: experiment.mode,
														},
														phenomena:
															offlinePhenomena.map(
																(p) => ({
																	id: p.phenomenon_id,
																	name: p.name,
																	status: p.status,
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
														"Experiment configuration copied to clipboard!"
													);
												}}
												className='px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700'
											>
												📋 Export Config
											</button>
										)}
									</>
								)}
								{liveExperiment && (
									<button
										onClick={() =>
											setShowPhenomenonForm(
												!showPhenomenonForm
											)
										}
										className='px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700'
									>
										🔬 Add Live Phenomenon
									</button>
								)}
								<button
									onClick={() =>
										copyToClipboard(
											experiment.experiment_id,
											"Experiment ID"
										)
									}
									className='px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700'
								>
									📋 Copy Exp ID
								</button>

							</div>
						</div>

						<div className='flex items-center space-x-2'>
							<span className='text-sm text-blue-700'>
								{experiment.mode} Mode • {experiment.status}
							</span>
							{liveExperiment && (
								<span className='px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium'>
									🔴 LIVE
								</span>
							)}
						</div>
					</div>
				</div>
				{/* Experiment Header */}
				<div className='bg-white p-6 rounded-lg border border-gray-200'>
					<div className='flex justify-between items-start mb-4'>
						<div className='flex-1'>
							<div className='flex items-center space-x-4 mb-2'>
								<h2 className='text-2xl font-bold text-gray-900'>
									{experiment.name ||
										`Experiment ${experiment.experiment_id}`}
								</h2>
								<div className='flex space-x-2'>
									<button
										onClick={() =>
											copyToClipboard(
												experiment.experiment_id,
												"Experiment ID"
											)
										}
										className='px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200'
										title='Copy experiment ID'
									>
										📋 Copy ID
									</button>
									<span
										className={`px-2 py-1 rounded-full text-xs ${
											experiment.status === "Running"
												? "bg-green-100 text-green-800"
												: experiment.status ===
												  "Completed"
												? "bg-blue-100 text-blue-800"
												: experiment.status === "Failed"
												? "bg-red-100 text-red-800"
												: "bg-gray-100 text-gray-800"
										}`}
									>
										{experiment.status}
									</span>
								</div>
							</div>
							<p className='text-gray-600 mb-4'>
								{experiment.description ||
									"No description provided"}
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
									{new Date(
										experiment.start_date
									).toLocaleString()}
								</div>
								{experiment.end_date && (
									<div>
										<span className='font-medium'>
											Ended:
										</span>{" "}
										{new Date(
											experiment.end_date
										).toLocaleString()}
									</div>
								)}
								<div>
									<span className='font-medium'>Mode:</span>
									<span
										className={`ml-1 px-2 py-0.5 rounded text-xs ${
											experiment.mode === "Online"
												? "bg-green-100 text-green-800"
												: "bg-orange-100 text-orange-800"
										}`}
									>
										{experiment.mode || "Unknown"}
									</span>
								</div>
								<div>
									<span className='font-medium'>
										Phenomena:
									</span>
									<span className='ml-1 font-mono'>
										{offlinePhenomena.length}
									</span>
									{liveExperiment && (
										<span className='ml-1 text-green-600'>
											({liveExperiment.phenomena_count}{" "}
											live)
										</span>
									)}
								</div>
								{liveExperiment && (
									<div>
										<span className='font-medium'>
											Session Duration:
										</span>{" "}
										<span className='font-mono'>
											{Math.floor(
												liveExperiment.duration / 60
											)}
											m {liveExperiment.duration % 60}s
										</span>
									</div>
								)}
								<div>
									<span className='font-medium'>
										Created:
									</span>{" "}
									{experiment.created_at
										? new Date(
												experiment.created_at
										  ).toLocaleString()
										: "N/A"}
								</div>
								{experiment.updated_at &&
									experiment.updated_at !==
										experiment.created_at && (
										<div>
											<span className='font-medium'>
												Updated:
											</span>{" "}
											{new Date(
												experiment.updated_at
											).toLocaleString()}
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
												: device.status === "Not-Active"
												? "bg-yellow-100 text-yellow-800"
												: "bg-gray-100 text-gray-800"
										}`}
									>
										{device.status === "Active"
											? "Active"
											: device.status === "Not-Active"
											? "Not Active"
											: device.status ===
											  "Pending-Registration"
											? "Pending Registration"
											: device.status}
									</span>
								</div>
							</div>
						</div>

						{/* Experiment Actions */}
						<div className='flex flex-col space-y-2 ml-6'>
							{liveExperiment ? (
								<>
									<div className='text-right text-sm text-gray-500'>
										<div className='text-green-600 font-medium'>
											Live Session Active
										</div>
									</div>
									<button
										onClick={handleStopExperiment}
										className='px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700'
									>
										Stop Experiment
									</button>
								</>
							) : (
								<>
									{/* Experiment Status Controls */}
									<div className='flex space-x-1'>
										{experiment.status !== "Completed" &&
											experiment.status !== "Failed" && (
												<>
													{experiment.status !==
														"Running" && (
														<button
															onClick={() =>
																handleUpdateExperimentStatus(
																	"Running"
																)
															}
															disabled={
																experimentActionLoading ===
																"status"
															}
															className='px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:bg-gray-400'
														>
															{experimentActionLoading ===
															"status"
																? "..."
																: "▶️"}
														</button>
													)}
													{experiment.status ===
														"Running" && (
														<button
															onClick={() =>
																handleUpdateExperimentStatus(
																	"Paused"
																)
															}
															disabled={
																experimentActionLoading ===
																"status"
															}
															className='px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 disabled:bg-gray-400'
														>
															{experimentActionLoading ===
															"status"
																? "..."
																: "⏸️"}
														</button>
													)}
													{experiment.status ===
														"Paused" && (
														<button
															onClick={() =>
																handleUpdateExperimentStatus(
																	"Running"
																)
															}
															disabled={
																experimentActionLoading ===
																"status"
															}
															className='px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:bg-gray-400'
														>
															{experimentActionLoading ===
															"status"
																? "..."
																: "▶️"}
														</button>
													)}
													<button
														onClick={() =>
															handleUpdateExperimentStatus(
																"Completed"
															)
														}
														disabled={
															experimentActionLoading ===
															"status"
														}
														className='px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-400'
													>
														{experimentActionLoading ===
														"status"
															? "..."
															: "✅"}
													</button>
												</>
											)}
									</div>{" "}
									{/* Navigation Actions */}
									<div className='flex flex-col space-y-1'>

										<Link
											href={`/devices/${deviceId}`}
											className='px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 text-center'
										>
											🔧 Device View
										</Link>

										{experiment.mode === "Offline" && (
											<Link
												href={`/devices/${deviceId}/experiments/create`}
												className='px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 text-center'
											>
												➕ Create New
											</Link>
										)}
									</div>
									{/* Danger Zone */}
									<div className='border-t pt-2'>
										<button
											onClick={handleDeleteExperiment}
											disabled={
												experimentActionLoading ===
												"delete"
											}
											className='px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 disabled:bg-gray-400 w-full'
										>
											{experimentActionLoading ===
											"delete"
												? "Deleting..."
												: "🗑️ Delete"}
										</button>
									</div>
								</>
							)}
						</div>
					</div>
					{/* Device Management Section */}
					<div className='border-t pt-4 mt-4'>
						<div className='flex justify-between items-center'>
							<div className='flex items-center space-x-4'>
								<h3 className='text-lg font-medium text-gray-900'>
									Device Control
								</h3>
								<div className='flex items-center space-x-2'>
									<span className='text-sm text-gray-500'>
										Status:
									</span>
									<span
										className={`px-2 py-1 rounded-full text-xs ${
											device.status === "Active"
												? "bg-green-100 text-green-800"
												: device.status === "Not-Active"
												? "bg-yellow-100 text-yellow-800"
												: "bg-gray-100 text-gray-800"
										}`}
									>
										{device.status === "Active"
											? "Active"
											: device.status === "Not-Active"
											? "Not Active"
											: device.status ===
											  "Pending-Registration"
											? "Pending Registration"
											: device.status}
									</span>
								</div>
							</div>{" "}
							<div className='flex space-x-2'>
								{device.status === "Active" ? (
									<button
										onClick={handleDeactivateDevice}
										disabled={
											deviceActionLoading === "deactivate"
										}
										className='px-3 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:bg-gray-400 text-sm'
									>
										{deviceActionLoading === "deactivate"
											? "..."
											: "⏸️ Deactivate"}
									</button>
								) : (
									<button
										onClick={handleActivateDevice}
										disabled={
											deviceActionLoading === "activate"
										}
										className='px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 text-sm'
									>
										{deviceActionLoading === "activate"
											? "..."
											: "▶️ Activate"}
									</button>
								)}

								{/* Additional Device Actions */}
								<button
									onClick={() =>
										copyToClipboard(
											device.device_id,
											"Device ID"
										)
									}
									className='px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm'
									title='Copy device ID'
								>
									📋 Copy ID
								</button>
								<Link
									href={`/devices/${deviceId}`}
									className='px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm'
								>
									🔧 Manage
								</Link>
							</div>
						</div>
					</div>{" "}
				</div>
				{/* Live Experiment Overview */}
				{liveExperiment && (
					<div className='bg-gradient-to-r from-blue-50 via-purple-50 to-green-50 border-2 border-blue-200 rounded-lg p-6'>
						<div className='flex items-center justify-between mb-6'>
							<div className='flex items-center space-x-3'>
								<div className='flex items-center space-x-2'>
									<div className='w-4 h-4 bg-red-500 rounded-full animate-pulse'></div>
									<h3 className='text-2xl font-bold text-gray-900'>
										🔴 LIVE EXPERIMENT
									</h3>
								</div>
								<span className='px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium'>
									STREAMING
								</span>
							</div>
							<button
								onClick={handleStopExperiment}
								className='px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium'
							>
								🛑 Stop Experiment
							</button>
						</div>

						{/* Live Stats Grid */}
						<div className='grid grid-cols-1 md:grid-cols-4 gap-4 mb-6'>
							<div className='bg-white border border-blue-200 rounded-lg p-4'>
								<div className='flex items-center space-x-3'>
									<div className='w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center'>
										<span className='text-2xl'>⏱️</span>
									</div>
									<div>
										<div className='text-blue-600 text-2xl font-bold'>
											{Math.floor(
												liveExperiment.duration / 60
											)}
											m {liveExperiment.duration % 60}s
										</div>
										<div className='text-blue-800 text-sm font-medium'>
											Session Duration
										</div>
									</div>
								</div>
							</div>
							<div className='bg-white border border-green-200 rounded-lg p-4'>
								<div className='flex items-center space-x-3'>
									<div className='w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center'>
										<span className='text-2xl'>🔬</span>
									</div>
									<div>
										<div className='text-green-600 text-2xl font-bold'>
											{liveExperiment.phenomena_count ||
												0}
										</div>
										<div className='text-green-800 text-sm font-medium'>
											Total Phenomena
										</div>
									</div>
								</div>
							</div>
							<div className='bg-white border border-purple-200 rounded-lg p-4'>
								<div className='flex items-center space-x-3'>
									<div className='w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center'>
										<span className='text-2xl'>📊</span>
									</div>
									<div>
										<div className='text-purple-600 text-2xl font-bold'>
											{liveData.length}
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
											{liveExperiment.current_phenomenon
												? "Recording Data"
												: "Ready for Phenomena"}
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
											{new Date(
												experiment.start_date
											).toLocaleString()}
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
				)}
				{/* Live Phenomena Control */}
				{liveExperiment && (
					<div className='bg-white p-6 rounded-lg border border-gray-200'>
						<div className='flex justify-between items-center mb-4'>
							<h3 className='text-lg font-medium text-gray-900'>
								🔬 Live Phenomena Control
							</h3>
							<button
								onClick={() => setShowPhenomenonForm(!showPhenomenonForm)}
								className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
								disabled={anyPhenomenonActive}
								title={anyPhenomenonActive ? 'Cannot add new phenomenon while another is Active' : ''}
							>
								{showPhenomenonForm ? "Cancel" : "Add Phenomenon"}
							</button>
						</div>{" "}
						{/* Current Active Phenomenon with Live Data */}
						{liveExperiment.current_phenomenon && (
							<div className='bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200 rounded-lg p-6 mb-6'>
								{/* Phenomenon Header */}
								<div className='flex justify-between items-start mb-4'>
									<div className='flex-1'>
										<div className='flex items-center space-x-3 mb-2'>
											<div className='flex items-center space-x-2'>
												<div className='w-3 h-3 bg-green-500 rounded-full animate-pulse'></div>
												<h4 className='text-xl font-semibold text-green-800'>
													{
														liveExperiment
															.current_phenomenon
															.name
													}
												</h4>
											</div>
											<span className='px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium'>
												LIVE
											</span>
										</div>
										{liveExperiment.current_phenomenon
											.description && (
											<p className='text-sm text-green-700 mb-2'>
												{
													liveExperiment
														.current_phenomenon
														.description
												}
											</p>
										)}
										<div className='flex items-center space-x-4 text-sm text-green-600'>
											<div>
												<span className='font-medium'>
													Duration:
												</span>{" "}
												{Math.floor(
													liveExperiment
														.current_phenomenon
														.duration / 60
												)}
												m{" "}
												{liveExperiment
													.current_phenomenon
													.duration % 60}
												s
											</div>
											<div>
												<span className='font-medium'>
													Data Points:
												</span>{" "}
												<span className='font-mono'>
													{liveData.length}
												</span>
											</div>
											<div>
												<span className='font-medium'>
													ID:
												</span>{" "}
												<code className='bg-green-100 px-1 py-0.5 rounded text-xs'>
													{
														liveExperiment
															.current_phenomenon
															.phenomenon_id
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
											<button
												onClick={() => {
													navigator.clipboard.writeText(
														liveExperiment.current_phenomenon!
															.phenomenon_id
													);
													alert(
														"Active phenomenon ID copied to clipboard!"
													);
												}}
												className='px-3 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 text-sm'
												title='Copy active phenomenon ID'
											>
												📋 Copy ID
											</button>
											<Link
												href={`/devices/${deviceId}/experiments/${experimentId}/phenomena/${
													liveExperiment.current_phenomenon!
														.phenomenon_id
												}`}
												className='px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm'
												title='View detailed data analysis'
											>
												👁️ View Detail
											</Link>
											<button
												onClick={() =>
													handleStopPhenomenon(
														liveExperiment.current_phenomenon!
															.phenomenon_id
													)
												}
												className='px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm'
											>
												⏹️ Stop
											</button>
										</div>
									</div>
								</div>

								{/* Live Data Visualization */}
								<div className='bg-white rounded-lg border border-green-200 p-4'>
									<div className='flex justify-between items-center mb-4'>
										<h5 className='text-lg font-medium text-gray-900'>
											📊 Live Data Stream
										</h5>
										<div className='flex space-x-2'>
											{["chart", "table", "stats"].map(
												(mode) => (
													<button
														key={mode}
														onClick={() =>
															setChartViewMode(
																mode as typeof chartViewMode
															)
														}
														className={`px-3 py-1 rounded text-sm ${
															chartViewMode ===
															mode
																? "bg-green-600 text-white"
																: "bg-gray-200 text-gray-700 hover:bg-gray-300"
														}`}
													>
														{mode === "chart"
															? "📈 Chart"
															: mode === "table"
															? "📋 Table"
															: "📊 Stats"}
													</button>
												)
											)}
										</div>
									</div>

									{/* Chart View */}
									{chartViewMode === "chart" && (
										<div className='bg-gray-50 border border-gray-200 rounded-lg p-6'>
											<div className='text-center'>
												{liveData.length > 0 ? (
													<>
														<div className='text-4xl mb-4'>
															📈
														</div>
														<h6 className='text-lg font-medium mb-2 text-gray-800'>
															Real-time Sensor
															Data
														</h6>
														<p className='text-gray-600 mb-4'>
															Temperature,
															humidity, pressure,
															and battery over
															time
														</p>
														<div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-4'>
															{liveData.length >
																0 && (
																<>
																	<div className='bg-blue-50 border border-blue-200 rounded-lg p-3'>
																		<div className='text-blue-600 text-lg font-bold'>
																			{liveData[0].temperature.toFixed(
																				1
																			)}
																			°C
																		</div>
																		<div className='text-blue-800 text-xs font-medium'>
																			Temperature
																		</div>
																	</div>
																	<div className='bg-green-50 border border-green-200 rounded-lg p-3'>
																		<div className='text-green-600 text-lg font-bold'>
																			{liveData[0].humidity.toFixed(
																				1
																			)}
																			%
																		</div>
																		<div className='text-green-800 text-xs font-medium'>
																			Humidity
																		</div>
																	</div>
																	<div className='bg-purple-50 border border-purple-200 rounded-lg p-3'>
																		<div className='text-purple-600 text-lg font-bold'>
																			{liveData[0].pressure.toFixed(
																				1
																			)}{" "}
																			hPa
																		</div>
																		<div className='text-purple-800 text-xs font-medium'>
																			Pressure
																		</div>
																	</div>
																	<div className='bg-orange-50 border border-orange-200 rounded-lg p-3'>
																		<div className='text-orange-600 text-lg font-bold'>
																			{liveData[0].battery_level.toFixed(
																				1
																			)}
																			%
																		</div>
																		<div className='text-orange-800 text-xs font-medium'>
																			Battery
																		</div>
																	</div>
																</>
															)}
														</div>
														<p className='text-sm text-gray-500'>
															Showing{" "}
															{liveData.length}{" "}
															recent data points
															{autoRefresh && (
																<span className='text-green-600 ml-2'>
																	🔄
																	Refreshing
																	every 3
																	seconds
																</span>
															)}
														</p>
													</>
												) : (
													<>
														<div className='text-4xl mb-4 text-gray-400'>
															�
														</div>
														<h6 className='text-lg font-medium mb-2 text-gray-600'>
															Waiting for data...
														</h6>
														<p className='text-gray-500'>
															Live data will
															appear here once
															measurements start
															streaming
														</p>
														{autoRefresh && (
															<div className='mt-4 text-green-600'>
																🔄
																Auto-refreshing
																every 3 seconds
															</div>
														)}
													</>
												)}
											</div>
										</div>
									)}

									{/* Table View */}
									{chartViewMode === "table" && (
										<div className='overflow-x-auto'>
											{liveData.length > 0 ? (
												<table className='min-w-full divide-y divide-gray-200'>
													<thead className='bg-gray-50'>
														<tr>
															<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
																Timestamp
															</th>
															<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
																Temperature (°C)
															</th>
															<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
																Humidity (%)
															</th>
															<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
																Pressure (hPa)
															</th>
															<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
																Battery (%)
															</th>
														</tr>
													</thead>
													<tbody className='bg-white divide-y divide-gray-200'>
														{liveData
															.slice(0, 10)
															.map(
																(
																	measurement
																) => (
																	<tr
																		key={
																			measurement.id
																		}
																		className='hover:bg-gray-50'
																	>
																		<td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono'>
																			{
																				measurement.measured_at
																			}
																		</td>
																		<td className='px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium'>
																			{measurement.temperature.toFixed(
																				2
																			)}
																		</td>
																		<td className='px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium'>
																			{measurement.humidity.toFixed(
																				2
																			)}
																		</td>
																		<td className='px-6 py-4 whitespace-nowrap text-sm text-purple-600 font-medium'>
																			{measurement.pressure.toFixed(
																				2
																			)}
																		</td>
																		<td className='px-6 py-4 whitespace-nowrap text-sm text-orange-600 font-medium'>
																			{measurement.battery_level.toFixed(
																				2
																			)}
																		</td>
																	</tr>
																)
															)}
													</tbody>
												</table>
											) : (
												<div className='text-center py-8 text-gray-500'>
													<div className='text-4xl mb-4'>
														📊
													</div>
													<p>
														No live data available
														yet
													</p>
													<p className='text-sm mt-2'>
														Data will appear as
														measurements are
														captured
													</p>
												</div>
											)}
										</div>
									)}

									{/* Stats View */}
									{chartViewMode === "stats" && (
										<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
											{liveData.length > 0 ? (
												<>
													<div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
														<h6 className='text-blue-800 font-medium mb-2'>
															🌡️ Temperature
														</h6>
														<div className='space-y-1 text-sm'>
															<div className='flex justify-between'>
																<span>
																	Current:
																</span>
																<span className='font-mono'>
																	{liveData[0].temperature.toFixed(
																		2
																	)}
																	°C
																</span>
															</div>
															<div className='flex justify-between'>
																<span>
																	Average:
																</span>
																<span className='font-mono'>
																	{(
																		liveData.reduce(
																			(
																				sum,
																				d
																			) =>
																				sum +
																				d.temperature,
																			0
																		) /
																		liveData.length
																	).toFixed(
																		2
																	)}
																	°C
																</span>
															</div>
															<div className='flex justify-between'>
																<span>
																	Min:
																</span>
																<span className='font-mono'>
																	{Math.min(
																		...liveData.map(
																			(
																				d
																			) =>
																				d.temperature
																		)
																	).toFixed(
																		2
																	)}
																	°C
																</span>
															</div>
															<div className='flex justify-between'>
																<span>
																	Max:
																</span>
																<span className='font-mono'>
																	{Math.max(
																		...liveData.map(
																			(
																				d
																			) =>
																				d.temperature
																		)
																	).toFixed(
																		2
																	)}
																	°C
																</span>
															</div>
														</div>
													</div>
													<div className='bg-green-50 border border-green-200 rounded-lg p-4'>
														<h6 className='text-green-800 font-medium mb-2'>
															💧 Humidity
														</h6>
														<div className='space-y-1 text-sm'>
															<div className='flex justify-between'>
																<span>
																	Current:
																</span>
																<span className='font-mono'>
																	{liveData[0].humidity.toFixed(
																		2
																	)}
																	%
																</span>
															</div>
															<div className='flex justify-between'>
																<span>
																	Average:
																</span>
																<span className='font-mono'>
																	{(
																		liveData.reduce(
																			(
																				sum,
																				d
																			) =>
																				sum +
																				d.humidity,
																			0
																		) /
																		liveData.length
																	).toFixed(
																		2
																	)}
																	%
																</span>
															</div>
															<div className='flex justify-between'>
																<span>
																	Min:
																</span>
																<span className='font-mono'>
																	{Math.min(
																		...liveData.map(
																			(
																				d
																			) =>
																				d.humidity
																		)
																	).toFixed(
																		2
																	)}
																	%
																</span>
															</div>
															<div className='flex justify-between'>
																<span>
																	Max:
																</span>
																<span className='font-mono'>
																	{Math.max(
																		...liveData.map(
																			(
																				d
																			) =>
																				d.humidity
																		)
																	).toFixed(
																		2
																	)}
																	%
																</span>
															</div>
														</div>
													</div>
													<div className='bg-purple-50 border border-purple-200 rounded-lg p-4'>
														<h6 className='text-purple-800 font-medium mb-2'>
															🔲 Pressure
														</h6>
														<div className='space-y-1 text-sm'>
															<div className='flex justify-between'>
																<span>
																	Current:
																</span>
																<span className='font-mono'>
																	{liveData[0].pressure.toFixed(
																		2
																	)}{" "}
																	hPa
																</span>
															</div>
															<div className='flex justify-between'>
																<span>
																	Average:
																</span>
																<span className='font-mono'>
																	{(
																		liveData.reduce(
																			(
																				sum,
																				d
																			) =>
																				sum +
																				d.pressure,
																			0
																		) /
																		liveData.length
																	).toFixed(
																		2
																	)}{" "}
																	hPa
																</span>
															</div>
															<div className='flex justify-between'>
																<span>
																	Min:
																</span>
																<span className='font-mono'>
																	{Math.min(
																		...liveData.map(
																			(
																				d
																			) =>
																				d.pressure
																		)
																	).toFixed(
																		2
																	)}{" "}
																	hPa
																</span>
															</div>
															<div className='flex justify-between'>
																<span>
																	Max:
																</span>
																<span className='font-mono'>
																	{Math.max(
																		...liveData.map(
																			(
																				d
																			) =>
																				d.pressure
																		)
																	).toFixed(
																		2
																	)}{" "}
																	hPa
																</span>
															</div>
														</div>
													</div>
													<div className='bg-orange-50 border border-orange-200 rounded-lg p-4'>
														<h6 className='text-orange-800 font-medium mb-2'>
															🔋 Battery
														</h6>
														<div className='space-y-1 text-sm'>
															<div className='flex justify-between'>
																<span>
																	Current:
																</span>
																<span className='font-mono'>
																	{liveData[0].battery_level.toFixed(
																		2
																	)}
																	%
																</span>
															</div>
															<div className='flex justify-between'>
																<span>
																	Average:
																</span>
																<span className='font-mono'>
																	{(
																		liveData.reduce(
																			(
																				sum,
																				d
																			) =>
																				sum +
																				d.battery_level,
																			0
																		) /
																		liveData.length
																	).toFixed(
																		2
																	)}
																	%
																</span>
															</div>
															<div className='flex justify-between'>
																<span>
																	Min:
																</span>
																<span className='font-mono'>
																	{Math.min(
																		...liveData.map(
																			(
																				d
																			) =>
																				d.battery_level
																		)
																	).toFixed(
																		2
																	)}
																	%
																</span>
															</div>
															<div className='flex justify-between'>
																<span>
																	Max:
																</span>
																<span className='font-mono'>
																	{Math.max(
																		...liveData.map(
																			(
																				d
																			) =>
																				d.battery_level
																		)
																	).toFixed(
																		2
																	)}
																	%
																</span>
															</div>
														</div>
													</div>
												</>
											) : (
												<div className='col-span-2 text-center py-8 text-gray-500'>
													<div className='text-4xl mb-4'>
														📊
													</div>
													<p>
														No statistics available
														yet
													</p>
													<p className='text-sm mt-2'>
														Statistics will appear
														once data is captured
													</p>
												</div>
											)}
										</div>
									)}
								</div>
							</div>
						)}
						{/* Add New Phenomenon Form */}
						{showPhenomenonForm && (
							<div className='bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4'>
								<h4 className='font-medium text-gray-900 mb-3'>
									Start New Phenomenon
								</h4>
								<div className='space-y-3'>
									<div>
										<label className='block text-sm font-medium text-gray-700 mb-1'>
											Phenomenon Name *
										</label>
										<input
											type='text'
											value={newPhenomenonName}
											onChange={(e) =>
												setNewPhenomenonName(
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
											value={newPhenomenonDescription}
											onChange={(e) =>
												setNewPhenomenonDescription(
													e.target.value
												)
											}
											className='w-full px-3 py-2 border border-gray-300 rounded-md'
											rows={2}
											placeholder='Describe the experimental condition...'
										/>
									</div>
									<div className='flex space-x-2'>
										<button
											onClick={handleStartPhenomenon}
											disabled={!newPhenomenonName.trim()}
											className='px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300'
										>
											Start Phenomenon
										</button>
										<button
											onClick={() =>
												setShowPhenomenonForm(false)
											}
											className='px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400'
										>
											Cancel
										</button>
									</div>
								</div>
							</div>
						)}
						{/* Phenomena History */}
						<div>
							<h4 className='font-medium text-gray-900 mb-3'>
								Phenomena History
							</h4>
							{liveExperiment.phenomena_count > 0 ? (
								<div className='space-y-2'>
									{phenomena.map((phenomenon, index) => (
										<div
											key={phenomenon.phenomenon_id}
											className='bg-gray-50 border border-gray-200 rounded-lg p-3'
										>
											<div className='flex justify-between items-center'>
												<div>
													<h5 className='font-medium text-gray-900'>
														{phenomenon.name}
													</h5>
													{phenomenon.description && (
														<p className='text-sm text-gray-600'>
															{
																phenomenon.description
															}
														</p>
													)}
													<p className='text-xs text-gray-500'>
														Started:{" "}
														{new Date(
															phenomenon.start_time
														).toLocaleString()}
													</p>
												</div>{" "}
												<div className='flex justify-between items-center'>
													<div>
														<h5 className='font-medium text-gray-900'>
															{phenomenon.name}
														</h5>
														{phenomenon.description && (
															<p className='text-sm text-gray-600'>
																{
																	phenomenon.description
																}
															</p>
														)}
														<p className='text-xs text-gray-500'>
															Started:{" "}
															{new Date(
																phenomenon.start_time
															).toLocaleString()}
														</p>
													</div>
													<div className='flex space-x-2'>
														<button
															onClick={() => {
																navigator.clipboard.writeText(
																	phenomenon.phenomenon_id
																);
																alert(
																	"Phenomenon ID copied to clipboard!"
																);
															}}
															className='px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200'
															title='Copy phenomenon ID'
														>
															📋 Copy ID
														</button>
														<Link
															href={`/devices/${deviceId}/experiments/${experimentId}/phenomena/${phenomenon.phenomenon_id}`}
															className='px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200'
															title='View detailed data and analytics'
														>
															👁️ View Data
														</Link>
													</div>
												</div>
											</div>
										</div>
									))}
								</div>
							) : (
								<div className='text-center py-4 text-gray-500'>
									No phenomena recorded yet. Add one to start
									measuring specific conditions.
								</div>
							)}
						</div>
					</div>
				)}
				{/* Offline Phenomena Management */}
				{experiment.status !== "Running" && (
					<div className='bg-white p-6 rounded-lg border border-gray-200'>
						<div className='flex justify-between items-center mb-4'>
							<h3 className='text-lg font-medium text-gray-900'>
								📦 Live Phenomena Management
							</h3>
							<button
								onClick={() =>
									setShowOfflinePhenomenonForm(
										!showOfflinePhenomenonForm
									)
								}
								className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700'
							>
								{showOfflinePhenomenonForm
									? "Cancel"
									: "Add Phenomenon"}
							</button>
						</div>

						{/* Add New Offline Phenomenon Form */}
						{showOfflinePhenomenonForm && (
							<div className='bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4'>
								<h4 className='font-medium text-blue-900 mb-3'>
									Create New Offline Phenomenon
								</h4>
								<div className='space-y-3'>
									<div>
										<label className='block text-sm font-medium text-gray-700 mb-1'>
											Phenomenon Name *
										</label>
										<input
											type='text'
											value={newOfflinePhenomenonName}
											onChange={(e) =>
												setNewOfflinePhenomenonName(
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
											value={
												newOfflinePhenomenonDescription
											}
											onChange={(e) =>
												setNewOfflinePhenomenonDescription(
													e.target.value
												)
											}
											className='w-full px-3 py-2 border border-gray-300 rounded-md'
											rows={2}
											placeholder='Describe the experimental condition...'
										/>
									</div>
									<div className='flex space-x-2'>
										<button
											onClick={
												handleCreateOfflinePhenomenon
											}
											disabled={
												!newOfflinePhenomenonName.trim()
											}
											className='px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300'
										>
											Create Phenomenon
										</button>
										<button
											onClick={() =>
												setShowOfflinePhenomenonForm(
													false
												)
											}
											className='px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400'
										>
											Cancel
										</button>
									</div>
								</div>
							</div>
						)}

						{/* Offline Phenomena List */}
						<div>
							<h4 className='font-medium text-gray-900 mb-3'>
								Phenomena for Data Upload
							</h4>
							{offlinePhenomena.length > 0 ? (
								<div className='space-y-3'>
									{offlinePhenomena.map((phenomenon) => (
										<div
											key={phenomenon.phenomenon_id}
											className='bg-gray-50 border border-gray-200 rounded-lg p-4'
										>
											<div className='flex justify-between items-start'>
												<div className='flex-1'>
													<div className='flex items-center space-x-2 mb-2'>
														<h5 className='font-medium text-gray-900'>
															{phenomenon.name}
														</h5>
														<span
															className={`px-2 py-1 rounded-full text-xs ${
																phenomenon.status ===
																"Pending"
																	? "bg-yellow-100 text-yellow-800"
																	: phenomenon.status ===
																	  "Active"
																	? "bg-green-100 text-green-800"
																	: "bg-gray-100 text-gray-800"
															}`}
														>
															{phenomenon.status}
														</span>
													</div>
													{phenomenon.description && (
														<p className='text-sm text-gray-600 mb-2'>
															{
																phenomenon.description
															}
														</p>
													)}
													<div className='text-xs text-gray-500 space-y-1'>
														<div>
															ID:{" "}
															{
																phenomenon.phenomenon_id
															}
														</div>
														{phenomenon.created_at && (
															<div>
																Created:{" "}
																{new Date(
																	phenomenon.created_at
																).toLocaleString()}
															</div>
														)}
														{phenomenon.start_time && (
															<div>
																Started:{" "}
																{new Date(
																	phenomenon.start_time
																).toLocaleString()}
															</div>
														)}
													</div>
												</div>{" "}
												<div className='flex space-x-2 ml-4'>
													{/* Status Action Buttons */}
													{phenomenon.status ===
														"Pending" && (
														<button
															onClick={() =>
																handleStartOfflinePhenomenon(
																	phenomenon.phenomenon_id
																)
															}
															disabled={
																offlinePhenomenonActionLoading ===
																phenomenon.phenomenon_id
															}
															className='px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:bg-gray-400'
														>
															{offlinePhenomenonActionLoading ===
															phenomenon.phenomenon_id
																? "..."
																: "▶️ Start"}
														</button>
													)}
													{phenomenon.status ===
														"Active" && (
														<>
															<button
																onClick={() =>
																	handleStopOfflinePhenomenon(
																		phenomenon.phenomenon_id
																	)
																}
																disabled={
																	offlinePhenomenonActionLoading ===
																	phenomenon.phenomenon_id
																}
																className='px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 disabled:bg-gray-400'
															>
																{offlinePhenomenonActionLoading ===
																phenomenon.phenomenon_id
																	? "..."
																	: "⏸️ Stop"}
															</button>
															<button
																onClick={() =>
																	handleFinishOfflinePhenomenon(
																		phenomenon.phenomenon_id
																	)
																}
																disabled={
																	offlinePhenomenonActionLoading ===
																	phenomenon.phenomenon_id
																}
																className='px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-400'
															>
																{offlinePhenomenonActionLoading ===
																phenomenon.phenomenon_id
																	? "..."
																	: "✅ Finish"}
															</button>
														</>
													)}
													{phenomenon.status ===
														"Stopped" && (
														<>
															<button
																onClick={() =>
																	handleStartOfflinePhenomenon(
																		phenomenon.phenomenon_id
																	)
																}
																disabled={
																	offlinePhenomenonActionLoading ===
																	phenomenon.phenomenon_id
																}
																className='px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:bg-gray-400'
															>
																{offlinePhenomenonActionLoading ===
																phenomenon.phenomenon_id
																	? "..."
																	: "▶️ Resume"}
															</button>
															<button
																onClick={() =>
																	handleFinishOfflinePhenomenon(
																		phenomenon.phenomenon_id
																	)
																}
																disabled={
																	offlinePhenomenonActionLoading ===
																	phenomenon.phenomenon_id
																}
																className='px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-400'
															>
																{offlinePhenomenonActionLoading ===
																phenomenon.phenomenon_id
																	? "..."
																	: "✅ Finish"}
															</button>
														</>
													)}

													{/* Management Actions */}
													<button
														onClick={() =>
															handleEditPhenomenon(
																phenomenon
															)
														}
														className='px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200'
														title='Edit phenomenon details'
													>
														✏️ Edit
													</button>
													<button
														onClick={() => {
															navigator.clipboard.writeText(
																phenomenon.phenomenon_id
															);
															alert(
																"Phenomenon ID copied to clipboard!"
															);
														}}
														className='px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200'
														title='Copy phenomenon ID for scripts'
													>
														📋 Copy ID
													</button>

													{/* Navigation to Detail Page */}
													<Link
														href={`/devices/${deviceId}/experiments/${experimentId}/phenomena/${phenomenon.phenomenon_id}`}
														className='px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200'
														title='View phenomenon details and data'
													>
														👁️ View
													</Link>

													{/* Delete Action */}
													<button
														onClick={() =>
															handleDeleteOfflinePhenomenon(
																phenomenon.phenomenon_id
															)
														}
														disabled={
															offlinePhenomenonActionLoading ===
															phenomenon.phenomenon_id
														}
														className='px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 disabled:bg-gray-400'
													>
														{offlinePhenomenonActionLoading ===
														phenomenon.phenomenon_id
															? "..."
															: "🗑️ Delete"}
													</button>
												</div>
											</div>

											{/* Usage Instructions */}
											{phenomenon.status ===
												"Pending" && (
												<div className='mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm'>
													<div className='font-medium text-blue-900 mb-1'>
														📝 Usage Instructions:
													</div>
													<div className='text-blue-800 space-y-1'>
														<div>
															1. Use phenomenon
															ID:{" "}
															<code className='bg-blue-100 px-1 rounded'>
																{
																	phenomenon.phenomenon_id
																}
															</code>
														</div>
														<div>
															2. Update your
															script config with
															this ID
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
										No offline phenomena created yet.
									</div>
									<div className='text-sm'>
										Create phenomena to prepare for batch
										data upload via scripts.
									</div>
								</div>
							)}
						</div>
					</div>
				)}{" "}
				{/* Static Experiment Info and Analytics */}
				{!liveExperiment && experiment.status === "Completed" && (
					<div className='bg-white p-6 rounded-lg border border-gray-200'>
						<h3 className='text-lg font-medium text-gray-900 mb-4'>
							📊 Experiment Summary & Analytics
						</h3>
						<div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-4'>
							<div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
								<div className='text-blue-600 text-2xl font-bold'>
									{offlinePhenomena.length}
								</div>
								<div className='text-blue-800 text-sm font-medium'>
									Total Phenomena
								</div>
							</div>
							<div className='bg-green-50 border border-green-200 rounded-lg p-4'>
								<div className='text-green-600 text-2xl font-bold'>
									{
										offlinePhenomena.filter(
											(p) => p.status === "Finished"
										).length
									}
								</div>
								<div className='text-green-800 text-sm font-medium'>
									Completed
								</div>
							</div>
							<div className='bg-orange-50 border border-orange-200 rounded-lg p-4'>
								<div className='text-orange-600 text-2xl font-bold'>
									{experiment.end_date &&
									experiment.start_date
										? Math.ceil(
												(new Date(
													experiment.end_date
												).getTime() -
													new Date(
														experiment.start_date
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

						{/* Phenomena Status Breakdown */}
						{offlinePhenomena.length > 0 && (
							<div className='mb-4'>
								<h4 className='text-md font-medium text-gray-800 mb-2'>
									Phenomena Status Breakdown
								</h4>
								<div className='flex flex-wrap gap-2'>
									{[
										"Pending",
										"Active",
										"Stopped",
										"Finished",
									].map((status) => {
										const count = offlinePhenomena.filter(
											(p) => p.status === status
										).length;
										if (count === 0) return null;
										return (
											<span
												key={status}
												className={`px-3 py-1 rounded-full text-sm ${
													status === "Finished"
														? "bg-green-100 text-green-800"
														: status === "Active"
														? "bg-blue-100 text-blue-800"
														: status === "Stopped"
														? "bg-yellow-100 text-yellow-800"
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
								Experiment completed. Navigate to individual
								phenomena for detailed data analysis.
							</p>
							<div className='flex justify-center space-x-4 mt-4'>
								<Link
									href={`/devices/${deviceId}`}
									className='text-blue-600 hover:text-blue-900'
								>
									← Back to Device Overview
								</Link>
								<Link
									href='/experiments'
									className='text-blue-600 hover:text-blue-900'
								>
									All Experiments →
								</Link>
							</div>
						</div>
					</div>
				)}
				{/* Basic Static Experiment Info (for non-completed experiments) */}
				{!liveExperiment && experiment.status !== "Completed" && (
					<div className='bg-white p-6 rounded-lg border border-gray-200'>
						<h3 className='text-lg font-medium text-gray-900 mb-4'>
							📊 Experiment Status
						</h3>
						<div className='bg-gray-50 border border-gray-200 rounded-lg p-4'>
							<div className='text-center py-4'>
								<div className='text-2xl mb-2'>
									{experiment.status === "Running"
										? "⚡"
										: experiment.status === "Paused"
										? "⏸️"
										: experiment.status === "Failed"
										? "❌"
										: "📝"}
								</div>
								<p className='text-gray-700 font-medium mb-2'>
									Experiment Status: {experiment.status}
								</p>
								<p className='text-gray-600 text-sm'>
									{experiment.status === "Running"
										? "Experiment is currently active. You can manage phenomena and monitor progress."
										: experiment.status === "Paused"
										? "Experiment is paused. You can resume or manage phenomena."
										: experiment.status === "Failed"
										? "Experiment encountered an error. Check logs and phenomena status."
										: "Experiment is created but not yet started. Configure phenomena and start when ready."}
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
				)}
				{offlinePhenomena.filter(p => p.status === 'Stopped').length > 0 ? (
					<div className='mt-8'>
						<h4 className='font-medium text-green-900 mb-3'>
							Stopped Phenomena
						</h4>
						<div className='space-y-2'>
							{offlinePhenomena.filter(p => p.status === 'Stopped').map(phenomenon => (
								<div key={phenomenon.phenomenon_id} className='bg-green-50 border border-green-200 rounded-lg p-3'>
									<div className='flex justify-between items-center'>
										<div>
											<h5 className='font-medium text-green-900'>{phenomenon.name}</h5>
											{phenomenon.description && (
												<p className='text-sm text-green-700'>{phenomenon.description}</p>
											)}
											<p className='text-xs text-gray-500'>
												Started: {phenomenon.start_time ? new Date(phenomenon.start_time).toLocaleString() : 'N/A'}<br/>
												Ended: {phenomenon.end_time ? new Date(phenomenon.end_time).toLocaleString() : 'N/A'}
											</p>
										</div>
										<div className='flex space-x-2'>
											<button
												onClick={() => {
													navigator.clipboard.writeText(phenomenon.phenomenon_id);
													alert('Phenomenon ID copied to clipboard!');
												}}
												className='px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200'
												title='Copy phenomenon ID'
											>
												📋 Copy ID
											</button>
											<Link
												href={`/devices/${deviceId}/experiments/${experimentId}/phenomena/${phenomenon.phenomenon_id}`}
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
					<div className='mt-8 text-center text-gray-500'>No stopped phenomena yet.</div>
				)}
				{/* Finished Phenomena List */}
				{offlinePhenomena.filter(p => p.status === 'Finished').length > 0 ? (
					<div className='mt-8'>
						<h4 className='font-medium text-green-900 mb-3'>
							Finished Phenomena
						</h4>
						<div className='space-y-2'>
							{offlinePhenomena.filter(p => p.status === 'Stopped').map(phenomenon => (
								<div key={phenomenon.phenomenon_id} className='bg-green-50 border border-green-200 rounded-lg p-3'>
									<div className='flex justify-between items-center'>
										<div>
											<h5 className='font-medium text-green-900'>{phenomenon.name}</h5>
											{phenomenon.description && (
												<p className='text-sm text-green-700'>{phenomenon.description}</p>
											)}
											<p className='text-xs text-gray-500'>
												Started: {phenomenon.start_time ? new Date(phenomenon.start_time).toLocaleString() : 'N/A'}<br/>
												Ended: {phenomenon.end_time ? new Date(phenomenon.end_time).toLocaleString() : 'N/A'}
											</p>
										</div>
										<div className='flex space-x-2'>
											<button
												onClick={() => {
													navigator.clipboard.writeText(phenomenon.phenomenon_id);
													alert('Phenomenon ID copied to clipboard!');
												}}
												className='px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200'
												title='Copy phenomenon ID'
											>
												📋 Copy ID
											</button>
											<Link
												href={`/devices/${deviceId}/experiments/${experimentId}/phenomena/${phenomenon.phenomenon_id}`}
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
					<div className='mt-8 text-center text-gray-500'>No finished phenomena yet.</div>
				)}
			</div>
		</PageLayout>
	);
}
