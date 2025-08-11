export class StreamingCsvParser {
  constructor() {
    this.worker = null;
    this.abortController = null;
  }

  async parseFile(file, options = {}) {
    const {
      onProgress = () => {},
      onError = () => {},
      chunkSizeMB = 10,
      maxMemoryMB = 100
    } = options;

    return new Promise((resolve, reject) => {
      this.abortController = new AbortController();
      
      if (!window.Worker) {
        reject(new Error('Web Workers are not supported in this browser'));
        return;
      }

      try {
        this.worker = new Worker(new URL('./csv.worker.js', import.meta.url));
      } catch (error) {
        reject(new Error('Failed to create CSV worker: ' + error.message));
        return;
      }
      
      this.worker.onmessage = (e) => {
        const { type, data, processed, error } = e.data;
        
        switch (type) {
          case 'progress':
            onProgress(processed);
            break;
            
          case 'complete':
            this.cleanup();
            resolve(data || []);
            break;
            
          case 'error':
            this.cleanup();
            const errorObj = new Error(error || 'CSV processing failed');
            onError(errorObj);
            reject(errorObj);
            break;
            
          case 'aborted':
            this.cleanup();
            reject(new DOMException('Aborted', 'AbortError'));
            break;
        }
      };

      this.worker.onerror = (error) => {
        this.cleanup();
        const errorObj = new Error('Worker error: ' + error.message);
        onError(errorObj);
        reject(errorObj);
      };

      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > maxMemoryMB * 2) {
        this.parseFileInStreams(file, onProgress).then(resolve).catch(reject);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        if (this.abortController?.signal.aborted) {
          reject(new DOMException('Aborted', 'AbortError'));
          return;
        }

        const chunkSize = Math.max(50000, Math.min(200000, Math.floor(file.size / 100)));
        
        if (this.worker) {
          this.worker.postMessage({
            content: e.target.result,
            chunkSize
          });
        }
      };

      reader.onerror = () => {
        this.cleanup();
        reject(new Error('Failed to read file'));
      };

      if (this.abortController.signal.aborted) {
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }

      reader.readAsText(file);
    });
  }

  async parseFileInStreams(file, onProgress) {
    const CHUNK_SIZE = 5 * 1024 * 1024; 
    const experiments = new Map();
    let processedRows = 0;
    let offset = 0;
    let remainder = '';
    let isFirstChunk = true;

    while (offset < file.size && !this.abortController?.signal.aborted) {
      const chunk = file.slice(offset, offset + CHUNK_SIZE);
      const text = await this.readChunk(chunk);
      
      const fullText = remainder + text;
      const lines = fullText.split('\n');
      remainder = lines.pop() || ''; 
      
      const chunkRows = this.parseLines(lines, isFirstChunk);
      this.mergeExperiments(experiments, chunkRows);
      
      processedRows += chunkRows.length;
      offset += CHUNK_SIZE;
      isFirstChunk = false;
      
      onProgress(processedRows);
      
      await this.sleep(10);
    }

    if (this.abortController?.signal.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    if (remainder.trim()) {
      const lastRows = this.parseLines([remainder], false);
      this.mergeExperiments(experiments, lastRows);
    }

    return this.convertToResults(experiments);
  }

  readChunk(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(blob);
    });
  }

  parseLines(lines, isFirst) {
    const results = [];
    const startIndex = isFirst ? 1 : 0; 

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(',').map(part => part.trim().replace(/^"(.*)"$/, '$1'));
      if (parts.length >= 4) {
        const expId = parts[0];
        const metricName = parts[1];
        const step = +parts[2];
        const value = +parts[3];

        if (expId && metricName && Number.isFinite(step) && Number.isFinite(value)) {
          results.push({ expId, metricName, step, value });
        }
      }
    }

    return results;
  }

  mergeExperiments(experiments, rows) {
    for (const { expId, metricName, step, value } of rows) {
      let exp = experiments.get(expId);
      if (!exp) {
        exp = { id: expId, metrics: new Map() };
        experiments.set(expId, exp);
      }

      let metric = exp.metrics.get(metricName);
      if (!metric) {
        metric = [];
        exp.metrics.set(metricName, metric);
      }

      metric.push([step, value]);
    }
  }

  convertToResults(experiments) {
    const results = [];
    
    experiments.forEach(exp => {
      const metrics = [];
      exp.metrics.forEach((data, name) => {
        data.sort((a, b) => a[0] - b[0]);
        metrics.push({ name, data });
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

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  abort() {
    if (this.abortController) {
      this.abortController.abort();
    }
    
    if (this.worker) {
      this.worker.postMessage({ command: 'abort' });
    }
    
    this.cleanup();
  }

  cleanup() {
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch (e) {
        console.error('Error terminating worker:', e);
      }
      this.worker = null;
    }
    
    this.abortController = null;
  }
}

export class PerformanceMonitor {
  constructor() {
    this.startTime = 0;
    this.checkpoints = [];
  }

  start() {
    this.startTime = performance.now();
    this.checkpoints = [];
    this.logMemory('Start');
  }

  checkpoint(label) {
    const now = performance.now();
    this.checkpoints.push({
      label,
      time: now - this.startTime,
      memory: this.getMemoryInfo()
    });
    console.log(`${label}: ${Math.round(now - this.startTime)}ms`);
    this.logMemory(label);
  }

  getMemoryInfo() {
    if (performance.memory) {
      return {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
      };
    }
    return null;
  }

  logMemory(label) {
    const memory = this.getMemoryInfo();
    if (memory) {
      console.log(`${label} - Memory: ${memory.used}MB / ${memory.total}MB (limit: ${memory.limit}MB)`);
    }
  }

  getSummary() {
    return {
      totalTime: this.checkpoints.length > 0 ? 
        this.checkpoints[this.checkpoints.length - 1].time : 0,
      checkpoints: this.checkpoints
    };
  }
}

export const parseMetricsCsv = async (file, onProgress, abortSignal) => {
  const parser = new StreamingCsvParser();
  
  if (abortSignal) {
    abortSignal.addEventListener('abort', () => {
      parser.abort();
    });
  }
  
  return parser.parseFile(file, { onProgress });
};