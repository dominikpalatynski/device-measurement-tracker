"use client";

import React, {
	createContext,
	useContext,
	useEffect,
	useState,
	ReactNode,
	useRef,
} from "react";
import { auth, User } from "../services/auth";

// Utility function to decode JWT payload without verification
function decodeJWT(token: string): any {
	try {
		if (!token || typeof token !== "string") {
			return null;
		}

		const parts = token.split(".");
		if (parts.length !== 3) {
			return null;
		}

		const base64Url = parts[1];
		const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
		const jsonPayload = decodeURIComponent(
			atob(base64)
				.split("")
				.map(
					(c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)
				)
				.join("")
		);
		return JSON.parse(jsonPayload);
	} catch (error) {
		console.error("Failed to decode JWT token:", error);
		return null;
	}
}

// Utility function to get token expiration time
function getTokenExpiration(token: string): number | null {
	const payload = decodeJWT(token);
	return payload?.exp ? payload.exp * 1000 : null; // Convert to milliseconds
}

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
	const tokenTimerRef = useRef<NodeJS.Timeout | null>(null);

	// Clear existing timer
	const clearTokenTimer = () => {
		if (tokenTimerRef.current) {
			clearTimeout(tokenTimerRef.current);
			tokenTimerRef.current = null;
		}
	};

	// Set up token expiration timer
	const setupTokenTimer = (token: string) => {
		clearTokenTimer();

		const expirationTime = getTokenExpiration(token);
		if (!expirationTime) return;

		const currentTime = Date.now();
		const timeUntilExpiration = expirationTime - currentTime;

		// If token is already expired or expires in less than 30 seconds, logout immediately
		if (timeUntilExpiration <= 30000) {
			console.warn("Token expired or expiring soon, logging out");
			handleTokenExpiration();
			return;
		}

		// Set timer to logout user when token expires
		tokenTimerRef.current = setTimeout(() => {
			console.warn("Token has expired, logging out user");
			handleTokenExpiration();
		}, timeUntilExpiration);

		console.log(
			`Token timer set: expires in ${Math.round(
				timeUntilExpiration / 1000
			)} seconds`
		);
	};

	// Handle token expiration
	const handleTokenExpiration = async () => {
		console.log("Handling token expiration");
		clearTokenTimer();

		try {
			await auth.logout();
		} catch (error) {
			console.error("Error during logout:", error);
		}

		setUser(null);

		// Refresh the page to ensure clean state
		if (typeof window !== "undefined") {
			window.location.reload();
		}
	};

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

					// Set up token expiration timer
					setupTokenTimer(token);

					try {
						// Validate token and refresh user data from server
						const currentUser = await auth.getCurrentUser();

						setUser(currentUser?.user as User);
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

							// Update timer with new token
							setupTokenTimer(refreshedAuth.access_token);
						} catch (refreshError) {
							console.error(
								"Token refresh failed:",
								refreshError
							);
							// Clear invalid auth data
							auth.clearAll();
							setUser(null);
							clearTokenTimer();
						}
					}
				} else if (token && !storedUser) {
					// We have a token but no stored user, try to get user info
					setupTokenTimer(token);

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
						clearTokenTimer();
					}
				}
				// If no token, user stays null (not logged in)
			} catch (error) {
				console.error("Failed to initialize auth:", error);
				auth.clearAll();
				setUser(null);
				clearTokenTimer();
			} finally {
				setLoading(false);
			}
		};

		initAuth();

		// Cleanup timer on unmount
		return () => {
			clearTokenTimer();
		};
	}, []);

	const login = async (username: string, password: string) => {
		try {
			const response = await auth.login({ username, password });
			setUser(response.user);

			// Set up token expiration timer
			setupTokenTimer(response.access_token);

			// Refresh the page after successful login to ensure clean state
			if (typeof window !== "undefined") {
				setTimeout(() => {
					window.location.reload();
				}, 100);
			}
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
			clearTokenTimer();

			// Refresh the page after logout to ensure clean state
			if (typeof window !== "undefined") {
				setTimeout(() => {
					window.location.reload();
				}, 100);
			}
		}
	};

	const refreshUser = async () => {
		try {
			const token = auth.getToken();
			if (token) {
				// Update timer with current token
				setupTokenTimer(token);

				const currentUser = await auth.getCurrentUser();
				setUser(currentUser);
			} else {
				// No token available
				setUser(null);
				auth.clearAll();
				clearTokenTimer();
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

				// Update timer with new token
				setupTokenTimer(refreshedAuth.access_token);
			} catch (refreshError) {
				console.error("Token refresh failed:", refreshError);
				setUser(null);
				auth.clearAll();
				clearTokenTimer();
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
