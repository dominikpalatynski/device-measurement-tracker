"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PageLayout from "@/components/PageLayout";
import { experimentApi } from "@/services/api";

export default function CreateExperimentPage() {
	const params = useParams();
	const router = useRouter();
	const deviceId = params.deviceId as string;

	const [experimentName, setExperimentName] = useState("");
	const [experimentDescription, setExperimentDescription] = useState("");
	const [experimentType, setExperimentType] = useState<"batch" | "stream">(
		"stream"
	);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);

		try {
			const experimentData = {
				experiment_name: experimentName.trim(),
				description: experimentDescription.trim() || undefined,
				device_id: deviceId,
				type: experimentType,
				mode: "Offline" as const,
				status: "Created" as const,
			};

			const createdExperiment = await experimentApi.createExperiment(
				experimentData
			);

			if (createdExperiment) {
				// Redirect to the newly created experiment's page
				router.push(
					`/devices/${deviceId}/experiments/${createdExperiment.experiment_id}`
				);
			} else {
				setError("Failed to create experiment. Please try again.");
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

	const breadcrumbs = [
		{ label: "Home", href: "/" },
		{ label: "Devices", href: "/devices" },
		{ label: "Device", href: `/devices/${deviceId}` },
		{
			label: "Create Experiment",
			href: `/devices/${deviceId}/experiments/create`,
			current: true,
		},
	];

	return (
		<PageLayout
			title='Create Experiment'
			breadcrumbs={breadcrumbs}
		>
			{" "}
			<div className='max-w-2xl mx-auto'>
				<div className='mb-6'>
					<h2 className='text-2xl font-bold text-gray-900 mb-2'>
						Create New Experiment
					</h2>
					<p className='text-gray-600'>
						Set up a new experiment to organize and collect
						measurement data from your device.
					</p>
				</div>

				<div className='bg-white rounded-lg border border-gray-200 p-6'>
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

					<form
						onSubmit={handleSubmit}
						className='space-y-6'
					>
						{" "}
						<div>
							<label
								htmlFor='experimentName'
								className='block text-sm font-medium text-gray-700 mb-2'
							>
								Experiment Name *
							</label>
							<input
								type='text'
								id='experimentName'
								value={experimentName}
								onChange={(e) =>
									setExperimentName(e.target.value)
								}
								className='w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500'
								placeholder='Enter experiment name...'
								required
							/>
						</div>
						<div>
							<label
								htmlFor='experimentType'
								className='block text-sm font-medium text-gray-700 mb-2'
							>
								Experiment Type *
							</label>
							<select
								id='experimentType'
								value={experimentType}
								onChange={(e) =>
									setExperimentType(
										e.target.value as "batch" | "stream"
									)
								}
								className='w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500'
								required
							>
								<option value='stream'>
									🔄 Stream - Continuous real-time data
									collection
								</option>
								<option value='batch'>
									📦 Batch - Predefined data upload sessions
								</option>
							</select>
							<p className='mt-1 text-sm text-gray-500'>
								{experimentType === "stream"
									? "Stream experiments collect data continuously in real-time from connected devices."
									: "Batch experiments are designed for uploading and processing predefined datasets."}
							</p>
						</div>
						<div>
							<label
								htmlFor='experimentDescription'
								className='block text-sm font-medium text-gray-700 mb-2'
							>
								Description
							</label>
							<textarea
								id='experimentDescription'
								value={experimentDescription}
								onChange={(e) =>
									setExperimentDescription(e.target.value)
								}
								rows={4}
								className='w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500'
								placeholder='Enter experiment description...'
							/>
						</div>
						<div className='flex items-center justify-between pt-6'>
							<Link
								href={`/devices/${deviceId}`}
								className='px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50'
							>
								Cancel
							</Link>
							<button
								type='submit'
								disabled={loading || !experimentName.trim()}
								className='px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed'
							>
								{loading ? "Creating..." : "Create Experiment"}
							</button>
						</div>
					</form>
				</div>
			</div>
		</PageLayout>
	);
}
