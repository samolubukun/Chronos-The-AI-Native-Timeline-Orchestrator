"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner";

const Toaster = ({
  ...props
}) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      richColors
      closeButton
      style={
        {
          "--normal-bg": "white",
          "--normal-text": "#0f172a",
          "--normal-border": "#e2e8f0",
          "--success-bg": "#10b981",
          "--success-text": "white",
          "--error-bg": "#ef4444",
          "--error-text": "white",
          "--loading-bg": "#4f46e5",
          "--loading-text": "white",
        }
      }
      toastOptions={{
        className: "rounded-2xl shadow-2xl border-none font-medium",
      }}
      {...props} />
  );
}

export { Toaster }
