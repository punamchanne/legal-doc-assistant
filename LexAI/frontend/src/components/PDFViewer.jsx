import React, { useEffect, useState } from "react";

import { Viewer } from "@react-pdf-viewer/core";

import { Worker } from "@react-pdf-viewer/core";

import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";

import { searchPlugin } from "@react-pdf-viewer/search";

import "@react-pdf-viewer/core/lib/styles/index.css";

import "@react-pdf-viewer/default-layout/lib/styles/index.css";

import "@react-pdf-viewer/search/lib/styles/index.css";

export default function PDFViewer({ pdfUrl, searchText }) {

  const [isDocumentLoaded, setIsDocumentLoaded] = useState(false);

  const defaultLayoutPluginInstance =
    defaultLayoutPlugin();

  const searchPluginInstance =
    searchPlugin();

  const { highlight } =
    searchPluginInstance;

  useEffect(() => {
    if (isDocumentLoaded && searchText && searchText.trim()) {
      const searchTerms = [];
      const rawParts = searchText
        .split(",")
        .map((term) => term.trim())
        .filter((term) => term.length > 0);
      
      for (const part of rawParts) {
        searchTerms.push(part);
        
        // Split long terms into 2-word fallback chunks to handle spacing/kerning mismatches
        const words = part.split(/\s+/).filter((w) => w.length > 0);
        if (words.length > 3) {
          for (let i = 0; i < words.length - 1; i++) {
            // Keep 2-word chunks where at least one word has a meaningful length (>= 4)
            if (words[i].length >= 4 || words[i+1].length >= 4) {
              searchTerms.push(`${words[i]} ${words[i+1]}`);
            }
          }
        }
      }
      
      const uniqueTerms = Array.from(new Set(searchTerms));
      if (uniqueTerms.length > 0) {
        highlight(uniqueTerms);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, isDocumentLoaded]);

  return (

    <div style={{ height: "100vh" }}>

      <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">

        <Viewer
          fileUrl={pdfUrl}
          onDocumentLoad={() => setIsDocumentLoaded(true)}
          plugins={[
            defaultLayoutPluginInstance,
            searchPluginInstance
          ]}
        />

      </Worker>

    </div>
  );
}