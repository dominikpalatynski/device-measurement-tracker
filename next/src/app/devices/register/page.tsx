"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageLayout from "@/components/PageLayout";
import { deviceApi, Device } from "@/services/api";

export default function DeviceRegisterPage() {
	const router = useRouter();
	const [formData, setFormData] = useState({
		device_name: "",
		device_type: "",
	});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<Device | null>(null);
	const [verificationToken, setVerificationToken] = useState<string | null>(
		null
	);

	const handleInputChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
	) => {
		const { name, value } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: value,
		}));
	};
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!formData.device_name.trim()) {
			setError("Device name is required");
			return;
		}

		if (!formData.device_type.trim()) {
			setError("Device type is required");
			return;
		}

		try {
			setLoading(true);
			setError(null);

			const device = await deviceApi.registerDevice({
				device_name: formData.device_name.trim(),
				device_type: formData.device_type,
			});
			if (device) {
				setSuccess(device);
				// Get the verification token from localStorage
				const token = localStorage.getItem(
					`verification_token_${device.device_id}`
				);
				setVerificationToken(token);
			} else {
				setError("Failed to register device");
			}
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to register device"
			);
		} finally {
			setLoading(false);
		}
	};
	const handleReset = () => {
		setFormData({
			device_name: "",
			device_type: "pmsm-mechanical-vibration",
		});
		setError(null);
		setSuccess(null);
		setVerificationToken(null);
	};
	const handleViewDevice = () => {
		if (success) {
			router.push(`/devices/${success.device_id}`);
		}
	};

	const handleRegisterAnother = () => {
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
									Device Registered Successfully!
								</h2>
								<p className='text-green-700'>
									Your device has been registered and is ready
									to use.
								</p>
							</div>
						</div>

						<div className='bg-white rounded-lg p-4 mb-6'>
							<h3 className='text-lg font-medium text-gray-900 mb-3'>
								Device Details
							</h3>{" "}
							<dl className='space-y-2'>
								{" "}
								<div className='flex justify-between'>
									<dt className='text-sm font-medium text-gray-500'>
										Device Name:
									</dt>
									<dd className='text-sm text-gray-900'>
										{success.device_name}
									</dd>
								</div>
								<div className='flex justify-between'>
									<dt className='text-sm font-medium text-gray-500'>
										Device Type:
									</dt>
									<dd className='text-sm text-gray-900'>
										{success.device_type}
									</dd>
								</div>
								<div className='flex justify-between'>
									<dt className='text-sm font-medium text-gray-500'>
										Device ID:
									</dt>
									<dd className='text-sm text-gray-500 font-mono'>
										{success.device_id}
									</dd>
								</div>
								<div className='flex justify-between'>
									<dt className='text-sm font-medium text-gray-500'>
										Status:
									</dt>
									<dd className='text-sm'>
										<span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800'>
											{success.status === "Active"
												? "Active"
												: success.status ===
												  "Pending-Registration"
												? "Pending Registration"
												: "Not Active"}
										</span>
									</dd>{" "}
								</div>
								{verificationToken && (
									<div className='flex justify-between'>
										<dt className='text-sm font-medium text-gray-500'>
											Verification Token:
										</dt>
										<dd className='text-sm text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded'>
											{verificationToken}
										</dd>
									</div>
								)}
							</dl>
						</div>

						{/* Registration Token and Command */}
						{success.verification_token && (
							<div className='bg-white rounded-lg p-4 mb-6'>
								<h3 className='text-lg font-medium text-gray-900 mb-3'>
									Registration Information
								</h3>
								<div className='space-y-4'>
									<div className='space-y-2'>
										<label className='block text-sm font-medium text-gray-700'>
											Device ID
										</label>
										<div className='flex'>
											<input
												type='text'
												value={success.device_id}
												readOnly
												className='flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-sm font-mono text-gray-900'
											/>
											<button
												onClick={() =>
													navigator.clipboard.writeText(
														success.device_id
													)
												}
												className='px-3 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 text-sm'
											>
												Copy
											</button>
										</div>
									</div>
									<div className='space-y-2'>
										<label className='block text-sm font-medium text-gray-700'>
											Verification Token
										</label>
										<div className='flex'>
											<input
												type='text'
												value={
													success.verification_token
												}
												readOnly
												className='flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-sm font-mono text-gray-900'
											/>
											<button
												onClick={() =>
													navigator.clipboard.writeText(
														success.verification_token ||
															""
													)
												}
												className='px-3 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 text-sm'
											>
												Copy
											</button>
										</div>
									</div>
									<div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
										<h5 className='font-medium text-blue-800 mb-2'>
											Registration Command
										</h5>
										<p className='text-sm text-blue-700 mb-2'>
											Use this command to register your
											device:
										</p>
										<div className='bg-gray-800 text-green-400 p-2 rounded text-xs font-mono overflow-x-auto'>
											{`python register_device.py --token ${success.verification_token} --device-id ${success.device_id}`}
										</div>
										<button
											onClick={() =>
												navigator.clipboard.writeText(
													`python register_device.py --token ${success.verification_token} --device-id ${success.device_id}`
												)
											}
											className='mt-2 text-xs text-blue-600 hover:text-blue-800'
										>
											📋 Copy command
										</button>
									</div>
									<div className='bg-yellow-50 border border-yellow-200 rounded-lg p-3'>
										<div className='flex items-center'>
											<div className='text-yellow-400 mr-2'>
												⚠️
											</div>
											<div>
												<h5 className='font-medium text-yellow-800 text-sm'>
													Important
												</h5>
												<p className='text-xs text-yellow-700 mt-1'>
													The verification token will
													expire in 1 hour. If you
													need a new token later, you
													can regenerate it from the
													device details page.
												</p>
											</div>
										</div>
									</div>
								</div>
							</div>
						)}

						<div className='bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6'>
							<h4 className='text-sm font-medium text-blue-800 mb-2'>
								Next Steps:
							</h4>{" "}
							<ul className='text-sm text-blue-700 space-y-1 list-disc list-inside'>
								<li>
									Copy the device ID and verification token
									from above
								</li>
								<li>
									Run the registration command on your device
									to activate it
								</li>
								<li>
									Once registered, start sending measurement
									data
								</li>
								<li>
									Monitor device status and measurements in
									the dashboard
								</li>
								<li>
									Create faults to organize your data
									collection
								</li>
							</ul>
						</div>

						<div className='flex space-x-4'>
							<button
								onClick={handleViewDevice}
								className='flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors'
							>
								View Device Details
							</button>
							<button
								onClick={handleRegisterAnother}
								className='flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors'
							>
								Register Another Device
							</button>
							<Link
								href='/devices'
								className='flex-1 bg-gray-100 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors text-center'
							>
								Back to Devices
							</Link>
						</div>
					</div>
				</div>
			</div>
		);
	}

	const breadcrumbs = [
		{ label: "Home", href: "/" },
		{ label: "Devices", href: "/devices" },
		{ label: "Register Device", href: "/devices/register", current: true },
	];

	return (
		<PageLayout
			title='Register New Device'
			breadcrumbs={breadcrumbs}
		>
			<div className='max-w-2xl mx-auto'>
				<div className='mb-8'>
					<p className='text-gray-600 mt-1'>
						Add a new measurement device to your system
					</p>
				</div>

				{error && (
					<div className='mb-6 bg-red-50 border border-red-200 rounded-lg p-4'>
						<div className='flex items-center'>
							<span className='text-red-400 text-xl mr-3'>
								❌
							</span>
							<div>
								<h3 className='text-sm font-medium text-red-800'>
									Registration Failed
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
						{" "}
						<div>
							<label
								htmlFor='device_name'
								className='block text-sm font-medium text-gray-700 mb-2'
							>
								Device Name *
							</label>
							<input
								type='text'
								id='device_name'
								name='device_name'
								value={formData.device_name}
								onChange={handleInputChange}
								placeholder='Enter a descriptive name for your device'
								className='w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
								required
								disabled={loading}
							/>
							<p className='text-sm text-gray-500 mt-1'>
								Choose a name that helps you identify this
								device (e.g., "Office Temperature Sensor", "Lab
								Drone #1")
							</p>
						</div>{" "}
						<div>
							<label
								htmlFor='device_type'
								className='block text-sm font-medium text-gray-700 mb-2'
							>
								Device Type
							</label>
							<input
								type='text'
								id='device_type'
								name='device_type'
								value={formData.device_type}
								onChange={handleInputChange}
								placeholder='Enter device type (e.g., PMSM Mechanical Vibration, BLDC High Speed, Custom Sensor)'
								className='w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
								disabled={loading}
								required
							/>
							<p className='text-sm text-gray-500 mt-1'>
								Enter a descriptive type for your device (any
								string is allowed)
							</p>
						</div>{" "}
						<div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
							<h3 className='text-sm font-medium text-blue-800 mb-2'>
								About Device Registration
							</h3>
							<ul className='text-sm text-blue-700 space-y-1 list-disc list-inside'>
								<li>
									A unique UUID will be automatically
									generated for your device
								</li>
								<li>
									The device will initially have "Inactive"
									status (0)
								</li>
								<li>
									Status will change to "Active" (1) once the
									device starts sending data
								</li>
								<li>
									You can manage device settings and view
									measurements after registration
								</li>
							</ul>
						</div>
						<div className='flex space-x-4'>
							{" "}
							<button
								type='submit'
								disabled={
									loading || !formData.device_name.trim()
								}
								className='flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors'
							>
								{loading ? (
									<div className='flex items-center justify-center'>
										<div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
										Registering...
									</div>
								) : (
									"Register Device"
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
						After Registration
					</h3>
					<div className='space-y-4'>
						<div className='flex items-start'>
							<span className='text-2xl mr-3'>📋</span>
							<div>
								<h4 className='font-medium text-gray-900'>
									Configure Your Device
								</h4>
								<p className='text-sm text-gray-600'>
									Use the generated UUID to configure your
									physical device or software client to
									connect to this system.
								</p>
							</div>
						</div>
						<div className='flex items-start'>
							<span className='text-2xl mr-3'>📡</span>
							<div>
								<h4 className='font-medium text-gray-900'>
									Start Sending Data
								</h4>
								<p className='text-sm text-gray-600'>
									Configure your device to send measurement
									data via MQTT or HTTP API to activate it
									automatically.
								</p>
							</div>
						</div>
						<div className='flex items-start'>
							<span className='text-2xl mr-3'>📊</span>
							<div>
								<h4 className='font-medium text-gray-900'>
									Monitor and Analyze
								</h4>
								<p className='text-sm text-gray-600'>
									View real-time measurements, historical
									data, and statistics in the device
									dashboard.
								</p>
							</div>
						</div>{" "}
					</div>
				</div>
			</div>
		</PageLayout>
	);
}
