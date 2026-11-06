import React, { useState, useEffect, useCallback } from 'react';
import { Whiteboard, WhiteboardFolder } from '../../../../../shared/types';
import { useApp } from '../../../../context/AppContext';
import { WhiteboardsListView } from './WhiteboardsListView';
import { WhiteboardEditorView } from './WhiteboardEditorView';

export const WhiteboardsSubmoduleView: React.FC = () => {
  const { tenant, apiFetch, toast } = useApp();

  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [whiteboards, setWhiteboards] = useState<Whiteboard[]>([]);
  const [folders, setFolders] = useState<Array<WhiteboardFolder & { boardCount: number }>>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [wbRes, fRes] = await Promise.all([
        apiFetch('/api/workspace/whiteboards'),
        apiFetch('/api/workspace/whiteboards/folders'),
      ]);

      if (wbRes && wbRes.whiteboards) {
        setWhiteboards(wbRes.whiteboards);
      }
      if (fRes && fRes.folders) {
        setFolders(fRes.folders);
      }
    } catch (err: any) {
      toast('error', 'Error al cargar pizarras: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [tenant?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeBoard = whiteboards.find((w) => w.id === activeBoardId);
  const activeFolder = activeBoard ? folders.find((f) => f.id === activeBoard.folderId) : null;

  if (activeBoardId) {
    return (
      <WhiteboardEditorView
        whiteboardId={activeBoardId}
        onBack={() => {
          setActiveBoardId(null);
          loadData();
        }}
        folder={activeFolder}
      />
    );
  }

  return (
    <WhiteboardsListView
      whiteboards={whiteboards}
      folders={folders}
      onOpenWhiteboard={(id) => setActiveBoardId(id)}
      onRefresh={loadData}
    />
  );
};
