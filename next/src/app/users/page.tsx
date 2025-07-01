"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
	userManagement,
	User,
	CreateUserRequest,
	UpdateUserRequest,
} from "../../services/auth";
import PageLayout from "../../components/PageLayout";

interface UserFormData {
	username: string;
	email: string;
	password: string;
	password_repeat: string;
	first_name: string;
	last_name: string;
	role: "admin" | "normal";
}

const initialFormData: UserFormData = {
	username: "",
	email: "",
	password: "",
	password_repeat: "",
	first_name: "",
	last_name: "",
	role: "normal",
};

export default function UserManagement() {
	const { isAdmin, isAuthenticated, user: currentUser } = useAuth();
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [showEditModal, setShowEditModal] = useState(false);
	const [formData, setFormData] = useState<UserFormData>(initialFormData);
	const [editingUser, setEditingUser] = useState<User | null>(null);
	const [actionLoading, setActionLoading] = useState(false);

	useEffect(() => {
		if (isAuthenticated && isAdmin) {
			loadUsers();
		}
	}, [isAuthenticated, isAdmin]);

	const loadUsers = async () => {
		try {
			setLoading(true);
			const usersData = await userManagement.getUsers();
			setUsers(usersData);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to load users"
			);
		} finally {
			setLoading(false);
		}
	};

	const handleCreateUser = async (e: React.FormEvent) => {
		e.preventDefault();
		setActionLoading(true);
		setError("");

		// Validate password match
		if (formData.password !== formData.password_repeat) {
			setError("Passwords do not match");
			setActionLoading(false);
			return;
		}

		try {
			const createData: CreateUserRequest = {
				username: formData.username,
				email: formData.email,
				password: formData.password,
				password_repeat: formData.password_repeat,
				first_name: formData.first_name,
				last_name: formData.last_name,
				role: formData.role,
			};

			await userManagement.createUser(createData);
			setShowCreateModal(false);
			setFormData(initialFormData);
			await loadUsers();
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to create user"
			);
		} finally {
			setActionLoading(false);
		}
	};

	const handleEditUser = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!editingUser) return;

		setActionLoading(true);
		setError("");

		try {
			const updateData: UpdateUserRequest = {
				username: formData.username,
				email: formData.email,
				first_name: formData.first_name,
				last_name: formData.last_name,
				role: formData.role,
			};

			// Only include password if it's provided
			if (formData.password.trim()) {
				updateData.password = formData.password;
			}

			await userManagement.updateUser(editingUser.id, updateData);
			setShowEditModal(false);
			setEditingUser(null);
			setFormData(initialFormData);
			await loadUsers();
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to update user"
			);
		} finally {
			setActionLoading(false);
		}
	};

	const handleDeleteUser = async (user: User) => {
		// Prevent admin from deleting themselves
		if (currentUser && user.id === currentUser.id) {
			setError("You cannot delete your own account");
			return;
		}

		if (
			!confirm(`Are you sure you want to delete user "${user.username}"?`)
		) {
			return;
		}

		setActionLoading(true);
		setError("");

		try {
			await userManagement.deleteUser(user.id);
			await loadUsers();
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to delete user"
			);
		} finally {
			setActionLoading(false);
		}
	};

	const handleActivateUser = async (user: User) => {
		setActionLoading(true);
		setError("");

		try {
			await userManagement.activateUser(user.id);
			await loadUsers();
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to activate user"
			);
		} finally {
			setActionLoading(false);
		}
	};

	const handleDeactivateUser = async (user: User) => {
		if (
			!confirm(
				`Are you sure you want to deactivate user "${user.username}"?`
			)
		) {
			return;
		}

		setActionLoading(true);
		setError("");

		try {
			await userManagement.deactivateUser(user.id);
			await loadUsers();
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to deactivate user"
			);
		} finally {
			setActionLoading(false);
		}
	};

	const openEditModal = (user: User) => {
		setEditingUser(user);
		setFormData({
			username: user.username,
			email: user.email,
			password: "",
			password_repeat: "",
			first_name: user.first_name,
			last_name: user.last_name,
			role: user.role,
		});
		setShowEditModal(true);
	};

	const closeModals = () => {
		setShowCreateModal(false);
		setShowEditModal(false);
		setEditingUser(null);
		setFormData(initialFormData);
		setError("");
	};

	if (!isAuthenticated) {
		return (
			<PageLayout title='User Management'>
				<div className='text-center py-8'>
					<p className='text-gray-600'>
						Please log in to access user management.
					</p>
				</div>
			</PageLayout>
		);
	}

	if (!isAdmin) {
		return (
			<PageLayout title='User Management'>
				<div className='text-center py-8'>
					<p className='text-gray-600'>
						Access denied. Admin privileges required.
					</p>
				</div>
			</PageLayout>
		);
	}

	const breadcrumbs = [
		{ label: "Dashboard", href: "/" },
		{ label: "User Management", href: "/users", current: true },
	];

	return (
		<PageLayout
			title='User Management'
			breadcrumbs={breadcrumbs}
		>
			<div className='space-y-6'>
				{/* Header with create button */}
				<div className='flex justify-between items-center'>
					<h2 className='text-lg font-medium text-gray-900'>
						Manage Users
					</h2>
					<button
						onClick={() => setShowCreateModal(true)}
						className='bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
						disabled={actionLoading}
					>
						Create User
					</button>
				</div>

				{/* Error display */}
				{error && (
					<div className='bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded'>
						{error}
					</div>
				)}

				{/* Users table */}
				<div className='bg-white shadow overflow-hidden sm:rounded-md'>
					{loading ? (
						<div className='text-center py-8'>
							<div className='inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
							<p className='mt-2 text-gray-600'>
								Loading users...
							</p>
						</div>
					) : (
						<ul className='divide-y divide-gray-200'>
							{users.map((user) => (
								<li
									key={user.id}
									className='px-6 py-4'
								>
									<div className='flex items-center justify-between'>
										<div className='flex items-center space-x-4'>
											<div className='flex-shrink-0'>
												<div className='w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium'>
													{user.display_name?.[0] ||
														user.username?.[0] ||
														"U"}
												</div>
											</div>
											<div>
												<p className='text-sm font-medium text-gray-900'>
													{user.display_name ||
														`${user.first_name} ${user.last_name}`.trim() ||
														user.username}
												</p>
												<p className='text-sm text-gray-500'>
													{user.email}
												</p>
												<div className='flex items-center space-x-2 mt-1'>
													<span
														className={`px-2 py-1 rounded-full text-xs font-medium ${
															user.role ===
															"admin"
																? "bg-red-100 text-red-800"
																: "bg-green-100 text-green-800"
														}`}
													>
														{user.role}
													</span>
												</div>
											</div>
										</div>
										<div className='flex items-center space-x-2'>
											<button
												onClick={() =>
													openEditModal(user)
												}
												className='text-blue-600 hover:text-blue-800 text-sm font-medium'
												disabled={actionLoading}
											>
												Edit
											</button>
											{currentUser &&
												user.id !== currentUser.id && (
													<button
														onClick={() =>
															handleDeleteUser(
																user
															)
														}
														className='text-red-600 hover:text-red-800 text-sm font-medium'
														disabled={actionLoading}
													>
														Delete
													</button>
												)}
											{currentUser &&
												user.id === currentUser.id && (
													<span className='text-gray-400 text-sm font-medium'>
														Current User
													</span>
												)}
										</div>
									</div>
								</li>
							))}
						</ul>
					)}
				</div>

				{/* Create User Modal */}
				{showCreateModal && (
					<div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
						<div className='bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto'>
							<div className='flex justify-between items-center mb-4'>
								<h3 className='text-lg font-medium text-gray-900'>
									Create New User
								</h3>
								<button
									onClick={closeModals}
									className='text-gray-400 hover:text-gray-600'
								>
									<svg
										className='w-6 h-6'
										fill='none'
										stroke='currentColor'
										viewBox='0 0 24 24'
									>
										<path
											strokeLinecap='round'
											strokeLinejoin='round'
											strokeWidth={2}
											d='M6 18L18 6M6 6l12 12'
										/>
									</svg>
								</button>
							</div>

							<form
								onSubmit={handleCreateUser}
								className='space-y-4'
							>
								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>
										Username
									</label>
									<input
										type='text'
										value={formData.username}
										onChange={(e) =>
											setFormData({
												...formData,
												username: e.target.value,
											})
										}
										className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
										required
										disabled={actionLoading}
									/>
								</div>

								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>
										Email
									</label>
									<input
										type='email'
										value={formData.email}
										onChange={(e) =>
											setFormData({
												...formData,
												email: e.target.value,
											})
										}
										className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
										required
										disabled={actionLoading}
									/>
								</div>

								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>
										Password
									</label>
									<input
										type='password'
										value={formData.password}
										onChange={(e) =>
											setFormData({
												...formData,
												password: e.target.value,
											})
										}
										className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
										required
										disabled={actionLoading}
									/>
								</div>

								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>
										Confirm Password
									</label>
									<input
										type='password'
										value={formData.password_repeat}
										onChange={(e) =>
											setFormData({
												...formData,
												password_repeat: e.target.value,
											})
										}
										className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
										required
										disabled={actionLoading}
									/>
								</div>

								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>
										First Name
									</label>
									<input
										type='text'
										value={formData.first_name}
										onChange={(e) =>
											setFormData({
												...formData,
												first_name: e.target.value,
											})
										}
										className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
										disabled={actionLoading}
									/>
								</div>

								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>
										Last Name
									</label>
									<input
										type='text'
										value={formData.last_name}
										onChange={(e) =>
											setFormData({
												...formData,
												last_name: e.target.value,
											})
										}
										className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
										disabled={actionLoading}
									/>
								</div>

								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>
										Role
									</label>
									<select
										value={formData.role}
										onChange={(e) =>
											setFormData({
												...formData,
												role: e.target.value as
													| "admin"
													| "normal",
											})
										}
										className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
										disabled={actionLoading}
									>
										<option value='normal'>
											Normal User
										</option>
										<option value='admin'>
											Administrator
										</option>
									</select>
								</div>

								<div className='flex space-x-3 pt-4'>
									<button
										type='submit'
										disabled={actionLoading}
										className='flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50'
									>
										{actionLoading
											? "Creating..."
											: "Create User"}
									</button>
									<button
										type='button'
										onClick={closeModals}
										className='flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500'
										disabled={actionLoading}
									>
										Cancel
									</button>
								</div>
							</form>
						</div>
					</div>
				)}

				{/* Edit User Modal */}
				{showEditModal && editingUser && (
					<div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
						<div className='bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto'>
							<div className='flex justify-between items-center mb-4'>
								<h3 className='text-lg font-medium text-gray-900'>
									Edit User
								</h3>
								<button
									onClick={closeModals}
									className='text-gray-400 hover:text-gray-600'
								>
									<svg
										className='w-6 h-6'
										fill='none'
										stroke='currentColor'
										viewBox='0 0 24 24'
									>
										<path
											strokeLinecap='round'
											strokeLinejoin='round'
											strokeWidth={2}
											d='M6 18L18 6M6 6l12 12'
										/>
									</svg>
								</button>
							</div>

							<form
								onSubmit={handleEditUser}
								className='space-y-4'
							>
								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>
										Username
									</label>
									<input
										type='text'
										value={formData.username}
										onChange={(e) =>
											setFormData({
												...formData,
												username: e.target.value,
											})
										}
										className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
										required
										disabled={actionLoading}
									/>
								</div>

								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>
										Email
									</label>
									<input
										type='email'
										value={formData.email}
										onChange={(e) =>
											setFormData({
												...formData,
												email: e.target.value,
											})
										}
										className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
										required
										disabled={actionLoading}
									/>
								</div>

								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>
										Password (leave empty to keep current)
									</label>
									<input
										type='password'
										value={formData.password}
										onChange={(e) =>
											setFormData({
												...formData,
												password: e.target.value,
											})
										}
										className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
										disabled={actionLoading}
									/>
								</div>

								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>
										First Name
									</label>
									<input
										type='text'
										value={formData.first_name}
										onChange={(e) =>
											setFormData({
												...formData,
												first_name: e.target.value,
											})
										}
										className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
										disabled={actionLoading}
									/>
								</div>

								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>
										Last Name
									</label>
									<input
										type='text'
										value={formData.last_name}
										onChange={(e) =>
											setFormData({
												...formData,
												last_name: e.target.value,
											})
										}
										className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
										disabled={actionLoading}
									/>
								</div>

								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>
										Role
									</label>
									<select
										value={formData.role}
										onChange={(e) =>
											setFormData({
												...formData,
												role: e.target.value as
													| "admin"
													| "normal",
											})
										}
										className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
										disabled={actionLoading}
									>
										<option value='normal'>
											Normal User
										</option>
										<option value='admin'>
											Administrator
										</option>
									</select>
								</div>

								<div className='flex space-x-3 pt-4'>
									<button
										type='submit'
										disabled={actionLoading}
										className='flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50'
									>
										{actionLoading
											? "Updating..."
											: "Update User"}
									</button>
									<button
										type='button'
										onClick={closeModals}
										className='flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500'
										disabled={actionLoading}
									>
										Cancel
									</button>
								</div>
							</form>
						</div>
					</div>
				)}
			</div>
		</PageLayout>
	);
}
