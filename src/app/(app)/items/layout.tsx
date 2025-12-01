
import * as React from "react"

export default function ItemsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="h-full w-full">{children}</div>
}
