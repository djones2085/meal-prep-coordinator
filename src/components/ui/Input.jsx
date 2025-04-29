import React from 'react';

// Sophisticated Input with Tailwind styling
const StyledInput = React.forwardRef(({ label, id, className = '', error, ...props }, ref) => (
    <div className={`w-full ${className}`}>
        {label && (
            <label 
                htmlFor={id || props.name} 
                className="block text-base font-medium text-gray-700 mb-2"
            >
                {label}
            </label>
        )}
        <div className="relative">
            <input
                ref={ref}
                id={id || props.name}
                className={`
                    block w-full px-5 py-4 
                    bg-gray-50 border ${error ? 'border-red-300' : 'border-gray-200'} 
                    rounded-xl
                    text-gray-900 text-base
                    placeholder-gray-400
                    transition-all duration-200
                    hover:border-gray-300
                    focus:outline-none focus:ring-0 focus:border-indigo-400 focus:bg-white
                    disabled:bg-gray-100 disabled:cursor-not-allowed
                `}
                {...props}
            />
        </div>
    </div>
));

export default StyledInput; 