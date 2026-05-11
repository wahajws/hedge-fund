import { create } from 'zustand';

export type PageKey =
  | 'executive'
  | 'command'
  | 'risk'
  | 'workflow'
  | 'approvals'
  | 'audit'
  | 'data'
  | 'brief'
  | 'health'
  | 'demo';

type UiStore = {
  activePage: PageKey;
  selectedWorkflowId: string | null;
  commandText: string;
  presentationMode: boolean;
  setActivePage: (page: PageKey) => void;
  setSelectedWorkflowId: (id: string | null) => void;
  setCommandText: (text: string) => void;
  setPresentationMode: (value: boolean) => void;
};

export const useUiStore = create<UiStore>((set) => ({
  activePage: 'executive',
  selectedWorkflowId: null,
  commandText: 'What changed overnight and what exposure needs attention?',
  presentationMode: false,
  setActivePage: (activePage) => set({ activePage }),
  setSelectedWorkflowId: (selectedWorkflowId) => set({ selectedWorkflowId }),
  setCommandText: (commandText) => set({ commandText }),
  setPresentationMode: (presentationMode) => set({ presentationMode })
}));
