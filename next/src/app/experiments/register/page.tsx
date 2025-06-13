"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
	experimentApi,
	deviceApi,
	getPhenomena,
	Device,
	Experiment,
	Phenomenon,
} from "@/services/api";

export default function ExperimentRegisterPage() {
	const router = useRouter();
	const [formData, setFormData] = useState({
		name: "",
		description: "",
		start_date: "",
		end_date: "",
		device_ids: [] as string[],
		phenomena: [] as string[],
	});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<Experiment | null>(null);

	// Data for dropdowns
	const [devices, setDevices] = useState<Device[]>([]);
	const [phenomena, setPhenomena] = useState<Phenomenon[]>([]);
	const [loadingData, setLoadingData] = useState(true);

	useEffect(() => {
		loadFormData();
	}, []);

	const loadFormData = async () => {
		try {
			setLoadingData(true);
			const [devicesData, phenomenaData] = await Promise.allSettled([
				deviceApi.getDevices(),
				getPhenomena(),
			]);

			if (devicesData.status === "fulfilled") {
				setDevices(
					devicesData.value.filter((d) => d.status === "Active")
				);
			}

			if (phenomenaData.status === "fulfilled") {
				setPhenomena(phenomenaData.value);
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
		name: "device_ids" | "phenomena",
		value: string
	) => {
		setFormData((prev) => ({
			...prev,
			[name]: prev[name].includes(value)
				? prev[name].filter((item) => item !== value)
				: [...prev[name], value],
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

		if (formData.device_ids.length === 0) {
			setError("At least one device must be selected");
			return;
		}

		try {
			setLoading(true);
			setError(null);

			const experiment = await experimentApi.createExperiment({
				name: formData.name.trim(),
				description: formData.description.trim() || undefined,
				start_date: formData.start_date,
				end_date: formData.end_date || undefined,
				device_ids: formData.device_ids,
				phenomena: formData.phenomena,
				status: "Active",
			});

			if (experiment) {
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
			start_date: "",
			end_date: "",
			device_ids: [],
			phenomena: [],
		});
		setError(null);
		setSuccess(null);
	};

	const handleViewExperiment = () => {
		if (success) {
			router.push(`/experiments/${success.experiment_id}`);
		}
	};

	const handleCreateAnother = () => {
		handleReset();
	};

	if (success) {
		return (
			<div className='container mx-auto px-4 py-8'>
				<div className='max-w-2xl mx-auto'>
					<div className='bg-green-50 border border-green-200 rounded-lg p-6'>
						<div className='flex items-center mb-4'>
							<span className='text-green-400 text-3xl mr-3'>
								✅
							</span>
							<div>
								<h2 className='text-xl font-bold text-green-800'>
									Experiment Created Successfully!
								</h2>
								<p className='text-green-700'>
									Your experiment is now active and collecting
									data.
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
								<div className='flex justify-between'>
									<dt className='text-sm font-medium text-gray-500'>
										Experiment ID:
									</dt>
									<dd className='text-sm text-gray-900 font-mono'>
										{success.experiment_id}
									</dd>
								</div>
								<div className='flex justify-between'>
									<dt className='text-sm font-medium text-gray-500'>
										Status:
									</dt>
									<dd className='text-sm'>
										<span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800'>
											{success.status}
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
										Devices:
									</dt>
									<dd className='text-sm text-gray-900'>
										{success.device_ids.length} selected
									</dd>
								</div>
								<div className='flex justify-between'>
									<dt className='text-sm font-medium text-gray-500'>
										Phenomena:
									</dt>
									<dd className='text-sm text-gray-900'>
										{success.phenomena.length} selected
									</dd>
								</div>
							</dl>
						</div>

						<div className='flex space-x-4'>
							<button
								onClick={handleViewExperiment}
								className='flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors'
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
									placeholder='Enter experiment name'
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
						</div>

						<div>
							<label className='block text-sm font-medium text-gray-700 mb-2'>
								Select Devices *
							</label>
							{devices.length > 0 ? (
								<div className='grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3'>
									{devices.map((device) => (
										<label
											key={device.device_id}
											className='flex items-center'
										>
											<input
												type='checkbox'
												checked={formData.device_ids.includes(
													device.device_id
												)}
												onChange={() =>
													handleMultiSelectChange(
														"device_ids",
														device.device_id
													)
												}
												className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
												disabled={loading}
											/>
											<span className='ml-2 text-sm text-gray-900'>
												{device.device_name}
												<span className='text-gray-500 ml-1'>
													({device.device_type})
												</span>
											</span>
										</label>
									))}
								</div>
							) : (
								<div className='bg-yellow-50 border border-yellow-200 rounded-md p-3'>
									<p className='text-sm text-yellow-800'>
										No active devices available. You need to
										register and activate devices before
										creating experiments.
									</p>
									<Link
										href='/devices/register'
										className='text-sm text-blue-600 hover:text-blue-500'
									>
										Register a device →
									</Link>
								</div>
							)}
							<p className='text-sm text-gray-500 mt-1'>
								Selected: {formData.device_ids.length} device(s)
							</p>
						</div>

						<div>
							<label className='block text-sm font-medium text-gray-700 mb-2'>
								Select Phenomena (Optional)
							</label>
							{phenomena.length > 0 ? (
								<div className='grid grid-cols-1 md:grid-cols-2 gap-2 max-h-32 overflow-y-auto border border-gray-200 rounded-md p-3'>
									{phenomena.map((phenomenon) => (
										<label
											key={phenomenon.id}
											className='flex items-center'
										>
											<input
												type='checkbox'
												checked={formData.phenomena.includes(
													phenomenon.name
												)}
												onChange={() =>
													handleMultiSelectChange(
														"phenomena",
														phenomenon.name
													)
												}
												className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
												disabled={loading}
											/>
											<span className='ml-2 text-sm text-gray-900'>
												{phenomenon.name}
												{phenomenon.unit && (
													<span className='text-gray-500 ml-1'>
														({phenomenon.unit})
													</span>
												)}
											</span>
										</label>
									))}
								</div>
							) : (
								<div className='bg-gray-50 border border-gray-200 rounded-md p-3'>
									<p className='text-sm text-gray-600'>
										No phenomena configured in the system
										yet.
									</p>
								</div>
							)}
							<p className='text-sm text-gray-500 mt-1'>
								Selected: {formData.phenomena.length}{" "}
								phenomenon(a)
							</p>
						</div>

						<div className='flex space-x-4'>
							<button
								type='submit'
								disabled={
									loading ||
									!formData.name.trim() ||
									formData.device_ids.length === 0
								}
								className='flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors'
							>
								{loading ? (
									<div className='flex items-center justify-center'>
										<div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
										Creating...
									</div>
								) : (
									"Create Experiment"
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
				</div>

				<div className='mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6'>
					<h3 className='text-lg font-medium text-gray-900 mb-3'>
						About Experiments
					</h3>
					<div className='space-y-4'>
						<div className='flex items-start'>
							<span className='text-2xl mr-3'>🎯</span>
							<div>
								<h4 className='font-medium text-gray-900'>
									Organize Data Collection
								</h4>
								<p className='text-sm text-gray-600'>
									Experiments help you organize measurement
									data collection from multiple devices for
									specific research goals.
								</p>
							</div>
						</div>
						<div className='flex items-start'>
							<span className='text-2xl mr-3'>📊</span>
							<div>
								<h4 className='font-medium text-gray-900'>
									Track Progress
								</h4>
								<p className='text-sm text-gray-600'>
									Monitor experiment progress, device status,
									and data collection metrics in real-time.
								</p>
							</div>
						</div>
						<div className='flex items-start'>
							<span className='text-2xl mr-3'>🔬</span>
							<div>
								<h4 className='font-medium text-gray-900'>
									Analyze Results
								</h4>
								<p className='text-sm text-gray-600'>
									View aggregated data, statistics, and
									insights from all devices participating in
									the experiment.
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
