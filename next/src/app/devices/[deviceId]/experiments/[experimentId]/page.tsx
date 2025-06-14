"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PageLayout from "@/components/PageLayout";
import {
	deviceApi,
	experimentApi,
	onlineModeApi,
	Device,
	Experiment,
	LiveExperiment,
	ActivePhenomenon,
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
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Live phenomenon creation
	const [newPhenomenonName, setNewPhenomenonName] = useState("");
	const [newPhenomenonDescription, setNewPhenomenonDescription] =
		useState("");
	const [showPhenomenonForm, setShowPhenomenonForm] = useState(false);

	useEffect(() => {
		if (deviceId && experimentId) {
			loadExperimentData();
		}
	}, [deviceId, experimentId]);

	const loadExperimentData = async () => {
		try {
			setLoading(true);
			setError(null);

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
			setExperiment(experimentData);

			// Check if this is a live experiment
			if (experimentData.status === "Running") {
				const liveExp = await onlineModeApi.getLiveExperiment(deviceId);
				if (liveExp && liveExp.experiment_id === experimentId) {
					setLiveExperiment(liveExp);
				}
			}
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
			<div className='space-y-6'>
				{/* Experiment Header */}
				<div className='bg-white p-6 rounded-lg border border-gray-200'>
					<div className='flex justify-between items-start mb-4'>
						<div>
							{" "}
							<h2 className='text-2xl font-bold text-gray-900 mb-2'>
								{experiment.name ||
									`Experiment ${experiment.experiment_id}`}
							</h2>
							<p className='text-gray-600 mb-4'>
								{experiment.description ||
									"No description provided"}
							</p>
							<div className='flex space-x-4 text-sm text-gray-500'>
								<span>Device: {device.device_name}</span>
								<span>
									Started:{" "}
									{new Date(
										experiment.start_date
									).toLocaleString()}
								</span>
								<span
									className={`px-2 py-1 rounded-full text-xs ${
										experiment.status === "Running"
											? "bg-green-100 text-green-800"
											: "bg-gray-100 text-gray-800"
									}`}
								>
									{experiment.status}
								</span>
							</div>
						</div>

						{liveExperiment && (
							<div className='flex space-x-2'>
								<div className='text-right text-sm text-gray-500'>
									<div>Live Session Active</div>
									<div>
										Duration:{" "}
										{Math.floor(
											liveExperiment.duration / 60
										)}
										m {liveExperiment.duration % 60}s
									</div>
								</div>
								<button
									onClick={handleStopExperiment}
									className='px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700'
								>
									Stop Experiment
								</button>
							</div>
						)}
					</div>
				</div>

				{/* Live Phenomena Control */}
				{liveExperiment && (
					<div className='bg-white p-6 rounded-lg border border-gray-200'>
						<div className='flex justify-between items-center mb-4'>
							<h3 className='text-lg font-medium text-gray-900'>
								🔬 Live Phenomena Control
							</h3>
							<button
								onClick={() =>
									setShowPhenomenonForm(!showPhenomenonForm)
								}
								className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700'
							>
								{showPhenomenonForm
									? "Cancel"
									: "Add Phenomenon"}
							</button>
						</div>

						{/* Current Active Phenomenon */}
						{liveExperiment.current_phenomenon && (
							<div className='bg-green-50 border border-green-200 rounded-lg p-4 mb-4'>
								<div className='flex justify-between items-center'>
									<div>
										<h4 className='font-medium text-green-800'>
											🟢 Currently Active:{" "}
											{
												liveExperiment
													.current_phenomenon.name
											}
										</h4>
										<p className='text-sm text-green-700'>
											Duration:{" "}
											{Math.floor(
												liveExperiment
													.current_phenomenon
													.duration / 60
											)}
											m{" "}
											{liveExperiment.current_phenomenon
												.duration % 60}
											s
										</p>
									</div>
									<button
										onClick={() =>
											handleStopPhenomenon(
												liveExperiment.current_phenomenon!
													.phenomenon_id
											)
										}
										className='px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700'
									>
										Stop
									</button>
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
												</div>
												<Link
													href={`/devices/${deviceId}/experiments/${experimentId}/phenomena/${phenomenon.phenomenon_id}`}
													className='text-blue-600 hover:text-blue-900 text-sm'
												>
													View Data →
												</Link>
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

				{/* Static Experiment Info (for completed experiments) */}
				{!liveExperiment && (
					<div className='bg-white p-6 rounded-lg border border-gray-200'>
						<h3 className='text-lg font-medium text-gray-900 mb-4'>
							📊 Experiment Data
						</h3>
						<div className='bg-gray-50 border border-gray-200 rounded-lg p-4'>
							<p className='text-gray-600 text-center py-4'>
								Experiment completed. Navigate to individual
								phenomena for data analysis.
							</p>
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
			</div>
		</PageLayout>
	);
}
