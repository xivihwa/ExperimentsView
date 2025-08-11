# ExperimentsView

A web application for uploading, viewing, and comparing machine learning experiment logs.

**Demo:** [experiments-view.vercel.app](https://experiments-view.vercel.app/)

---

## Description

ExperimentsView allows you to upload CSV files containing training logs and interactively view metric charts.  
It expects CSV data in the following format (example):

| experiment_id | metric_name | step | value |
|---------------|-------------|------|-------|
| exp_001       | accuracy    | 1    | 0.65  |
| exp_001       | accuracy    | 2    | 0.72  |
| exp_001       | loss        | 1    | 1.25  |
| exp_001       | loss        | 2    | 0.98  |
| exp_002       | accuracy    | 1    | 0.58  |

**Columns:**
- `experiment_id` — unique identifier of the experiment
- `metric_name` — name of the metric
- `step` — training step
- `value` — numeric value of the metric

---

## Running Locally

**Requirements:** Node.js 16+

```bash
# Clone the repository
git clone https://github.com/xivihwa/ExperimentsView.git
cd ExperimentsView

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
