import {
  Box,
  Button,
  Card,
  CardContent,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import type { ClientRecord, FinanceSummary } from "../_lib/reportTypes";
import { formatMoney } from "../_lib/reportUtils";
import MiniFilterCard from "./MiniFilterCard";

type FilteredPrintPanelProps = {
  clients: ClientRecord[];
  filterDay: string;
  filterMonth: string;
  filterClientId: string;
  hasActiveFilters: boolean;
  filterLabel: string;
  filteredSummary: FinanceSummary;
  setFilterDay: (value: string) => void;
  setFilterMonth: (value: string) => void;
  setFilterClientId: (value: string) => void;
  onPrintFilteredPdf: () => void;
  onClearFilters: () => void;
};

export default function FilteredPrintPanel({
  clients,
  filterDay,
  filterMonth,
  filterClientId,
  hasActiveFilters,
  filterLabel,
  filteredSummary,
  setFilterDay,
  setFilterMonth,
  setFilterClientId,
  onPrintFilteredPdf,
  onClearFilters,
}: FilteredPrintPanelProps) {
  return (
    <Card sx={{ borderRadius: 3, mb: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
          Filtered Print
        </Typography>

        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Filter the report by day, month, or client, then print only the
          filtered results.
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(4, 1fr)",
            },
            gap: 2,
            alignItems: "center",
          }}
        >
          <TextField
            label="Filter by Day"
            type="date"
            fullWidth
            value={filterDay}
            onChange={(event) => setFilterDay(event.target.value)}
            slotProps={{
              inputLabel: {
                shrink: true,
              },
            }}
          />

          <TextField
            label="Filter by Month"
            type="month"
            fullWidth
            value={filterMonth}
            onChange={(event) => setFilterMonth(event.target.value)}
            slotProps={{
              inputLabel: {
                shrink: true,
              },
            }}
          />

          <TextField
            select
            label="Filter by Client"
            fullWidth
            value={filterClientId}
            onChange={(event) => setFilterClientId(event.target.value)}
          >
            <MenuItem value="">All Clients</MenuItem>

            {clients.map((client) => (
              <MenuItem key={client._id} value={client._id}>
                {client.companyName}
              </MenuItem>
            ))}
          </TextField>

          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ flexWrap: "wrap" }}
          >
            <Button
              variant="contained"
              color="secondary"
              onClick={onPrintFilteredPdf}
              disabled={!hasActiveFilters}
            >
              Print Filtered PDF
            </Button>

            <Button variant="outlined" onClick={onClearFilters}>
              Clear
            </Button>
          </Stack>
        </Box>

        <Box
          sx={{
            mt: 2,
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "1fr 1fr",
              md: "repeat(4, 1fr)",
            },
            gap: 1.5,
          }}
        >
          <MiniFilterCard
            title="Filtered Revenue"
            value={formatMoney(filteredSummary.totalRevenue)}
          />

          <MiniFilterCard
            title="Filtered Expenses"
            value={formatMoney(filteredSummary.totalExpenses)}
          />

          <MiniFilterCard
            title="Filtered Profit"
            value={formatMoney(filteredSummary.netProfit)}
          />

          <MiniFilterCard
            title="Active Filter"
            value={hasActiveFilters ? filterLabel : "None"}
          />
        </Box>
      </CardContent>
    </Card>
  );
}