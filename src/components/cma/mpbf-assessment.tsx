
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

type MpbfAssessmentProps = {
  report: {
    mpbf: {
      headers: string[];
      body: (string | number)[][];
    };
  };
};

export const MpbfAssessment = ({ report }: MpbfAssessmentProps) => {
  return (
    <AccordionItem value="mpbf">
      <AccordionTrigger>Part VI: MPBF Assessment</AccordionTrigger>
      <AccordionContent>
        <div className="overflow-x-auto">
            <Table>
            <TableHeader>
                <TableRow>
                {report.mpbf.headers.map((header) => (
                    <TableHead key={header}>{header}</TableHead>
                ))}
                </TableRow>
            </TableHeader>
            <TableBody>
                {report.mpbf.body.map((row, rowIndex) => (
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
