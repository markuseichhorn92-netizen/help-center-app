"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { useEffect, useState, useCallback } from "react";
import { CalloutExtension, CalloutType } from "./extensions/CalloutExtension";

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  variant?: "article" | "ticket";
  placeholder?: string;
  className?: string;
  onImageUpload?: (file: File) => Promise<string>;
}

export default function RichTextEditor({
  value,
  onChange,
  variant = "article",
  placeholder = "Schreibe hier...",
  className = "",
  onImageUpload,
}: RichTextEditorProps) {
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showCalloutMenu, setShowCalloutMenu] = useState(false);

  const isArticle = variant === "article";

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: isArticle ? { levels: [2, 3] } : false,
        codeBlock: isArticle ? {} : false,
        blockquote: isArticle ? {} : false,
        horizontalRule: isArticle ? {} : false,
        orderedList: isArticle ? {} : false,
      }),
      Underline.configure({
        HTMLAttributes: {},
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
      ...(isArticle
        ? [
            Image.configure({
              inline: false,
              HTMLAttributes: {
                class: "editor-image",
              },
            }),
            Table.configure({
              resizable: true,
            }),
            TableRow,
            TableCell,
            TableHeader,
            TextAlign.configure({
              types: ["heading", "paragraph"],
            }),
            CalloutExtension,
          ]
        : []),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[200px] px-4 py-3",
        "aria-label": placeholder, // barrierefreier Name für Screenreader
      },
    },
  });

  // Sync external value changes
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  const handleImageUpload = useCallback(async () => {
    if (!onImageUpload) return;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const url = await onImageUpload(file);
          editor?.chain().focus().setImage({ src: url }).run();
        } catch (error) {
          console.error("Image upload failed:", error);
        }
      }
    };
    input.click();
  }, [editor, onImageUpload]);

  const setLink = useCallback(() => {
    if (!linkUrl) {
      editor?.chain().focus().unsetLink().run();
    } else {
      const url = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`;
      editor?.chain().focus().setLink({ href: url }).run();
    }
    setShowLinkDialog(false);
    setLinkUrl("");
  }, [editor, linkUrl]);

  const openLinkDialog = useCallback(() => {
    const previousUrl = editor?.getAttributes("link").href || "";
    setLinkUrl(previousUrl);
    setShowLinkDialog(true);
  }, [editor]);

  const insertTable = useCallback(() => {
    editor
      ?.chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  }, [editor]);

  const insertCallout = useCallback(
    (type: CalloutType) => {
      editor?.chain().focus().setCallout({ type }).run();
      setShowCalloutMenu(false);
    },
    [editor]
  );

  if (!editor) {
    return (
      <div className={`border border-apple-gray-200 rounded-apple-lg ${className}`}>
        <div className="h-12 bg-apple-gray-50 rounded-t-apple-lg border-b border-apple-gray-200" />
        <div className="min-h-[200px] p-4 animate-pulse bg-apple-gray-50/50" />
      </div>
    );
  }

  return (
    <div className={`border border-apple-gray-200 rounded-apple-lg overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-apple-gray-50 border-b border-apple-gray-200">
        {/* Text Formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Fett (Strg+B)"
        >
          <BoldIcon />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Kursiv (Strg+I)"
        >
          <ItalicIcon />
        </ToolbarButton>
        {isArticle && (
          <>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              active={editor.isActive("underline")}
              title="Unterstrichen (Strg+U)"
            >
              <UnderlineIcon />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              active={editor.isActive("strike")}
              title="Durchgestrichen"
            >
              <StrikeIcon />
            </ToolbarButton>
          </>
        )}

        <ToolbarDivider />

        {/* Headings (Article only) */}
        {isArticle && (
          <>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              active={editor.isActive("heading", { level: 2 })}
              title="Überschrift 2"
            >
              H2
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              active={editor.isActive("heading", { level: 3 })}
              title="Überschrift 3"
            >
              H3
            </ToolbarButton>
            <ToolbarDivider />
          </>
        )}

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Aufzählung"
        >
          <BulletListIcon />
        </ToolbarButton>
        {isArticle && (
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive("orderedList")}
            title="Nummerierte Liste"
          >
            <OrderedListIcon />
          </ToolbarButton>
        )}

        <ToolbarDivider />

        {/* Link */}
        <ToolbarButton
          onClick={openLinkDialog}
          active={editor.isActive("link")}
          title="Link einfügen"
        >
          <LinkIcon />
        </ToolbarButton>

        {/* Image (Article only) */}
        {isArticle && onImageUpload && (
          <ToolbarButton onClick={handleImageUpload} title="Bild einfügen">
            <ImageIcon />
          </ToolbarButton>
        )}

        {isArticle && (
          <>
            <ToolbarDivider />

            {/* Code & Quote */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              active={editor.isActive("codeBlock")}
              title="Code-Block"
            >
              <CodeIcon />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              active={editor.isActive("blockquote")}
              title="Zitat"
            >
              <QuoteIcon />
            </ToolbarButton>

            <ToolbarDivider />

            {/* Table */}
            <ToolbarButton onClick={insertTable} title="Tabelle einfügen">
              <TableIcon />
            </ToolbarButton>

            {/* Callout */}
            <div className="relative">
              <ToolbarButton
                onClick={() => setShowCalloutMenu(!showCalloutMenu)}
                title="Callout-Block"
              >
                <CalloutIcon />
              </ToolbarButton>
              {showCalloutMenu && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-apple-gray-200 rounded-apple shadow-lg z-10 min-w-[140px]">
                  <button
                    onClick={() => insertCallout("info")}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-2"
                  >
                    <span className="w-3 h-3 rounded bg-blue-500" />
                    Info
                  </button>
                  <button
                    onClick={() => insertCallout("success")}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-green-50 flex items-center gap-2"
                  >
                    <span className="w-3 h-3 rounded bg-green-500" />
                    Erfolg
                  </button>
                  <button
                    onClick={() => insertCallout("warning")}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-yellow-50 flex items-center gap-2"
                  >
                    <span className="w-3 h-3 rounded bg-yellow-500" />
                    Warnung
                  </button>
                  <button
                    onClick={() => insertCallout("error")}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 flex items-center gap-2"
                  >
                    <span className="w-3 h-3 rounded bg-red-500" />
                    Fehler
                  </button>
                </div>
              )}
            </div>

            {/* Horizontal Rule */}
            <ToolbarButton
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              title="Trennlinie"
            >
              <HorizontalRuleIcon />
            </ToolbarButton>
          </>
        )}
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} className="editor-content" />

      {/* Link Dialog */}
      {showLinkDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-apple-lg p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-apple-gray-600 mb-4">Link einfügen</h3>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-4 py-2 border border-apple-gray-200 rounded-apple-lg focus:outline-none focus:ring-2 focus:ring-brand/20 mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setLink();
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowLinkDialog(false);
                  setLinkUrl("");
                }}
                className="px-4 py-2 text-apple-gray-600 hover:bg-apple-gray-100 rounded-apple-lg transition-colors"
              >
                Abbrechen
              </button>
              {editor.isActive("link") && (
                <button
                  onClick={() => {
                    editor.chain().focus().unsetLink().run();
                    setShowLinkDialog(false);
                    setLinkUrl("");
                  }}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-apple-lg transition-colors"
                >
                  Entfernen
                </button>
              )}
              <button
                onClick={setLink}
                className="px-4 py-2 bg-brand text-white rounded-apple-lg hover:bg-brand-dark transition-colors"
              >
                Einfügen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Toolbar Components
function ToolbarButton({
  children,
  onClick,
  active = false,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-2 rounded-apple transition-colors ${
        active
          ? "bg-brand/10 text-brand"
          : "text-apple-gray-500 hover:bg-apple-gray-100 hover:text-apple-gray-600"
      }`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-6 bg-apple-gray-200 mx-1" />;
}

// Icons
function BoldIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
    </svg>
  );
}

function ItalicIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 4h4m-2 0l-4 16m0 0h4" />
    </svg>
  );
}

function UnderlineIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4v7a5 5 0 0010 0V4M5 20h14" />
    </svg>
  );
}

function StrikeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 12H7m5-8a4 4 0 014 4M12 20a4 4 0 01-4-4" />
    </svg>
  );
}

function BulletListIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
      <circle cx="2" cy="6" r="1" fill="currentColor" />
      <circle cx="2" cy="12" r="1" fill="currentColor" />
      <circle cx="2" cy="18" r="1" fill="currentColor" />
    </svg>
  );
}

function OrderedListIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 6h13M7 12h13M7 18h13" />
      <text x="1" y="8" fontSize="6" fill="currentColor">1</text>
      <text x="1" y="14" fontSize="6" fill="currentColor">2</text>
      <text x="1" y="20" fontSize="6" fill="currentColor">3</text>
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  );
}

function QuoteIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
    </svg>
  );
}

function TableIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18M10 3v18M14 3v18M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6z" />
    </svg>
  );
}

function CalloutIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function HorizontalRuleIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14" />
    </svg>
  );
}
