import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Polyline, Circle, Line, Text as SvgText, G } from 'react-native-svg';

interface WeightEntry {
  id: string;
  weight: number;
  date: Date;
  notes?: string;
  createdAt: Date;
}

interface WeightChartProps {
  data: WeightEntry[];
  width?: number;
  height?: number;
}

export const WeightChart: React.FC<WeightChartProps> = ({ 
  data, 
  width = Dimensions.get('window').width - 48,
  height = 220 
}) => {
  if (data.length === 0) {
    return (
      <View style={[styles.container, { width, height }]}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No weight data available</Text>
          <Text style={styles.emptyStateSubtext}>Start logging weights to see trends</Text>
        </View>
      </View>
    );
  }

  // Sort data by date (oldest first) and filter out invalid dates
  const sortedData = [...data]
    .filter(entry => entry.date && !isNaN(entry.date.getTime()))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  
  // Chart dimensions and padding - ensure chart fits within container
  const padding = 50; // Increased padding for better spacing
  const chartWidth = Math.max(width - padding * 2, 200); // Minimum width of 200
  const chartHeight = Math.max(height - padding * 2, 120); // Minimum height of 120
  
  // Find min and max weights for scaling
  const weights = sortedData.map(entry => entry.weight).filter(w => !isNaN(w) && isFinite(w));
  if (weights.length === 0) {
    return (
      <View style={[styles.container, { width, height }]}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No valid weight data available</Text>
          <Text style={styles.emptyStateSubtext}>Start logging weights to see trends</Text>
        </View>
      </View>
    );
  }
  
  const minWeight = Math.min(...weights);
  const maxWeight = Math.max(...weights);
  const weightRange = maxWeight - minWeight;
  
  // Add some padding to the range for better visualization
  const paddedMin = minWeight - weightRange * 0.1;
  const paddedMax = maxWeight + weightRange * 0.1;
  const paddedRange = paddedMax - paddedMin;
  
  // Convert data points to chart coordinates
  const points = sortedData.map((entry, index) => {
    const x = padding + (index / Math.max(sortedData.length - 1, 1)) * chartWidth;
    const y = padding + chartHeight - ((entry.weight - paddedMin) / Math.max(paddedRange, 0.1)) * chartHeight;
    return { x: isNaN(x) ? padding : x, y: isNaN(y) ? padding + chartHeight : y, weight: entry.weight, date: entry.date };
  });
  
  // Create polyline path
  const pathData = points.map((point, index) => 
    `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  ).join(' ');
  
  // Generate Y-axis labels
  const yAxisLabels = [];
  const numLabels = 5;
  for (let i = 0; i <= numLabels; i++) {
    const value = paddedMax - (i / numLabels) * paddedRange;
    const y = padding + (i / numLabels) * chartHeight;
    yAxisLabels.push({ value, y });
  }
  
  // Generate X-axis labels (show every few points to avoid crowding)
  const xAxisLabels = [];
  const labelInterval = Math.max(1, Math.floor(sortedData.length / 5));
  for (let i = 0; i < sortedData.length; i += labelInterval) {
    const point = points[i];
    const date = sortedData[i].date;
    xAxisLabels.push({
      x: point.x,
      label: `${date.getMonth() + 1}/${date.getDate()}`
    });
  }
  
  // Add the last point if it's not already included
  if (sortedData.length > 0 && xAxisLabels[xAxisLabels.length - 1]?.x !== points[points.length - 1].x) {
    const lastPoint = points[points.length - 1];
    const lastDate = sortedData[sortedData.length - 1].date;
    xAxisLabels.push({
      x: lastPoint.x,
      label: `${lastDate.getMonth() + 1}/${lastDate.getDate()}`
    });
  }

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Grid lines */}
        {yAxisLabels.map((label, index) => (
          <Line
            key={`grid-${index}`}
            x1={padding}
            y1={label.y}
            x2={width - padding}
            y2={label.y}
            stroke="#E5E7EB"
            strokeWidth={1}
            strokeDasharray="2,2"
          />
        ))}
        
        {/* Y-axis labels */}
        {yAxisLabels.map((label, index) => (
          <SvgText
            key={`y-label-${index}`}
            x={padding - 10}
            y={label.y + 4}
            fontSize="12"
            fill="#6B7280"
            textAnchor="end"
          >
            {label.value.toFixed(1)}
          </SvgText>
        ))}
        
        {/* X-axis labels */}
        {xAxisLabels.map((label, index) => (
          <SvgText
            key={`x-label-${index}`}
            x={label.x}
            y={height - padding + 20}
            fontSize="12"
            fill="#6B7280"
            textAnchor="middle"
          >
            {label.label}
          </SvgText>
        ))}
        
        {/* Chart line */}
        {points.length > 1 && (
          <Polyline
            points={points.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#3B82F6"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        
        {/* Data points */}
        {points.map((point, index) => (
          <Circle
            key={`point-${index}`}
            cx={isNaN(point.x) ? padding : point.x}
            cy={isNaN(point.y) ? padding + chartHeight : point.y}
            r="6"
            fill="#3B82F6"
            stroke="#ffffff"
            strokeWidth="2"
          />
        ))}
        
        {/* Chart border */}
        <Line
          x1={padding}
          y1={padding}
          x2={padding}
          y2={height - padding}
          stroke="#D1D5DB"
          strokeWidth="1"
        />
        <Line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke="#D1D5DB"
          strokeWidth="1"
        />
      </Svg>
      
      {/* Chart title */}
      <View style={styles.chartTitle}>
        <Text style={styles.chartTitleText}>Weight Trend</Text>
        <Text style={styles.chartSubtitle}>
          {sortedData.length} entries - {weightRange.toFixed(1)} kg range
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden', // Prevent chart from overflowing container
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  chartTitle: {
    position: 'absolute',
    top: 10,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 10,
  },
  chartTitleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
});
