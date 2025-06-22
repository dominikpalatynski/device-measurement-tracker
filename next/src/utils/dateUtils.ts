/**
 * Utility functions for handling different date formats from the backend
 */

export const formatDate = (dateString: string | null | undefined): string => {
	if (!dateString) return 'N/A';
	
	// Handle Unix timestamps (numbers as strings)
	const timestamp = parseInt(dateString);
	if (!isNaN(timestamp) && timestamp > 1000000000) {
		return new Date(timestamp * 1000).toLocaleString();
	}
	
	// Handle ISO date strings
	const date = new Date(dateString);
	if (isNaN(date.getTime())) {
		return 'Invalid Date';
	}
	
	return date.toLocaleString();
};

export const formatDateShort = (dateString: string | null | undefined): string => {
	if (!dateString) return 'N/A';
	
	// Handle Unix timestamps (numbers as strings)
	const timestamp = parseInt(dateString);
	if (!isNaN(timestamp) && timestamp > 1000000000) {
		return new Date(timestamp * 1000).toLocaleDateString();
	}
	
	// Handle ISO date strings
	const date = new Date(dateString);
	if (isNaN(date.getTime())) {
		return 'Invalid Date';
	}
	
	return date.toLocaleDateString();
};

export const formatDateTime = (dateString: string | null | undefined): string => {
	if (!dateString) return 'N/A';
	
	// Handle Unix timestamps (numbers as strings)
	const timestamp = parseInt(dateString);
	if (!isNaN(timestamp) && timestamp > 1000000000) {
		const date = new Date(timestamp * 1000);
		return date.toLocaleString();
	}
	
	// Handle ISO date strings
	const date = new Date(dateString);
	if (isNaN(date.getTime())) {
		return 'Invalid Date';
	}
	
	return date.toLocaleString();
};

export const isValidDate = (dateString: string | null | undefined): boolean => {
	if (!dateString) return false;
	
	// Handle Unix timestamps
	const timestamp = parseInt(dateString);
	if (!isNaN(timestamp) && timestamp > 1000000000) {
		return true;
	}
	
	// Handle ISO date strings
	const date = new Date(dateString);
	return !isNaN(date.getTime());
};

/**
 * Format duration in seconds to a human-readable string
 * @param seconds Duration in seconds
 * @returns Formatted duration string (e.g., "1h 30m 45s", "5m 30s", "45s")
 */
export const formatDuration = (seconds: number): string => {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = seconds % 60;

	if (hours > 0) {
		return `${hours}h ${minutes}m ${secs}s`;
	} else if (minutes > 0) {
		return `${minutes}m ${secs}s`;
	} else {
		return `${secs}s`;
	}
};
