importScripts('https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js');

class OptimizedProcessor {
  constructor() {
    this.experiments = new Map();
    this.processedRows = 0;
    this.batchBuffer = [];
    this.batchSize = 5000; 
    this.progressInterval = 10000; 
    this.aborted = false;
  }

  processRow(row) {
    if (this.aborted) return false;

    const expId = row.experiment_id || row.exp_id || row.id || row.experiment;
    const metricName = row.metric_name || row.metric || row.name;
    const step = +(row.step || row.epoch || row.iteration || 0);
    const value = +(row.value || row.val || row.score || 0);

    if (!expId || !metricName || !Number.isFinite(step) || !Number.isFinite(value)) {
      return true;
    }

    this.batchBuffer.push([expId, metricName, step, value]);
    this.processedRows++;

    if (this.batchBuffer.length >= this.batchSize) {
      this.processBatch();
    }

    if (this.processedRows % this.progressInterval === 0) {
      self.postMessage({
        type: 'progress',
        processed: this.processedRows
      });
    }

    return true;
  }

  processBatch() {
    if (this.aborted) return;

    for (const [expId, metricName, step, value] of this.batchBuffer) {
      let exp = this.experiments.get(expId);
      if (!exp) {
        exp = { id: expId, metrics: new Map() };
        this.experiments.set(expId, exp);
      }

      let metricData = exp.metrics.get(metricName);
      if (!metricData) {
        metricData = { data: [] };
        exp.metrics.set(metricName, metricData);
      }

      metricData.data.push([step, value]);
    }

    this.batchBuffer.length = 0;
  }

  getResults() {
    if (this.aborted) return [];

    if (this.batchBuffer.length > 0) {
      this.processBatch();
    }

    const results = [];
    
    this.experiments.forEach(exp => {
      const metrics = [];
      exp.metrics.forEach((metricData, name) => {
        metricData.data.sort((a, b) => a[0] - b[0]);
        
        metrics.push({
          name,
          data: metricData.data
        });
      });

      if (metrics.length > 0) {
        results.push({
          id: exp.id,
          name: exp.id,
          metrics,
          selected: true
        });
      }
    });

    return results;
  }

  abort() {
    this.aborted = true;
  }

  cleanup() {
    this.experiments.clear();
    this.batchBuffer.length = 0;
    
    if (self.gc) {
      self.gc();
    }
  }
}

let processor = null;
let abortController = null;

self.onmessage = function(e) {
  try {
    const { command, content, chunkSize = 100000 } = e.data;
    
    if (command === 'abort') {
      if (processor) {
        processor.abort();
      }
      if (abortController) {
        abortController.abort();
      }
      self.postMessage({ type: 'aborted' });
      return;
    }

    if (!content) {
      self.postMessage({
        type: 'error',
        error: 'No content provided'
      });
      return;
    }
    
    processor = new OptimizedProcessor();
    abortController = new AbortController();

    const parseConfig = {
      header: true,
      skipEmptyLines: true,
      chunkSize,
      worker: false,
      fastMode: true,
      comments: '#',
      dynamicTyping: false,

      step: (row, parser) => {
        if (abortController.signal.aborted || processor.aborted) {
          parser.abort();
          return;
        }

        if (row.errors.length === 0) {
          const shouldContinue = processor.processRow(row.data);
          if (!shouldContinue) {
            parser.abort();
          }
        }
      },

      complete: () => {
        if (processor.aborted || abortController.signal.aborted) {
          self.postMessage({ type: 'aborted' });
          return;
        }

        try {
          const results = processor.getResults();
          
          self.postMessage({
            type: 'complete',
            data: results,
            processed: processor.processedRows
          });
          
          processor.cleanup();
          processor = null;
          abortController = null;
          
        } catch (error) {
          self.postMessage({
            type: 'error',
            error: 'Processing error: ' + error.message
          });
        }
      },

      error: (error) => {
        if (!processor.aborted && !abortController.signal.aborted) {
          self.postMessage({
            type: 'error',
            error: 'Parsing error: ' + (error.message || 'Unknown parsing error')
          });
        }
        
        if (processor) {
          processor.cleanup();
          processor = null;
        }
        abortController = null;
      }
    };

    Papa.parse(content, parseConfig);

  } catch (error) {
    self.postMessage({
      type: 'error',
      error: 'Worker error: ' + (error.message || 'Unknown error')
    });
    
    if (processor) {
      processor.cleanup();
      processor = null;
    }
    abortController = null;
  }
};