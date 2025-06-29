import { create } from 'zustand';

export const useCreatePostStore = create((set) => ({
  isCreateModalOpen: false,
  openCreateModal: () => set({ isCreateModalOpen: true }),
  closeCreateModal: () => set({ isCreateModalOpen: false }),
})); 