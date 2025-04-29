import React from 'react';

// Simple Input with Tailwind styling
const StyledInput = React.forwardRef(({ label, id, className = '', ...props }, ref) => (
    <div className={`w-full ${className}`}>
        {label && <label htmlFor={id || props.name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
        <input
            ref={ref}
            id={id || props.name}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            {...props}
        />
    </div>
));

export default StyledInput; 