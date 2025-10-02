
import * as React from "react"

export default function BillingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="h-full w-full">{children}</div>
}
