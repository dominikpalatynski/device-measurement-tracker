"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
	Brush,
	ReferenceLine,
	ReferenceArea,
} from "recharts";

interface DataPoint {
	timestamp: number;
	timestampFormatted: string;
	value: number;
	index: number;
	[key: string]: any;
}

interface ZoomState {
	left: number | null;
	right: number | null;
	refAreaLeft: string | number | null;
	refAreaRight: string | number | null;
	top: number | null;
	bottom: number | null;
	animation: boolean;
}

interface AdvancedZoomChartProps {
	data: DataPoint[];
	dataKey: string;
	xAxisKey: string;
	title: string;
	color?: string;
	height?: number;
	enableBrush?: boolean;
	enableMagnifier?: boolean;
	enableCrosshair?: boolean;
	downsampleThreshold?: number;
}

const AdvancedZoomChart: React.FC<AdvancedZoomChartProps> = ({
	data,
	dataKey = "value",
	xAxisKey = "timestampFormatted",
	title,
	color = "#2563eb",
	height = 400,
	enableBrush = true,
	enableMagnifier = true,
	enableCrosshair = true,
	downsampleThreshold = 10000,
}) => {
	const [zoomState, setZoomState] = useState<ZoomState>({
		left: null,
		right: null,
		refAreaLeft: null,
		refAreaRight: null,
		top: null,
		bottom: null,
		animation: true,
	});

	const [brushDomain, setBrushDomain] = useState<[number, number] | null>(
		null
	);
	const [processedData, setProcessedData] = useState<DataPoint[]>([]);
	const [zoomLevel, setZoomLevel] = useState(1);
	const [zoomHistory, setZoomHistory] = useState<
		Array<{
			domain: [number, number] | null;
			yDomain: [number, number] | null;
		}>
	>([]);
	const [currentZoomIndex, setCurrentZoomIndex] = useState(-1);
	const [magnifierActive, setMagnifierActive] = useState(false);
	const [crosshairPos, setCrosshairPos] = useState<{
		x: number;
		y: number;
	} | null>(null);

	// Downsample data for performance when dealing with large datasets
	const downsampleData = useCallback(
		(data: DataPoint[], maxPoints: number) => {
			if (data.length <= maxPoints) return data;

			const step = Math.ceil(data.length / maxPoints);
			const downsampled: DataPoint[] = [];

			// Always include first point
			downsampled.push(data[0]);

			// Douglas-Peucker-inspired downsampling for better curve preservation
			for (let i = step; i < data.length - step; i += step) {
				// Take max, min, and actual point to preserve peaks and valleys
				const window = data.slice(i - step, i + step);
				const maxPoint = window.reduce((max, curr) =>
					curr[dataKey] > max[dataKey] ? curr : max
				);
				const minPoint = window.reduce((min, curr) =>
					curr[dataKey] < min[dataKey] ? curr : min
				);

				if (maxPoint !== minPoint) {
					downsampled.push(minPoint);
					downsampled.push(maxPoint);
				} else {
					downsampled.push(data[i]);
				}
			}

			// Always include last point
			downsampled.push(data[data.length - 1]);

			return downsampled.sort((a, b) => a.index - b.index);
		},
		[dataKey]
	);

	// Process data based on current zoom level and brush selection
	useEffect(() => {
		let filtered = data;

		// Apply brush filter if active
		if (brushDomain) {
			filtered = data.slice(brushDomain[0], brushDomain[1] + 1);
		}

		// Apply downsampling based on zoom level
		const effectiveThreshold = Math.floor(downsampleThreshold / zoomLevel);
		const processed = downsampleData(filtered, effectiveThreshold);

		setProcessedData(processed);
	}, [data, brushDomain, zoomLevel, downsampleData, downsampleThreshold]);

	const getAxisYDomain = (
		from: number,
		to: number,
		ref: string,
		offset: number
	) => {
		const refData = processedData.slice(from - 1, to);
		let [bottom, top] = [refData[0]?.[ref] || 0, refData[0]?.[ref] || 0];

		refData.forEach((d) => {
			if (d[ref] > top) top = d[ref];
			if (d[ref] < bottom) bottom = d[ref];
		});

		const range = top - bottom;
		return [bottom - range * offset, top + range * offset];
	};

	const zoom = () => {
		let { refAreaLeft, refAreaRight } = zoomState;

		if (
			refAreaLeft === refAreaRight ||
			refAreaRight === null ||
			refAreaLeft === null
		) {
			setZoomState((prev) => ({
				...prev,
				refAreaLeft: null,
				refAreaRight: null,
			}));
			return;
		}

		// Ensure left < right
		if (refAreaLeft > refAreaRight) {
			[refAreaLeft, refAreaRight] = [refAreaRight, refAreaLeft];
		}

		// Find data indices
		const leftIndex = processedData.findIndex(
			(item) => item[xAxisKey] >= refAreaLeft
		);
		const rightIndex = processedData.findIndex(
			(item) => item[xAxisKey] >= refAreaRight
		);

		const left = leftIndex >= 0 ? leftIndex : 0;
		const right = rightIndex >= 0 ? rightIndex : processedData.length - 1;

		// Calculate Y domain for the selected area
		const [bottom, top] = getAxisYDomain(left, right, dataKey, 0.05);

		// Save current state to history
		const newHistoryEntry = {
			domain: brushDomain,
			yDomain: [zoomState.bottom || 0, zoomState.top || 0] as [
				number,
				number
			],
		};

		setZoomHistory((prev) => [
			...prev.slice(0, currentZoomIndex + 1),
			newHistoryEntry,
		]);
		setCurrentZoomIndex((prev) => prev + 1);

		// Apply zoom
		setBrushDomain([left, right]);
		setZoomLevel((prev) => prev * 2);

		setZoomState({
			refAreaLeft: null,
			refAreaRight: null,
			left,
			right,
			bottom,
			top,
			animation: false,
		});
	};

	const zoomOut = () => {
		if (currentZoomIndex > 0) {
			const previousState = zoomHistory[currentZoomIndex - 1];
			setBrushDomain(previousState.domain);
			setZoomState((prev) => ({
				...prev,
				left: null,
				right: null,
				bottom: previousState.yDomain[0],
				top: previousState.yDomain[1],
			}));
			setCurrentZoomIndex((prev) => prev - 1);
			setZoomLevel((prev) => Math.max(1, prev / 2));
		} else {
			// Reset to original view
			setBrushDomain(null);
			setZoomState({
				left: null,
				right: null,
				refAreaLeft: null,
				refAreaRight: null,
				top: null,
				bottom: null,
				animation: true,
			});
			setZoomLevel(1);
			setZoomHistory([]);
			setCurrentZoomIndex(-1);
		}
	};

	const resetZoom = () => {
		setBrushDomain(null);
		setZoomState({
			left: null,
			right: null,
			refAreaLeft: null,
			refAreaRight: null,
			top: null,
			bottom: null,
			animation: true,
		});
		setZoomLevel(1);
		setZoomHistory([]);
		setCurrentZoomIndex(-1);
	};

	const handleMouseDown = (e: any) => {
		if (!enableMagnifier) return;

		if (e && e.activeLabel) {
			setZoomState((prev) => ({
				...prev,
				refAreaLeft: e.activeLabel,
				refAreaRight: e.activeLabel,
			}));
		}
	};

	const handleMouseMove = (e: any) => {
		if (!enableMagnifier) return;

		if (zoomState.refAreaLeft && e && e.activeLabel) {
			setZoomState((prev) => ({
				...prev,
				refAreaRight: e.activeLabel,
			}));
		}

		// Update crosshair position
		if (enableCrosshair && e) {
			setCrosshairPos({
				x: e.activeLabel || 0,
				y: e.activePayload?.[0]?.value || 0,
			});
		}
	};

	const handleMouseUp = () => {
		if (!enableMagnifier) return;
		zoom();
	};

	const handleMouseLeave = () => {
		setCrosshairPos(null);
	};

	const CustomTooltip = ({ active, payload, label }: any) => {
		if (active && payload && payload.length) {
			const data = payload[0].payload;
			return (
				<div className='bg-white p-3 border border-gray-200 rounded shadow-lg'>
					<p className='text-sm font-medium text-gray-900'>{`Time: ${label}`}</p>
					<p className='text-sm text-blue-600'>{`${dataKey}: ${payload[0].value?.toFixed(
						4
					)}`}</p>
					{data.index !== undefined && (
						<p className='text-xs text-gray-500'>{`Sample: ${data.index}`}</p>
					)}
				</div>
			);
		}
		return null;
	};

	return (
		<div className='w-full space-y-4'>
			{/* Controls */}
			<div className='flex flex-wrap items-center justify-between bg-gray-50 p-4 rounded-lg'>
				<div className='flex items-center space-x-4'>
					<h3 className='text-lg font-medium text-gray-900'>
						{title}
					</h3>
					<div className='text-sm text-gray-600'>
						Zoom Level: {zoomLevel.toFixed(1)}x | Points:{" "}
						{processedData.length.toLocaleString()} /{" "}
						{data.length.toLocaleString()}
					</div>
				</div>

				<div className='flex items-center space-x-2'>
					<button
						onClick={zoomOut}
						disabled={currentZoomIndex < 0}
						className='px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm'
					>
						🔍- Zoom Out
					</button>
					<button
						onClick={resetZoom}
						className='px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm'
					>
						🏠 Reset
					</button>
					<button
						onClick={() => setMagnifierActive(!magnifierActive)}
						className={`px-3 py-1 rounded text-sm ${
							magnifierActive
								? "bg-green-600 text-white hover:bg-green-700"
								: "bg-gray-200 text-gray-700 hover:bg-gray-300"
						}`}
					>
						🔍 {magnifierActive ? "Magnifier On" : "Magnifier Off"}
					</button>
				</div>
			</div>

			{/* Instructions */}
			{magnifierActive && (
				<div className='bg-blue-50 border border-blue-200 rounded-lg p-3'>
					<p className='text-sm text-blue-800'>
						<strong>Zoom Instructions:</strong> Click and drag to
						select an area to zoom into. Use "Zoom Out" to go back
						or "Reset" to return to the original view.
					</p>
				</div>
			)}

			{/* Main Chart */}
			<div className='bg-white border border-gray-200 rounded-lg p-4'>
				<ResponsiveContainer
					width='100%'
					height={height}
				>
					<LineChart
						data={processedData}
						onMouseDown={
							magnifierActive ? handleMouseDown : undefined
						}
						onMouseMove={
							magnifierActive ? handleMouseMove : undefined
						}
						onMouseUp={magnifierActive ? handleMouseUp : undefined}
						onMouseLeave={handleMouseLeave}
					>
						<CartesianGrid
							strokeDasharray='3 3'
							stroke='#f0f0f0'
						/>
						<XAxis
							allowDataOverflow
							dataKey={xAxisKey}
							domain={
								zoomState.left !== null &&
								zoomState.right !== null
									? [zoomState.left, zoomState.right]
									: ["dataMin", "dataMax"]
							}
							type='category'
							tick={{ fontSize: 12 }}
							angle={-45}
							textAnchor='end'
							height={60}
						/>
						<YAxis
							allowDataOverflow
							domain={
								zoomState.bottom !== null &&
								zoomState.top !== null
									? [zoomState.bottom, zoomState.top]
									: ["auto", "auto"]
							}
							type='number'
							tick={{ fontSize: 12 }}
						/>
						<Tooltip content={<CustomTooltip />} />
						<Legend />

						<Line
							type='monotone'
							dataKey={dataKey}
							stroke={color}
							strokeWidth={1.5}
							dot={false}
							connectNulls={false}
							animationDuration={zoomState.animation ? 300 : 0}
						/>

						{/* Crosshair */}
						{enableCrosshair && crosshairPos && (
							<>
								<ReferenceLine
									x={crosshairPos.x}
									stroke='#666'
									strokeDasharray='2 2'
								/>
								<ReferenceLine
									y={crosshairPos.y}
									stroke='#666'
									strokeDasharray='2 2'
								/>
							</>
						)}

						{/* Selection Area */}
						{magnifierActive &&
							zoomState.refAreaLeft &&
							zoomState.refAreaRight && (
								<ReferenceArea
									x1={zoomState.refAreaLeft}
									x2={zoomState.refAreaRight}
									strokeOpacity={0.3}
									fill='rgba(59, 130, 246, 0.2)'
								/>
							)}
					</LineChart>
				</ResponsiveContainer>
			</div>

			{/* Brush/Overview Chart */}
			{enableBrush && data.length > 100 && (
				<div className='bg-white border border-gray-200 rounded-lg p-4'>
					<h4 className='text-sm font-medium text-gray-700 mb-2'>
						Overview & Navigation
					</h4>
					<ResponsiveContainer
						width='100%'
						height={100}
					>
						<LineChart data={downsampleData(data, 1000)}>
							<XAxis
								dataKey={xAxisKey}
								tick={false}
							/>
							<YAxis hide />
							<Line
								type='monotone'
								dataKey={dataKey}
								stroke={color}
								strokeWidth={1}
								dot={false}
							/>
							<Brush
								dataKey={xAxisKey}
								height={30}
								stroke={color}
								onChange={(e) => {
									if (
										e &&
										e.startIndex !== undefined &&
										e.endIndex !== undefined
									) {
										setBrushDomain([
											e.startIndex,
											e.endIndex,
										]);
										setZoomLevel(
											data.length /
												(e.endIndex - e.startIndex + 1)
										);
									}
								}}
							/>
						</LineChart>
					</ResponsiveContainer>
				</div>
			)}

			{/* Statistics Panel */}
			<div className='grid grid-cols-2 md:grid-cols-4 gap-4 bg-white border border-gray-200 rounded-lg p-4'>
				<div className='text-center'>
					<div className='text-2xl font-bold text-blue-600'>
						{processedData.length.toLocaleString()}
					</div>
					<div className='text-sm text-gray-500'>Visible Points</div>
				</div>
				<div className='text-center'>
					<div className='text-2xl font-bold text-green-600'>
						{processedData.length > 0
							? Math.min(
									...processedData.map((d) => d[dataKey])
							  ).toFixed(4)
							: "N/A"}
					</div>
					<div className='text-sm text-gray-500'>Minimum</div>
				</div>
				<div className='text-center'>
					<div className='text-2xl font-bold text-red-600'>
						{processedData.length > 0
							? Math.max(
									...processedData.map((d) => d[dataKey])
							  ).toFixed(4)
							: "N/A"}
					</div>
					<div className='text-sm text-gray-500'>Maximum</div>
				</div>
				<div className='text-center'>
					<div className='text-2xl font-bold text-purple-600'>
						{processedData.length > 0
							? (
									processedData.reduce(
										(sum, d) => sum + d[dataKey],
										0
									) / processedData.length
							  ).toFixed(4)
							: "N/A"}
					</div>
					<div className='text-sm text-gray-500'>Average</div>
				</div>
			</div>
		</div>
	);
};

export default AdvancedZoomChart;
