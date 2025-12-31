import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { Users, Eye, TrendingUp, Globe, Calendar, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const StatCard = ({ title, value, subValue, icon: Icon, color }) => (
  <Card className="bg-[#1A1A1A] border-white/10">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/60 text-sm">{title}</p>
          <p className="text-3xl font-bold text-white mt-1">{value.toLocaleString()}</p>
          {subValue && <p className="text-white/40 text-xs mt-1">{subValue}</p>}
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="text-white" size={24} />
        </div>
      </div>
    </CardContent>
  </Card>
);

const VisitorStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/admin/visitor-stats`, { withCredentials: true });
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching visitor stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white/60">Loading stats...</div>
      </div>
    );
  }

  const dailyData = stats?.daily_stats || [];
  const maxVisits = Math.max(...dailyData.map(d => d.total_visits || 0), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Visitor Analytics</h1>
          <p className="text-white/60">Track your website traffic and SEO performance</p>
        </div>
        <button
          onClick={fetchStats}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
        >
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Visits"
          value={stats?.today_visits || 0}
          subValue={`${stats?.today_unique || 0} unique visitors`}
          icon={Eye}
          color="bg-blue-600"
        />
        <StatCard
          title="Last 30 Days"
          value={stats?.total_visits_30d || 0}
          subValue={`${stats?.unique_visitors_30d || 0} unique visitors`}
          icon={Users}
          color="bg-green-600"
        />
        <StatCard
          title="Avg Daily Visits"
          value={dailyData.length > 0 ? Math.round((stats?.total_visits_30d || 0) / Math.min(dailyData.length, 30)) : 0}
          subValue="visitors per day"
          icon={TrendingUp}
          color="bg-purple-600"
        />
        <StatCard
          title="Pages Tracked"
          value={Object.keys(stats?.page_breakdown || {}).length}
          subValue="different pages visited"
          icon={Globe}
          color="bg-orange-600"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Traffic Chart */}
        <Card className="bg-[#1A1A1A] border-white/10 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 size={20} />
              Daily Traffic (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end gap-1">
              {dailyData.slice(0, 30).reverse().map((day, index) => {
                const height = ((day.total_visits || 0) / maxVisits) * 100;
                const isToday = index === dailyData.length - 1;
                return (
                  <div
                    key={day.date}
                    className="flex-1 flex flex-col items-center group"
                  >
                    <div className="relative w-full">
                      <div
                        className={`w-full rounded-t transition-all ${isToday ? 'bg-red-500' : 'bg-red-600/60 group-hover:bg-red-500'}`}
                        style={{ height: `${Math.max(height, 2)}%`, minHeight: '4px' }}
                      />
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                        <div className="bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                          {day.date}: {day.total_visits || 0} visits
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-2 text-white/40 text-xs">
              <span>30 days ago</span>
              <span>Today</span>
            </div>
          </CardContent>
        </Card>

        {/* Top Pages */}
        <Card className="bg-[#1A1A1A] border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Globe size={20} />
              Top Pages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(stats?.top_pages || []).slice(0, 8).map(([page, count], index) => {
                const percentage = stats?.total_visits_30d > 0 
                  ? ((count / stats.total_visits_30d) * 100).toFixed(1) 
                  : 0;
                const pageName = page === '_' || page === 'home' ? 'Homepage' : 
                  page.replace(/_/g, '/').replace(/^\//, '');
                return (
                  <div key={page} className="flex items-center gap-3">
                    <span className="text-white/40 text-xs w-4">{index + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-white truncate">{pageName}</span>
                        <span className="text-white/60">{count}</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-1.5 mt-1">
                        <div 
                          className="bg-red-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              {(!stats?.top_pages || stats.top_pages.length === 0) && (
                <p className="text-white/40 text-sm text-center py-4">
                  No page data yet. Visits will appear here.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Days Table */}
      <Card className="bg-[#1A1A1A] border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Calendar size={20} />
            Recent Traffic
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-white/60 text-sm py-3 px-4">Date</th>
                  <th className="text-right text-white/60 text-sm py-3 px-4">Total Visits</th>
                  <th className="text-right text-white/60 text-sm py-3 px-4">Unique Visitors</th>
                  <th className="text-right text-white/60 text-sm py-3 px-4">Trend</th>
                </tr>
              </thead>
              <tbody>
                {dailyData.slice(0, 14).map((day, index) => {
                  const prevDay = dailyData[index + 1];
                  const change = prevDay 
                    ? ((day.total_visits || 0) - (prevDay.total_visits || 0))
                    : 0;
                  return (
                    <tr key={day.date} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 px-4 text-white">{day.date}</td>
                      <td className="py-3 px-4 text-white text-right">{(day.total_visits || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-white/70 text-right">{(day.unique_visitors?.length || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">
                        {change > 0 && <span className="text-green-500">+{change}</span>}
                        {change < 0 && <span className="text-red-500">{change}</span>}
                        {change === 0 && <span className="text-white/40">-</span>}
                      </td>
                    </tr>
                  );
                })}
                {dailyData.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-white/40">
                      No visitor data yet. Traffic will be tracked as visitors browse your site.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Info Note */}
      <div className="bg-blue-950/30 border border-blue-800 rounded-lg p-4">
        <p className="text-blue-200 text-sm">
          <strong>Note:</strong> Visitor tracking started when this feature was added. 
          Data will accumulate over time. For more detailed analytics, consider integrating 
          Google Analytics or similar services.
        </p>
      </div>
    </motion.div>
  );
};

export default VisitorStats;
