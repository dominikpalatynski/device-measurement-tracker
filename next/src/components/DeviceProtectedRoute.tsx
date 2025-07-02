"use client";

import { useDeviceOwnership } from "@/hooks/useDeviceOwnership";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface DeviceProtectedRouteProps {
	children: React.ReactNode;
	deviceId: string;
	redirectTo?: string;
	fallback?: React.ReactNode;
}

export function DeviceProtectedRoute({
	children,
	deviceId,
	redirectTo = "/",
	fallback,
}: DeviceProtectedRouteProps) {
	const { canAccess, loading, error } = useDeviceOwnership({ deviceId });
	const router = useRouter();

	useEffect(() => {
		if (!loading && !canAccess) {
			router.push(redirectTo);
		}
	}, [loading, canAccess, router, redirectTo]);

	if (loading) {
		return (
			fallback || (
				<div className='min-h-screen flex items-center justify-center'>
					<div className='text-center'>
						<div
							className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4'
							data-testid='device-loading-spinner'
						></div>
						<p className='text-gray-600'>
							Verifying access permissions...
						</p>
					</div>
				</div>
			)
		);
	}

	if (error) {
		return (
			<div className='min-h-screen flex items-center justify-center'>
				<div className='text-center'>
					<div className='w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4'>
						<svg
							className='w-8 h-8 text-red-600'
							fill='currentColor'
							viewBox='0 0 20 20'
						>
							<path
								fillRule='evenodd'
								d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'
								clipRule='evenodd'
							/>
						</svg>
					</div>
					<h3 className='text-lg font-medium text-gray-900 mb-2'>
						Access Denied
					</h3>
					<p className='text-gray-600 mb-4'>{error}</p>
					<button
						onClick={() => router.push(redirectTo)}
						className='bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700'
					>
						Go Back
					</button>
				</div>
			</div>
		);
	}

	if (!canAccess) {
		return null;
	}

	return <>{children}</>;
}

export default DeviceProtectedRoute;
