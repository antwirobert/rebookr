import { DataTable } from "@/components/refine-ui/data-table/data-table";
import {
  ListView,
  ListViewHeader,
} from "@/components/refine-ui/views/list-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Patient } from "@/types";
import { useCustomMutation, useInvalidate } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";
import { ColumnDef } from "@tanstack/react-table";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

const Dashboard = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [rowMessages, setRowMessages] = useState<Record<string, string>>({});
  const { mutate: sendSms } = useCustomMutation();
  const invalidate = useInvalidate();

  const searchFilter = searchQuery
    ? [
        { field: "name", operator: "contains" as const, value: searchQuery },
        { field: "phone", operator: "contains" as const, value: searchQuery },
      ]
    : [];
  const statusFilter =
    status !== "all"
      ? [{ field: "status", operator: "eq" as const, value: status }]
      : [];

  const handleSendSms = (patient: Patient) => {
    sendSms(
      {
        url: `/api/patients/${patient.id}/send-sms`,
        method: "post",
        values: {},
      },
      {
        onSuccess: (response) => {
          const id = String(patient.id);

          setRowMessages((prev) => ({
            ...prev,
            [id]: response.data.message,
          }));

          invalidate({
            resource: "patients",
            invalidates: ["list"],
          });

          setTimeout(() => {
            setRowMessages((prev) => {
              const copy = { ...prev };
              delete copy[id];
              return copy;
            });
          }, 5000);
        },
      },
    );
  };

  const columns = useMemo<ColumnDef<Patient>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: () => <p>Name</p>,
        cell: ({ getValue }) => (
          <span className="font-semibold">{getValue<string>()}</span>
        ),
        filterFn: "includesString",
      },
      {
        id: "phone",
        accessorKey: "phone",
        header: () => <p>Phone</p>,
        cell: ({ getValue }) => (
          <span className="text-muted-foreground">{getValue<string>()}</span>
        ),
        filterFn: "includesString",
      },
      {
        id: "missedDate",
        accessorKey: "missedDate",
        header: () => <p>Missed Date</p>,
        cell: ({ getValue }) => {
          const date = new Date(getValue<string>());
          return (
            <span className="text-muted-foreground">
              {date.toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          );
        },
      },
      {
        id: "status",
        accessorKey: "status",
        header: () => <p>Status</p>,
        cell: ({ getValue }) => {
          const status = getValue<string>();
          return (
            <Badge
              variant={
                status === "pending"
                  ? "warning"
                  : status === "rebooked"
                  ? "success"
                  : "info"
              }
            >
              {status}
            </Badge>
          );
        },
      },
      {
        id: "action",
        header: () => <p>Action</p>,
        cell: ({ row }) => {
          const patient = row.original;

          return (
            <Button
              size="sm"
              disabled={
                patient.status === "contacted" || patient.status === "rebooked"
              }
              onClick={() => handleSendSms(patient)}
            >
              {patient.status === "contacted" || patient.status === "rebooked"
                ? "Sent"
                : "Send SMS"}
            </Button>
          );
        },
      },
    ],
    [],
  );

  const patientsTable = useTable<Patient>({
    columns,
    refineCoreProps: {
      resource: "patients",
      pagination: {
        pageSize: 10,
        mode: "server",
      },
      filters: {
        permanent: [...searchFilter, ...statusFilter],
      },
      sorters: {
        initial: [
          {
            field: "missedDate",
            order: "desc",
          },
        ],
      },
    },
  });

  return (
    <ListView>
      <ListViewHeader
        title="Recover Missed Appointments in 7 Days"
        resource="patients"
      />
      <h3 className="text-lg font-semibold">Clinic: Sunrise Family Clinic </h3>
      <ScrollArea>
        <div className="relative flex gap-2 mt-4">
          <Search className="size-4 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Search by name or phone..."
            onChange={(e) => setSearchQuery(e.target.value)}
            value={searchQuery}
            className="rounded-lg px-4 py-2 pl-10 w-full max-w-60 max-md:text-sm"
          />

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full max-w-48 rounded-lg">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rebooked">Rebooked</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      <DataTable table={patientsTable} rowMessages={rowMessages} />
    </ListView>
  );
};

export default Dashboard;
