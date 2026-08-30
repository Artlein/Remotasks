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
  AreaChart,
  Area,
  LineChart,
  Line,
} from 'recharts';
import { BarChart3, PieChart as PieIcon, LineChart as LineIcon, DollarSign, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  active: boolean;
}

interface DailyRow {
  date: string;
  projectBreakdown: Record<string, number>;
  totalHours: number;
  totalMinutes: number;
  targetHours: number;
}

interface TrendChartsProps {
  dailyRows: DailyRow[];
  projects: Project[];
  targetHours: number;
  hourlyRate?: number;
}

const PROJECT_COLORS = [
  '#3b82f6',
  '#06b6d4',
  '#6366f1',
  '#10b981',
  '#f59e0b',
  '#ec4899',
  '#8b5cf6',
  '#14b8a6',
];

const TOOLTIP_STYLE = {
  backgroundColor: '#090d16',
  borderColor: '#334155',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '12px',
};

export function TrendCharts({ dailyRows, projects, targetHours, hourlyRate = 0 }: TrendChartsProps) {
  const chronoRows = [...dailyRows].sort((a, b) => a.date.localeCompare(b.date));

  // --- Existing chart data ---
  const stackedChartData = chronoRows.map((row) => {
    const dataPoint: any = { date: row.date.slice(5) };
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

  // --- Earnings Analytics data ---
  const hasRate = hourlyRate > 0;

  // Daily earnings chart data
  const earningsChartData = chronoRows.map((row) => ({
    date: row.date.slice(5),
    earnings: Math.round(row.totalHours * hourlyRate * 100) / 100,
    targetEarnings: Math.round(targetHours * hourlyRate * 100) / 100,
    hours: row.totalHours,
  }));

  // Cumulative earnings (running total)
  let cumulative = 0;
  const cumulativeData = chronoRows.map((row) => {
    cumulative += row.totalHours * hourlyRate;
    return {
      date: row.date.slice(5),
      cumEarnings: Math.round(cumulative * 100) / 100,
    };
  });

  // Per-project earnings pie
  const projectEarningsPie = Object.entries(pieDataMap).map(([name, mins]) => ({
    name,
    value: Math.round((mins / 60) * hourlyRate * 100) / 100,
  }));

  // Summary stats
  const totalEarnings = dailyRows.reduce((sum, r) => sum + r.totalHours * hourlyRate, 0);
  const avgDailyEarnings = dailyRows.length > 0 ? totalEarnings / dailyRows.length : 0;
  const targetDailyEarnings = targetHours * hourlyRate;
  const totalDays = dailyRows.length;
  const metTargetDays = dailyRows.filter((r) => r.totalHours >= targetHours).length;
  const bestDayEarnings = Math.max(...dailyRows.map((r) => r.totalHours * hourlyRate), 0);

  // Weekly rollup earnings for bar chart
  const weeklyEarningsMap: Record<string, number> = {};
  chronoRows.forEach((row) => {
    const d = new Date(row.date);
    const day = d.getDay(); // 0=Sun
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diff);
    const weekKey = monday.toISOString().slice(0, 10);
    weeklyEarningsMap[weekKey] = (weeklyEarningsMap[weekKey] || 0) + row.totalHours * hourlyRate;
  });
  const weeklyEarningsData = Object.entries(weeklyEarningsMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, earnings]) => ({
      week: `W ${week.slice(5)}`,
      earnings: Math.round(earnings * 100) / 100,
      target: Math.round(targetHours * 5 * hourlyRate * 100) / 100,
    }));

  return (
    <div className="space-y-6">

      {/* ── Earnings Analytics Section ── */}
      {hasRate && (
        <>
          {/* Earnings KPI Summary Cards */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold text-white">Pay & Earnings Analytics</h2>
              <span className="text-xs text-slate-400 font-mono ml-1">@ ${hourlyRate.toFixed(2)}/hr</span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: 'Total Earned',
                  value: `$${totalEarnings.toFixed(2)}`,
                  sub: `${totalDays} workdays`,
                  color: 'text-emerald-400',
                  glow: 'border-emerald-500/20 bg-emerald-500/5',
                  icon: <DollarSign className="w-5 h-5 text-emerald-400" />,
                },
                {
                  label: 'Avg Daily Pay',
                  value: `$${avgDailyEarnings.toFixed(2)}`,
                  sub: `Target: $${targetDailyEarnings.toFixed(2)}/day`,
                  color: avgDailyEarnings >= targetDailyEarnings ? 'text-emerald-400' : 'text-amber-400',
                  glow: avgDailyEarnings >= targetDailyEarnings ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-amber-500/20 bg-amber-500/5',
                  icon: avgDailyEarnings >= targetDailyEarnings
                    ? <TrendingUp className="w-5 h-5 text-emerald-400" />
                    : <TrendingDown className="w-5 h-5 text-amber-400" />,
                },
                {
                  label: 'Best Day',
                  value: `$${bestDayEarnings.toFixed(2)}`,
                  sub: `${(bestDayEarnings / hourlyRate).toFixed(2)} hrs worked`,
                  color: 'text-blue-400',
                  glow: 'border-blue-500/20 bg-blue-500/5',
                  icon: <TrendingUp className="w-5 h-5 text-blue-400" />,
                },
                {
                  label: 'Target Hit Rate',
                  value: `${totalDays > 0 ? Math.round((metTargetDays / totalDays) * 100) : 0}%`,
                  sub: `${metTargetDays} of ${totalDays} days`,
                  color: metTargetDays === totalDays ? 'text-emerald-400' : 'text-indigo-400',
                  glow: 'border-indigo-500/20 bg-indigo-500/5',
                  icon: <Minus className="w-5 h-5 text-indigo-400" />,
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className={`skeuo-panel p-5 border ${card.glow} flex items-start gap-3`}
                >
                  <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-700/50 shrink-0">
                    {card.icon}
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold mb-0.5">
                      {card.label}
                    </div>
                    <div className={`text-2xl font-black font-mono ${card.color}`}>
                      {card.value}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{card.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Daily Earnings Bar + Cumulative Line */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Earnings vs Target */}
            <div className="skeuo-panel p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                  Daily Earnings vs Target
                </h3>
                <span className="text-xs text-slate-400">$ per workday</span>
              </div>
              <div className="h-[260px]">
                {earningsChartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-500 text-sm">No earnings data yet.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={earningsChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickLine={false} />
                      <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v}`} />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        formatter={(value: any, name: string) => [
                          `$${Number(value).toFixed(2)}`,
                          name === 'earnings' ? 'Earned' : 'Daily Target',
                        ]}
                      />
                      <ReferenceLine
                        y={targetDailyEarnings}
                        stroke="#f87171"
                        strokeDasharray="4 4"
                        label={{ value: `Target $${targetDailyEarnings.toFixed(0)}`, fill: '#f87171', fontSize: 10, position: 'top' }}
                      />
                      <Bar dataKey="earnings" radius={[4, 4, 0, 0]} name="earnings">
                        {earningsChartData.map((entry, index) => (
                          <Cell
                            key={index}
                            fill={entry.earnings >= entry.targetEarnings ? '#10b981' : '#3b82f6'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Cumulative Earnings Area Chart */}
            <div className="skeuo-panel p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-cyan-400" />
                  Cumulative Earnings
                </h3>
                <span className="text-xs text-slate-400">Running total</span>
              </div>
              <div className="h-[260px]">
                {cumulativeData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-500 text-sm">No data yet.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cumulativeData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickLine={false} />
                      <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v}`} />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Cumulative Earned']}
                      />
                      <Area
                        type="monotone"
                        dataKey="cumEarnings"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        fill="url(#earningsGradient)"
                        dot={false}
                        activeDot={{ r: 5, fill: '#10b981' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Weekly Earnings Bar + Project Earnings Donut */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Weekly Earnings */}
            <div className="lg:col-span-2 skeuo-panel p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-400" />
                  Weekly Earnings vs Target
                </h3>
                <span className="text-xs text-slate-400">$ per week</span>
              </div>
              <div className="h-[260px]">
                {weeklyEarningsData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-500 text-sm">No weekly data.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyEarningsData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="week" stroke="#9ca3af" fontSize={11} tickLine={false} />
                      <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v}`} />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        formatter={(value: any, name: string) => [`$${Number(value).toFixed(2)}`, name === 'earnings' ? 'Earned' : 'Weekly Target']}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                      <ReferenceLine
                        y={weeklyEarningsData[0]?.target}
                        stroke="#f87171"
                        strokeDasharray="4 4"
                      />
                      <Bar dataKey="earnings" fill="#6366f1" radius={[4, 4, 0, 0]} name="earnings" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Earnings by Project Donut */}
            <div className="skeuo-panel p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <PieIcon className="w-5 h-5 text-amber-400" />
                  Earnings by Project
                </h3>
              </div>
              <div className="h-[260px] flex items-center justify-center">
                {projectEarningsPie.length === 0 ? (
                  <div className="text-slate-500 text-sm">No data.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={projectEarningsPie}
                        cx="50%"
                        cy="45%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {projectEarningsPie.map((_, index) => (
                          <Cell key={index} fill={PROJECT_COLORS[index % PROJECT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Earnings']}
                      />
                      <Legend
                        layout="horizontal"
                        verticalAlign="bottom"
                        align="center"
                        iconSize={8}
                        wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Hours Analytics Section (original charts) ── */}
      <div className="flex items-center gap-2 mt-2">
        <LineIcon className="w-5 h-5 text-blue-400" />
        <h2 className="text-base font-bold text-white">Hours Analytics</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Daily Total vs Target */}
        <div className="lg:col-span-2 skeuo-panel p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <LineIcon className="w-5 h-5 text-blue-400" />
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
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value: any) => [`${value} hrs`, 'Total Hours']}
                  />
                  <ReferenceLine
                    y={targetHours}
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    label={{ value: `Target (${targetHours}h)`, fill: '#f87171', fontSize: 11, position: 'top' }}
                  />
                  <Bar dataKey="totalHours" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Total Hours" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Project Share Pie */}
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
                    {pieChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PROJECT_COLORS[index % PROJECT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
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
                <Tooltip contentStyle={TOOLTIP_STYLE} />
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
