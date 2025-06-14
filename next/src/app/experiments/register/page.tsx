"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageLayout from "@/components/PageLayout";
import {
	experimentApi,
	deviceApi,
	phenomenaApi,
	Device,
	Experiment,
	Phenomenon,
} from "@/services/api";

export default function ExperimentRegisterPage() {
	const router = useRouter();
	const [experimentMode, setExperimentMode] = useState<"Online" | "Offline">(
		"Online"
	);
	const [formData, setFormData] = useState({
		name: "",
		description: "",
		start_date: new Date().toISOString().split("T")[0],
		end_date: "",
		device_id: "",
		mode: "Online" as "Online" | "Offline",
		phenomena: [] as Array<{ name: string; description: string }>,
	});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<Experiment | null>(null);
	const [createdPhenomena, setCreatedPhenomena] = useState<Phenomenon[]>([]);
	// Data for dropdowns
	const [devices, setDevices] = useState<Device[]>([]);
	const [phenomena, setPhenomena] = useState<Phenomenon[]>([]);
	const [loadingData, setLoadingData] = useState(true);
	const [activeExperiments, setActiveExperiments] = useState<Experiment[]>(
		[]
	);

	useEffect(() => {
		loadFormData();
	}, []);

	useEffect(() => {
		// Update mode in form data when experiment mode changes
		setFormData((prev) => ({
			...prev,
			mode: experimentMode,
			// Reset phenomena for online mode since it's device-centric
			phenomena: experimentMode === "Online" ? [] : prev.phenomena,
		}));
	}, [experimentMode]);

	const loadFormData = async () => {
		try {
			setLoadingData(true);
			const [devicesData, phenomenaData, experimentsData] =
				await Promise.allSettled([
					deviceApi.getDevices(),
					phenomenaApi.getPhenomena(),
					experimentApi.getExperiments(),
				]);

			if (devicesData.status === "fulfilled") {
				setDevices(
					devicesData.value.filter((d) => d.status === "Active")
				);
			}

			if (phenomenaData.status === "fulfilled") {
				setPhenomena(phenomenaData.value);
			}

			if (experimentsData.status === "fulfilled") {
				setActiveExperiments(
					experimentsData.value.filter(
						(exp) =>
							exp.status === "Running" || exp.status === "Created"
					)
				);
			}
		} catch (err) {
			console.error("Error loading form data:", err);
		} finally {
			setLoadingData(false);
		}
	};

	const handleInputChange = (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
		>
	) => {
		const { name, value } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: value,
		}));
	};
	const handleMultiSelectChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
	) => {
		const { name, value } = e.target;

		if (name === "device_id") {
			setFormData((prev) => ({
				...prev,
				device_id: value,
			}));
		}
	};

	const handlePhenomenaAdd = (name: string, description: string = "") => {
		setFormData((prev) => ({
			...prev,
			phenomena: [...prev.phenomena, { name, description }],
		}));
	};

	const handlePhenomenaRemove = (index: number) => {
		setFormData((prev) => ({
			...prev,
			phenomena: prev.phenomena.filter((_, i) => i !== index),
		}));
	};
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!formData.name.trim()) {
			setError("Experiment name is required");
			return;
		}

		if (!formData.start_date) {
			setError("Start date is required");
			return;
		}

		if (!formData.device_id) {
			setError("A device must be selected");
			return;
		}

		// Check for existing active experiments on the device for Online mode
		if (experimentMode === "Online") {
			const existingActiveExperiment = activeExperiments.find(
				(exp) =>
					exp.device_id === formData.device_id &&
					(exp.status === "Running" || exp.status === "Created")
			);

			if (existingActiveExperiment) {
				setError(
					`Device ${formData.device_id} already has an active experiment: "${existingActiveExperiment.name}". Only one active experiment per device is allowed in Online mode.`
				);
				return;
			}
		}

		// For Offline mode, require at least one phenomenon
		if (experimentMode === "Offline" && formData.phenomena.length === 0) {
			setError("Offline experiments require at least one phenomenon");
			return;
		}

		try {
			setLoading(true);
			setError(null);

			// Create the experiment with the primary data
			const experiment = await experimentApi.createExperiment({
				name: formData.name.trim(),
				description: formData.description.trim() || undefined,
				device_id: formData.device_id,
				mode: experimentMode,
				start_date: formData.start_date,
				end_date: formData.end_date || undefined,
				status: experimentMode === "Online" ? "Running" : "Created", // Online experiments start immediately
			});

			if (experiment) {
				let phenomenaResults: Phenomenon[] = [];

				// Create phenomena for the experiment if needed
				if (formData.phenomena.length > 0) {
					const phenomenaPromises = formData.phenomena.map(
						(phenomenon) =>
							phenomenaApi.createPhenomenon({
								experiment_id: experiment.experiment_id,
								name: phenomenon.name,
								description:
									phenomenon.description || undefined,
								status:
									experimentMode === "Online"
										? "Active"
										: "Pending",
							})
					);

					phenomenaResults = (
						await Promise.all(phenomenaPromises)
					).filter((p) => p !== null) as Phenomenon[];
					setCreatedPhenomena(phenomenaResults);
				}

				setSuccess(experiment);
			} else {
				setError("Failed to create experiment");
			}
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to create experiment"
			);
		} finally {
			setLoading(false);
		}
	};
	const handleReset = () => {
		setFormData({
			name: "",
			description: "",
			start_date: new Date().toISOString().split("T")[0],
			end_date: "",
			device_id: "",
			mode: experimentMode,
			phenomena: [],
		});
		setError(null);
		setSuccess(null);
		setCreatedPhenomena([]);
	};

	const handleViewExperiment = () => {
		if (success) {
			router.push(`/experiments/${success.experiment_id}`);
		}
	};

	const handleCreateAnother = () => {
		handleReset();
	};
	const getAvailableDevicesForOnline = () => {
		return devices.filter((device) => {
			const hasActiveExperiment = activeExperiments.some(
				(exp) =>
					exp.device_id === device.device_id &&
					(exp.status === "Running" || exp.status === "Created")
			);
			return !hasActiveExperiment;
		});
	};

	const copyToClipboard = (text: string, label: string) => {
		navigator.clipboard.writeText(text).then(() => {
			// Could add a toast notification here
			console.log(`${label} copied to clipboard: ${text}`);
		});
	};

	if (success) {
		return (
			<div className='container mx-auto px-4 py-8'>
				<div className='max-w-2xl mx-auto'>
					<div
						className={`${
							experimentMode === "Online"
								? "bg-green-50 border-green-200"
								: "bg-blue-50 border-blue-200"
						} border rounded-lg p-6`}
					>
						<div className='flex items-center mb-4'>
							<span
								className={`${
									experimentMode === "Online"
										? "text-green-400"
										: "text-blue-400"
								} text-3xl mr-3`}
							>
								{experimentMode === "Online" ? "🚀" : "⚙️"}
							</span>
							<div>
								<h2
									className={`text-xl font-bold ${
										experimentMode === "Online"
											? "text-green-800"
											: "text-blue-800"
									}`}
								>
									{experimentMode === "Online"
										? "Online Experiment Started!"
										: "Offline Experiment Created!"}
								</h2>
								<p
									className={`${
										experimentMode === "Online"
											? "text-green-700"
											: "text-blue-700"
									}`}
								>
									{experimentMode === "Online"
										? "Your experiment is now running and collecting real-time data."
										: "Your experiment is ready for manual data collection and script integration."}
								</p>
							</div>
						</div>

						<div className='bg-white rounded-lg p-4 mb-6'>
							<h3 className='text-lg font-medium text-gray-900 mb-3'>
								Experiment Details
							</h3>
							<dl className='space-y-2'>
								<div className='flex justify-between'>
									<dt className='text-sm font-medium text-gray-500'>
										Experiment Name:
									</dt>
									<dd className='text-sm text-gray-900'>
										{success.name}
									</dd>
								</div>
								{experimentMode === "Offline" && (
									<div className='flex justify-between items-center'>
										<dt className='text-sm font-medium text-gray-500'>
											Experiment ID:
										</dt>
										<dd className='text-sm text-gray-900 font-mono flex items-center'>
											{success.experiment_id}
											<button
												onClick={() =>
													copyToClipboard(
														success.experiment_id,
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
								<div className='flex justify-between'>
									<dt className='text-sm font-medium text-gray-500'>
										Status:
									</dt>
									<dd className='text-sm'>
										<span
											className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
												success.status === "Running"
													? "bg-green-100 text-green-800"
													: "bg-blue-100 text-blue-800"
											}`}
										>
											{success.status}
										</span>
									</dd>
								</div>
								<div className='flex justify-between'>
									<dt className='text-sm font-medium text-gray-500'>
										Mode:
									</dt>
									<dd className='text-sm'>
										<span
											className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
												success.mode === "Online"
													? "bg-green-100 text-green-800"
													: "bg-orange-100 text-orange-800"
											}`}
										>
											{success.mode}
										</span>
									</dd>
								</div>
								<div className='flex justify-between'>
									<dt className='text-sm font-medium text-gray-500'>
										Start Date:
									</dt>
									<dd className='text-sm text-gray-900'>
										{new Date(
											success.start_date
										).toLocaleDateString()}
									</dd>
								</div>
								{success.end_date && (
									<div className='flex justify-between'>
										<dt className='text-sm font-medium text-gray-500'>
											End Date:
										</dt>
										<dd className='text-sm text-gray-900'>
											{new Date(
												success.end_date
											).toLocaleDateString()}
										</dd>
									</div>
								)}
								<div className='flex justify-between'>
									<dt className='text-sm font-medium text-gray-500'>
										Device:
									</dt>
									<dd className='text-sm text-gray-900'>
										{success.device_id}
									</dd>
								</div>
							</dl>

							{/* Show phenomena for offline mode with copyable IDs */}
							{experimentMode === "Offline" &&
								createdPhenomena.length > 0 && (
									<div className='mt-4 pt-4 border-t'>
										<h4 className='text-sm font-medium text-gray-900 mb-2'>
											Created Phenomena (
											{createdPhenomena.length}):
										</h4>
										<div className='space-y-2'>
											{createdPhenomena.map(
												(phenomenon) => (
													<div
														key={phenomenon.id}
														className='flex justify-between items-center bg-gray-50 p-2 rounded'
													>
														<div>
															<span className='text-sm font-medium'>
																{
																	phenomenon.name
																}
															</span>
															{phenomenon.description && (
																<p className='text-xs text-gray-600'>
																	{
																		phenomenon.description
																	}
																</p>
															)}
														</div>
														<div className='flex items-center space-x-1'>
															<span className='text-xs font-mono text-gray-500'>
																{
																	phenomenon.phenomenon_id
																}
															</span>
															<button
																onClick={() =>
																	copyToClipboard(
																		phenomenon.phenomenon_id,
																		`Phenomenon ID for ${phenomenon.name}`
																	)
																}
																className='text-blue-600 hover:text-blue-800 text-xs'
																title='Copy phenomenon ID'
															>
																📋
															</button>
														</div>
													</div>
												)
											)}
										</div>
									</div>
								)}
						</div>

						{experimentMode === "Offline" && (
							<div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6'>
								<h4 className='text-sm font-medium text-yellow-800 mb-2'>
									📝 Script Integration
								</h4>
								<p className='text-xs text-yellow-700 mb-2'>
									Use these IDs in your data collection
									scripts:
								</p>
								<div className='font-mono text-xs bg-white p-2 rounded border space-y-1'>
									<div>
										Experiment ID:{" "}
										<strong>{success.experiment_id}</strong>
									</div>
									{createdPhenomena.map((phenomenon) => (
										<div key={phenomenon.id}>
											{phenomenon.name} ID:{" "}
											<strong>
												{phenomenon.phenomenon_id}
											</strong>
										</div>
									))}
								</div>
							</div>
						)}

						<div className='flex space-x-4'>
							<button
								onClick={handleViewExperiment}
								className={`flex-1 ${
									experimentMode === "Online"
										? "bg-green-600 hover:bg-green-700"
										: "bg-blue-600 hover:bg-blue-700"
								} text-white px-4 py-2 rounded-md transition-colors`}
							>
								View Experiment
							</button>
							<button
								onClick={handleCreateAnother}
								className='flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors'
							>
								Create Another
							</button>
							<Link
								href='/experiments'
								className='flex-1 bg-gray-100 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors text-center'
							>
								Back to Experiments
							</Link>
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (loadingData) {
		return (
			<div className='flex items-center justify-center min-h-screen'>
				<div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600'></div>
			</div>
		);
	}

	return (
		<div className='container mx-auto px-4 py-8'>
			<div className='max-w-4xl mx-auto'>
				{" "}
				<div className='flex items-center mb-8'>
					<Link
						href='/experiments'
						className='text-blue-600 hover:text-blue-500 mr-4'
					>
						← Back to Experiments
					</Link>
					<div>
						<h1 className='text-3xl font-bold text-gray-900'>
							Create New Experiment
						</h1>
						<p className='text-gray-600 mt-1'>
							Set up a new measurement experiment with selected
							devices and phenomena
						</p>
					</div>
				</div>
				{/* Mode Selection */}
				<div className='mb-6'>
					<div className='bg-white border border-gray-200 rounded-lg p-6'>
						<h3 className='text-lg font-medium text-gray-900 mb-4'>
							Experiment Mode
						</h3>
						<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
							<div
								className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${
									experimentMode === "Online"
										? "border-green-500 bg-green-50"
										: "border-gray-200 hover:border-gray-300"
								}`}
								onClick={() => setExperimentMode("Online")}
							>
								<div className='flex items-center'>
									<input
										type='radio'
										name='experiment_mode'
										value='Online'
										checked={experimentMode === "Online"}
										onChange={() =>
											setExperimentMode("Online")
										}
										className='h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300'
									/>
									<div className='ml-3'>
										<label className='text-sm font-medium text-gray-900 cursor-pointer'>
											🚀 Online Mode
										</label>
										<p className='text-xs text-gray-600'>
											Real-time data collection from
											device sensors. Instant start,
											device-centric approach.
										</p>
									</div>
								</div>
								<div className='mt-2 text-xs text-gray-500'>
									• One active experiment per device
									<br />
									• Automatic data collection
									<br />• Real-time monitoring
								</div>
							</div>

							<div
								className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${
									experimentMode === "Offline"
										? "border-orange-500 bg-orange-50"
										: "border-gray-200 hover:border-gray-300"
								}`}
								onClick={() => setExperimentMode("Offline")}
							>
								<div className='flex items-center'>
									<input
										type='radio'
										name='experiment_mode'
										value='Offline'
										checked={experimentMode === "Offline"}
										onChange={() =>
											setExperimentMode("Offline")
										}
										className='h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300'
									/>
									<div className='ml-3'>
										<label className='text-sm font-medium text-gray-900 cursor-pointer'>
											⚙️ Offline Mode
										</label>
										<p className='text-xs text-gray-600'>
											Manual data collection and script
											integration. Management panel
											approach.
										</p>
									</div>
								</div>
								<div className='mt-2 text-xs text-gray-500'>
									• Multiple experiments per device
									<br />
									• Script-based data collection
									<br />• Copyable IDs for integration
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
									Creation Failed
								</h3>
								<p className='text-sm text-red-700 mt-1'>
									{error}
								</p>
							</div>
						</div>
					</div>
				)}
				<div className='bg-white border border-gray-200 rounded-lg p-6'>
					{" "}
					<form
						onSubmit={handleSubmit}
						className='space-y-6'
					>
						<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
							<div>
								<label
									htmlFor='name'
									className='block text-sm font-medium text-gray-700 mb-2'
								>
									Experiment Name *
								</label>
								<input
									type='text'
									id='name'
									name='name'
									value={formData.name}
									onChange={handleInputChange}
									placeholder={
										experimentMode === "Online"
											? "e.g., Live Temperature Monitoring"
											: "e.g., Batch Data Collection #1"
									}
									className='w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
									required
									disabled={loading}
								/>
							</div>

							<div>
								<label
									htmlFor='start_date'
									className='block text-sm font-medium text-gray-700 mb-2'
								>
									Start Date *
								</label>
								<input
									type='date'
									id='start_date'
									name='start_date'
									value={formData.start_date}
									onChange={handleInputChange}
									className='w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
									required
									disabled={loading}
								/>
								{experimentMode === "Online" && (
									<p className='text-xs text-blue-600 mt-1'>
										Online experiments start immediately
										upon creation
									</p>
								)}
							</div>
						</div>
						<div>
							<label
								htmlFor='description'
								className='block text-sm font-medium text-gray-700 mb-2'
							>
								Description
							</label>
							<textarea
								id='description'
								name='description'
								value={formData.description}
								onChange={handleInputChange}
								placeholder='Describe the purpose and goals of this experiment'
								rows={3}
								className='w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
								disabled={loading}
							/>
						</div>
						<div>
							<label
								htmlFor='end_date'
								className='block text-sm font-medium text-gray-700 mb-2'
							>
								End Date (Optional)
							</label>
							<input
								type='date'
								id='end_date'
								name='end_date'
								value={formData.end_date}
								onChange={handleInputChange}
								className='w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
								disabled={loading}
							/>
							<p className='text-sm text-gray-500 mt-1'>
								Leave empty for ongoing experiments
							</p>
						</div>{" "}
						<div>
							<label
								className={`block text-sm font-medium text-gray-700 mb-2`}
							>
								Select Device *
							</label>
							{(() => {
								const availableDevices =
									experimentMode === "Online"
										? getAvailableDevicesForOnline()
										: devices;

								if (availableDevices.length > 0) {
									return (
										<div className='grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3'>
											{availableDevices.map((device) => {
												const hasActiveExperiment =
													activeExperiments.some(
														(exp) =>
															exp.device_id ===
																device.device_id &&
															(exp.status ===
																"Running" ||
																exp.status ===
																	"Created")
													);

												return (
													<label
														key={device.device_id}
														className={`flex items-center ${
															hasActiveExperiment &&
															experimentMode ===
																"Online"
																? "opacity-50"
																: ""
														}`}
													>
														<input
															type='radio'
															name='device_id'
															value={
																device.device_id
															}
															checked={
																formData.device_id ===
																device.device_id
															}
															onChange={
																handleMultiSelectChange
															}
															className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
															disabled={
																loading ||
																(hasActiveExperiment &&
																	experimentMode ===
																		"Online")
															}
														/>
														<span className='ml-2 text-sm text-gray-900'>
															{device.device_name ||
																device.device_id}
															<span className='text-gray-500 ml-1'>
																(
																{device.device_type ||
																	"Unknown"}
																)
															</span>
															{hasActiveExperiment &&
																experimentMode ===
																	"Online" && (
																	<span className='text-red-500 text-xs ml-1'>
																		(In Use)
																	</span>
																)}
														</span>
													</label>
												);
											})}
										</div>
									);
								} else {
									return (
										<div className='bg-yellow-50 border border-yellow-200 rounded-md p-3'>
											<p className='text-sm text-yellow-800'>
												{experimentMode === "Online"
													? "No devices available for online experiments. All active devices are currently in use."
													: "No active devices available. You need to register and activate devices before creating experiments."}
											</p>
											<Link
												href='/devices/register'
												className='text-sm text-blue-600 hover:text-blue-500'
											>
												Register a device →
											</Link>
										</div>
									);
								}
							})()}
							<p className='text-sm text-gray-500 mt-1'>
								{formData.device_id
									? `Selected device: ${formData.device_id}`
									: "No device selected"}
							</p>
							{experimentMode === "Online" && (
								<p className='text-xs text-green-600 mt-1'>
									💡 Only devices without active experiments
									are shown
								</p>
							)}
						</div>{" "}
						{/* Phenomena section - different for Online vs Offline */}
						{experimentMode === "Offline" ? (
							<div>
								<label className='block text-sm font-medium text-gray-700 mb-2'>
									Add Phenomena *
								</label>
								<div className='grid grid-cols-1 gap-2 border border-gray-200 rounded-md p-3'>
									{/* Current phenomena list */}
									{formData.phenomena.length > 0 ? (
										<div className='mb-4'>
											<h4 className='text-sm font-medium mb-2'>
												Current phenomena (
												{formData.phenomena.length}):
											</h4>
											<ul className='list-disc pl-5 space-y-1'>
												{formData.phenomena.map(
													(phenomenon, index) => (
														<li
															key={index}
															className='text-sm flex items-center justify-between'
														>
															<span>
																{
																	phenomenon.name
																}
																{phenomenon.description && (
																	<span className='text-gray-500 text-xs ml-1'>
																		-{" "}
																		{
																			phenomenon.description
																		}
																	</span>
																)}
															</span>
															<button
																type='button'
																onClick={() =>
																	handlePhenomenaRemove(
																		index
																	)
																}
																className='text-red-500 hover:text-red-700 text-xs'
															>
																Remove
															</button>
														</li>
													)
												)}
											</ul>
										</div>
									) : (
										<p className='text-sm text-gray-500 mb-2'>
											No phenomena added yet (at least one
											is required for offline experiments)
										</p>
									)}

									{/* Add new phenomenon */}
									<div className='border-t pt-3'>
										<h4 className='text-sm font-medium mb-2'>
											Add new phenomenon:
										</h4>
										<div className='space-y-2'>
											<input
												type='text'
												placeholder='Phenomenon name (required)'
												id='new-phenomenon-name'
												className='w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
												disabled={loading}
											/>
											<input
												type='text'
												placeholder='Description (optional)'
												id='new-phenomenon-description'
												className='w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
												disabled={loading}
											/>
											<button
												type='button'
												onClick={() => {
													const nameInput =
														document.getElementById(
															"new-phenomenon-name"
														) as HTMLInputElement;
													const descInput =
														document.getElementById(
															"new-phenomenon-description"
														) as HTMLInputElement;
													if (
														nameInput &&
														nameInput.value.trim()
													) {
														handlePhenomenaAdd(
															nameInput.value.trim(),
															descInput
																? descInput.value.trim()
																: ""
														);
														nameInput.value = "";
														if (descInput)
															descInput.value =
																"";
													}
												}}
												className='w-full bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors'
												disabled={loading}
											>
												Add Phenomenon
											</button>
										</div>
									</div>
								</div>
								<p className='text-xs text-orange-600 mt-1'>
									💡 Offline experiments require phenomena for
									script integration and data organization
								</p>
							</div>
						) : (
							<div className='bg-green-50 border border-green-200 rounded-md p-4'>
								<h4 className='text-sm font-medium text-green-800 mb-2'>
									🚀 Online Mode Features
								</h4>
								<ul className='text-xs text-green-700 space-y-1'>
									<li>
										• Automatic sensor data collection from
										the selected device
									</li>
									<li>• Real-time monitoring and alerts</li>
									<li>
										• No manual phenomena setup required
									</li>
									<li>
										• Instant experiment start upon creation
									</li>
								</ul>
							</div>
						)}{" "}
						<div className='flex space-x-4'>
							<button
								type='submit'
								disabled={
									loading ||
									!formData.name.trim() ||
									!formData.device_id ||
									(experimentMode === "Offline" &&
										formData.phenomena.length === 0)
								}
								className={`flex-1 ${
									experimentMode === "Online"
										? "bg-green-600 hover:bg-green-700"
										: "bg-orange-600 hover:bg-orange-700"
								} text-white px-4 py-2 rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors`}
							>
								{loading ? (
									<div className='flex items-center justify-center'>
										<div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
										Creating...
									</div>
								) : (
									`${
										experimentMode === "Online"
											? "Start"
											: "Create"
									} Experiment`
								)}
							</button>
							<button
								type='button'
								onClick={handleReset}
								disabled={loading}
								className='flex-1 bg-gray-100 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors'
							>
								Reset Form
							</button>
						</div>
					</form>
				</div>{" "}
				<div className='mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6'>
					<h3 className='text-lg font-medium text-gray-900 mb-3'>
						Experiment Modes Guide
					</h3>
					<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
						{/* Online Mode Info */}
						<div className='space-y-4'>
							<div className='flex items-start'>
								<span className='text-2xl mr-3'>🚀</span>
								<div>
									<h4 className='font-medium text-green-800 mb-1'>
										Online Mode
									</h4>
									<p className='text-sm text-gray-600'>
										Device-centric real-time data collection
										with automatic sensor readings and
										instant monitoring.
									</p>
								</div>
							</div>
							<div className='pl-11 space-y-2 text-sm text-gray-600'>
								<div>• One active experiment per device</div>
								<div>• Automatic data collection</div>
								<div>• Real-time monitoring dashboard</div>
								<div>• Immediate experiment start</div>
							</div>
						</div>

						{/* Offline Mode Info */}
						<div className='space-y-4'>
							<div className='flex items-start'>
								<span className='text-2xl mr-3'>⚙️</span>
								<div>
									<h4 className='font-medium text-orange-800 mb-1'>
										Offline Mode
									</h4>
									<p className='text-sm text-gray-600'>
										Management panel approach for
										script-based data collection with manual
										control and copyable IDs.
									</p>
								</div>
							</div>
							<div className='pl-11 space-y-2 text-sm text-gray-600'>
								<div>• Multiple experiments per device</div>
								<div>• Script-based data integration</div>
								<div>
									• Copyable experiment & phenomenon IDs
								</div>
								<div>• Manual experiment management</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
