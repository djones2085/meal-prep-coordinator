import React from 'react';

// Simple Select component using Tailwind styling
// Assumes @tailwindcss/forms plugin is installed for base styling
const StyledSelect = React.forwardRef(({ label, id, options, className = '', wrapperClassName = '', ...props }, ref) => {
    const selectId = id || props.name;
    return (
        <div className={`w-full ${wrapperClassName}`}>
            {label && <label htmlFor={selectId} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
            <select
                ref={ref}
                id={selectId}
                className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed ${className}`}
                {...props}
            >
                {/* Add a default placeholder/disabled option if needed */} 
                {/* <option value="" disabled selected>Please select</option> */}
                {options && options.map(option => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
});

export default StyledSelect; 