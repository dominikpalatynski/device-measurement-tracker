"use client";

import { useState, useEffect } from "react";
import {
	getLatestMeasurement,
	getAllMeasurements,
	getMeasurementStats,
	testApiConnection,
	Measurement,
	MeasurementStats,
} from "@/services/api";
import styles from "./page.module.css";

// Default test device UUID - in a real app, this would come from device selection
const DEFAULT_DEVICE_UUID = "test-device-001";

export default function Home() {
	const [deviceUuid, setDeviceUuid] = useState<string>(DEFAULT_DEVICE_UUID);
	const [latestMeasurement, setLatestMeasurement] =
		useState<Measurement | null>(null);
	const [measurements, setMeasurements] = useState<Measurement[]>([]);
	const [stats, setStats] = useState<MeasurementStats | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [apiStatus, setApiStatus] = useState<{
		success: boolean;
		message?: string;
		time?: string;
	} | null>(null);

	useEffect(() => {
		// Test API connection on component mount
		const testApi = async () => {
			try {
				const result = await testApiConnection(
					"Testing API from Next.js"
				);
				setApiStatus(result);
			} catch (err: any) {
				setApiStatus({
					success: false,
					message: `API connection failed: ${err.message}`,
				});
			}
		};

		testApi();
	}, []);

	useEffect(() => {
		// Fetch device data when the component mounts or deviceUuid changes
		const fetchDeviceData = async () => {
			try {
				setIsLoading(true);
				setError(null);

				console.log(
					"Starting to fetch device data for UUID:",
					deviceUuid
				);

				// Use Promise.allSettled to prevent one failure from affecting the others
				const results = await Promise.allSettled([
					getLatestMeasurement(deviceUuid),
					getAllMeasurements(deviceUuid, 10),
					getMeasurementStats(deviceUuid),
				]);

				// Check each result individually
				if (
					results[0].status === "fulfilled" &&
					results[0].value.success
				) {
					setLatestMeasurement(results[0].value.data);
				}

				if (
					results[1].status === "fulfilled" &&
					results[1].value.success
				) {
					setMeasurements(results[1].value.data);
				}

				if (
					results[2].status === "fulfilled" &&
					results[2].value.success
				) {
					setStats(results[2].value.data);
				}

				// Check for any rejected promises
				const rejectedResults = results.filter(
					(r) => r.status === "rejected"
				);
				if (rejectedResults.length > 0) {
					const errors = rejectedResults.map(
						(r: any) => r.reason?.message || "Unknown error"
					);
					setError(`API errors: ${errors.join(", ")}`);
				}
			} catch (err: any) {
				setError(`Failed to fetch data from API: ${err.message}`);
				console.error("API fetch error:", err);
			} finally {
				setIsLoading(false);
			}
		};

		fetchDeviceData();
	}, [deviceUuid]);

	const handleDeviceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setDeviceUuid(e.target.value);
	};

	return (
		<main className={styles.main}>
			<div className={styles.center}>
				<h1 className={styles.title}>Device Measurement Tracker</h1>
			</div>

			{/* API Status */}
			<div className={styles.card}>
				<h2>API Connection Status</h2>
				{apiStatus ? (
					<div
						className={
							apiStatus.success ? styles.success : styles.error
						}
					>
						<p>
							Status: {apiStatus.success ? "Connected" : "Error"}
						</p>
						{apiStatus.message && (
							<p>Message: {apiStatus.message}</p>
						)}
						{apiStatus.time && <p>Server time: {apiStatus.time}</p>}
					</div>
				) : (
					<p>Checking API connection...</p>
				)}
			</div>

			<div className={styles.card}>
				<h2>Device Selection</h2>
				<div className={styles.inputGroup}>
					<label htmlFor='deviceUuid'>Device UUID:</label>
					<input
						type='text'
						id='deviceUuid'
						value={deviceUuid}
						onChange={handleDeviceChange}
						className={styles.input}
					/>
					<small className={styles.hint}>
						Enter a device UUID to fetch its measurements
					</small>
				</div>
			</div>

			{isLoading ? (
				<div className={styles.card}>
					<h2>Loading Data</h2>
					<p>Fetching measurements from API...</p>
					<div className={styles.loader}></div>
				</div>
			) : error ? (
				<div className={styles.card}>
					<h2>Error</h2>
					<div className={styles.error}>
						<p>{error}</p>
						<p className={styles.hint}>
							Make sure your Yii API is running on{" "}
							{process.env.NEXT_PUBLIC_API_URL}
							and that the device UUID exists in the database.
						</p>
					</div>
				</div>
			) : (
				<>
					{latestMeasurement && (
						<div className={styles.card}>
							<h2>Latest Measurement</h2>
							<div className={styles.measurementGrid}>
								<div className={styles.measurementItem}>
									<div className={styles.measurementIcon}>
										🌡️
									</div>
									<div className={styles.measurementValue}>
										{latestMeasurement.temperature}°C
									</div>
									<div className={styles.measurementLabel}>
										Temperature
									</div>
								</div>
								<div className={styles.measurementItem}>
									<div className={styles.measurementIcon}>
										💧
									</div>
									<div className={styles.measurementValue}>
										{latestMeasurement.humidity}%
									</div>
									<div className={styles.measurementLabel}>
										Humidity
									</div>
								</div>
								<div className={styles.measurementItem}>
									<div className={styles.measurementIcon}>
										🔄
									</div>
									<div className={styles.measurementValue}>
										{latestMeasurement.pressure} hPa
									</div>
									<div className={styles.measurementLabel}>
										Pressure
									</div>
								</div>
								<div className={styles.measurementItem}>
									<div className={styles.measurementIcon}>
										🔋
									</div>
									<div className={styles.measurementValue}>
										{latestMeasurement.battery_level}%
									</div>
									<div className={styles.measurementLabel}>
										Battery
									</div>
								</div>
							</div>
							<p className={styles.timestamp}>
								Measured at: {latestMeasurement.measured_at}
							</p>
						</div>
					)}

					{measurements.length > 0 && (
						<div className={styles.card}>
							<h2>Recent Measurements</h2>
							<div className={styles.tableWrapper}>
								<table className={styles.table}>
									<thead>
										<tr>
											<th>Time</th>
											<th>Temp (°C)</th>
											<th>Humidity (%)</th>
											<th>Pressure (hPa)</th>
											<th>Battery (%)</th>
										</tr>
									</thead>
									<tbody>
										{measurements.map((measurement) => (
											<tr key={measurement.id}>
												<td>
													{measurement.measured_at}
												</td>
												<td>
													{measurement.temperature}
												</td>
												<td>{measurement.humidity}</td>
												<td>{measurement.pressure}</td>
												<td>
													{measurement.battery_level}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}

					{stats && (
						<div className={styles.card}>
							<h2>Measurement Statistics</h2>
							<div className={styles.statsGrid}>
								<div className={styles.statsItem}>
									<h3>Temperature</h3>
									<ul>
										<li>
											Average:{" "}
											{typeof stats.avg_temperature ===
											"number"
												? Number(
														stats.avg_temperature
												  ).toFixed(1)
												: stats.avg_temperature}
											°C
										</li>
										<li>
											Min:{" "}
											{typeof stats.min_temperature ===
											"number"
												? Number(
														stats.min_temperature
												  ).toFixed(1)
												: stats.min_temperature}
											°C
										</li>
										<li>
											Max:{" "}
											{typeof stats.max_temperature ===
											"number"
												? Number(
														stats.max_temperature
												  ).toFixed(1)
												: stats.max_temperature}
											°C
										</li>
									</ul>
								</div>
								<div className={styles.statsItem}>
									<h3>Humidity</h3>
									<ul>
										<li>
											Average:{" "}
											{typeof stats.avg_humidity ===
											"number"
												? Number(
														stats.avg_humidity
												  ).toFixed(1)
												: stats.avg_humidity}
											%
										</li>
										<li>
											Min:{" "}
											{typeof stats.min_humidity ===
											"number"
												? Number(
														stats.min_humidity
												  ).toFixed(1)
												: stats.min_humidity}
											%
										</li>
										<li>
											Max:{" "}
											{typeof stats.max_humidity ===
											"number"
												? Number(
														stats.max_humidity
												  ).toFixed(1)
												: stats.max_humidity}
											%
										</li>
									</ul>
								</div>
								<div className={styles.statsItem}>
									<h3>Pressure</h3>
									<ul>
										<li>
											Average:{" "}
											{typeof stats.avg_pressure ===
											"number"
												? Number(
														stats.avg_pressure
												  ).toFixed(1)
												: stats.avg_pressure}{" "}
											hPa
										</li>
										<li>
											Min:{" "}
											{typeof stats.min_pressure ===
											"number"
												? Number(
														stats.min_pressure
												  ).toFixed(1)
												: stats.min_pressure}{" "}
											hPa
										</li>
										<li>
											Max:{" "}
											{typeof stats.max_pressure ===
											"number"
												? Number(
														stats.max_pressure
												  ).toFixed(1)
												: stats.max_pressure}{" "}
											hPa
										</li>
									</ul>
								</div>
								<div className={styles.statsItem}>
									<h3>Total</h3>
									<p>
										{stats.total_measurements} measurements
									</p>
								</div>
							</div>
						</div>
					)}
				</>
			)}

			<div className={styles.grid}>
				<a
					href='https://github.com/yiisoft/yii2'
					className={styles.card}
					target='_blank'
					rel='noopener noreferrer'
				>
					<h2>
						Yii2 Framework <span>-&gt;</span>
					</h2>
					<p>
						Learn more about the backend framework powering this
						application.
					</p>
				</a>

				<a
					href='https://nextjs.org/docs'
					className={styles.card}
					target='_blank'
					rel='noopener noreferrer'
				>
					<h2>
						Next.js Documentation <span>-&gt;</span>
					</h2>
					<p>
						Find in-depth information about Next.js features and
						API.
					</p>
				</a>
			</div>
		</main>
	);
}
