"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface ProtectedRouteProps {
	children: React.ReactNode;
	requireAdmin?: boolean;
	allowedRoles?: string[];
	redirectTo?: string;
}

export function ProtectedRoute({
	children,
	requireAdmin = false,
	allowedRoles = [],
	redirectTo = "/",
}: ProtectedRouteProps) {
	const { user, loading, isAuthenticated, isAdmin } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (loading) return;

		// Not authenticated - redirect to login
		if (!isAuthenticated) {
			router.push(redirectTo);
			return;
		}

		// Require admin but user is not admin
		if (requireAdmin && !isAdmin) {
			router.push(redirectTo);
			return;
		}

		// Check allowed roles
		if (
			allowedRoles.length > 0 &&
			user &&
			!allowedRoles.includes(user.role)
		) {
			router.push(redirectTo);
			return;
		}
	}, [
		user,
		loading,
		isAuthenticated,
		isAdmin,
		requireAdmin,
		allowedRoles,
		router,
		redirectTo,
	]);

	if (loading) {
		return (
			<div className='min-h-screen flex items-center justify-center'>
				<div className='animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600'></div>
			</div>
		);
	}

	if (!isAuthenticated) {
		return null;
	}

	if (requireAdmin && !isAdmin) {
		return null;
	}

	if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
		return null;
	}

	return <>{children}</>;
}

export default ProtectedRoute;
