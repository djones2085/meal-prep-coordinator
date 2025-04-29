import React from 'react';
import {
    FormControl,
    InputLabel,
    Select as MuiSelect,
    MenuItem,
    FormHelperText
} from '@mui/material';

const Select = ({
    label,
    value,
    onChange,
    options,
    error,
    helperText,
    fullWidth = true,
    size = 'medium',
    margin = 'normal',
    required = false,
    disabled = false,
    ...props
}) => {
    const id = props.id || props.name || label?.toLowerCase().replace(/\s+/g, '-');

    return (
        <FormControl
            fullWidth={fullWidth}
            error={error}
            size={size}
            margin={margin}
            required={required}
            disabled={disabled}
        >
            {label && <InputLabel id={`${id}-label`}>{label}</InputLabel>}
            <MuiSelect
                labelId={`${id}-label`}
                id={id}
                value={value}
                label={label}
                onChange={onChange}
                {...props}
            >
                {options.map((option) => (
                    <MenuItem 
                        key={option.value} 
                        value={option.value}
                        disabled={option.disabled}
                    >
                        {option.label}
                    </MenuItem>
                ))}
            </MuiSelect>
            {helperText && <FormHelperText>{helperText}</FormHelperText>}
        </FormControl>
    );
};

export default Select; 