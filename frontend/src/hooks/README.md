# Web Worker Background Processing

This directory contains the implementation for background violation processing using Web Workers to prevent UI blocking.

## Overview

The violations processing system uses Web Workers to move heavy geospatial calculations off the main thread, ensuring smooth UI performance even when processing hundreds of vessels with complex violation detection algorithms.

## Architecture

### Main Components

1. **`useViolationsWorker.ts`** - React hook that manages the Web Worker lifecycle
2. **`/public/workers/violations-worker.js`** - Web Worker that performs the actual calculations
3. **`ProcessingIndicator.tsx`** - UI component showing processing progress

### Processing Flow

```
Main Thread                    Web Worker Thread
-----------                    -----------------
Data Changes Detected     →
useEffect Triggers        →
processViolations()       →   postMessage(vessels, boundaries)
                          ←   Progress Updates (batched)
UI Shows Progress         ←
                          ←   Final Results
Update vessel states      ←
Hide progress indicator   ←
```

## Features

### ✅ Non-blocking Processing
- Heavy geospatial calculations run in background
- UI remains responsive during processing
- Progress updates keep users informed

### ✅ Batch Processing
- Processes vessels in batches of 50
- Prevents worker thread blocking
- Provides granular progress feedback

### ✅ Fallback Support
- Graceful degradation if workers unavailable
- Synchronous processing for small datasets (≤10 vessels)
- Error handling and user feedback

### ✅ Performance Optimized
- Uses CDN-loaded Turf.js in worker context
- Minimizes data transfer between threads
- Efficient progress reporting

## Usage

```typescript
import { useViolationsWorker } from '@/hooks/useViolationsWorker';

function MyComponent() {
  const {
    processViolations,
    violations,
    isProcessing,
    progress,
    error,
    clearError
  } = useViolationsWorker();

  // Trigger processing
  useEffect(() => {
    processViolations(vessels, parkBoundaries, bufferedBoundaries, posidoniaData);
  }, [vessels]);

  // Show processing indicator
  return (
    <div>
      {isProcessing && <ProcessingIndicator progress={progress} />}
      {/* Your UI */}
    </div>
  );
}
```

## Worker Messages

### Input Messages
```javascript
{
  type: 'PROCESS_VIOLATIONS',
  data: {
    vessels: VesselData[],
    parkBoundaries: GeoJSON.FeatureCollection,
    bufferedBoundaries: GeoJSON.FeatureCollection,
    posidoniaData: GeoJSON.FeatureCollection,
    shoreline?: GeoJSON.FeatureCollection
  }
}
```

### Output Messages
```javascript
// Progress Update
{
  type: 'PROGRESS',
  data: {
    processed: number,
    total: number,
    percentage: number
  }
}

// Final Results
{
  type: 'VIOLATIONS_PROCESSED',
  data: VesselViolations[]
}

// Error
{
  type: 'ERROR',
  data: {
    message: string,
    stack?: string
  }
}
```

## Performance Benefits

### Before (Synchronous)
- 🔴 UI freezes during processing
- 🔴 400+ vessels = 2-3 second freeze
- 🔴 No progress feedback
- 🔴 Poor user experience

### After (Web Worker)
- ✅ UI remains responsive
- ✅ Background processing
- ✅ Real-time progress updates
- ✅ Smooth user experience

## Browser Compatibility

- ✅ All modern browsers support Web Workers
- ✅ Fallback for unsupported environments
- ✅ Progressive enhancement approach

## Troubleshooting

### Worker Not Loading
- Check `/public/workers/violations-worker.js` exists
- Verify CORS/security policies
- Check browser console for worker errors

### Performance Issues
- Adjust batch size in worker (default: 50)
- Monitor memory usage with large datasets
- Consider implementing result caching

### Debug Mode
Enable worker debugging by adding to worker:
```javascript
const DEBUG = true;
if (DEBUG) console.log('Processing batch:', batchNumber);
```