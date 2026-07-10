import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { InsertDriveFile as InsertDriveFileIcon } from '@mui/icons-material';
import CommonModal from './CommonModal';

function getKind(mimetype = '') {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  return 'file';
}

function FileViewerModal({ open, onClose, fileUrl, fileName, fileType, mode = 'view', onSend, sending = false }) {
  const [downloading, setDownloading] = useState(false); 

  if (!open) return null;
  const kind = getKind(fileType || '');

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName || 'download';
      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download failed:', err);
      
      window.open(fileUrl, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <CommonModal
      open={open}
      onClose={mode === 'preview' ? (sending ? () => {} : onClose) : onClose}
      title={fileName || 'File'}
      onAction={mode === 'preview' ? onSend : handleDownload}
      actionLabel={mode === 'preview' ? 'Send' : 'Download'}
      actionLoading={mode === 'preview' ? sending : downloading} 
      hideCancel={mode === 'view'}
      maxWidth="sm"
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        {kind === 'image' && (
          <Box component="img" src={fileUrl} alt={fileName} sx={{ maxWidth: '100%', maxHeight: 400, borderRadius: 1 }} />
        )}
        {kind === 'video' && (
          <Box component="video" controls src={fileUrl} sx={{ maxWidth: '100%', maxHeight: 400, borderRadius: 1 }} />
        )}
        {kind === 'audio' && (
          <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 4 }}>
            <InsertDriveFileIcon sx={{ fontSize: 60, color: 'text.secondary' }} />
            <Box component="audio" controls src={fileUrl} sx={{ width: '100%' }} />
          </Box>
        )}
        {kind === 'file' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, py: 4 }}>
            <InsertDriveFileIcon sx={{ fontSize: 60, color: 'text.secondary' }} />
            <Typography variant="body2" color="textSecondary">{fileName}</Typography>
          </Box>
        )}
      </Box>
    </CommonModal>
  );
}

export default FileViewerModal;