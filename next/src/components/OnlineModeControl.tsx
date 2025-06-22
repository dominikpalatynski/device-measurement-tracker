"use client";

import { useState, useEffect, useCallback } from "react";
import {
	onlineModeApi,
	LiveExperiment,
	ActivePhenomenon,
} from "@/services/api";
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
	const [liveExperiment, setLiveExperiment] = useState<LiveExperiment | null>(
		null
	);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [newPhenomenonName, setNewPhenomenonName] = useState("");
	const [newPhenomenonDescription, setNewPhenomenonDescription] =
		useState("");
	const [showPhenomenonForm, setShowPhenomenonForm] = useState(false);

	// Refresh live experiment status
	const refreshStatus = useCallback(async () => {
		try {
			const experiment = await onlineModeApi.getLiveExperiment(deviceId);
			setLiveExperiment(experiment);
			onStatusChange?.(experiment !== null);
		} catch (error) {
			console.error("Error refreshing status:", error);
		}
	}, [deviceId, onStatusChange]);

	// Load initial status
	useEffect(() => {
		refreshStatus();
	}, [refreshStatus]);

	// Auto-refresh every 5 seconds when experiment is active
	useEffect(() => {
		if (!liveExperiment) return;

		const interval = setInterval(refreshStatus, 5000);
		return () => clearInterval(interval);
	}, [liveExperiment, refreshStatus]);

	const handleStartExperiment = async () => {
		setLoading(true);
		setError(null);
		try {
			const experiment = await onlineModeApi.startLiveExperiment(
				deviceId,
				`Live Session - ${deviceName}`
			);
			setLiveExperiment(experiment);
			onStatusChange?.(true);
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: "Failed to start experiment"
			);
		} finally {
			setLoading(false);
		}
	};

	const handleStopExperiment = async () => {
		if (!liveExperiment) return;

		setLoading(true);
		setError(null);
		try {
			await onlineModeApi.stopLiveExperiment(deviceId);
			setLiveExperiment(null);
			onStatusChange?.(false);
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: "Failed to stop experiment"
			);
		} finally {
			setLoading(false);
		}
	};

	const handleStartPhenomenon = async () => {
		if (!liveExperiment || !newPhenomenonName.trim()) return;

		setLoading(true);
		setError(null);
		try {
			await onlineModeApi.startPhenomenon(deviceId, {
				name: newPhenomenonName.trim(),
				description: newPhenomenonDescription.trim() || undefined,
			});
			setNewPhenomenonName("");
			setNewPhenomenonDescription("");
			setShowPhenomenonForm(false);
			await refreshStatus();
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: "Failed to start phenomenon"
			);
		} finally {
			setLoading(false);
		}
	};

	const handleStopPhenomenon = async () => {
		if (!liveExperiment?.current_phenomenon) return;

		setLoading(true);
		setError(null);
		try {
			await onlineModeApi.stopPhenomenon(deviceId);
			await refreshStatus();
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: "Failed to stop phenomenon"
			);
		} finally {
			setLoading(false);
		}
	};
	// No live experiment - show start button
	if (!liveExperiment) {
		return (
			<div className='bg-white rounded-lg shadow p-6'>
				<div className='text-center'>
					<h3 className='text-lg font-medium text-gray-900 mb-4'>
						🚀 Start Live Experiment
					</h3>
					<p className='text-gray-600 mb-6'>
						Begin real-time data collection and phenomenon control
						for {deviceName}
					</p>

					{error && (
						<div className='mb-4 p-3 bg-red-50 border border-red-200 rounded-md'>
							<p className='text-red-800 text-sm'>{error}</p>
						</div>
					)}

					<button
						onClick={handleStartExperiment}
						disabled={loading}
						className='inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed'
					>
						{loading ? "Starting..." : "🎯 Start Live Experiment"}
					</button>
				</div>
			</div>
		);
	}

	// Live experiment is active
	return (
		<div className='bg-white rounded-lg shadow'>
			{/* Experiment Header */}
			<div className='bg-green-50 border-b border-green-200 px-6 py-4'>
				<div className='flex items-center justify-between'>
					<div>
						<h3 className='text-lg font-medium text-green-900'>
							🔴 Live Experiment Active
						</h3>
						<p className='text-sm text-green-700'>
							Duration: {formatDuration(liveExperiment.duration)}{" "}
							| Phenomena: {liveExperiment.phenomena_count}
						</p>
					</div>
					<button
						onClick={handleStopExperiment}
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

				{/* Current Phenomenon Status */}
				{liveExperiment.current_phenomenon ? (
					<div className='mb-6'>
						<div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
							<div className='flex items-center justify-between mb-3'>
								<h4 className='text-lg font-medium text-blue-900'>
									📊 Active Phenomenon
								</h4>
								<button
									onClick={handleStopPhenomenon}
									disabled={loading}
									className='inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50'
								>
									{loading
										? "Stopping..."
										: "⏹️ Stop Phenomenon"}
								</button>
							</div>
							<div>
								<h5 className='font-medium text-blue-900'>
									{liveExperiment.current_phenomenon.name}
								</h5>
								{liveExperiment.current_phenomenon
									.description && (
									<p className='text-sm text-blue-700 mt-1'>
										{
											liveExperiment.current_phenomenon
												.description
										}
									</p>
								)}
								<p className='text-sm text-blue-600 mt-2'>
									⏱️ Running for:{" "}
									{formatDuration(
										liveExperiment.current_phenomenon
											.duration
									)}
								</p>
							</div>
						</div>
					</div>
				) : (
					// No active phenomenon - show start form
					<div className='mb-6'>
						{!showPhenomenonForm ? (
							<div className='text-center py-8'>
								<p className='text-gray-600 mb-4'>
									No phenomenon is currently active. Start
									measuring a new condition.
								</p>
								<button
									onClick={() => setShowPhenomenonForm(true)}
									className='inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700'
								>
									▶️ Start Phenomenon
								</button>
							</div>
						) : (
							<div className='bg-gray-50 border border-gray-200 rounded-lg p-4'>
								<h4 className='text-lg font-medium text-gray-900 mb-4'>
									🔬 Start New Phenomenon
								</h4>
								<div className='space-y-4'>
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
											placeholder='e.g., Temperature Test, Vibration Analysis'
											className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
										/>
									</div>
									<div>
										<label className='block text-sm font-medium text-gray-700 mb-1'>
											Description (Optional)
										</label>
										<textarea
											value={newPhenomenonDescription}
											onChange={(e) =>
												setNewPhenomenonDescription(
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
											onClick={handleStartPhenomenon}
											disabled={
												loading ||
												!newPhenomenonName.trim()
											}
											className='flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed'
										>
											{loading
												? "Starting..."
												: "🚀 Start Now"}
										</button>
										<button
											onClick={() => {
												setShowPhenomenonForm(false);
												setNewPhenomenonName("");
												setNewPhenomenonDescription("");
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
							{liveExperiment.current_phenomenon
								? "Live data charts will appear here during active phenomenon measurement."
								: "Start a phenomenon to see real-time data visualization."}
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
