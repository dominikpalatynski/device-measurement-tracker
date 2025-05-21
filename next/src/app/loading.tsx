"use client";

export default function Loading() {
	return (
		<div className='loading-container'>
			<div className='loading-spinner'></div>
			<p>Loading...</p>
			<style jsx>{`
				.loading-container {
					display: flex;
					flex-direction: column;
					align-items: center;
					justify-content: center;
					padding: 2rem;
					min-height: 200px;
				}
				.loading-spinner {
					width: 40px;
					height: 40px;
					border: 4px solid rgba(0, 0, 0, 0.1);
					border-radius: 50%;
					border-left-color: #09f;
					animation: spin 1s linear infinite;
					margin-bottom: 1rem;
				}
				@keyframes spin {
					0% {
						transform: rotate(0deg);
					}
					100% {
						transform: rotate(360deg);
					}
				}
			`}</style>
		</div>
	);
}
