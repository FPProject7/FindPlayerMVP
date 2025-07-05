import { create } from 'zustand';

export const useCreatePostStore = create((set) => ({
  isCreateModalOpen: false,
  activeTab: 'post', // 'post' or 'event'
  openCreateModal: (tab = 'post') => set({ isCreateModalOpen: true, activeTab: tab }),
  closeCreateModal: () => set({ isCreateModalOpen: false }),
  setActiveTab: (tab) => set({ activeTab: tab }),
})); 