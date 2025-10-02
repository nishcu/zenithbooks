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

type RatioAnalysisProps = {
  report: {
    ratioAnalysis: {
      headers: string[];
      body: (string | number)[][];
    };
  };
};

export const RatioAnalysis = ({ report }: RatioAnalysisProps) => {
  return (
    <AccordionItem value="ratio-analysis">
      <AccordionTrigger>Part IV: Ratio Analysis</AccordionTrigger>
      <AccordionContent>
        <div className="overflow-x-auto">
            <Table>
            <TableHeader>
                <TableRow>
                {report.ratioAnalysis.headers.map((header) => (
                    <TableHead key={header}>{header}</TableHead>
                ))}
                </TableRow>
            </TableHeader>
            <TableBody>
                {report.ratioAnalysis.body.map((row, rowIndex) => (
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