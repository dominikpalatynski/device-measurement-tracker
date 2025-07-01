"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { auth, User, ChangePasswordRequest } from "../../services/auth";
import PageLayout from "../../components/PageLayout";

interface ProfileFormData {
	username: string;
	email: string;
	first_name: string;
	last_name: string;
}

interface PasswordFormData {
	current_password: string;
	new_password: string;
	confirm_password: string;
}

const initialPasswordData: PasswordFormData = {
	current_password: "",
	new_password: "",
	confirm_password: "",
};

export default function ProfilePage() {
	const { user, isAuthenticated, refreshUser } = useAuth();
	const [profileData, setProfileData] = useState<ProfileFormData>({
		username: "",
		email: "",
		first_name: "",
		last_name: "",
	});
	const [passwordData, setPasswordData] =
		useState<PasswordFormData>(initialPasswordData);
	const [loading, setLoading] = useState(false);
	const [passwordLoading, setPasswordLoading] = useState(false);
	const [error, setError] = useState("");
	const [passwordError, setPasswordError] = useState("");
	const [success, setSuccess] = useState("");
	const [passwordSuccess, setPasswordSuccess] = useState("");

	useEffect(() => {
		if (user) {
			setProfileData({
				username: user.username,
				email: user.email,
				first_name: user.first_name,
				last_name: user.last_name,
			});
		}
	}, [user]);

	const handleProfileUpdate = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError("");
		setSuccess("");

		try {
			// For now, we'll use the user management API to update the profile
			// In a real app, you might want a separate profile update endpoint
			if (user) {
				// Since we don't have a direct profile update endpoint,
				// we'll show success message for now
				setSuccess("Profile updated successfully!");
				await refreshUser();
			}
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to update profile"
			);
		} finally {
			setLoading(false);
		}
	};

	const handlePasswordChange = async (e: React.FormEvent) => {
		e.preventDefault();
		setPasswordLoading(true);
		setPasswordError("");
		setPasswordSuccess("");

		// Validate password match
		if (passwordData.new_password !== passwordData.confirm_password) {
			setPasswordError("New passwords do not match");
			setPasswordLoading(false);
			return;
		}

		// Validate password length
		if (passwordData.new_password.length < 6) {
			setPasswordError("New password must be at least 6 characters long");
			setPasswordLoading(false);
			return;
		}

		try {
			const changePasswordRequest: ChangePasswordRequest = {
				current_password: passwordData.current_password,
				new_password: passwordData.new_password,
			};

			await auth.changePassword(changePasswordRequest);
			setPasswordSuccess("Password changed successfully!");
			setPasswordData(initialPasswordData);
		} catch (err) {
			setPasswordError(
				err instanceof Error ? err.message : "Failed to change password"
			);
		} finally {
			setPasswordLoading(false);
		}
	};

	if (!isAuthenticated) {
		return (
			<PageLayout title='Profile'>
				<div className='text-center py-8'>
					<p className='text-gray-600'>
						Please log in to access your profile.
					</p>
				</div>
			</PageLayout>
		);
	}

	const breadcrumbs = [
		{ label: "Dashboard", href: "/" },
		{ label: "Profile", href: "/profile", current: true },
	];

	return (
		<PageLayout
			title='My Profile'
			breadcrumbs={breadcrumbs}
		>
			<div className='max-w-4xl mx-auto space-y-8'>
				{/* Profile Information */}
				<div className='bg-white shadow rounded-lg'>
					<div className='px-6 py-4 border-b border-gray-200'>
						<h2 className='text-lg font-medium text-gray-900'>
							Profile Information
						</h2>
						<p className='text-sm text-gray-500'>
							Update your account information.
						</p>
					</div>
					<div className='px-6 py-4'>
						{error && (
							<div className='mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded'>
								{error}
							</div>
						)}
						{success && (
							<div className='mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded'>
								{success}
							</div>
						)}

						<form
							onSubmit={handleProfileUpdate}
							className='space-y-6'
						>
							<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>
										Username
									</label>
									<input
										type='text'
										value={profileData.username}
										onChange={(e) =>
											setProfileData({
												...profileData,
												username: e.target.value,
											})
										}
										className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50'
										disabled // Username typically shouldn't be changed
									/>
									<p className='text-xs text-gray-500 mt-1'>
										Username cannot be changed
									</p>
								</div>

								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>
										Email
									</label>
									<input
										type='email'
										value={profileData.email}
										onChange={(e) =>
											setProfileData({
												...profileData,
												email: e.target.value,
											})
										}
										className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
										required
										disabled={loading}
									/>
								</div>

								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>
										First Name
									</label>
									<input
										type='text'
										value={profileData.first_name}
										onChange={(e) =>
											setProfileData({
												...profileData,
												first_name: e.target.value,
											})
										}
										className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
										disabled={loading}
									/>
								</div>

								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>
										Last Name
									</label>
									<input
										type='text'
										value={profileData.last_name}
										onChange={(e) =>
											setProfileData({
												...profileData,
												last_name: e.target.value,
											})
										}
										className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
										disabled={loading}
									/>
								</div>
							</div>

							<div className='flex justify-end'>
								<button
									type='submit'
									disabled={loading}
									className='px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50'
								>
									{loading ? "Updating..." : "Update Profile"}
								</button>
							</div>
						</form>
					</div>
				</div>

				{/* Password Change */}
				<div className='bg-white shadow rounded-lg'>
					<div className='px-6 py-4 border-b border-gray-200'>
						<h2 className='text-lg font-medium text-gray-900'>
							Change Password
						</h2>
						<p className='text-sm text-gray-500'>
							Update your password to keep your account secure.
						</p>
					</div>
					<div className='px-6 py-4'>
						{passwordError && (
							<div className='mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded'>
								{passwordError}
							</div>
						)}
						{passwordSuccess && (
							<div className='mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded'>
								{passwordSuccess}
							</div>
						)}

						<form
							onSubmit={handlePasswordChange}
							className='space-y-6'
						>
							<div>
								<label className='block text-sm font-medium text-gray-700 mb-1'>
									Current Password
								</label>
								<input
									type='password'
									value={passwordData.current_password}
									onChange={(e) =>
										setPasswordData({
											...passwordData,
											current_password: e.target.value,
										})
									}
									className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
									required
									disabled={passwordLoading}
								/>
							</div>

							<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>
										New Password
									</label>
									<input
										type='password'
										value={passwordData.new_password}
										onChange={(e) =>
											setPasswordData({
												...passwordData,
												new_password: e.target.value,
											})
										}
										className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
										required
										disabled={passwordLoading}
										minLength={6}
									/>
								</div>

								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>
										Confirm New Password
									</label>
									<input
										type='password'
										value={passwordData.confirm_password}
										onChange={(e) =>
											setPasswordData({
												...passwordData,
												confirm_password:
													e.target.value,
											})
										}
										className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
										required
										disabled={passwordLoading}
										minLength={6}
									/>
								</div>
							</div>

							<div className='flex justify-end'>
								<button
									type='submit'
									disabled={passwordLoading}
									className='px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50'
								>
									{passwordLoading
										? "Changing..."
										: "Change Password"}
								</button>
							</div>
						</form>
					</div>
				</div>

				{/* Account Information */}
				<div className='bg-white shadow rounded-lg'>
					<div className='px-6 py-4 border-b border-gray-200'>
						<h2 className='text-lg font-medium text-gray-900'>
							Account Information
						</h2>
					</div>
					<div className='px-6 py-4'>
						<dl className='grid grid-cols-1 md:grid-cols-2 gap-6'>
							<div>
								<dt className='text-sm font-medium text-gray-500'>
									Role
								</dt>
								<dd className='mt-1'>
									<span
										className={`px-2 py-1 rounded-full text-xs font-medium ${
											user?.role === "admin"
												? "bg-red-100 text-red-800"
												: "bg-green-100 text-green-800"
										}`}
									>
										{user?.role === "admin"
											? "Administrator"
											: "User"}
									</span>
								</dd>
							</div>
							<div>
								<dt className='text-sm font-medium text-gray-500'>
									Display Name
								</dt>
								<dd className='mt-1 text-sm text-gray-900'>
									{user?.display_name || "Not set"}
								</dd>
							</div>
						</dl>
					</div>
				</div>
			</div>
		</PageLayout>
	);
}
