"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PageLayout from "@/components/PageLayout";
import {
	experimentApi,
	phenomenaApi,
	deviceApi,
	Experiment,
	Phenomenon,
	Device,
} from "@/services/api";

export default function ExperimentDetailPage() {
	const params = useParams();
	const router = useRouter();
	const experimentId = params.experimentId as string;

	const [experiment, setExperiment] = useState<Experiment | null>(null);
	const [phenomena, setPhenomena] = useState<Phenomenon[]>([]);
	const [device, setDevice] = useState<Device | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [actionLoading, setActionLoading] = useState<string | null>(null);

	useEffect(() => {
		if (experimentId) {
			loadExperimentData();
		}
	}, [experimentId]);

	const loadExperimentData = async () => {
		try {
			setLoading(true);
			setError(null);

			// Load experiment details
			const experimentData = await experimentApi.getExperiment(
				experimentId
			);
			if (!experimentData) {
				setError("Experiment not found");
				return;
			}
			setExperiment(experimentData);

			// Load associated device
			if (experimentData.device_id) {
				const deviceData = await deviceApi.getDevice(
					experimentData.device_id
				);
				setDevice(deviceData);
			}

			// Load phenomena for this experiment
			const phenomenaData = await phenomenaApi.getPhenomenaForExperiment(
				experimentData.experiment_id
			);
			setPhenomena(phenomenaData);
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

	const copyToClipboard = (text: string, label: string) => {
		navigator.clipboard.writeText(text).then(() => {
			console.log(`${label} copied to clipboard: ${text}`);
		});
	};

	const handlePhenomenonAction = async (
		phenomenonId: string,
		action: "start" | "stop" | "finish"
	) => {
		try {
			setActionLoading(phenomenonId);

			let result;
			switch (action) {
				case "start":
					result = await phenomenaApi.startPhenomenon(phenomenonId);
					break;
				case "stop":
					result = await phenomenaApi.stopPhenomenon(phenomenonId);
					break;
				case "finish":
					result = await phenomenaApi.finishPhenomenon(phenomenonId);
					break;
			}

			if (result) {
				await loadExperimentData(); // Reload to get updated data
			}
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: `Failed to ${action} phenomenon`
			);
		} finally {
			setActionLoading(null);
		}
	};

	const getStatusColor = (
		status: Experiment["status"] | Phenomenon["status"]
	) => {
		switch (status) {
			case "Running":
			case "Active":
				return "bg-green-100 text-green-800";
			case "Completed":
			case "Finished":
				return "bg-blue-100 text-blue-800";
			case "Paused":
			case "Stopped":
				return "bg-yellow-100 text-yellow-800";
			case "Created":
			case "Pending":
				return "bg-gray-100 text-gray-800";
			case "Failed":
				return "bg-red-100 text-red-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	if (loading) {
		return (
			<div className='flex items-center justify-center min-h-screen'>
				<div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600'></div>
			</div>
		);
	}

	if (error || !experiment) {
		return (
			<div className='container mx-auto px-4 py-8'>
				<div className='max-w-2xl mx-auto text-center'>
					<div className='bg-red-50 border border-red-200 rounded-lg p-6'>
						<h2 className='text-xl font-bold text-red-800 mb-2'>
							Error Loading Experiment
						</h2>
						<p className='text-red-700 mb-4'>
							{error || "Experiment not found"}
						</p>
						<Link
							href='/experiments'
							className='inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700'
						>
							← Back to Experiments
						</Link>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className='container mx-auto px-4 py-8'>
			<div className='max-w-6xl mx-auto'>
				{/* Header */}
				<div className='flex items-center mb-8'>
					<Link
						href='/experiments'
						className='text-blue-600 hover:text-blue-500 mr-4'
					>
						← Back to Experiments
					</Link>
					<div className='flex-1'>
						<div className='flex items-center'>
							<span className='text-3xl mr-3'>
								{experiment.mode === "Online" ? "🚀" : "⚙️"}
							</span>
							<div>
								<h1 className='text-3xl font-bold text-gray-900'>
									{experiment.name}
								</h1>
								<div className='flex items-center mt-1 space-x-4'>
									<span
										className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
											experiment.mode === "Online"
												? "bg-green-100 text-green-800"
												: "bg-orange-100 text-orange-800"
										}`}
									>
										{experiment.mode} Mode
									</span>
									<span
										className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
											experiment.status
										)}`}
									>
										{experiment.status}
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>

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

				<div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
					{/* Main Content */}
					<div className='lg:col-span-2 space-y-8'>
						{/* Experiment Details */}
						<div className='bg-white border border-gray-200 rounded-lg p-6'>
							<h2 className='text-xl font-semibold text-gray-900 mb-4'>
								Experiment Details
							</h2>
							<dl className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
								<div>
									<dt className='text-sm font-medium text-gray-500'>
										Name
									</dt>
									<dd className='text-sm text-gray-900'>
										{experiment.name}
									</dd>
								</div>
								{experiment.mode === "Offline" && (
									<div>
										<dt className='text-sm font-medium text-gray-500'>
											Experiment ID
										</dt>
										<dd className='text-sm text-gray-900 font-mono flex items-center'>
											{experiment.experiment_id}
											<button
												onClick={() =>
													copyToClipboard(
														experiment.experiment_id,
														"Experiment ID"
													)
												}
												className='ml-2 text-blue-600 hover:text-blue-800 text-xs'
												title='Copy to clipboard'
											>
												📋
											</button>
										</dd>
									</div>
								)}
								<div>
									<dt className='text-sm font-medium text-gray-500'>
										Mode
									</dt>
									<dd className='text-sm text-gray-900'>
										{experiment.mode}
									</dd>
								</div>
								<div>
									<dt className='text-sm font-medium text-gray-500'>
										Status
									</dt>
									<dd className='text-sm text-gray-900'>
										{experiment.status}
									</dd>
								</div>
								<div>
									<dt className='text-sm font-medium text-gray-500'>
										Start Date
									</dt>
									<dd className='text-sm text-gray-900'>
										{new Date(
											experiment.start_date
										).toLocaleDateString()}
									</dd>
								</div>
								{experiment.end_date && (
									<div>
										<dt className='text-sm font-medium text-gray-500'>
											End Date
										</dt>
										<dd className='text-sm text-gray-900'>
											{new Date(
												experiment.end_date
											).toLocaleDateString()}
										</dd>
									</div>
								)}
								<div>
									<dt className='text-sm font-medium text-gray-500'>
										Device
									</dt>
									<dd className='text-sm text-gray-900'>
										{device ? (
											<Link
												href={`/devices/${device.device_id}`}
												className='text-blue-600 hover:text-blue-800'
											>
												{device.device_name ||
													device.device_id}
											</Link>
										) : (
											experiment.device_id
										)}
									</dd>
								</div>
								<div>
									<dt className='text-sm font-medium text-gray-500'>
										Created
									</dt>
									<dd className='text-sm text-gray-900'>
										{new Date(
											experiment.created_at
										).toLocaleString()}
									</dd>
								</div>
							</dl>
							{experiment.description && (
								<div className='mt-4'>
									<dt className='text-sm font-medium text-gray-500 mb-1'>
										Description
									</dt>
									<dd className='text-sm text-gray-900 bg-gray-50 p-3 rounded'>
										{experiment.description}
									</dd>
								</div>
							)}
						</div>

						{/* Phenomena Section */}
						<div className='bg-white border border-gray-200 rounded-lg p-6'>
							<div className='flex justify-between items-center mb-4'>
								<h2 className='text-xl font-semibold text-gray-900'>
									Phenomena ({phenomena.length})
								</h2>
								{experiment.mode === "Online" &&
									experiment.status === "Running" && (
										<Link
											href={`/experiments/${experiment.experiment_id}/phenomena/create`}
											className='bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 text-sm'
										>
											+ Add Phenomenon
										</Link>
									)}
							</div>

							{phenomena.length === 0 ? (
								<div className='text-center py-8 bg-gray-50 rounded-lg'>
									<p className='text-gray-500 mb-4'>
										{experiment.mode === "Online"
											? "No phenomena created yet. Start by adding your first phenomenon."
											: "No phenomena found for this experiment."}
									</p>
									{experiment.mode === "Online" &&
										experiment.status === "Running" && (
											<Link
												href={`/experiments/${experiment.experiment_id}/phenomena/create`}
												className='inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700'
											>
												Add First Phenomenon
											</Link>
										)}
								</div>
							) : (
								<div className='space-y-4'>
									{phenomena.map((phenomenon) => (
										<div
											key={phenomenon.id}
											className='border border-gray-200 rounded-lg p-4'
										>
											<div className='flex justify-between items-start'>
												<div className='flex-1'>
													<div className='flex items-center'>
														<h3 className='text-lg font-medium text-gray-900'>
															{phenomenon.name}
														</h3>
														{experiment.mode ===
															"Offline" && (
															<button
																onClick={() =>
																	copyToClipboard(
																		phenomenon.phenomenon_id,
																		`Phenomenon ID for ${phenomenon.name}`
																	)
																}
																className='ml-2 text-blue-600 hover:text-blue-800 text-xs'
																title='Copy phenomenon ID'
															>
																📋{" "}
																{
																	phenomenon.phenomenon_id
																}
															</button>
														)}
													</div>
													{phenomenon.description && (
														<p className='text-sm text-gray-600 mt-1'>
															{
																phenomenon.description
															}
														</p>
													)}
													<div className='flex items-center mt-2 space-x-4'>
														<span
															className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
																phenomenon.status
															)}`}
														>
															{phenomenon.status}
														</span>
														{phenomenon.start_time && (
															<span className='text-xs text-gray-500'>
																Started:{" "}
																{new Date(
																	phenomenon.start_time
																).toLocaleString()}
															</span>
														)}
														{phenomenon.end_time && (
															<span className='text-xs text-gray-500'>
																Ended:{" "}
																{new Date(
																	phenomenon.end_time
																).toLocaleString()}
															</span>
														)}
													</div>
												</div>

												{/* Phenomenon Actions for Online Mode */}
												{experiment.mode === "Online" &&
													experiment.status ===
														"Running" && (
														<div className='flex space-x-2'>
															{phenomenon.status ===
																"Pending" && (
																<button
																	onClick={() =>
																		handlePhenomenonAction(
																			phenomenon.phenomenon_id,
																			"start"
																		)
																	}
																	disabled={
																		actionLoading ===
																		phenomenon.phenomenon_id
																	}
																	className='bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 disabled:bg-gray-400'
																>
																	{actionLoading ===
																	phenomenon.phenomenon_id
																		? "..."
																		: "Start"}
																</button>
															)}
															{phenomenon.status ===
																"Active" && (
																<>
																	<button
																		onClick={() =>
																			handlePhenomenonAction(
																				phenomenon.phenomenon_id,
																				"stop"
																			)
																		}
																		disabled={
																			actionLoading ===
																			phenomenon.phenomenon_id
																		}
																		className='bg-yellow-600 text-white px-3 py-1 rounded text-xs hover:bg-yellow-700 disabled:bg-gray-400'
																	>
																		{actionLoading ===
																		phenomenon.phenomenon_id
																			? "..."
																			: "Pause"}
																	</button>
																	<button
																		onClick={() =>
																			handlePhenomenonAction(
																				phenomenon.phenomenon_id,
																				"finish"
																			)
																		}
																		disabled={
																			actionLoading ===
																			phenomenon.phenomenon_id
																		}
																		className='bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 disabled:bg-gray-400'
																	>
																		{actionLoading ===
																		phenomenon.phenomenon_id
																			? "..."
																			: "Finish"}
																	</button>
																</>
															)}
															{phenomenon.status ===
																"Stopped" && (
																<button
																	onClick={() =>
																		handlePhenomenonAction(
																			phenomenon.phenomenon_id,
																			"start"
																		)
																	}
																	disabled={
																		actionLoading ===
																		phenomenon.phenomenon_id
																	}
																	className='bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 disabled:bg-gray-400'
																>
																	{actionLoading ===
																	phenomenon.phenomenon_id
																		? "..."
																		: "Resume"}
																</button>
															)}
														</div>
													)}
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>

					{/* Sidebar */}
					<div className='space-y-6'>
						{/* Device Info */}
						{device && (
							<div className='bg-white border border-gray-200 rounded-lg p-6'>
								<h3 className='text-lg font-medium text-gray-900 mb-3'>
									Associated Device
								</h3>
								<div className='space-y-3'>
									<div>
										<dt className='text-sm font-medium text-gray-500'>
											Name
										</dt>
										<dd className='text-sm text-gray-900'>
											{device.device_name}
										</dd>
									</div>
									<div>
										<dt className='text-sm font-medium text-gray-500'>
											Type
										</dt>
										<dd className='text-sm text-gray-900'>
											{device.device_type}
										</dd>
									</div>
									<div>
										<dt className='text-sm font-medium text-gray-500'>
											Status
										</dt>
										<dd className='text-sm'>
											<span
												className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
													device.status === "Active"
														? "bg-green-100 text-green-800"
														: "bg-gray-100 text-gray-800"
												}`}
											>
												{device.status}
											</span>
										</dd>
									</div>
								</div>
								<Link
									href={`/devices/${device.device_id}`}
									className='mt-4 w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-center block'
								>
									View Device Details
								</Link>
							</div>
						)}

						{/* Actions */}
						<div className='bg-white border border-gray-200 rounded-lg p-6'>
							<h3 className='text-lg font-medium text-gray-900 mb-3'>
								Actions
							</h3>
							<div className='space-y-3'>
								<Link
									href={`/experiments/${experiment.experiment_id}/edit`}
									className='w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-center block'
								>
									Edit Experiment
								</Link>
								{experiment.mode === "Offline" && (
									<div className='bg-yellow-50 border border-yellow-200 rounded-lg p-3'>
										<h4 className='text-sm font-medium text-yellow-800 mb-2'>
											📄 Script Integration
										</h4>
										<div className='text-xs text-yellow-700 space-y-1'>
											<div>
												Experiment ID:{" "}
												<code className='bg-white px-1 rounded'>
													{experiment.experiment_id}
												</code>
											</div>
											{phenomena.map((p) => (
												<div key={p.id}>
													{p.name}:{" "}
													<code className='bg-white px-1 rounded'>
														{p.phenomenon_id}
													</code>
												</div>
											))}
										</div>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
