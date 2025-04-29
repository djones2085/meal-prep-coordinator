import React from 'react';

// Simple Button with Tailwind styling (variants can be added)
const StyledButton = ({ 
    children, 
    onClick, 
    type = 'button', 
    variant = 'primary', 
    disabled = false, 
    fullWidth = false, 
    size = 'medium', 
    className = '', 
    isLoading = false,
    ...props 
}) => {
    const baseClasses = 'relative inline-flex items-center justify-center font-medium focus:outline-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

    let variantClasses = '';
    switch (variant) {
        case 'secondary':
            variantClasses = 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 shadow-sm hover:border-gray-400';
            break;
        case 'outline':
            variantClasses = 'bg-white text-indigo-600 hover:bg-indigo-50 border-2 border-indigo-600 shadow-sm';
            break;
        case 'text':
            variantClasses = 'bg-transparent text-indigo-600 hover:bg-indigo-50';
            break;
        case 'primary':
        default:
            variantClasses = 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700 active:bg-indigo-800';
            break;
    }

    let sizeClasses = '';
    switch (size) {
        case 'small':
            sizeClasses = 'px-3 py-2 text-sm rounded-lg';
            break;
        case 'large':
            sizeClasses = 'px-6 py-3 text-base rounded-xl';
            break;
        case 'medium':
        default:
            sizeClasses = 'px-4 py-2.5 text-sm rounded-lg';
            break;
    }

    const widthClass = fullWidth ? 'w-full' : '';

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || isLoading}
            className={`${baseClasses} ${variantClasses} ${sizeClasses} ${widthClass} ${className}`}
            {...props}
        >
            {isLoading ? (
                <>
                    <span className="opacity-0">{children}</span>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                </>
            ) : children}
        </button>
    );
};

export default StyledButton; 