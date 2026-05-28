import { create } from 'zustand'

interface DrawerStore {
  open: boolean
  setOpen: (v: boolean) => void
}

export const useDrawerStore = create<DrawerStore>((set) => ({
  open: false,
  setOpen: (v) => set({ open: v }),
}))
