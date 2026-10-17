"use client";
import { useCurrency } from "@/lib/currency-context";
import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from "recharts";

interface Props {
  dailyTrends: any[];
  hourlyDistribution: any[];
}

export default function OrderTypeCharts({ dailyTrends, hourlyDistribution }: Props) {
  const { currencySymbol: sym } = useCurrency();

  const formatValue = (value: number) => `${sym}${new Intl.NumberFormat("en-IN").format(Math.round(value))}`;

  return (
    <div style={{ display: "contents" }}>
      {/* Daily Revenue Trend Chart */}
      <div style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "32px", padding: "40px", boxShadow: "var(--kravy-shadow-md)" }}>
        <h3 style={{ fontSize: "1.2rem", fontWeight: 900, color: "var(--kravy-text-primary)", marginBottom: "40px" }}>Daily Revenue Trend</h3>
        <div style={{ height: "350px", width: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyTrends}>
              <defs>
                <linearGradient id="colorDineIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorDelivery" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorTakeaway" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--kravy-border)" />
              <XAxis 
                dataKey="day" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: "var(--kravy-text-muted)", fontSize: 12, fontWeight: 700 }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: "var(--kravy-text-muted)", fontSize: 12, fontWeight: 700 }}
                tickFormatter={(value) => `${sym}${value >= 1000 ? value / 1000 + "k" : value}`}
              />
              <Tooltip 
                contentStyle={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "16px", boxShadow: "var(--kravy-shadow-lg)" }}
                itemStyle={{ fontSize: "12px", fontWeight: 800 }}
                formatter={formatValue}
              />
              <Legend verticalAlign="top" align="right" iconType="circle" iconSize={8} wrapperStyle={{ paddingBottom: "20px", fontSize: "12px", fontWeight: 800 }} />
              <Area type="monotone" dataKey="Dine-in" stroke="#10B981" strokeWidth={4} fillOpacity={1} fill="url(#colorDineIn)" />
              <Area type="monotone" dataKey="Delivery" stroke="#3B82F6" strokeWidth={4} fillOpacity={1} fill="url(#colorDelivery)" />
              <Area type="monotone" dataKey="Takeaway" stroke="#F59E0B" strokeWidth={4} fillOpacity={1} fill="url(#colorTakeaway)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Peak Hours Stacked Bar Chart */}
      <div style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "32px", padding: "40px", boxShadow: "var(--kravy-shadow-md)" }}>
        <h3 style={{ fontSize: "1.2rem", fontWeight: 900, color: "var(--kravy-text-primary)", marginBottom: "40px" }}>Peak Hours Distribution</h3>
        <div style={{ height: "350px", width: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyDistribution.filter(h => (h["Dine-in"] + h["Delivery"] + h["Takeaway"]) > 0)}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--kravy-border)" />
              <XAxis 
                dataKey="hour" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: "var(--kravy-text-muted)", fontSize: 10, fontWeight: 700 }}
                tickFormatter={(h) => h === 0 ? "12AM" : h > 12 ? `${h-12}PM` : `${h}AM`}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: "var(--kravy-text-muted)", fontSize: 12, fontWeight: 700 }}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                contentStyle={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "16px", boxShadow: "var(--kravy-shadow-lg)" }}
              />
              <Bar dataKey="Dine-in" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Delivery" stackId="a" fill="#3B82F6" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Takeaway" stackId="a" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
