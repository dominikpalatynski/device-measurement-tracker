"use client";

import Breadcrumb from "./Breadcrumb";
import AuthHeader from "./AuthHeader";

interface BreadcrumbItem {
	label: string;
	href: string;
	current?: boolean;
}

interface PageLayoutProps {
	children: React.ReactNode;
	title?: string;
	breadcrumbs?: BreadcrumbItem[];
	className?: string;
}

export default function PageLayout({
	children,
	title,
	breadcrumbs,
	className = "",
}: PageLayoutProps) {
	return (
		<div className={`min-h-screen bg-gray-50 ${className}`}>
			{/* Header with breadcrumb and auth */}
			<div className='bg-white shadow-sm border-b border-gray-200'>
				<div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
					<div className='py-4'>
						<div className='flex justify-between items-start'>
							<div className='flex-1'>
								<Breadcrumb items={breadcrumbs} />
								{title && (
									<h1 className='mt-2 text-2xl font-bold text-gray-900'>
										{title}
									</h1>
								)}
							</div>
							<div className='ml-4'>
								<AuthHeader />
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Main content */}
			<main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
				{children}
			</main>
		</div>
	);
}
