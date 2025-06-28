"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface BreadcrumbItem {
	label: string;
	href: string;
	current?: boolean;
}

interface BreadcrumbProps {
	items?: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
	const pathname = usePathname();

	// Generate breadcrumb items from pathname if not provided
	const generateBreadcrumbs = (): BreadcrumbItem[] => {
		if (items) return items;

		const pathSegments = pathname.split("/").filter(Boolean);
		const breadcrumbs: BreadcrumbItem[] = [{ label: "Home", href: "/" }];

		let currentPath = "";
		pathSegments.forEach((segment, index) => {
			currentPath += `/${segment}`;
			const isLast = index === pathSegments.length - 1;

			// Convert segment to readable label
			let label = segment;

			// Handle specific cases
			if (segment === "faults") {
				label = "Faults";
			} else if (segment === "devices") {
				label = "Devices";
			} else if (segment === "register") {
				label = "Register";
			} else if (segment.startsWith("flt_") || segment.length > 10) {
				// This might be an ID, try to make it more readable
				if (segment.startsWith("flt_")) {
					label = `Fault ${segment.slice(4, 12)}...`;
				} else {
					label = `${segment.slice(0, 8)}...`;
				}
			} else {
				// Capitalize first letter
				label = segment.charAt(0).toUpperCase() + segment.slice(1);
			}

			breadcrumbs.push({
				label,
				href: currentPath,
				current: isLast,
			});
		});

		return breadcrumbs;
	};

	const breadcrumbs = generateBreadcrumbs();

	return (
		<nav
			className='flex'
			aria-label='Breadcrumb'
		>
			<ol className='flex items-center space-x-2'>
				{" "}
				{breadcrumbs.map((item, index) => (
					<li
						key={item.href}
						className='flex items-center'
					>
						{index === 0 ? (
							<Link
								href={item.href}
								className='text-gray-400 hover:text-gray-500 flex items-center'
							>
								<span className='text-lg mr-1'>🏠</span>
								<span className='sr-only'>{item.label}</span>
							</Link>
						) : (
							<>
								<span className='mx-2 text-gray-400'>›</span>
								{item.current ? (
									<span
										className='text-sm font-medium text-gray-900'
										aria-current='page'
									>
										{item.label}
									</span>
								) : (
									<Link
										href={item.href}
										className='text-sm font-medium text-gray-500 hover:text-gray-700'
									>
										{item.label}
									</Link>
								)}
							</>
						)}
					</li>
				))}
			</ol>
		</nav>
	);
}
