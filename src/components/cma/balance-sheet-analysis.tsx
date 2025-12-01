
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

type BalanceSheetAnalysisProps = {
  report: {
    balanceSheet: {
      headers: string[];
      body: (string | number)[][];
    };
  };
};

export const BalanceSheetAnalysis = ({ report }: BalanceSheetAnalysisProps) => {
  return (
    <AccordionItem value="balance-sheet">
      <AccordionTrigger>Part II: Analysis of Balance Sheet</AccordionTrigger>
      <AccordionContent>
        <div className="overflow-x-auto">
            <Table>
            <TableHeader>
                <TableRow>
                {report.balanceSheet.headers.map((header) => (
                    <TableHead key={header}>{header}</TableHead>
                ))}
                </TableRow>
            </TableHeader>
            <TableBody>
                {report.balanceSheet.body.map((row, rowIndex) => (
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
