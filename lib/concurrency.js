/**
 * Runs tasks with a maximum concurrency limit.
 * @param {Array} items - The items to process
 * @param {number} limit - Maximum number of concurrent tasks
 * @param {Function} taskFn - The function to run for each item
 * @returns {Promise<Array>} - The results of all tasks
 */
export async function runWithConcurrency(items, limit, taskFn) {
    const results = [];
    const executing = new Set();
    
    for (const item of items) {
        const promise = Promise.resolve().then(() => taskFn(item, items.indexOf(item)));
        results.push(promise);
        executing.add(promise);
        
        const cleanPromise = promise.then(() => executing.delete(promise));
        
        if (executing.size >= limit) {
            await Promise.race(executing);
        }
    }
    
    return Promise.all(results);
}

/**
 * Retries a function with exponential backoff.
 * @param {Function} fn - The function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delay - Initial delay in ms
 * @returns {Promise<any>}
 */
export async function withRetry(fn, maxRetries = 3, delay = 1000) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            console.warn(`Attempt ${i + 1} failed: ${error.message}. Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Exponential backoff
        }
    }
    
    throw lastError;
}
