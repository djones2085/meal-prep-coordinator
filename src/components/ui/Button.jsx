import React from 'react';

// Simple Button with Tailwind styling (variants can be added)
const StyledButton = ({ children, onClick, type = 'button', variant = 'primary', disabled = false, fullWidth = false, size = 'medium', className = '', ...props }) => {
    const baseClasses = 'inline-flex items-center justify-center border border-transparent rounded-md shadow-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    let variantClasses = '';
    switch (variant) {
        case 'secondary':
            variantClasses = 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-indigo-500';
            break;
        case 'outline':
             variantClasses = 'border-indigo-600 text-indigo-600 bg-white hover:bg-indigo-50 focus:ring-indigo-500';
             break;
        case 'text':
             variantClasses = 'border-transparent text-indigo-600 hover:bg-indigo-100 focus:ring-indigo-500';
             break;
        case 'primary':
        default:
            variantClasses = 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500';
            break;
    }

    let sizeClasses = '';
     switch (size) {
         case 'small':
             sizeClasses = 'px-2.5 py-1.5 text-xs';
             break;
         case 'large':
             sizeClasses = 'px-4 py-2 text-base';
             break;
         case 'medium':
         default:
             sizeClasses = 'px-4 py-2 text-sm';
             break;
     }

    const widthClass = fullWidth ? 'w-full' : '';

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`${baseClasses} ${variantClasses} ${sizeClasses} ${widthClass} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

export default StyledButton; 