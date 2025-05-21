"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		// Log the error to an error reporting service
		console.error("Application error:", error);
	}, [error]);

	return (
		<div className='error-container'>
			<h2>Something went wrong!</h2>
			<p>{error.message || "An unexpected error occurred"}</p>
			<button onClick={reset}>Try again</button>
			<style jsx>{`
				.error-container {
					padding: 2rem;
					margin: 2rem auto;
					max-width: 500px;
					background-color: #fee2e2;
					border-radius: 8px;
					text-align: center;
				}
				button {
					margin-top: 1rem;
					padding: 0.5rem 1rem;
					background-color: #ef4444;
					color: white;
					border: none;
					border-radius: 4px;
					cursor: pointer;
				}
				button:hover {
					background-color: #dc2626;
				}
			`}</style>
		</div>
	);
}
