import React from 'react';
import {
    Card,
    CardContent,
    Typography,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Box,
    Chip
} from '@mui/material';

export default function UserCard({ user, availableRoles, onInitiateRoleChange, isUpdating }) {
    const cardTitle = user.displayName || user.email || user.id;

    return (
        <Card sx={{ mb: 2, boxShadow: 3 }}>
            <CardContent>
                <Typography variant="h6" component="div" gutterBottom noWrap title={cardTitle}>
                    {cardTitle}
                </Typography>
                
                {user.email && (
                    <Typography variant="body2" color="text.secondary" gutterBottom noWrap>
                        Email: {user.email}
                    </Typography>
                )}
                <Typography variant="body2" color="text.secondary" sx={{mb: 0.5}}>
                    User ID: {user.id}
                </Typography>

                <Box sx={{ my: 1.5 }}>
                    <Typography variant="caption" display="block" color="text.secondary" sx={{mb: 0.5}}>
                        Current Roles:
                    </Typography>
                    {user.roles && user.roles.length > 0 ? (
                        user.roles.map(role => (
                            <Chip key={role} label={role} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                        ))
                    ) : (
                        <Typography variant="body2" color="text.secondary" sx={{fontStyle: 'italic'}}>No roles assigned</Typography>
                    )}
                </Box>

                <FormControl fullWidth size="small" sx={{ mt: 1}} disabled={isUpdating}> 
                    <InputLabel id={`role-select-label-${user.id}`}>Change Roles</InputLabel>
                    <Select
                        labelId={`role-select-label-${user.id}`}
                        multiple
                        value={user.roles || []}
                        onChange={(e) => onInitiateRoleChange(user.id, e.target.value)}
                        label="Change Roles"
                        renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {selected.map((value) => (
                                    <Chip key={value} label={value} size="small"/>
                                ))}
                            </Box>
                        )}
                    >
                        {availableRoles.map((role) => (
                            <MenuItem key={role} value={role}>
                                {role.charAt(0).toUpperCase() + role.slice(1)}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </CardContent>
        </Card>
    );
} 