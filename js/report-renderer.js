const ReportRenderer = {
    render(container, sections) {
        if (!sections || !Array.isArray(sections)) return;
        
        sections.forEach(section => {
            const sectionEl = document.createElement('div');
            sectionEl.className = 'report-section';
            
            if (section.type === 'text') {
                sectionEl.innerHTML = `<p>${section.data}</p>`;
            } else if (section.type === 'chart') {
                const chartContainer = document.createElement('div');
                chartContainer.className = 'chart-container';
                sectionEl.appendChild(chartContainer);
                
                setTimeout(() => {
                    ChartFactory.render(chartContainer, section.data);
                }, 0);
            }
            
            container.appendChild(sectionEl);
        });
    }
};
