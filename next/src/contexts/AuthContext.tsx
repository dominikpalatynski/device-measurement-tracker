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
				const token = auth.getToken();
				const storedUser = auth.getUser();

				if (token && storedUser) {
					// Set user immediately from localStorage for fast UI update
					console.log("setuser1", storedUser);
					setUser(storedUser);

					try {
						// Validate token and refresh user data from server
						const currentUser = await auth.getCurrentUser();
						console.log(
							"User fetched with existing token:",
							currentUser
						);
						setUser(currentUser);
					} catch (error) {
						console.warn(
							"Token validation failed, attempting refresh:",
							error
						);

						try {
							// Try to refresh the token
							const refreshedAuth = await auth.refreshToken();
							console.log(refreshedAuth.user);
							setUser(refreshedAuth.user);
						} catch (refreshError) {
							console.error(
								"Token refresh failed:",
								refreshError
							);
							// Clear invalid auth data
							auth.clearAll();
							setUser(null);
						}
					}
				} else if (token && !storedUser) {
					// We have a token but no stored user, try to get user info
					try {
						const currentUser = await auth.getCurrentUser();
						console.log(
							"User fetched with existing token:",
							currentUser.user
						);
						setUser(currentUser.user as User);
					} catch (error) {
						console.error(
							"Failed to get user with existing token:",
							error
						);
						auth.clearAll();
						setUser(null);
					}
				}
				// If no token, user stays null (not logged in)
			} catch (error) {
				console.error("Failed to initialize auth:", error);
				auth.clearAll();
				setUser(null);
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
			const token = auth.getToken();
			if (token) {
				const currentUser = await auth.getCurrentUser();
				setUser(currentUser);
			} else {
				// No token available
				setUser(null);
				auth.clearAll();
			}
		} catch (error) {
			console.warn(
				"Failed to refresh user, attempting token refresh:",
				error
			);

			try {
				// Try to refresh the token
				const refreshedAuth = await auth.refreshToken();
				setUser(refreshedAuth.user);
			} catch (refreshError) {
				console.error("Token refresh failed:", refreshError);
				setUser(null);
				auth.clearAll();
			}
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
