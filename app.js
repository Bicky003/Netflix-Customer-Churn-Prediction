// Netflix Customer Churn Power BI Dashboard Application Logic

document.addEventListener('DOMContentLoaded', () => {
  if (typeof CHURN_DATA === 'undefined') {
    console.error('CHURN_DATA not found. Make sure data.js is loaded.');
    return;
  }

  const state = {
    customers: CHURN_DATA.customers || [],
    metrics: CHURN_DATA.metrics || [],
    feature_importance: CHURN_DATA.feature_importance || [],
    filteredCustomers: [],
    filters: {
      region: 'All',
      plan: 'All',
      risk: 'All',
      search: ''
    },
    pagination: {
      currentPage: 1,
      pageSize: 15
    },
    charts: {}
  };

  // Initialize App
  initTabNavigation();
  initFilterControls();
  initSearchAndPagination();

  // Initial Filter Apply & Render
  applyFilters();
  renderMetricsTable();
  initCharts();

  // Tab Navigation Setup
  function initTabNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const targetTab = item.getAttribute('data-tab');

        navItems.forEach(nav => nav.classList.remove('active'));
        tabContents.forEach(tab => tab.classList.remove('active'));

        item.classList.add('active');
        const targetElement = document.getElementById(`tab-${targetTab}`);
        if (targetElement) {
          targetElement.classList.add('active');
        }

        // Update Page Titles
        const titleMap = {
          'overview': { title: 'Executive Churn Overview', sub: 'Real-time ML customer churn predictions, revenue risk exposure, and segment dynamics' },
          'ml-drivers': { title: 'ML Model Drivers & Benchmarks', sub: 'Feature importances, model comparison matrix, and cluster distribution' },
          'risk-desk': { title: 'Customer Risk Desk & Retention Plan', sub: 'Granular customer risk scoring, key drivers, and targeted retention actions' }
        };

        if (titleMap[targetTab]) {
          document.getElementById('page-title').textContent = titleMap[targetTab].title;
          document.getElementById('page-subtitle').textContent = titleMap[targetTab].sub;
        }

        // Trigger chart resize/update
        Object.values(state.charts).forEach(chart => chart && chart.resize());
      });
    });
  }

  // Filter Controls Listener Setup
  function initFilterControls() {
    const regionSelect = document.getElementById('filter-region');
    const planSelect = document.getElementById('filter-plan');
    const riskSelect = document.getElementById('filter-risk');
    const resetBtn = document.getElementById('reset-filters-btn');

    regionSelect.addEventListener('change', (e) => {
      state.filters.region = e.target.value;
      state.pagination.currentPage = 1;
      applyFilters();
    });

    planSelect.addEventListener('change', (e) => {
      state.filters.plan = e.target.value;
      state.pagination.currentPage = 1;
      applyFilters();
    });

    riskSelect.addEventListener('change', (e) => {
      state.filters.risk = e.target.value;
      state.pagination.currentPage = 1;
      applyFilters();
    });

    resetBtn.addEventListener('click', () => {
      regionSelect.value = 'All';
      planSelect.value = 'All';
      riskSelect.value = 'All';
      document.getElementById('table-search').value = '';
      state.filters = { region: 'All', plan: 'All', risk: 'All', search: '' };
      state.pagination.currentPage = 1;
      applyFilters();
    });
  }

  function initSearchAndPagination() {
    const searchInput = document.getElementById('table-search');
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');

    searchInput.addEventListener('input', (e) => {
      state.filters.search = e.target.value.toLowerCase().trim();
      state.pagination.currentPage = 1;
      applyFilters();
    });

    prevBtn.addEventListener('click', () => {
      if (state.pagination.currentPage > 1) {
        state.pagination.currentPage--;
        renderCustomerTable();
      }
    });

    nextBtn.addEventListener('click', () => {
      const maxPages = Math.ceil(state.filteredCustomers.length / state.pagination.pageSize) || 1;
      if (state.pagination.currentPage < maxPages) {
        state.pagination.currentPage++;
        renderCustomerTable();
      }
    });
  }

  // Apply Filters to Data & Recalculate Everything
  function applyFilters() {
    state.filteredCustomers = state.customers.filter(c => {
      const matchRegion = state.filters.region === 'All' || c.region === state.filters.region;
      const matchPlan = state.filters.plan === 'All' || c.subscription_type === state.filters.plan;
      const matchRisk = state.filters.risk === 'All' || c.churn_risk_segment === state.filters.risk;
      const matchSearch = !state.filters.search || 
        c.customer_id.toLowerCase().includes(state.filters.search) ||
        (c.primary_risk_driver && c.primary_risk_driver.toLowerCase().includes(state.filters.search));

      return matchRegion && matchPlan && matchRisk && matchSearch;
    });

    updateKPICards();
    updateCharts();
    renderCustomerTable();
  }

  // Update Top KPI Banner Cards
  function updateKPICards() {
    const total = state.filteredCustomers.length;
    const churnedCount = state.filteredCustomers.filter(c => c.predicted_churn_flag === 1).length;
    const churnRate = total > 0 ? (churnedCount / total) * 100 : 0;

    const highRiskCount = state.filteredCustomers.filter(c => c.churn_risk_segment === 'High Risk').length;
    const highRiskPct = total > 0 ? (highRiskCount / total) * 100 : 0;

    const monthlyRevRisk = state.filteredCustomers.reduce((acc, c) => acc + (c.monthly_revenue_at_risk || 0), 0);
    const annualRevRisk = state.filteredCustomers.reduce((acc, c) => acc + (c.annual_revenue_at_risk || 0), 0);

    document.getElementById('kpi-total-base').textContent = total.toLocaleString();
    document.getElementById('kpi-churn-rate').textContent = `${churnRate.toFixed(1)}%`;
    document.getElementById('kpi-churn-count').textContent = `${churnedCount.toLocaleString()} Accounts Flagged`;

    document.getElementById('kpi-high-risk').textContent = highRiskCount.toLocaleString();
    document.getElementById('kpi-high-risk-pct').textContent = `${highRiskPct.toFixed(1)}% of Selected Base`;

    document.getElementById('kpi-annual-revenue').textContent = `$${Math.round(annualRevRisk).toLocaleString()}`;
    document.getElementById('kpi-monthly-revenue').textContent = `$${Math.round(monthlyRevRisk).toLocaleString()} Monthly Exposure`;

    // Active Model KPI
    const bestModel = state.metrics[0] || { ROC_AUC: 0.9998, Model: 'Gradient Boosting' };
    document.getElementById('active-model-name').textContent = bestModel.Model;
    document.getElementById('active-model-auc').textContent = bestModel.ROC_AUC;
    document.getElementById('active-model-acc').textContent = `${(bestModel.Accuracy * 100).toFixed(1)}%`;
  }

  // Render Machine Learning Metrics Benchmark Table
  function renderMetricsTable() {
    const tbody = document.getElementById('metrics-table-body');
    if (!tbody) return;

    tbody.innerHTML = state.metrics.map((m, index) => {
      const isBest = index === 0;
      return `
        <tr style="${isBest ? 'background: rgba(0, 209, 178, 0.08); font-weight: 600;' : ''}">
          <td>
            <strong>${m.Model}</strong>
            ${isBest ? ' <span class="badge badge-low" style="font-size: 0.65rem; margin-left: 6px;">RECOMMENDED</span>' : ''}
          </td>
          <td>${(m.Accuracy * 100).toFixed(1)}%</td>
          <td>${(m.Precision * 100).toFixed(1)}%</td>
          <td>${(m.Recall * 100).toFixed(1)}%</td>
          <td>${(m.F1_Score * 100).toFixed(1)}%</td>
          <td><strong style="color: #2DD4BF;">${m.ROC_AUC.toFixed(4)}</strong></td>
          <td>${m.Log_Loss.toFixed(4)}</td>
          <td>
            <span class="badge ${isBest ? 'badge-low' : 'badge-medium'}">
              ${isBest ? 'Optimal' : 'Evaluated'}
            </span>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Render Customer Table with Pagination
  function renderCustomerTable() {
    const tbody = document.getElementById('customer-table-body');
    if (!tbody) return;

    const total = state.filteredCustomers.length;
    document.getElementById('total-desk-count').textContent = total.toLocaleString();

    const pageSize = state.pagination.pageSize;
    const maxPages = Math.ceil(total / pageSize) || 1;
    if (state.pagination.currentPage > maxPages) state.pagination.currentPage = maxPages;

    const startIdx = (state.pagination.currentPage - 1) * pageSize;
    const pageData = state.filteredCustomers.slice(startIdx, startIdx + pageSize);

    document.getElementById('showing-count').textContent = `${pageData.length}`;
    document.getElementById('page-info').textContent = `Page ${state.pagination.currentPage} of ${maxPages}`;
    document.getElementById('prev-page-btn').disabled = state.pagination.currentPage <= 1;
    document.getElementById('next-page-btn').disabled = state.pagination.currentPage >= maxPages;

    if (pageData.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 30px;">No matching customer records found.</td></tr>`;
      return;
    }

    tbody.innerHTML = pageData.map(c => {
      const probPct = (c.churn_probability * 100).toFixed(1);
      let badgeClass = 'badge-low';
      if (c.churn_risk_segment === 'High Risk') badgeClass = 'badge-high';
      else if (c.churn_risk_segment === 'Medium Risk') badgeClass = 'badge-medium';

      let action = 'Send Re-engagement Email';
      if (c.primary_risk_driver.includes('Inactivity')) action = 'Send "We Miss You" Offer & Discount';
      else if (c.primary_risk_driver.includes('Watch Volume')) action = 'Deliver Content Recommendations';
      else if (c.primary_risk_driver.includes('Payment Channel')) action = 'Incentivize Auto-Debit Switch';
      else if (c.primary_risk_driver.includes('Basic Plan')) action = 'Offer Free Standard Trial Upgrade';

      return `
        <tr>
          <td><code style="font-size: 0.78rem; color: #94A3B8;">${c.customer_id.substring(0, 13)}...</code></td>
          <td><strong>${c.subscription_type}</strong></td>
          <td><span class="badge ${badgeClass}">${c.churn_risk_segment}</span></td>
          <td><span class="prob-meter" style="color: ${c.churn_probability >= 0.65 ? '#FF4D58' : '#2DD4BF'};">${probPct}%</span></td>
          <td>${c.primary_risk_driver}</td>
          <td>${c.last_login_days} days ago</td>
          <td>${c.watch_hours.toFixed(1)} hrs</td>
          <td>${c.payment_method}</td>
          <td><span class="action-pill">${action}</span></td>
        </tr>
      `;
    }).join('');
  }

  // Initialize Chart.js Instances
  function initCharts() {
    Chart.defaults.font.family = "'Outfit', sans-serif";
    Chart.defaults.color = '#94A3B8';
    Chart.defaults.plugins.tooltip.backgroundColor = '#1A1F2C';
    Chart.defaults.plugins.tooltip.borderColor = '#2D3548';
    Chart.defaults.plugins.tooltip.borderWidth = 1;

    // 1. Risk Tier Doughnut Chart
    const ctxRisk = document.getElementById('riskDistributionChart');
    if (ctxRisk) {
      state.charts.risk = new Chart(ctxRisk, {
        type: 'doughnut',
        data: {
          labels: ['High Risk', 'Medium Risk', 'Low Risk'],
          datasets: [{
            data: [0, 0, 0],
            backgroundColor: ['#E50914', '#FF9900', '#00D1B2'],
            borderWidth: 2,
            borderColor: '#1A1F2C'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true } }
          },
          cutout: '70%'
        }
      });
    }

    // 2. Plan Churn Bar Chart
    const ctxPlan = document.getElementById('planChurnChart');
    if (ctxPlan) {
      state.charts.plan = new Chart(ctxPlan, {
        type: 'bar',
        data: {
          labels: ['Basic', 'Standard', 'Premium'],
          datasets: [{
            label: 'Predicted Churn Rate %',
            data: [0, 0, 0],
            backgroundColor: ['#E50914', '#FF9900', '#3B82F6'],
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' }, grid: { color: 'rgba(255,255,255,0.05)' } },
            x: { grid: { display: false } }
          }
        }
      });
    }

    // 3. Payment Method Churn Chart
    const ctxPay = document.getElementById('paymentChurnChart');
    if (ctxPay) {
      state.charts.payment = new Chart(ctxPay, {
        type: 'bar',
        data: {
          labels: ['Crypto', 'Gift Card', 'PayPal', 'Debit Card', 'Credit Card'],
          datasets: [{
            label: 'Churn Rate %',
            data: [0, 0, 0, 0, 0],
            backgroundColor: ['#E50914', '#E50914', '#FF9900', '#00D1B2', '#00D1B2'],
            borderRadius: 6
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' }, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { grid: { display: false } }
          }
        }
      });
    }

    // 4. Region Revenue Risk Chart
    const ctxReg = document.getElementById('regionRevenueChart');
    if (ctxReg) {
      state.charts.region = new Chart(ctxReg, {
        type: 'bar',
        data: {
          labels: [],
          datasets: [{
            label: 'Annual Revenue at Risk ($)',
            data: [],
            backgroundColor: '#8B5CF6',
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { callback: v => '$' + (v/1000).toFixed(0) + 'k' }, grid: { color: 'rgba(255,255,255,0.05)' } },
            x: { grid: { display: false } }
          }
        }
      });
    }

    // 5. Feature Importance Chart
    const ctxFeat = document.getElementById('featureImportanceChart');
    if (ctxFeat) {
      const top10 = state.feature_importance.slice(0, 8);
      state.charts.feature = new Chart(ctxFeat, {
        type: 'bar',
        data: {
          labels: top10.map(f => f.Feature.replace('_', ' ')),
          datasets: [{
            label: 'Importance Weight %',
            data: top10.map(f => f.Importance_Pct.toFixed(2)),
            backgroundColor: '#FF4D58',
            borderRadius: 6
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { beginAtZero: true, ticks: { callback: v => v + '%' }, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { grid: { display: false } }
          }
        }
      });
    }

    // 6. Scatter Cluster Chart
    const ctxScatter = document.getElementById('scatterClusterChart');
    if (ctxScatter) {
      state.charts.scatter = new Chart(ctxScatter, {
        type: 'scatter',
        data: {
          datasets: [
            { label: 'High Risk', data: [], backgroundColor: 'rgba(229, 9, 20, 0.7)' },
            { label: 'Low Risk', data: [], backgroundColor: 'rgba(0, 209, 178, 0.5)' }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { title: { display: true, text: 'Last Login (Days Ago)' }, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { title: { display: true, text: 'Watch Hours' }, grid: { color: 'rgba(255,255,255,0.05)' } }
          }
        }
      });
    }
  }

  // Update Dynamic Chart Data when Filters Change
  function updateCharts() {
    const data = state.filteredCustomers;

    // 1. Risk Tier Doughnut
    if (state.charts.risk) {
      const high = data.filter(c => c.churn_risk_segment === 'High Risk').length;
      const med = data.filter(c => c.churn_risk_segment === 'Medium Risk').length;
      const low = data.filter(c => c.churn_risk_segment === 'Low Risk').length;
      state.charts.risk.data.datasets[0].data = [high, med, low];
      state.charts.risk.update();
    }

    // 2. Plan Churn Bar Chart
    if (state.charts.plan) {
      const plans = ['Basic', 'Standard', 'Premium'];
      const rates = plans.map(p => {
        const sub = data.filter(c => c.subscription_type === p);
        const churned = sub.filter(c => c.predicted_churn_flag === 1).length;
        return sub.length > 0 ? (churned / sub.length) * 100 : 0;
      });
      state.charts.plan.data.datasets[0].data = rates.map(r => r.toFixed(1));
      state.charts.plan.update();
    }

    // 3. Payment Method Chart
    if (state.charts.payment) {
      const methods = ['Crypto', 'Gift Card', 'PayPal', 'Debit Card', 'Credit Card'];
      const rates = methods.map(m => {
        const sub = data.filter(c => c.payment_method === m);
        const churned = sub.filter(c => c.predicted_churn_flag === 1).length;
        return sub.length > 0 ? (churned / sub.length) * 100 : 0;
      });
      state.charts.payment.data.datasets[0].data = rates.map(r => r.toFixed(1));
      state.charts.payment.update();
    }

    // 4. Region Revenue Chart
    if (state.charts.region) {
      const regions = ['Africa', 'Asia', 'Europe', 'North America', 'Oceania', 'South America'];
      const revs = regions.map(r => {
        return data.filter(c => c.region === r).reduce((acc, c) => acc + (c.annual_revenue_at_risk || 0), 0);
      });
      state.charts.region.data.labels = regions;
      state.charts.region.data.datasets[0].data = revs;
      state.charts.region.update();
    }

    // 5. Scatter Chart
    if (state.charts.scatter) {
      const sample = data.slice(0, 300);
      const highPoints = sample.filter(c => c.churn_risk_segment === 'High Risk').map(c => ({ x: c.last_login_days, y: c.watch_hours }));
      const lowPoints = sample.filter(c => c.churn_risk_segment === 'Low Risk').map(c => ({ x: c.last_login_days, y: c.watch_hours }));

      state.charts.scatter.data.datasets[0].data = highPoints;
      state.charts.scatter.data.datasets[1].data = lowPoints;
      state.charts.scatter.update();
    }
  }
});
