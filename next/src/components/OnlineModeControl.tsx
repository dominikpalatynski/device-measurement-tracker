"use client";

import { useState, useEffect, useCallback } from "react";
import { onlineModeApi, LiveFault, ActiveCondition } from "@/services/api";
import { formatDuration } from "@/utils/dateUtils";

interface OnlineModeControlProps {
	deviceId: string;
	deviceName: string;
	onStatusChange?: (isActive: boolean) => void;
}

export default function OnlineModeControl({
	deviceId,
	deviceName,
	onStatusChange,
}: OnlineModeControlProps) {
	const [liveFault, setLiveFault] = useState<LiveFault | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [newConditionName, setNewConditionName] = useState("");
	const [newConditionDescription, setNewConditionDescription] = useState("");
	const [showConditionForm, setShowConditionForm] = useState(false);

	// Refresh live fault status
	const refreshStatus = useCallback(async () => {
		try {
			const fault = await onlineModeApi.getLiveFault(deviceId);
			setLiveFault(fault);
			onStatusChange?.(fault !== null);
		} catch (error) {
			console.error("Error refreshing status:", error);
		}
	}, [deviceId, onStatusChange]);

	// Load initial status
	useEffect(() => {
		refreshStatus();
	}, [refreshStatus]);

	// Auto-refresh every 5 seconds when fault is active
	useEffect(() => {
		if (!liveFault) return;

		const interval = setInterval(refreshStatus, 5000);
		return () => clearInterval(interval);
	}, [liveFault, refreshStatus]);

	const handleStartFault = async () => {
		setLoading(true);
		setError(null);
		try {
			const fault = await onlineModeApi.startLiveFault(
				deviceId,
				`Live Session - ${deviceName}`
			);
			setLiveFault(fault);
			onStatusChange?.(true);
		} catch (error) {
			setError(
				error instanceof Error ? error.message : "Failed to start fault"
			);
		} finally {
			setLoading(false);
		}
	};

	const handleStopFault = async () => {
		if (!liveFault) return;

		setLoading(true);
		setError(null);
		try {
			await onlineModeApi.stopLiveFault(deviceId);
			setLiveFault(null);
			onStatusChange?.(false);
		} catch (error) {
			setError(
				error instanceof Error ? error.message : "Failed to stop fault"
			);
		} finally {
			setLoading(false);
		}
	};

	const handleStartCondition = async () => {
		if (!liveFault || !newConditionName.trim()) return;

		setLoading(true);
		setError(null);
		try {
			await onlineModeApi.startCondition(deviceId, {
				name: newConditionName.trim(),
				description: newConditionDescription.trim() || undefined,
			});
			setNewConditionName("");
			setNewConditionDescription("");
			setShowConditionForm(false);
			await refreshStatus();
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: "Failed to start condition"
			);
		} finally {
			setLoading(false);
		}
	};

	const handleStopCondition = async () => {
		if (!liveFault?.current_condition) return;

		setLoading(true);
		setError(null);
		try {
			await onlineModeApi.stopCondition(
				deviceId,
				liveFault.current_condition.condition_id
			);
			await refreshStatus();
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: "Failed to stop condition"
			);
		} finally {
			setLoading(false);
		}
	};
	// No live fault - show start button
	if (!liveFault) {
		return (
			<div className='bg-white rounded-lg shadow p-6'>
				<div className='text-center'>
					<h3 className='text-lg font-medium text-gray-900 mb-4'>
						🚀 Start Live Fault
					</h3>
					<p className='text-gray-600 mb-6'>
						Begin real-time data collection and condition control
						for {deviceName}
					</p>

					{error && (
						<div className='mb-4 p-3 bg-red-50 border border-red-200 rounded-md'>
							<p className='text-red-800 text-sm'>{error}</p>
						</div>
					)}

					<button
						onClick={handleStartFault}
						disabled={loading}
						className='inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed'
					>
						{loading ? "Starting..." : "🎯 Start Live Fault"}
					</button>
				</div>
			</div>
		);
	}

	// Live fault is active
	return (
		<div className='bg-white rounded-lg shadow'>
			{/* Fault Header */}
			<div className='bg-green-50 border-b border-green-200 px-6 py-4'>
				<div className='flex items-center justify-between'>
					<div>
						<h3 className='text-lg font-medium text-green-900'>
							🔴 Live Fault Active
						</h3>
						<p className='text-sm text-green-700'>
							Duration: {formatDuration(liveFault.duration)} |
							Conditions: {liveFault.conditions_count}
						</p>
					</div>
					<button
						onClick={handleStopFault}
						disabled={loading}
						className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50'
					>
						{loading ? "Stopping..." : "🛑 End Session"}
					</button>
				</div>
			</div>

			<div className='p-6'>
				{error && (
					<div className='mb-4 p-3 bg-red-50 border border-red-200 rounded-md'>
						<p className='text-red-800 text-sm'>{error}</p>
					</div>
				)}

				{/* Current Condition Status */}
				{liveFault.current_condition ? (
					<div className='mb-6'>
						<div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
							<div className='flex items-center justify-between mb-3'>
								<h4 className='text-lg font-medium text-blue-900'>
									📊 Active Condition
								</h4>
								<button
									onClick={handleStopCondition}
									disabled={loading}
									className='inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50'
								>
									{loading
										? "Stopping..."
										: "⏹️ Stop Condition"}
								</button>
							</div>
							<div>
								<h5 className='font-medium text-blue-900'>
									{liveFault.current_condition.name}
								</h5>
								{liveFault.current_condition.description && (
									<p className='text-sm text-blue-700 mt-1'>
										{
											liveFault.current_condition
												.description
										}
									</p>
								)}
								<p className='text-sm text-blue-600 mt-2'>
									⏱️ Running for:{" "}
									{formatDuration(
										liveFault.current_condition.duration
									)}
								</p>
							</div>
						</div>
					</div>
				) : (
					// No active condition - show start form
					<div className='mb-6'>
						{!showConditionForm ? (
							<div className='text-center py-8'>
								<p className='text-gray-600 mb-4'>
									No condition is currently active. Start
									measuring a new condition.
								</p>
								<button
									onClick={() => setShowConditionForm(true)}
									className='inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700'
								>
									▶️ Start Condition
								</button>
							</div>
						) : (
							<div className='bg-gray-50 border border-gray-200 rounded-lg p-4'>
								<h4 className='text-lg font-medium text-gray-900 mb-4'>
									🔬 Start New Condition
								</h4>
								<div className='space-y-4'>
									<div>
										<label className='block text-sm font-medium text-gray-700 mb-1'>
											Condition Name *
										</label>
										<input
											type='text'
											value={newConditionName}
											onChange={(e) =>
												setNewConditionName(
													e.target.value
												)
											}
											placeholder='e.g., Temperature Test, Vibration Analysis'
											className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
										/>
									</div>
									<div>
										<label className='block text-sm font-medium text-gray-700 mb-1'>
											Description (Optional)
										</label>
										<textarea
											value={newConditionDescription}
											onChange={(e) =>
												setNewConditionDescription(
													e.target.value
												)
											}
											placeholder='Brief description of measurement conditions...'
											rows={2}
											className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
										/>
									</div>
									<div className='flex space-x-3'>
										<button
											onClick={handleStartCondition}
											disabled={
												loading ||
												!newConditionName.trim()
											}
											className='flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed'
										>
											{loading
												? "Starting..."
												: "🚀 Start Now"}
										</button>
										<button
											onClick={() => {
												setShowConditionForm(false);
												setNewConditionName("");
												setNewConditionDescription("");
											}}
											className='px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50'
										>
											Cancel
										</button>
									</div>
								</div>
							</div>
						)}
					</div>
				)}

				{/* Real-time Data Visualization Placeholder */}
				<div className='bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8'>
					<div className='text-center'>
						<h4 className='text-lg font-medium text-gray-900 mb-2'>
							📈 Real-time Data Visualization
						</h4>
						<p className='text-gray-600'>
							{liveFault.current_condition
								? "Live data charts will appear here during active condition measurement."
								: "Start a condition to see real-time data visualization."}
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
