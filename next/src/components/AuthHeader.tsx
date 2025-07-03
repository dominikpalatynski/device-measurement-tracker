"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "../contexts/AuthContext";
import LoginModal from "./LoginModal";

export default function AuthHeader() {
	const { user, logout, isAuthenticated, isAdmin, loading } = useAuth();
	const [showLoginModal, setShowLoginModal] = useState(false);
	const [showUserMenu, setShowUserMenu] = useState(false);

	console.log(user);

	const handleLogout = async () => {
		try {
			await logout();
			setShowUserMenu(false);
		} catch (error) {
			console.error("Logout failed:", error);
		}
	};

	if (loading) {
		return (
			<div className='flex items-center space-x-4'>
				<div
					className='w-8 h-8 bg-gray-200 rounded-full animate-pulse'
					data-testid='loading-spinner'
				></div>
			</div>
		);
	}

	if (!isAuthenticated) {
		return (
			<div className='flex items-center space-x-4'>
				<button
					onClick={() => setShowLoginModal(true)}
					className='bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
				>
					Login
				</button>
				<LoginModal
					isOpen={showLoginModal}
					onClose={() => setShowLoginModal(false)}
				/>
			</div>
		);
	}

	console.log(user.display_name);
	console.log(user?.display_name);

	return (
		<div className='flex items-center space-x-4'>
			<div className='flex items-center space-x-2 text-sm text-gray-600'>
				<span
					className={`px-2 py-1 rounded-full text-xs font-medium ${
						isAdmin
							? "bg-red-100 text-red-800"
							: "bg-green-100 text-green-800"
					}`}
				>
					{isAdmin ? "Admin" : "User"}
				</span>
			</div>

			<div className='relative'>
				<button
					onClick={() => setShowUserMenu(!showUserMenu)}
					className='flex items-center space-x-2 text-gray-700 hover:text-gray-900 focus:outline-none'
				>
					<div className='w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium'>
						{user?.display_name?.[0] || user?.username?.[0] || "U"}
					</div>
					<span className='hidden sm:block'>
						{user?.display_name || user?.username}
					</span>
					<svg
						className='w-4 h-4'
						fill='none'
						stroke='currentColor'
						viewBox='0 0 24 24'
					>
						<path
							strokeLinecap='round'
							strokeLinejoin='round'
							strokeWidth={2}
							d='M19 9l-7 7-7-7'
						/>
					</svg>
				</button>

				{showUserMenu && (
					<div className='absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200'>
						<div className='px-4 py-2 text-sm text-gray-900 border-b'>
							<div className='font-medium'>
								{user?.display_name || user?.username}
							</div>
							<div className='text-gray-500'>{user?.email}</div>
						</div>

						<Link
							href='/profile'
							onClick={() => setShowUserMenu(false)}
							className='block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100'
						>
							Profile
						</Link>

						{isAdmin && (
							<Link
								href='/users'
								onClick={() => setShowUserMenu(false)}
								className='block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100'
							>
								User Management
							</Link>
						)}

						<button
							onClick={handleLogout}
							className='block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100'
						>
							Logout
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
