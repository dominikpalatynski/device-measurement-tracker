import React from "react";
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
import {
	Device,
	LiveFault,
	ActiveCondition,
	MongoMeasurementData,
} from "@/services/api";

interface LiveConditionsControlProps {
	device: Device;
	liveFault: LiveFault;
	conditions: ActiveCondition[];
	conditionsData: MongoMeasurementData[];
	chartViewMode: "chart" | "stats";
	showConditionForm: boolean;
	newConditionName: string;
	newConditionDescription: string;
	onChartViewModeChange: (mode: "chart" | "stats") => void;
	onToggleConditionForm: () => void;
	onConditionNameChange: (value: string) => void;
	onConditionDescriptionChange: (value: string) => void;
	onStartCondition: () => void;
	onStopCondition: (conditionId: string) => void;
}

export default function LiveConditionsControl({
	device,
	liveFault,
	conditions,
	conditionsData,
	chartViewMode,
	showConditionForm,
	newConditionName,
	newConditionDescription,
	onChartViewModeChange,
	onToggleConditionForm,
	onConditionNameChange,
	onConditionDescriptionChange,
	onStartCondition,
	onStopCondition,
}: LiveConditionsControlProps) {
	// Process chart data
	const chartData = conditionsData
		.slice(0, 50)
		.reverse()
		.map((item, index) => {
			const timestamp = new Date(
				item.timestamp || (item as any).timestamp_unix * 1000
			);

			// Extract numeric values from data
			const dataValues: any = {};
			const itemData = (item as any).data;
			if (itemData) {
				Object.entries(itemData).forEach(([key, value]) => {
					if (typeof value === "number") {
						dataValues[key] = value;
					}
				});
			}

			return {
				index,
				time: timestamp.toLocaleTimeString(),
				timestamp: timestamp.getTime(),
				...dataValues,
			};
		});

	// Calculate statistics
	const calculateStats = (data: any[], key: string) => {
		const values = data
			.map((item) => item[key])
			.filter((val) => typeof val === "number");
		if (values.length === 0) return { avg: 0, min: 0, max: 0, latest: 0 };

		return {
			avg: values.reduce((a, b) => a + b, 0) / values.length,
			min: Math.min(...values),
			max: Math.max(...values),
			latest: values[values.length - 1] || 0,
		};
	};

	// Get unique data keys for stats
	const dataKeys =
		conditionsData.length > 0
			? Object.keys((conditionsData[0] as any).data || {}).filter(
					(key) =>
						typeof (conditionsData[0] as any).data![key] ===
						"number"
			  )
			: [];

	return (
		<div className='bg-white p-6 rounded-lg border border-gray-200'>
			<div className='flex justify-between items-center mb-4'>
				<h3 className='text-lg font-medium text-gray-900'>
					🔴 Live Conditions Control
				</h3>
				<div className='flex items-center space-x-3'>
					<div className='flex bg-gray-100 rounded-lg p-1'>
						<button
							onClick={() => onChartViewModeChange("chart")}
							className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
								chartViewMode === "chart"
									? "bg-white text-blue-600 shadow"
									: "text-gray-600 hover:text-gray-800"
							}`}
						>
							📈 Chart
						</button>
						<button
							onClick={() => onChartViewModeChange("stats")}
							className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
								chartViewMode === "stats"
									? "bg-white text-blue-600 shadow"
									: "text-gray-600 hover:text-gray-800"
							}`}
						>
							📊 Stats
						</button>
					</div>
					<button
						onClick={onToggleConditionForm}
						className='px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700'
					>
						{showConditionForm ? "Cancel" : "Add Condition"}
					</button>
				</div>
			</div>

			{/* Current Active Condition with Live Data */}
			{liveFault.current_condition ? (
				<div className='bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200 rounded-lg p-6 mb-6'>
					<div className='flex items-center justify-between mb-4'>
						<div className='flex items-center space-x-3'>
							<div className='w-3 h-3 bg-green-500 rounded-full animate-pulse'></div>
							<h4 className='text-lg font-bold text-green-900'>
								Active: {liveFault.current_condition.name}
							</h4>
							<span className='px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium'>
								Recording Data
							</span>
						</div>
						<button
							onClick={() =>
								onStopCondition(
									liveFault.current_condition!.condition_id
								)
							}
							className='px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700'
						>
							Stop Condition
						</button>
					</div>

					{liveFault.current_condition.description && (
						<div className='mb-4 p-3 bg-white rounded-lg border border-green-200'>
							<p className='text-sm text-gray-700'>
								{liveFault.current_condition.description}
							</p>
						</div>
					)}

					<div className='bg-white rounded-lg border border-green-200 p-4'>
						<div className='flex items-center justify-between mb-4'>
							<h5 className='font-medium text-gray-900'>
								Live Data Stream
							</h5>
							<div className='text-sm text-gray-500'>
								{conditionsData.length} measurements collected
							</div>
						</div>

						{chartViewMode === "chart" && (
							<div className='h-64'>
								{chartData.length > 0 ? (
									<ResponsiveContainer
										width='100%'
										height='100%'
									>
										<LineChart data={chartData}>
											<CartesianGrid strokeDasharray='3 3' />
											<XAxis
												dataKey='time'
												tick={{ fontSize: 12 }}
											/>
											<YAxis tick={{ fontSize: 12 }} />
											<Tooltip />
											<Legend />
											{dataKeys
												.slice(0, 3)
												.map((key, index) => (
													<Line
														key={key}
														type='monotone'
														dataKey={key}
														stroke={
															[
																"#3b82f6",
																"#ef4444",
																"#10b981",
															][index]
														}
														strokeWidth={2}
														dot={false}
													/>
												))}
										</LineChart>
									</ResponsiveContainer>
								) : (
									<div className='flex items-center justify-center h-full bg-gray-50 rounded-lg'>
										<p className='text-gray-500'>
											Waiting for data...
										</p>
									</div>
								)}
							</div>
						)}

						{chartViewMode === "stats" && (
							<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
								{chartData.length > 0 ? (
									dataKeys.length > 0 ? (
										dataKeys.slice(0, 4).map((key) => {
											const stats = calculateStats(
												chartData,
												key
											);
											return (
												<div
													key={key}
													className='bg-gray-50 border border-gray-200 rounded-lg p-3'
												>
													<h6 className='font-medium text-gray-900 mb-2'>
														{key}
													</h6>
													<div className='grid grid-cols-2 gap-2 text-sm'>
														<div>
															<span className='text-gray-600'>
																Avg:
															</span>
															<span className='ml-1 font-medium'>
																{stats.avg.toFixed(
																	2
																)}
															</span>
														</div>
														<div>
															<span className='text-gray-600'>
																Latest:
															</span>
															<span className='ml-1 font-medium'>
																{stats.latest.toFixed(
																	2
																)}
															</span>
														</div>
														<div>
															<span className='text-gray-600'>
																Min:
															</span>
															<span className='ml-1 font-medium'>
																{stats.min.toFixed(
																	2
																)}
															</span>
														</div>
														<div>
															<span className='text-gray-600'>
																Max:
															</span>
															<span className='ml-1 font-medium'>
																{stats.max.toFixed(
																	2
																)}
															</span>
														</div>
													</div>
												</div>
											);
										})
									) : (
										<div className='col-span-2 text-center py-4 text-gray-500'>
											No numeric data available for
											statistics
										</div>
									)
								) : (
									<div className='col-span-2 text-center py-4 text-gray-500'>
										Waiting for data...
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			) : (
				<div className='bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6 text-center'>
					<h4 className='text-lg font-medium text-gray-900 mb-2'>
						No Active Condition
					</h4>
					<p className='text-gray-600 mb-4'>
						Start a new condition to begin collecting data
					</p>
					<button
						onClick={onToggleConditionForm}
						className='px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700'
					>
						Start Condition
					</button>
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
									onConditionNameChange(e.target.value)
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
									onConditionDescriptionChange(e.target.value)
								}
								className='w-full px-3 py-2 border border-gray-300 rounded-md'
								rows={2}
								placeholder='Describe the condition...'
							/>
						</div>
						<div className='flex space-x-2'>
							<button
								onClick={onStartCondition}
								disabled={!newConditionName.trim()}
								className='px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300'
							>
								Start Condition
							</button>
							<button
								onClick={onToggleConditionForm}
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
						{conditions.map((condition, index) => (
							<div
								key={condition.condition_id}
								className='bg-gray-50 border border-gray-200 rounded-lg p-3'
							>
								<div className='flex items-center justify-between'>
									<div className='flex items-center space-x-3'>
										<span className='font-medium text-gray-900'>
											{condition.name}
										</span>
										<span
											className={`px-2 py-1 rounded-full text-xs font-medium ${
												condition.status === "Active"
													? "bg-green-100 text-green-800"
													: "bg-gray-100 text-gray-800"
											}`}
										>
											{condition.status}
										</span>
									</div>
									{condition.status === "Active" && (
										<button
											onClick={() =>
												onStopCondition(
													condition.condition_id
												)
											}
											className='px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700'
										>
											Stop
										</button>
									)}
								</div>
								<div className='mt-1'>
									{condition.description && (
										<p className='text-sm text-gray-600'>
											{condition.description}
										</p>
									)}
									<div className='text-xs text-gray-500 mt-1'>
										<span>
											Started:{" "}
											{new Date(
												condition.start_time
											).toLocaleString()}
										</span>
										{condition.duration && (
											<span className='ml-2'>
												Duration:{" "}
												{Math.floor(
													condition.duration / 60
												)}{" "}
												min
											</span>
										)}
									</div>
								</div>
							</div>
						))}
					</div>
				) : (
					<div className='text-center py-4 text-gray-500'>
						No conditions recorded yet. Add one to start measuring
						specific conditions.
					</div>
				)}
			</div>
		</div>
	);
}
