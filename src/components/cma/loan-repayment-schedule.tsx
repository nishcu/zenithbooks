
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type LoanRepaymentScheduleProps = {
  report: {
    repaymentSchedule: {
      headers: string[];
      body: (string | number)[][];
    };
  };
};

export const LoanRepaymentSchedule = ({ report }: LoanRepaymentScheduleProps) => {
    if (report.repaymentSchedule.body.length === 0) return null;
    
  return (
    <AccordionItem value="repayment-schedule">
      <AccordionTrigger>Part VII: Loan Repayment Schedule</AccordionTrigger>
      <AccordionContent>
        <div className="overflow-x-auto">
            <Table>
            <TableHeader>
                <TableRow>
                {report.repaymentSchedule.headers.map((header) => (
                    <TableHead key={header} className="text-right">{header}</TableHead>
                ))}
                </TableRow>
            </TableHeader>
            <TableBody>
                {report.repaymentSchedule.body.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                    <TableCell
                        key={cellIndex}
                        className={
                        cellIndex === 0
                            ? "font-medium"
                            : "text-right font-mono"
                        }
                    >
                        {cell}
                    </TableCell>
                    ))}
                </TableRow>
                ))}
            </TableBody>
            </Table>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};
