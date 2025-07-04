"use client";

import { useState } from "react";
import { downloadAsJSON, generateExportFilename, createExportMetadata } from "@/utils/exportUtils";

interface ExportButtonProps {
	/**
	 * Function to fetch data with filters
	 */
	onExport: (filters: any) => Promise<any>;
	
	/**
	 * Export type for filename generation
	 */
	exportType: 'faults' | 'conditions' | 'dataseries';
	
	/**
	 * Additional context for filename
	 */
	context?: string;
	
	/**
	 * Default filters to apply
	 */
	defaultFilters?: any;
	
	/**
	 * Custom button text
	 */
	buttonText?: string;
	
	/**
	 * Button size
	 */
	size?: 'sm' | 'md' | 'lg';
	
	/**
	 * Button variant
	 */
	variant?: 'primary' | 'secondary' | 'outline';
	
	/**
	 * Optional className for styling
	 */
	className?: string;
}

export default function ExportButton({
	onExport,
	exportType,
	context,
	defaultFilters = {},
	buttonText = "Export JSON",
	size = 'md',
	variant = 'outline',
	className = ''
}: ExportButtonProps) {
	const [isExporting, setIsExporting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleExport = async () => {
		try {
			setIsExporting(true);
			setError(null);

			// Fetch data using the provided function
			const data = await onExport(defaultFilters);

			// Create export metadata
			const metadata = createExportMetadata(exportType, defaultFilters);
			metadata.total_records = Array.isArray(data) ? data.length : 1;

			// Prepare export data
			const exportData = {
				metadata,
				data,
			};

			// Generate filename
			const filename = generateExportFilename(exportType, context);

			// Download as JSON
			downloadAsJSON(exportData, filename);

		} catch (err) {
			console.error('Export error:', err);
			setError(err instanceof Error ? err.message : 'Export failed');
		} finally {
			setIsExporting(false);
		}
	};

	// Button size classes
	const sizeClasses = {
		sm: 'px-3 py-1.5 text-sm',
		md: 'px-4 py-2 text-sm',
		lg: 'px-6 py-3 text-base'
	};

	// Button variant classes
	const variantClasses = {
		primary: 'bg-blue-600 hover:bg-blue-700 text-white border-transparent',
		secondary: 'bg-gray-600 hover:bg-gray-700 text-white border-transparent',
		outline: 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300 hover:border-gray-400'
	};

	const baseClasses = `
		inline-flex items-center justify-center
		border rounded-md font-medium
		transition-colors duration-200
		disabled:opacity-50 disabled:cursor-not-allowed
		focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
		${sizeClasses[size]}
		${variantClasses[variant]}
		${className}
	`.trim();

	return (
		<div className="space-y-2">
			<button
				onClick={handleExport}
				disabled={isExporting}
				className={baseClasses}
				title={`Export ${exportType} data as JSON file`}
			>
				{isExporting ? (
					<>
						<svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
							<circle
								className="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								strokeWidth="4"
							/>
							<path
								className="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							/>
						</svg>
						Exporting...
					</>
				) : (
					<>
						<svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
						</svg>
						{buttonText}
					</>
				)}
			</button>
			
			{error && (
				<div className="text-red-600 text-sm">
					Export failed: {error}
				</div>
			)}
		</div>
	);
}
