import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import Icon from '../../../components/AppIcon';

const AnalyticsSection = ({ analyticsData, professionalName }) => {
  const { ratingTrends, categoryBreakdown, ratingDistribution } = analyticsData;

  // Prepare data for charts
  const distributionData = Object.entries(ratingDistribution).map(([stars, count]) => ({
    stars: `${stars} Star${stars !== '1' ? 's' : ''}`,
    count,
    percentage: Math.round((count / Object.values(ratingDistribution).reduce((a, b) => a + b, 0)) * 100)
  }));

  const categoryData = Object.entries(categoryBreakdown).map(([category, rating]) => ({
    category: category.charAt(0).toUpperCase() + category.slice(1),
    rating: rating,
    percentage: Math.round((rating / 5) * 100)
  }));

  const COLORS = ['#E67E22', '#27AE60', '#3498DB', '#9B59B6', '#E74C3C'];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface border border-border rounded-lg shadow-modal p-3">
          <p className="font-medium text-text-primary">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-surface rounded-xl shadow-card border border-border p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Icon name="TrendingUp" size={24} className="text-primary" />
        <h3 className="text-xl font-semibold text-text-primary">
          Rating Analytics for {professionalName}
        </h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rating Trends Over Time */}
        <div className="bg-background rounded-lg p-4">
          <h4 className="font-semibold text-text-primary mb-4 flex items-center space-x-2">
            <Icon name="TrendingUp" size={18} className="text-primary" />
            <span>Rating Trends Over Time</span>
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ratingTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E1E8ED" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12, fill: '#7F8C8D' }}
                  axisLine={{ stroke: '#E1E8ED' }}
                />
                <YAxis 
                  domain={[3.5, 5]}
                  tick={{ fontSize: 12, fill: '#7F8C8D' }}
                  axisLine={{ stroke: '#E1E8ED' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="rating" 
                  stroke="#1B365D" 
                  strokeWidth={3}
                  dot={{ fill: '#1B365D', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#1B365D', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-background rounded-lg p-4">
          <h4 className="font-semibold text-text-primary mb-4 flex items-center space-x-2">
            <Icon name="BarChart3" size={18} className="text-secondary" />
            <span>Performance by Category</span>
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#E1E8ED" />
                <XAxis 
                  type="number" 
                  domain={[0, 5]}
                  tick={{ fontSize: 12, fill: '#7F8C8D' }}
                  axisLine={{ stroke: '#E1E8ED' }}
                />
                <YAxis 
                  type="category" 
                  dataKey="category"
                  tick={{ fontSize: 12, fill: '#7F8C8D' }}
                  axisLine={{ stroke: '#E1E8ED' }}
                  width={80}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="rating" 
                  fill="#4A90A4"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="bg-background rounded-lg p-4">
          <h4 className="font-semibold text-text-primary mb-4 flex items-center space-x-2">
            <Icon name="PieChart" size={18} className="text-accent" />
            <span>Rating Distribution</span>
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ percentage }) => `${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {distributionData.map((item, index) => (
              <div key={item.stars} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></div>
                  <span className="text-text-secondary">{item.stars}</span>
                </div>
                <span className="font-medium text-text-primary">
                  {item.count} ({item.percentage}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Key Metrics Summary */}
        <div className="bg-background rounded-lg p-4">
          <h4 className="font-semibold text-text-primary mb-4 flex items-center space-x-2">
            <Icon name="Target" size={18} className="text-success" />
            <span>Key Performance Metrics</span>
          </h4>
          <div className="space-y-4">
            {categoryData.map((category, index) => (
              <div key={category.category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-text-primary">
                    {category.category}
                  </span>
                  <span className="text-sm font-bold text-primary">
                    {category.rating}/5.0
                  </span>
                </div>
                <div className="w-full bg-border-light rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${category.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          {/* Additional Stats */}
          <div className="mt-6 pt-4 border-t border-border">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">
                  {Math.round(Object.values(categoryBreakdown).reduce((a, b) => a + b, 0) / Object.keys(categoryBreakdown).length * 10) / 10}
                </div>
                <div className="text-sm text-text-secondary">Overall Score</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-success">
                  {Math.round((ratingDistribution[5] + ratingDistribution[4]) / Object.values(ratingDistribution).reduce((a, b) => a + b, 0) * 100)}%
                </div>
                <div className="text-sm text-text-secondary">Positive Reviews</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsSection;