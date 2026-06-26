const ChartFactory = {
    render(container, chartData) {
        if (!container || !chartData) return;
        
        const chart = echarts.init(container);
        
        const columns = chartData.columns || [];
        const rows = chartData.rows || [];
        const config = chartData.config || {};
        
        const xAxisData = rows.map(row => row[config.xAxisColumn || 0]);
        const seriesData = [];
        
        const seriesColumns = config.seriesColumns || [];
        seriesColumns.forEach((colIndex, index) => {
            seriesData.push({
                name: columns[colIndex] || `系列${index + 1}`,
                type: chartData.chartType || 'bar',
                data: rows.map(row => row[colIndex])
            });
        });
        
        const option = {
            title: {
                text: chartData.title || ''
            },
            tooltip: {
                trigger: 'axis'
            },
            legend: {
                data: seriesData.map(s => s.name)
            },
            xAxis: {
                type: 'category',
                data: xAxisData
            },
            yAxis: {
                type: 'value'
            },
            series: seriesData
        };
        
        chart.setOption(option);
        
        window.addEventListener('resize', () => chart.resize());
        
        return chart;
    }
};
