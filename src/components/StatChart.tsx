/** Tiny Recharts wrappers used by the Dashboard. */
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface StackedRow {
  label: string;
  Correct: number;
  Incorrect: number;
  "Not Attempted"?: number;
}

export function StackedResultBar({ data }: { data: StackedRow[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Correct" stackId="a" fill="#10b981" />
        <Bar dataKey="Incorrect" stackId="a" fill="#f43f5e" />
        <Bar dataKey="Not Attempted" stackId="a" fill="#cbd5e1" />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface SimpleRow {
  label: string;
  value: number;
  highlight?: boolean;
}

export function SimpleBar({ data, color = "#6366f1" }: { data: SimpleRow[]; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(140, data.length * 26)}>
      <BarChart data={data} layout="vertical" margin={{ left: 12, right: 24, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
        <YAxis dataKey="label" type="category" width={180} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {data.map((row, i) => (
            <Cell key={i} fill={row.highlight ? "#f43f5e" : color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
