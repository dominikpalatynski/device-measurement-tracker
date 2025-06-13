"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { experimentApi, Experiment } from "@/services/api";

export default function ExperimentsPage() {
	const [experiments, setExperiments] = useState<Experiment[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [filter, setFilter] = useState<
		"all" | "Active" | "Completed" | "Paused" | "Draft"
	>("all");

	useEffect(() => {
		loadExperiments();
	}, []);

	const loadExperiments = async () => {
		try {
			setLoading(true);
			setError(null);
			const response = await experimentApi.getExperiments();
			setExperiments(Array.isArray(response) ? response : []);
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to load experiments"
			);
		} finally {
			setLoading(false);
		}
	};

	const handleDeleteExperiment = async (experimentId: string) => {
		if (!confirm("Are you sure you want to delete this experiment?"))
			return;

		try {
			const success = await experimentApi.deleteExperiment(experimentId);
			if (success) {
				await loadExperiments(); // Reload experiments
			} else {
				setError("Failed to delete experiment");
			}
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to delete experiment"
			);
		}
	};

	const getStatusColor = (status: Experiment["status"]) => {
		switch (status) {
			case "Active":
				return "bg-green-100 text-green-800";
			case "Completed":
				return "bg-blue-100 text-blue-800";
			case "Paused":
				return "bg-yellow-100 text-yellow-800";
			case "Draft":
				return "bg-gray-100 text-gray-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	const getStatusIcon = (status: Experiment["status"]) => {
		switch (status) {
			case "Active":
				return "🟢";
			case "Completed":
				return "✅";
			case "Paused":
				return "⏸️";
			case "Draft":
				return "📝";
			default:
				return "❓";
		}
	};

	const filteredExperiments =
		filter === "all"
			? experiments
			: experiments.filter((experiment) => experiment.status === filter);

	if (loading) {
		return (
			<div className='flex items-center justify-center min-h-screen'>
				<div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600'></div>
			</div>
		);
	}

	return (
		<div className='container mx-auto px-4 py-8'>
			<div className='flex justify-between items-center mb-8'>
				<div>
					<h1 className='text-3xl font-bold text-gray-900'>
						Experiments
					</h1>
					<p className='text-gray-600 mt-1'>
						Manage and monitor your measurement experiments
					</p>
				</div>
				<div className='flex space-x-3'>
					<Link
						href='/experiments/register'
						className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700'
					>
						+ New Experiment
					</Link>
				</div>
			</div>

			{error && (
				<div className='mb-6 bg-red-50 border border-red-200 rounded-lg p-4'>
					<div className='flex items-center'>
						<span className='text-red-400 text-xl mr-3'>❌</span>
						<div>
							<h3 className='text-sm font-medium text-red-800'>
								Error
							</h3>
							<p className='text-sm text-red-700 mt-1'>{error}</p>
						</div>
						<button
							onClick={loadExperiments}
							className='ml-auto text-red-600 hover:text-red-500 text-sm'
						>
							Retry
						</button>
					</div>
				</div>
			)}

			{/* Filter buttons */}
			<div className='mb-6 flex flex-wrap gap-2'>
				{(
					["all", "Active", "Completed", "Paused", "Draft"] as const
				).map((status) => (
					<button
						key={status}
						onClick={() => setFilter(status)}
						className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
							filter === status
								? "bg-blue-600 text-white"
								: "bg-gray-100 text-gray-700 hover:bg-gray-200"
						}`}
					>
						{status === "all" ? "All Experiments" : status}
						{status !== "all" && (
							<span className='ml-2 bg-white/20 px-2 py-0.5 rounded text-xs'>
								{
									experiments.filter(
										(exp) => exp.status === status
									).length
								}
							</span>
						)}
					</button>
				))}
			</div>

			{filteredExperiments.length === 0 ? (
				<div className='text-center py-12 bg-gray-50 rounded-lg'>
					<h3 className='text-lg font-medium text-gray-900 mb-2'>
						{filter === "all"
							? "No experiments found"
							: `No ${filter.toLowerCase()} experiments`}
					</h3>
					<p className='text-gray-500 mb-6'>
						{filter === "all"
							? "Get started by creating your first experiment"
							: "Try adjusting your filter or create a new experiment"}
					</p>
					<Link
						href='/experiments/register'
						className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700'
					>
						Create Experiment
					</Link>
				</div>
			) : (
				<div className='bg-white border border-gray-200 rounded-lg overflow-hidden'>
					<div className='overflow-x-auto'>
						<table className='min-w-full divide-y divide-gray-200'>
							<thead className='bg-gray-50'>
								<tr>
									<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
										Experiment
									</th>
									<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
										Status
									</th>
									<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
										Duration
									</th>
									<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
										Devices
									</th>
									<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
										Phenomena
									</th>
									<th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
										Actions
									</th>
								</tr>
							</thead>
							<tbody className='bg-white divide-y divide-gray-200'>
								{filteredExperiments.map((experiment) => (
									<tr
										key={experiment.experiment_id}
										className='hover:bg-gray-50'
									>
										<td className='px-6 py-4 whitespace-nowrap'>
											<div className='flex items-center'>
												<div className='text-2xl mr-3'>
													{getStatusIcon(
														experiment.status
													)}
												</div>
												<div>
													<div className='text-sm font-medium text-gray-900'>
														<Link
															href={`/experiments/${experiment.experiment_id}`}
															className='hover:text-blue-600'
														>
															{experiment.name}
														</Link>
													</div>
													<div className='text-sm text-gray-500'>
														ID:{" "}
														{
															experiment.experiment_id
														}
													</div>
													{experiment.description && (
														<div className='text-sm text-gray-500 mt-1 truncate max-w-xs'>
															{
																experiment.description
															}
														</div>
													)}
												</div>
											</div>
										</td>
										<td className='px-6 py-4 whitespace-nowrap'>
											<span
												className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
													experiment.status
												)}`}
											>
												{experiment.status}
											</span>
										</td>
										<td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
											<div>
												<div>
													Started:{" "}
													{new Date(
														experiment.start_date
													).toLocaleDateString()}
												</div>
												{experiment.end_date && (
													<div>
														Ended:{" "}
														{new Date(
															experiment.end_date
														).toLocaleDateString()}
													</div>
												)}
											</div>
										</td>
										<td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
											{experiment.device_ids?.length || 0}{" "}
											devices
										</td>
										<td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
											{experiment.phenomena?.length || 0}{" "}
											phenomena
											{experiment.phenomena?.length >
												0 && (
												<div className='text-xs text-gray-500 mt-1'>
													{experiment.phenomena
														.slice(0, 2)
														.join(", ")}
													{experiment.phenomena
														.length > 2 && "..."}
												</div>
											)}
										</td>
										<td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
											<div className='flex items-center justify-end space-x-2'>
												<Link
													href={`/experiments/${experiment.experiment_id}`}
													className='text-blue-600 hover:text-blue-500'
												>
													View
												</Link>
												<Link
													href={`/experiments/${experiment.experiment_id}/edit`}
													className='text-yellow-600 hover:text-yellow-500'
												>
													Edit
												</Link>
												<button
													onClick={() =>
														handleDeleteExperiment(
															experiment.experiment_id
														)
													}
													className='text-red-600 hover:text-red-500'
												>
													Delete
												</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	);
}
