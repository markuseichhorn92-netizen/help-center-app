"use client";

import dynamic from "next/dynamic";

// Lazy load the RichTextEditor to reduce initial bundle size (~800KB savings)
const RichTextEditor = dynamic(() => import("./RichTextEditor"), {
  loading: () => (
    <div className="animate-pulse">
      <div className="h-10 bg-apple-gray-100 rounded-t-apple-lg mb-1" />
      <div className="h-48 bg-apple-gray-50 rounded-b-apple-lg border border-apple-gray-200" />
    </div>
  ),
  ssr: false,
});

export default RichTextEditor;
