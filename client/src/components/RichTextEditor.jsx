import React, { forwardRef, useImperativeHandle, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { Box, IconButton, Divider } from '@mui/material';
import {
  FormatBold, FormatItalic, FormatUnderlined, FormatStrikethrough,
  FormatListBulleted, FormatListNumbered, FormatQuote, Code as CodeIcon
} from '@mui/icons-material';

const RichTextEditor = forwardRef(function RichTextEditor(
  { content = '', onChange, onSubmit, placeholder = 'Type a message...', showToolbar = false, autoFocus = true, minHeight = 24, maxHeight = 150 },
  ref
) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      Underline,
      Placeholder.configure({ placeholder })
    ],
    content,
    autofocus: autoFocus,
    onUpdate: ({ editor }) => {
      onChange?.(editor.isEmpty ? '' : editor.getHTML());
    },
    editorProps: {
      attributes: { class: 'rte-content' },
      handleKeyDown: (view, event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          onSubmit?.();
          return true;
        }
        return false;
      }
    }
  });

  useImperativeHandle(ref, () => ({
    getHTML: () => (editor && !editor.isDestroyed ? editor.getHTML() : ''),
    isEmpty: () => (editor && !editor.isDestroyed ? editor.isEmpty : true),
    clear: () => {
      if (editor && !editor.isDestroyed) {
        editor.commands.clearContent();
      }
    },
    focus: () => {
      if (editor && !editor.isDestroyed) {
        editor.commands.focus();
      }
    }
  }), [editor]);

  useEffect(() => {
    return () => editor?.destroy();
  }, [editor]);

  if (!editor) return null;

  const ToolbarButton = ({ active, onClick, icon }) => (
    <IconButton
      size="small"
      onMouseDown={(e) => e.preventDefault()} // editor focus mat todo
      onClick={onClick}
      sx={{ color: active ? 'primary.main' : 'inherit' }}
    >
      {icon}
    </IconButton>
  );

  return (
    <Box sx={{ border: '1px solid #ddd', borderRadius: 1, overflow: 'hidden', bgcolor: 'white' }}>
      {/* NAYA — toolbar sirf tab dikhega jab showToolbar true ho, editor hamesha wahi hai */}
      {showToolbar && (
        <Box 
          sx={{
            display: 'flex',
            alignItems: 'center',
            p: 0.5,
            borderBottom: '1px solid #eee',
            bgcolor: '#fafafa',
            color: 'rgba(0, 0, 0, 0.7)',   // NAYA — parent Paper ka white color yahan override karo
            flexWrap: 'wrap'
          }}
        >
          <ToolbarButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} icon={<FormatBold fontSize="small" />} />
          <ToolbarButton active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} icon={<FormatItalic fontSize="small" />} />
          <ToolbarButton active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} icon={<FormatUnderlined fontSize="small" />} />
          <ToolbarButton active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} icon={<FormatStrikethrough fontSize="small" />} />
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          <ToolbarButton active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} icon={<FormatListBulleted fontSize="small" />} />
          <ToolbarButton active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} icon={<FormatListNumbered fontSize="small" />} />
          <ToolbarButton active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} icon={<FormatQuote fontSize="small" />} />
          <ToolbarButton active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()} icon={<CodeIcon fontSize="small" />} />
        </Box>
      )}
      <Box sx={{ p: 1, minHeight, maxHeight, overflowY: 'auto' }}>
        <EditorContent editor={editor} />
      </Box>
    </Box>
  );
});

export default RichTextEditor;