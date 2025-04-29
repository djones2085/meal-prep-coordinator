import React from 'react';

const TailwindAlert = ({ severity = 'info', children, className = '' }) => {
    const baseClasses = 'px-4 py-3 rounded relative mb-4';
    let severityClasses = '';

    switch (severity) {
        case 'error':
            severityClasses = 'bg-red-100 border border-red-400 text-red-700';
            break;
        case 'success':
            severityClasses = 'bg-green-100 border border-green-400 text-green-700';
            break;
        case 'warning':
             severityClasses = 'bg-yellow-100 border border-yellow-400 text-yellow-700';
             break;
        case 'info':
        default:
             severityClasses = 'bg-blue-100 border border-blue-400 text-blue-700';
             break;
    }

    return (
        <div role="alert" className={`${baseClasses} ${severityClasses} ${className}`}>
            {children}
        </div>
    );
};

export default TailwindAlert; 