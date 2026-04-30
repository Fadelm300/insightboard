import { TableCell, TableRow, Typography } from "@mui/material";

type EmptyTableRowProps = {
  colSpan: number;
  message: string;
};

export default function EmptyTableRow({
  colSpan,
  message,
}: EmptyTableRowProps) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan}>
        <Typography color="text.secondary" sx={{ py: 2 }}>
          {message}
        </Typography>
      </TableCell>
    </TableRow>
  );
}