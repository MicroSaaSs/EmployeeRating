import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import Icon from '../../../components/AppIcon';

const AnalyticsTab = ({ data }) => {
  const COLORS = ['#1B365D', '#4A90A4', '#E67E22', '#27AE60', '#E74C3C'];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface border border-border rounded-lg p-3 shadow-modal">
          <p className="font-medium text-text-primary">{`${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.dataKey}: ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const categoryChartData = data.categoryBreakdown.map(item => ({
    ...item,
    fill: COLORS[data.categoryBreakdown.indexOf(item) % COLORS.length]
  }));

  return (
    <div className="space-y-8">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <Icon name="Star" size={24} color="white" />
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-primary">{data.overallRating}</p>
              <p className="text-sm text-primary-700">Overall Rating</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Icon name="TrendingUp" size={16} className="text-success" />
            <span className="text-sm text-success font-medium">+0.3 from last month</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-success-50 to-success-100 border border-success-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-success rounded-lg flex items-center justify-center">
              <Icon name="MessageSquare" size={24} color="white" />
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-success">{data.totalRatingsReceived}</p>
              <p className="text-sm text-success-700">Ratings Received</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Icon name="TrendingUp" size={16} className="text-success" />
            <span className="text-sm text-success font-medium">+5 this month</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-accent-50 to-accent-100 border border-accent-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
              <Icon name="Send" size={24} color="white" />
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-accent">{data.totalRatingsGiven}</p>
              <p className="text-sm text-accent-700">Ratings Given</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Icon name="TrendingUp" size={16} className="text-success" />
            <span className="text-sm text-success font-medium">+3 this month</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-secondary-50 to-secondary-100 border border-secondary-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center">
              <Icon name="Eye" size={24} color="white" />
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-secondary">{data.profileViews}</p>
              <p className="text-sm text-secondary-700">Profile Views</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Icon name="TrendingUp" size={16} className="text-success" />
            <span className="text-sm text-success font-medium">+12 this week</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Rating Trends Chart */}
        <div className="bg-surface border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-text-primary">Rating Activity Trends</h3>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-primary rounded-full"></div>
                <span className="text-sm text-text-secondary">Received</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-accent rounded-full"></div>
                <span className="text-sm text-text-secondary">Given</span>
              </div>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.ratingTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E1E8ED" />
                <XAxis 
                  dataKey="month" 
                  stroke="#7F8C8D"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#7F8C8D"
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="received" 
                  stroke="#1B365D" 
                  strokeWidth={3}
                  dot={{ fill: '#1B365D', strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="given" 
                  stroke="#E67E22" 
                  strokeWidth={3}
                  dot={{ fill: '#E67E22', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown Chart */}
        <div className="bg-surface border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-text-primary">Rating Categories</h3>
            <select className="px-3 py-1 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
              <option>Last 6 months</option>
              <option>Last year</option>
              <option>All time</option>
            </select>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#E1E8ED" />
                <XAxis 
                  type="number" 
                  domain={[0, 5]}
                  stroke="#7F8C8D"
                  fontSize={12}
                />
                <YAxis 
                  type="category" 
                  dataKey="category" 
                  stroke="#7F8C8D"
                  fontSize={12}
                  width={100}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="rating" 
                  fill="#1B365D"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Category Analysis */}
      <div className="bg-surface border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-6">Category Performance Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.categoryBreakdown.map((category, index) => (
            <div key={category.category} className="border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-text-primary">{category.category}</h4>
                <div className="flex items-center gap-1">
                  <Icon name="Star" size={16} className="text-warning fill-current" />
                  <span className="font-semibold text-text-primary">{category.rating}</span>
                </div>
              </div>
              
              <div className="mb-3">
                <div className="flex justify-between text-sm text-text-secondary mb-1">
                  <span>Progress</span>
                  <span>{category.count} ratings</span>
                </div>
                <div className="w-full bg-border rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(category.rating / 5) * 100}%`,
                      backgroundColor: COLORS[index % COLORS.length]
                    }}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Avg. Rating</span>
                <span className={`font-medium ${
                  category.rating >= 4.5 ? 'text-success' :
                  category.rating >= 3.5 ? 'text-warning' : 'text-error'
                }`}>
                  {category.rating >= 4.5 ? 'Excellent' :
                   category.rating >= 3.5 ? 'Good' : 'Needs Improvement'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights and Recommendations */}
      <div className="bg-gradient-to-r from-primary-50 to-secondary-50 border border-primary-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Insights & Recommendations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-text-primary mb-3 flex items-center gap-2">
              <Icon name="TrendingUp" size={18} className="text-success" />
              Strengths
            </h4>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li className="flex items-start gap-2">
                <Icon name="CheckCircle" size={16} className="text-success mt-0.5" />
                <span>Consistently high ratings in Problem Solving (4.9/5)</span>
              </li>
              <li className="flex items-start gap-2">
                <Icon name="CheckCircle" size={16} className="text-success mt-0.5" />
                <span>Strong technical skills recognition from peers</span>
              </li>
              <li className="flex items-start gap-2">
                <Icon name="CheckCircle" size={16} className="text-success mt-0.5" />
                <span>Positive trend in overall rating (+0.3 this month)</span>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-text-primary mb-3 flex items-center gap-2">
              <Icon name="Target" size={18} className="text-accent" />
              Areas for Growth
            </h4>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li className="flex items-start gap-2">
                <Icon name="AlertCircle" size={16} className="text-accent mt-0.5" />
                <span>Focus on creativity skills (4.5/5 - room for improvement)</span>
              </li>
              <li className="flex items-start gap-2">
                <Icon name="AlertCircle" size={16} className="text-accent mt-0.5" />
                <span>Increase networking activity to get more ratings</span>
              </li>
              <li className="flex items-start gap-2">
                <Icon name="AlertCircle" size={16} className="text-accent mt-0.5" />
                <span>Consider showcasing more diverse project experiences</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsTab;