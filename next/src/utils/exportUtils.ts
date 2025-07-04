/**
 * Utility functions for exporting data
 */

/**
 * Download data as JSON file
 */
export const downloadAsJSON = (data: any, filename: string) => {
	try {
		const jsonString = JSON.stringify(data, null, 2);
		const blob = new Blob([jsonString], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		
		const link = document.createElement('a');
		link.href = url;
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		
		// Clean up
		URL.revokeObjectURL(url);
	} catch (error) {
		console.error('Error downloading JSON:', error);
		throw new Error('Failed to download data as JSON');
	}
};

/**
 * Generate filename with timestamp
 */
export const generateExportFilename = (type: string, context?: string) => {
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	const contextPart = context ? `_${context}` : '';
	return `${type}${contextPart}_export_${timestamp}.json`;
};

/**
 * Format export metadata
 */
export const createExportMetadata = (type: string, filters: any = {}) => {
	return {
		export_type: type,
		export_timestamp: new Date().toISOString(),
		filters: filters,
		total_records: 0, // Will be updated by caller
	};
};
