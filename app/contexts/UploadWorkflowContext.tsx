'use client';

import React, { createContext, useContext, useState } from 'react';

type ToolId = string;

interface UploadWorkflowContextValue {
  getFiles: (toolId: ToolId) => File[];
  setFiles: (toolId: ToolId, files: File[]) => void;
}

const UploadWorkflowContext = createContext<UploadWorkflowContextValue | undefined>(undefined);

export function UploadWorkflowProvider({ children }: { children: React.ReactNode }) {
  const [filesByTool, setFilesByTool] = useState<Record<ToolId, File[]>>({});

  const getFiles = (toolId: ToolId) => {
    return filesByTool[toolId] || [];
  };

  const setFiles = (toolId: ToolId, files: File[]) => {
    setFilesByTool((prev) => ({
      ...prev,
      [toolId]: files,
    }));
  };

  return (
    <UploadWorkflowContext.Provider value={{ getFiles, setFiles }}>
      {children}
    </UploadWorkflowContext.Provider>
  );
}

export function useUploadWorkflow(): UploadWorkflowContextValue {
  const ctx = useContext(UploadWorkflowContext);
  if (!ctx) {
    throw new Error('useUploadWorkflow must be used within an UploadWorkflowProvider');
  }
  return ctx;
}


