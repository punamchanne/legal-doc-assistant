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
      const searchTerms = searchText
        .split(",")
        .map((term) => term.trim())
        .filter((term) => term.length > 0);
      
      if (searchTerms.length > 0) {
        highlight(searchTerms);
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