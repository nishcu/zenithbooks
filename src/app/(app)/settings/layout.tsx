
import * as React from "react"

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="h-full w-full">{children}</div>
}
