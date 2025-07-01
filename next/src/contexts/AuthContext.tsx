"use client";

import React, {
	createContext,
	useContext,
	useEffect,
	useState,
	ReactNode,
} from "react";
import { auth, User } from "../services/auth";

interface AuthContextType {
	user: User | null;
	loading: boolean;
	login: (username: string, password: string) => Promise<void>;
	logout: () => Promise<void>;
	isAuthenticated: boolean;
	isAdmin: boolean;
	refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
	children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		// Check if user is already logged in
		const initAuth = async () => {
			try {
				if (auth.isLoggedIn()) {
					const currentUser = await auth.getCurrentUser();
					setUser(currentUser);
				}
			} catch (error) {
				console.error("Failed to get current user:", error);
				auth.clearAll();
			} finally {
				setLoading(false);
			}
		};

		initAuth();
	}, []);

	const login = async (username: string, password: string) => {
		try {
			const response = await auth.login({ username, password });
			setUser(response.user);
		} catch (error) {
			console.error("Login failed:", error);
			throw error;
		}
	};

	const logout = async () => {
		try {
			await auth.logout();
		} catch (error) {
			console.error("Logout failed:", error);
		} finally {
			setUser(null);
		}
	};

	const refreshUser = async () => {
		try {
			if (auth.isLoggedIn()) {
				const currentUser = await auth.getCurrentUser();
				setUser(currentUser);
			}
		} catch (error) {
			console.error("Failed to refresh user:", error);
			setUser(null);
			auth.clearAll();
		}
	};

	const value: AuthContextType = {
		user,
		loading,
		login,
		logout,
		isAuthenticated: !!user,
		isAdmin: user?.role === "admin",
		refreshUser,
	};

	return (
		<AuthContext.Provider value={value}>{children}</AuthContext.Provider>
	);
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
}

export default AuthContext;
