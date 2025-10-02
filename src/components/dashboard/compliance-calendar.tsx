
"use client"

import { Bell, CalendarDays } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { format } from 'date-fns';

const getDeadlines = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // GST deadlines for the previous month's return
    const gstMonth = new Date(currentYear, currentMonth, 1);
    
    // PF/ESI deadlines are for the current month's payment
    const pfEsiMonth = new Date(currentYear, currentMonth, 1);

    return [
        {
            title: "GSTR-1 Filing",
            date: new Date(gstMonth.getFullYear(), gstMonth.getMonth(), 11),
            description: "Monthly return for outward supplies."
        },
        {
            title: "PF & ESI Payment",
            date: new Date(pfEsiMonth.getFullYear(), pfEsiMonth.getMonth(), 15),
            description: "Monthly provident fund and ESI contribution."
        },
        {
            title: "GSTR-3B Filing",
            date: new Date(gstMonth.getFullYear(), gstMonth.getMonth(), 20),
            description: "Monthly summary return."
        },
    ];
}


export function ComplianceCalendar() {
    const deadlines = getDeadlines();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          <span>Compliance Calendar</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {deadlines.map((notification, index) => (
            <li key={index} className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                  <span className="text-sm font-bold">{format(notification.date, 'dd')}</span>
                </div>
                 <p className="text-center text-xs text-muted-foreground">{format(notification.date, 'MMM')}</p>
              </div>
              <div className="flex-1">
                <p className="font-semibold">{notification.title}</p>
                <p className="text-sm text-muted-foreground">
                  {notification.description}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Bell className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
