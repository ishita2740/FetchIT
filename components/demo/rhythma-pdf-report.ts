import { RHYTHMA_DEMO_DATA } from './rhythma-data'

export function generateRhythmaPdfHtml(): string {
  const d = RHYTHMA_DEMO_DATA

  // Generate comparison table rows
  const tableRowsHtml = d.comparisonTable
    .map(
      (row) => `
    <tr>
      <td class="col-feature"><strong>${escapeHtml(row.feature)}</strong></td>
      <td class="col-rhythma highlight">${escapeHtml(row.rhythma)}</td>
      <td>${escapeHtml(row.flo)}</td>
      <td>${escapeHtml(row.clue)}</td>
      <td>${escapeHtml(row.maya)}</td>
      <td>${escapeHtml(row.naree)}</td>
      <td>${escapeHtml(row.healcycle)}</td>
    </tr>
  `
    )
    .join('')

  // Generate clean data-driven SVG bar charts (strictly no decorative images or emojis)
  const chart1Bars = d.charts[0].data
    .map(
      (item: any) => `
    <div class="chart-row">
      <div class="chart-label">${escapeHtml(item.label)}</div>
      <div class="chart-bar-wrap">
        <div class="chart-bar ${item.label === 'Rhythma' ? 'chart-bar-primary' : 'chart-bar-secondary'}" style="width: ${item.score}%;"></div>
      </div>
      <div class="chart-val">${item.score}%</div>
    </div>
  `
    )
    .join('')

  const chart3Bars = d.charts[2].data
    .map(
      (item: any) => `
    <div class="chart-row">
      <div class="chart-label">${escapeHtml(item.label)}</div>
      <div class="chart-bar-wrap">
        <div class="chart-bar ${item.label === 'Rhythma' ? 'chart-bar-primary' : 'chart-bar-secondary'}" style="width: ${item.score}%;"></div>
      </div>
      <div class="chart-val">${item.indianLanguages} langs (${item.score}/100)</div>
    </div>
  `
    )
    .join('')

  const techStackHtml = d.techStack
    .map(
      (cat) => `
    <div class="tech-group">
      <h4>${escapeHtml(cat.category)}</h4>
      <ul>
        ${cat.technologies
          .map(
            (t) => `
          <li><strong>${escapeHtml(t.name)}:</strong> ${escapeHtml(t.description)}</li>
        `
          )
          .join('')}
      </ul>
    </div>
  `
    )
    .join('')

  const insightsHtml = d.keyInsights
    .map(
      (ins) => `
    <div class="insight-block">
      <h4>${ins.number}. ${escapeHtml(ins.title)}</h4>
      <p>${escapeHtml(ins.content)}</p>
    </div>
  `
    )
    .join('')

  const sourcesHtml = d.sources
    .map(
      (s, idx) => `
    <li>
      <strong>${idx + 1}. ${escapeHtml(s.title)}</strong> [${escapeHtml(s.category)}]<br>
      <span class="url">${escapeHtml(s.url)}</span> - <em>${escapeHtml(s.notes)}</em>
    </li>
  `
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Rhythma - Women's Health Product & Market Intelligence</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 18mm 16mm 18mm 16mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1a1a1a;
      background: #ffffff;
      line-height: 1.5;
      font-size: 10pt;
      margin: 0;
      padding: 0;
    }
    .header {
      border-bottom: 2pt solid #0f766e;
      padding-bottom: 12pt;
      margin-bottom: 16pt;
    }
    .title {
      font-size: 22pt;
      font-weight: 800;
      letter-spacing: -0.5pt;
      color: #0f766e;
      margin: 0 0 4pt 0;
    }
    .tagline {
      font-size: 13pt;
      font-weight: 600;
      color: #374151;
      margin: 0 0 6pt 0;
    }
    .subtitle {
      font-size: 9.5pt;
      color: #4b5563;
      margin: 0 0 10pt 0;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6pt;
      font-size: 8.5pt;
      background: #f8fafc;
      border: 1pt solid #e2e8f0;
    }
    .meta-table td {
      padding: 4pt 8pt;
      border: 1pt solid #e2e8f0;
    }
    .meta-label {
      font-weight: 700;
      color: #475569;
      width: 18%;
    }
    h2 {
      font-size: 13pt;
      font-weight: 700;
      color: #0f766e;
      border-bottom: 1pt solid #cbd5e1;
      padding-bottom: 3pt;
      margin: 18pt 0 8pt 0;
      page-break-after: avoid;
    }
    h3 {
      font-size: 11pt;
      font-weight: 600;
      color: #1e293b;
      margin: 12pt 0 4pt 0;
      page-break-after: avoid;
    }
    h4 {
      font-size: 9.5pt;
      font-weight: 700;
      color: #334155;
      margin: 8pt 0 2pt 0;
    }
    p {
      margin: 0 0 6pt 0;
    }
    ul, ol {
      margin: 0 0 8pt 0;
      padding-left: 18pt;
    }
    li {
      margin-bottom: 3pt;
    }
    .page-break {
      page-break-before: always;
    }
    .callout {
      background: #f0fdf4;
      border-left: 3pt solid #0f766e;
      padding: 8pt 10pt;
      margin: 8pt 0 12pt 0;
      font-size: 9pt;
      color: #1e3a2f;
    }
    .comparison-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.5pt;
      margin: 10pt 0 14pt 0;
    }
    .comparison-table th, .comparison-table td {
      border: 0.5pt solid #cbd5e1;
      padding: 4pt 5pt;
      text-align: left;
      vertical-align: top;
    }
    .comparison-table th {
      background: #f1f5f9;
      font-weight: 700;
      color: #1e293b;
    }
    .comparison-table .col-feature {
      width: 15%;
      background: #f8fafc;
    }
    .comparison-table .col-rhythma {
      background: #f0fdfa;
      font-weight: 600;
      color: #0f766e;
      width: 18%;
    }
    .chart-container {
      margin: 10pt 0 16pt 0;
      padding: 10pt;
      background: #f8fafc;
      border: 1pt solid #e2e8f0;
      page-break-inside: avoid;
    }
    .chart-title {
      font-size: 9.5pt;
      font-weight: 700;
      margin-bottom: 2pt;
      color: #1e293b;
    }
    .chart-desc {
      font-size: 8pt;
      color: #64748b;
      margin-bottom: 8pt;
    }
    .chart-row {
      display: flex;
      align-items: center;
      margin-bottom: 5pt;
      font-size: 8pt;
    }
    .chart-label {
      width: 80pt;
      font-weight: 600;
      color: #334155;
    }
    .chart-bar-wrap {
      flex: 1;
      height: 11pt;
      background: #e2e8f0;
      margin: 0 8pt;
      position: relative;
    }
    .chart-bar {
      height: 100%;
    }
    .chart-bar-primary {
      background: #0f766e;
    }
    .chart-bar-secondary {
      background: #94a3b8;
    }
    .chart-val {
      width: 90pt;
      text-align: right;
      font-weight: 600;
      color: #475569;
    }
    .insight-block {
      margin-bottom: 8pt;
      page-break-inside: avoid;
    }
    .tech-group {
      margin-bottom: 6pt;
      page-break-inside: avoid;
    }
    .url {
      color: #0284c7;
      word-break: break-all;
    }
    .footer {
      margin-top: 24pt;
      border-top: 1pt solid #cbd5e1;
      padding-top: 8pt;
      font-size: 8pt;
      color: #64748b;
      display: flex;
      justify-content: space-between;
    }
    .no-print-bar {
      background: #0f766e;
      color: #ffffff;
      padding: 10pt 16pt;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 1000;
      box-shadow: 0 2pt 4pt rgba(0,0,0,0.1);
    }
    .print-btn {
      background: #ffffff;
      color: #0f766e;
      border: none;
      padding: 6pt 14pt;
      font-weight: 700;
      border-radius: 4pt;
      cursor: pointer;
    }
    @media print {
      .no-print-bar {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <span><strong>FetchIT Executive Intelligence Dossier</strong> &bull; Rhythma Product & Market Research</span>
    <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
  </div>

  <div style="padding: 16pt;">
    <!-- HEADER -->
    <div class="header">
      <div class="title">${escapeHtml(d.header.title)}</div>
      <div class="tagline">${escapeHtml(d.header.tagline)}</div>
      <div class="subtitle">${escapeHtml(d.header.subtitle)}</div>

      <table class="meta-table">
        <tr>
          <td class="meta-label">Research Type</td>
          <td>${escapeHtml(d.header.metadata.researchType)}</td>
          <td class="meta-label">Domain</td>
          <td>${escapeHtml(d.header.metadata.domain)}</td>
        </tr>
        <tr>
          <td class="meta-label">Repository</td>
          <td>${escapeHtml(d.header.metadata.repository)}</td>
          <td class="meta-label">Scope</td>
          <td>${escapeHtml(d.header.metadata.researchOutput)}</td>
        </tr>
      </table>
    </div>

    <!-- AI EXPLAINABILITY & PERSONALIZATION -->
    <h2>1. Executive Summary & AI Explainability</h2>
    <p><strong>What FetchIT Understood:</strong> ${escapeHtml(d.aiExplainability.lead)}</p>
    <ul>
      ${d.aiExplainability.objectives
        .map(
          (o) => `
        <li><strong>${o.number}. ${escapeHtml(o.title)}:</strong> ${escapeHtml(o.description)}</li>
      `
        )
        .join('')}
    </ul>

    <div class="callout">
      <strong>Personalized for Your Request:</strong> ${escapeHtml(d.aiExplainability.personalization.lead)}<br>
      <em>${escapeHtml(d.aiExplainability.personalization.details)}</em>
    </div>

    <!-- RHYTHMA PRODUCT DEFINITION -->
    <h2>2. Rhythma Product Definition</h2>
    <p><strong>Overview:</strong> ${escapeHtml(d.glance.whatIs)}</p>
    <p><strong>Problem Addressed:</strong> ${escapeHtml(d.glance.problemAddressed)}</p>
    <p><strong>Target Personas:</strong> ${escapeHtml(d.glance.targetUsers)}</p>
    <p><strong>Proposed Solution:</strong> ${escapeHtml(d.glance.proposedSolution)}</p>
    <p><strong>Current Development Status:</strong> ${escapeHtml(d.glance.currentStatus)}</p>

    <h3>Core Problem Drivers in Target Demographics</h3>
    <ul>
      ${d.problem.points
        .map(
          (pt) => `
        <li><strong>${escapeHtml(pt.title)}:</strong> ${escapeHtml(pt.description)}</li>
      `
        )
        .join('')}
    </ul>

    <h3>Solution Pillars</h3>
    <ul>
      ${d.solution.pillars
        .map(
          (pil) => `
        <li><strong>${escapeHtml(pil.title)}:</strong> ${escapeHtml(pil.detail)}</li>
      `
        )
        .join('')}
    </ul>

    <div class="page-break"></div>

    <!-- STRATEGIC DIFFERENTIATION -->
    <h2>3. Strategic Differentiation</h2>
    <p>${escapeHtml(d.differentiation.lead)}</p>
    <ul>
      ${d.differentiation.differentiators
        .map(
          (diff) => `
        <li><strong>${escapeHtml(diff.area)}:</strong> ${escapeHtml(diff.rhythmaApproach)} (Versus industry standard: <em>${escapeHtml(diff.industryStandard)}</em>)</li>
      `
        )
        .join('')}
    </ul>

    <!-- TECHNOLOGY STACK -->
    <h2>4. Architectural & Technology Stack</h2>
    ${techStackHtml}

    <div class="page-break"></div>

    <!-- COMPETITOR COMPARISON TABLE -->
    <h2>5. Competitive Benchmark Matrix</h2>
    <p>Direct comparison against prominent international and regional solutions across 15 documented capability dimensions:</p>

    <table class="comparison-table">
      <thead>
        <tr>
          <th>Capability / Feature</th>
          <th style="background:#ccfbf1; color:#0f766e;">Rhythma (Target)</th>
          <th>Flo (Global)</th>
          <th>Clue (EU)</th>
          <th>Maya (India)</th>
          <th>Naree (Regional)</th>
          <th>HealCycle (Clinical)</th>
        </tr>
      </thead>
      <tbody>
        ${tableRowsHtml}
      </tbody>
    </table>

    <div class="page-break"></div>

    <!-- DATA-DRIVEN CHARTS & GRAPHS -->
    <h2>6. Data-Driven Capability Charts</h2>

    <div class="chart-container">
      <div class="chart-title">Chart 1: Documented Feature Coverage Across Competitors (%)</div>
      <div class="chart-desc">${escapeHtml(d.charts[0].description)}</div>
      ${chart1Bars}
    </div>

    <div class="chart-container">
      <div class="chart-title">Chart 2: Indian Language & Accessibility Coverage</div>
      <div class="chart-desc">${escapeHtml(d.charts[2].description)}</div>
      ${chart3Bars}
    </div>

    <div class="chart-container">
      <div class="chart-title">Chart 3: Privacy & Edge Computing Metric (0–100)</div>
      <div class="chart-desc">Relative assessment of on-device processing and zero-cloud dependency.</div>
      <div class="chart-row"><div class="chart-label">Rhythma</div><div class="chart-bar-wrap"><div class="chart-bar chart-bar-primary" style="width: 100%;"></div></div><div class="chart-val">100 / 100</div></div>
      <div class="chart-row"><div class="chart-label">Clue</div><div class="chart-bar-wrap"><div class="chart-bar chart-bar-secondary" style="width: 60%;"></div></div><div class="chart-val">60 / 100</div></div>
      <div class="chart-row"><div class="chart-label">Maya</div><div class="chart-bar-wrap"><div class="chart-bar chart-bar-secondary" style="width: 40%;"></div></div><div class="chart-val">40 / 100</div></div>
      <div class="chart-row"><div class="chart-label">Flo</div><div class="chart-bar-wrap"><div class="chart-bar chart-bar-secondary" style="width: 25%;"></div></div><div class="chart-val">25 / 100</div></div>
    </div>

    <!-- KEY INSIGHTS -->
    <h2>7. Key Strategic Insights</h2>
    ${insightsHtml}

    <div class="page-break"></div>

    <!-- STATUS & ROADMAP -->
    <h2>8. Repository Implementation Status & Improvement Roadmap</h2>
    <h3>Implemented Capabilities (Verified in Codebase)</h3>
    <ul>
      ${d.alreadyAchieved.implemented
        .map(
          (imp) => `
        <li><strong>${escapeHtml(imp.feature)}:</strong> ${escapeHtml(imp.detail)}</li>
      `
        )
        .join('')}
    </ul>

    <h3>Areas for Targeted Improvement</h3>
    <h4>High Priority</h4>
    <ul>
      ${d.whatToImprove.highPriority
        .map(
          (hp) => `
        <li><strong>${escapeHtml(hp.opportunity)}:</strong> ${escapeHtml(hp.whyItMatters)}<br>
        <em>Benchmark:</em> ${escapeHtml(hp.competitorBenchmark)} | <em>Execution:</em> ${escapeHtml(hp.implementationPath)}</li>
      `
        )
        .join('')}
    </ul>

    <h4>Suggested Product Roadmap</h4>
    <ul>
      ${d.productRoadmap.stages
        .map(
          (stg) => `
        <li><strong>${escapeHtml(stg.phase)} (${escapeHtml(stg.timeframe)}) - ${escapeHtml(stg.theme)}:</strong>
          <ul>
            ${stg.goals.map((g) => `<li>${escapeHtml(g)}</li>`).join('')}
          </ul>
        </li>
      `
        )
        .join('')}
    </ul>

    <!-- SOURCES -->
    <h2>9. Research Sources & Citations</h2>
    <ul>
      ${sourcesHtml}
    </ul>

    <div class="footer">
      <span>Generated by FetchIT Autonomous Research Platform</span>
      <span>Confidential &bull; Prepared for Rhythma Strategic Analysis</span>
    </div>
  </div>

  <script>
    window.addEventListener('load', function() {
      // Auto-trigger print if requested via query param
      if (window.location.search.includes('print=true')) {
        setTimeout(function() { window.print(); }, 400);
      }
    });
  </script>
</body>
</html>`
}

function escapeHtml(str: string): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
