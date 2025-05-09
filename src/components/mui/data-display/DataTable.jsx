import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
} from '@mui/material';

const DataTable = ({
    columns,
    data,
    maxHeight,
    stickyHeader = true,
    size = 'medium',
    children,
    ...props
}) => {
    return (
        <TableContainer 
            component={Paper} 
            sx={{ 
                maxHeight: maxHeight,
                '& .MuiTableCell-stickyHeader': {
                    backgroundColor: 'background.paper',
                },
            }}
        >
            <Table stickyHeader={stickyHeader} size={size} {...props}>
                <TableHead>
                    <TableRow>
                        {columns.map((column) => (
                            <TableCell
                                key={column.id}
                                align={column.align || 'left'}
                                style={{ 
                                    minWidth: column.minWidth,
                                    ...column.style
                                }}
                            >
                                {column.label}
                            </TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {children ? (
                        children
                    ) : (
                        Array.isArray(data) && data.map((row, index) => (
                            <TableRow 
                                hover 
                                key={row.id || index}
                                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                            >
                                {columns.map((column) => (
                                    <TableCell
                                        key={column.id}
                                        align={column.align || 'left'}
                                    >
                                        {column.render ? column.render(row) : row[column.id]}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default DataTable; 