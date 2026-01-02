import React, { useEffect, useImperativeHandle, forwardRef } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  Code, 
  List, 
  ListOrdered, 
  Quote, 
  Undo, 
  Redo,
  Heading1,
  Heading2
} from 'lucide-react';

interface MenuBarProps {
  editor: Editor | null;
}

const MenuBar = ({ editor }: MenuBarProps) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b border-gray-200 bg-gray-50">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={`p-1 rounded hover:bg-gray-200 ${editor.isActive('bold') ? 'bg-gray-200 text-blue-600' : 'text-gray-600'}`}
        title="Bold"
      >
        <Bold size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={`p-1 rounded hover:bg-gray-200 ${editor.isActive('italic') ? 'bg-gray-200 text-blue-600' : 'text-gray-600'}`}
        title="Italic"
      >
        <Italic size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
        className={`p-1 rounded hover:bg-gray-200 ${editor.isActive('strike') ? 'bg-gray-200 text-blue-600' : 'text-gray-600'}`}
        title="Strike"
      >
        <Strikethrough size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleCode().run()}
        disabled={!editor.can().chain().focus().toggleCode().run()}
        className={`p-1 rounded hover:bg-gray-200 ${editor.isActive('code') ? 'bg-gray-200 text-blue-600' : 'text-gray-600'}`}
        title="Code"
      >
        <Code size={16} />
      </button>
      <div className="w-px h-6 bg-gray-300 mx-1 self-center" />
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`p-1 rounded hover:bg-gray-200 ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-200 text-blue-600' : 'text-gray-600'}`}
        title="Heading 1"
      >
        <Heading1 size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`p-1 rounded hover:bg-gray-200 ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200 text-blue-600' : 'text-gray-600'}`}
        title="Heading 2"
      >
        <Heading2 size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-1 rounded hover:bg-gray-200 ${editor.isActive('bulletList') ? 'bg-gray-200 text-blue-600' : 'text-gray-600'}`}
        title="Bullet List"
      >
        <List size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-1 rounded hover:bg-gray-200 ${editor.isActive('orderedList') ? 'bg-gray-200 text-blue-600' : 'text-gray-600'}`}
        title="Ordered List"
      >
        <ListOrdered size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`p-1 rounded hover:bg-gray-200 ${editor.isActive('blockquote') ? 'bg-gray-200 text-blue-600' : 'text-gray-600'}`}
        title="Blockquote"
      >
        <Quote size={16} />
      </button>
      <div className="w-px h-6 bg-gray-300 mx-1 self-center" />
      <button
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
        className="p-1 rounded hover:bg-gray-200 text-gray-600 disabled:opacity-50"
        title="Undo"
      >
        <Undo size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
        className="p-1 rounded hover:bg-gray-200 text-gray-600 disabled:opacity-50"
        title="Redo"
      >
        <Redo size={16} />
      </button>
    </div>
  );
};

interface TiptapEditorProps {
  value: string;
  onChange: (value: string, selection?: number) => void;
  placeholder?: string;
  className?: string;
  onSlash?: (rect: DOMRect, index: number) => void;
  onBlur?: () => void;
}

export interface TiptapEditorRef {
  insertContent: (text: string) => void;
  insertVariable: (variable: string, slashIndex: number) => void;
  focus: () => void;
}

const TiptapEditor = forwardRef<TiptapEditorRef, TiptapEditorProps>(({ 
  value, 
  onChange, 
  placeholder = '', 
  className = '',
  onSlash,
  onBlur
}, ref) => {
  // Force update trigger for MenuBar
  const [, forceUpdate] = React.useState({});

  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'focus:outline-none outline-none border-none ring-0 [&.ProseMirror-focused]:outline-none [&.ProseMirror-focused]:ring-0 [&.ProseMirror-focused]:border-none min-h-[150px]',
      },
      handleKeyDown: (view, event) => {
        if (event.key === '/' && onSlash) {
          setTimeout(() => {
            const { from } = view.state.selection;
            const coords = view.coordsAtPos(from);
            const rect = {
              top: coords.top,
              right: coords.right,
              bottom: coords.bottom,
              left: coords.left,
              width: 0,
              height: coords.bottom - coords.top,
              x: coords.left,
              y: coords.top,
              toJSON: () => {}
            } as DOMRect;
            onSlash(rect, from);
          }, 0);
        }
        return false;
      }
    },
    onUpdate: ({ editor }) => {
      const markdownStorage = (editor.storage as any)?.markdown;
      const nextValue = markdownStorage?.getMarkdown?.() ?? '';
      onChange(nextValue, editor.state.selection.from);
    },
    onTransaction: () => {
        forceUpdate({});
    },
    onBlur: () => {
      onBlur?.();
    },
  });

  useEffect(() => {
    const markdownStorage = (editor?.storage as any)?.markdown;
    const current = markdownStorage?.getMarkdown?.() ?? '';
    if (editor && value !== current) {
       if (!editor.isFocused) {
         editor.commands.setContent(value);
       }
    }
  }, [value, editor]);

  useImperativeHandle(ref, () => ({
    insertContent: (text: string) => {
      editor?.chain().focus().insertContent(text).run();
      const markdownStorage = (editor?.storage as any)?.markdown;
      const nextValue = markdownStorage?.getMarkdown?.() ?? '';
      onChange(nextValue, editor?.state.selection.from);
    },
    insertVariable: (variable: string, slashIndex: number) => {
      // Delete from slashIndex - 1 (the slash) to current selection
      editor?.chain().focus().deleteRange({ from: slashIndex - 1, to: editor.state.selection.from }).insertContent(variable).run();
      const markdownStorage = (editor?.storage as any)?.markdown;
      const nextValue = markdownStorage?.getMarkdown?.() ?? '';
      onChange(nextValue, editor?.state.selection.from);
    },
    focus: () => {
      editor?.chain().focus().run();
    }
  }));

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white flex flex-col">
      <MenuBar editor={editor} />
      <div 
        className="flex-1 cursor-text p-3" 
        onClick={() => editor?.chain().focus().run()}
      >
        <EditorContent editor={editor} className={`prose prose-sm max-w-none [&_p]:m-0 [&_p]:leading-normal ${className}`} />
      </div>
    </div>
  );
});

TiptapEditor.displayName = 'TiptapEditor';

export default TiptapEditor;
