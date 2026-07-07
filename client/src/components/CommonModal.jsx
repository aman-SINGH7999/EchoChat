import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Button, Typography, Box, CircularProgress } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

function CommonModal({
  open,
  onClose,
  title,
  children,
  onAction,
  actionLabel = 'Confirm',
  actionDisabled = false,
  actionLoading = false,
  actionColor = 'primary',
  hideCancel = false,
  maxWidth = 'sm'
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth={maxWidth} fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
        <Typography variant="h6" component="span">{title}</Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {children}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        {!hideCancel && (
          <Button onClick={onClose} disabled={actionLoading}>
            Cancel
          </Button>
        )}
        {onAction && (
          <Button
            onClick={onAction}
            variant="contained"
            color={actionColor}
            disabled={actionDisabled || actionLoading}
          >
            {actionLoading ? <CircularProgress size={20} color="inherit" /> : actionLabel}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default CommonModal;