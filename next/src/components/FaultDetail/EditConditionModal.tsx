import React from "react";
import { Condition } from "@/services/api";

interface EditConditionModalProps {
	condition: Condition;
	formData: {
		name: string;
		description: string;
		status: "Active" | "Inactive";
	};
	onFormChange: (field: string, value: string) => void;
	onSave: () => void;
	onCancel: () => void;
	loading: boolean;
}

export default function EditConditionModal({
	condition,
	formData,
	onFormChange,
	onSave,
	onCancel,
	loading,
}: EditConditionModalProps) {
	return (
		<div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
			<div className='bg-white rounded-lg p-6 w-full max-w-md'>
				<h3 className='text-lg font-medium text-gray-900 mb-4'>
					Edit Condition
				</h3>
				<div className='space-y-4'>
					<div>
						<label
							htmlFor='condition-name'
							className='block text-sm font-medium text-gray-700 mb-1'
						>
							Name
						</label>
						<input
							id='condition-name'
							type='text'
							value={formData.name}
							onChange={(e) =>
								onFormChange("name", e.target.value)
							}
							className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
							disabled={loading}
						/>
					</div>
					<div>
						<label
							htmlFor='condition-description'
							className='block text-sm font-medium text-gray-700 mb-1'
						>
							Description
						</label>
						<textarea
							id='condition-description'
							value={formData.description}
							onChange={(e) =>
								onFormChange("description", e.target.value)
							}
							rows={3}
							className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
							disabled={loading}
						/>
					</div>
					<div>
						<label
							htmlFor='condition-status'
							className='block text-sm font-medium text-gray-700 mb-1'
						>
							Status
						</label>
						<select
							id='condition-status'
							value={formData.status}
							onChange={(e) =>
								onFormChange("status", e.target.value)
							}
							className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
							disabled={loading}
						>
							<option value='Active'>Active</option>
							<option value='Inactive'>Inactive</option>
						</select>
					</div>
				</div>
				<div className='flex space-x-3 mt-6'>
					<button
						onClick={onSave}
						disabled={loading}
						className='flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50'
					>
						{loading ? "Saving..." : "Save Changes"}
					</button>
					<button
						onClick={onCancel}
						disabled={loading}
						className='flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 disabled:opacity-50'
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	);
}
