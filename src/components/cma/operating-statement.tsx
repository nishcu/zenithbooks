
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

type OperatingStatementProps = {
  report: {
    operatingStatement: {
      headers: string[];
      body: (string | number)[][];
    };
  };
};

export const OperatingStatement = ({ report }: OperatingStatementProps) => {
  return (
    <AccordionItem value="operating-statement">
      <AccordionTrigger>Part I: Operating Statement</AccordionTrigger>
      <AccordionContent>
        <div className="overflow-x-auto">
            <Table>
            <TableHeader>
                <TableRow>
                {report.operatingStatement.headers.map((header) => (
                    <TableHead key={header}>{header}</TableHead>
                ))}
                </TableRow>
            </TableHeader>
            <TableBody>
                {report.operatingStatement.body.map((row, rowIndex) => (
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
