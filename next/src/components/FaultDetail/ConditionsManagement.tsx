import React from "react";
import Link from "next/link";
import { Condition } from "@/services/api";

interface ConditionsManagementProps {
	deviceId: string;
	faultId: string;
	offlineConditions: Condition[];
	showOfflineConditionForm: boolean;
	newOfflineConditionName: string;
	newOfflineConditionDescription: string;
	offlineConditionActionLoading: string | null;
	onToggleForm: () => void;
	onNameChange: (value: string) => void;
	onDescriptionChange: (value: string) => void;
	onCreateCondition: () => void;
	onStartCondition: (conditionId: string) => void;
	onStopCondition: (conditionId: string) => void;
	onFinishCondition: (conditionId: string) => void;
	onEditCondition: (condition: Condition) => void;
	onDeleteCondition: (conditionId: string) => void;
	copyToClipboard: (text: string, label: string) => void;
}

export default function ConditionsManagement({
	deviceId,
	faultId,
	offlineConditions,
	showOfflineConditionForm,
	newOfflineConditionName,
	newOfflineConditionDescription,
	offlineConditionActionLoading,
	onToggleForm,
	onNameChange,
	onDescriptionChange,
	onCreateCondition,
	onStartCondition,
	onStopCondition,
	onFinishCondition,
	onEditCondition,
	onDeleteCondition,
	copyToClipboard,
}: ConditionsManagementProps) {
	return (
		<div className='bg-white p-6 rounded-lg border border-gray-200'>
			<div className='flex justify-between items-center mb-4'>
				<h3 className='text-lg font-medium text-gray-900'>
					Conditions Management
				</h3>
				<button
					onClick={onToggleForm}
					className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700'
				>
					{showOfflineConditionForm ? "Cancel" : "Add Condition"}
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
								onChange={(e) => onNameChange(e.target.value)}
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
									onDescriptionChange(e.target.value)
								}
								className='w-full px-3 py-2 border border-gray-300 rounded-md'
								rows={2}
								placeholder='Describe the condition...'
							/>
						</div>
						<div className='flex space-x-2'>
							<button
								onClick={onCreateCondition}
								disabled={
									!newOfflineConditionName.trim() ||
									offlineConditionActionLoading === "create"
								}
								className='px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300'
							>
								{offlineConditionActionLoading === "create"
									? "Creating..."
									: "Create Condition"}
							</button>
							<button
								onClick={onToggleForm}
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
										<div className='flex items-center space-x-3 mb-2'>
											<Link
												href={`/devices/${deviceId}/faults/${faultId}/conditions/${condition.condition_id}`}
												className='font-medium text-blue-600 hover:text-blue-800 hover:underline'
											>
												{condition.name}
											</Link>
											<span
												className={`px-2 py-1 rounded-full text-xs font-medium ${
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
												<span
													className='text-blue-600 cursor-pointer hover:text-blue-800'
													onClick={() =>
														copyToClipboard(
															condition.condition_id,
															"Condition ID"
														)
													}
												>
													{condition.condition_id}
												</span>
											</div>
											<div>
												Created:{" "}
												{new Date(
													condition.created_at
												).toLocaleString()}
											</div>
											{condition.start_time && (
												<div>
													Started:{" "}
													{new Date(
														condition.start_time
													).toLocaleString()}
												</div>
											)}
											{condition.end_time && (
												<div>
													Ended:{" "}
													{new Date(
														condition.end_time
													).toLocaleString()}
												</div>
											)}
										</div>
									</div>

									<div className='flex space-x-2 ml-4'>
										<Link
											href={`/devices/${deviceId}/faults/${faultId}/conditions/${condition.condition_id}`}
											className='px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700'
										>
											View Details
										</Link>
										{condition.status === "Inactive" && (
											<button
												onClick={() =>
													onStartCondition(
														condition.condition_id
													)
												}
												disabled={
													offlineConditionActionLoading ===
													condition.condition_id
												}
												className='px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50'
											>
												{offlineConditionActionLoading ===
												condition.condition_id
													? "Starting..."
													: "Start"}
											</button>
										)}
										{condition.status === "Active" && (
											<>
												<button
													onClick={() =>
														onStopCondition(
															condition.condition_id
														)
													}
													disabled={
														offlineConditionActionLoading ===
														condition.condition_id
													}
													className='px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 disabled:opacity-50'
												>
													{offlineConditionActionLoading ===
													condition.condition_id
														? "Stopping..."
														: "Stop"}
												</button>
												<button
													onClick={() =>
														onFinishCondition(
															condition.condition_id
														)
													}
													disabled={
														offlineConditionActionLoading ===
														condition.condition_id
													}
													className='px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50'
												>
													{offlineConditionActionLoading ===
													condition.condition_id
														? "Finishing..."
														: "Finish"}
												</button>
											</>
										)}
										<button
											onClick={() =>
												onEditCondition(condition)
											}
											disabled={
												offlineConditionActionLoading ===
												condition.condition_id
											}
											className='px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 disabled:opacity-50'
										>
											Edit
										</button>
										<button
											onClick={() =>
												onDeleteCondition(
													condition.condition_id
												)
											}
											disabled={
												offlineConditionActionLoading ===
												condition.condition_id
											}
											className='px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50'
										>
											{offlineConditionActionLoading ===
											condition.condition_id
												? "Deleting..."
												: "Delete"}
										</button>
									</div>
								</div>

								{/* Usage Instructions */}
								{condition.status === "Inactive" && (
									<div className='mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm'>
										<div className='font-medium text-blue-900 mb-1'>
											Usage Instructions:
										</div>
										<div className='text-blue-800 space-y-1'>
											<div>
												1. Start this condition when
												ready to collect data
											</div>
											<div>
												2. Use the condition ID in your
												data upload scripts
											</div>
											<div>
												3. Finish the condition when
												data collection is complete
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
							Create conditions to prepare for data upload via
							scripts.
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
