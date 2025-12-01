
import { TableCell, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

type ReportRowProps = {
    label: string;
    value: number;
    isSub?: boolean;
}

export const ReportRow = ({ label, value, isSub = false }: ReportRowProps) => (
    <TableRow>
       <TableCell className={isSub ? 'pl-8' : ''}>{label}</TableCell>
       <TableCell className="text-right font-mono">{formatCurrency(value)}</TableCell>
   </TableRow>
);
