"use client";

import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

interface LoginModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const { login } = useAuth();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError("");

		try {
			await login(username, password);
			onClose();
			setUsername("");
			setPassword("");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Login failed");
		} finally {
			setLoading(false);
		}
	};

	if (!isOpen) return null;

	return (
		<div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
			<div className='bg-white rounded-lg p-6 w-full max-w-md mx-4'>
				<div className='flex justify-between items-center mb-4'>
					<h2 className='text-xl font-semibold text-gray-900'>
						Login
					</h2>
					<button
						onClick={onClose}
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
					onSubmit={handleSubmit}
					className='space-y-4'
				>
					{error && (
						<div className='bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded'>
							{error}
						</div>
					)}

					<div>
						<label
							htmlFor='username'
							className='block text-sm font-medium text-gray-700 mb-1'
						>
							Username
						</label>
						<input
							type='text'
							id='username'
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
							required
							disabled={loading}
						/>
					</div>

					<div>
						<label
							htmlFor='password'
							className='block text-sm font-medium text-gray-700 mb-1'
						>
							Password
						</label>
						<input
							type='password'
							id='password'
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
							required
							disabled={loading}
						/>
					</div>

					<button
						type='submit'
						disabled={loading}
						className='w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50'
					>
						{loading ? "Logging in..." : "Login"}
					</button>
				</form>

				<div className='mt-4 text-sm text-gray-600'>
					<p>
						<strong>Demo Accounts:</strong>
					</p>
					<p>Admin: admin / admin123</p>
					<p>User: user / user123</p>
				</div>
			</div>
		</div>
	);
}
