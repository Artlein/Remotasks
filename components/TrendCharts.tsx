'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { BarChart3, PieChart as PieIcon, LineChart } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  active: boolean;
}

interface DailyRow {
  date: string;
  projectBreakdown: Record<string, number>;
  totalHours: number;
  targetHours: number;
}

interface TrendChartsProps {
  dailyRows: DailyRow[];
  projects: Project[];
  targetHours: number;
}

const PROJECT_COLORS = [
  '#3b82f6', // blue
  '#06b6d4', // cyan
  '#6366f1', // indigo
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#14b8a6', // teal
];

export function TrendCharts({ dailyRows, projects, targetHours }: TrendChartsProps) {
  const chronoRows = [...dailyRows].sort((a, b) => a.date.localeCompare(b.date));

  const stackedChartData = chronoRows.map((row) => {
    const dataPoint: any = { date: row.date.slice(5) }; // MM-DD
    projects.forEach((p) => {
      const mins = row.projectBreakdown[p.name] || 0;
      dataPoint[p.name] = Math.round((mins / 60) * 100) / 100;
    });
    return dataPoint;
  });

  const pieDataMap: Record<string, number> = {};
  dailyRows.forEach((row) => {
    Object.entries(row.projectBreakdown).forEach(([pName, mins]) => {
      pieDataMap[pName] = (pieDataMap[pName] || 0) + mins;
    });
  });

  const pieChartData = Object.entries(pieDataMap).map(([name, mins]) => ({
    name,
    value: Math.round((mins / 60) * 10) / 10,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Daily Total vs Target Line (2 cols) */}
        <div className="lg:col-span-2 skeuo-panel p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <LineChart className="w-5 h-5 text-blue-400" />
              Daily Total vs {targetHours}h Target
            </h3>
            <span className="text-xs text-slate-400">Hours logged per workday</span>
          </div>

          <div className="h-[290px] w-full">
            {chronoRows.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                No data available for chart visualization.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chronoRows} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#090d16',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    formatter={(value: any) => [`${value} hrs`, 'Total Hours']}
                  />
                  <ReferenceLine
                    y={targetHours}
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    label={{
                      value: `Target (${targetHours}h)`,
                      fill: '#f87171',
                      fontSize: 11,
                      position: 'top',
                    }}
                  />
                  <Bar dataKey="totalHours" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Total Hours" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Project Share Pie Chart (1 col) */}
        <div className="skeuo-panel p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-emerald-400" />
              Project Share
            </h3>
            <span className="text-xs text-slate-400">Total hours breakdown</span>
          </div>

          <div className="h-[290px] w-full flex items-center justify-center">
            {pieChartData.length === 0 ? (
              <div className="text-slate-500 text-sm">No project data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PROJECT_COLORS[index % PROJECT_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#090d16',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    formatter={(value: any) => [`${value} hrs`, 'Hours']}
                  />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Chart 3: Stacked Bar Chart per Project */}
      <div className="skeuo-panel p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            Per-Project Hours Trend
          </h3>
          <span className="text-xs text-slate-400">Stacked hours per active project</span>
        </div>

        <div className="h-[300px] w-full">
          {stackedChartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">
              No task history to render trend.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stackedChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickLine={false} />
                <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#090d16',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                {projects.map((p, idx) => (
                  <Bar
                    key={p.id}
                    dataKey={p.name}
                    stackId="a"
                    fill={PROJECT_COLORS[idx % PROJECT_COLORS.length]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
