import { createTheme } from "flowbite-react";


 // https://flowbite-react.com/docs/customize/theme

export const moonlightTheme = createTheme({
  dropdown: {
    floating: {
      base: "z-50 w-fit divide-y divide-white/[0.06] rounded-xl border border-white/[0.08] bg-slate-800/95 shadow-2xl backdrop-blur-xl focus:outline-none",
      content: "py-1 text-sm text-slate-200",
      divider: "my-1 h-px bg-white/[0.06]",
      header: "block px-4 py-2 text-sm text-slate-200",
      item: {
        base: "flex w-full cursor-pointer items-center justify-start gap-2.5 bg-transparent px-3.5 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/[0.04] hover:text-white focus:bg-white/[0.04] focus:text-white focus:outline-none",
      },
    },
  },
});