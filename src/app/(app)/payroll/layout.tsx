
import * as React from "react"

export default function PayrollLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="h-full w-full">{children}</div>
}
