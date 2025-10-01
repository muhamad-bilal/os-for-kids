import { useState, useEffect } from 'react';
import { GanttChart, BarChart3, AlertCircle } from 'lucide-react';

const SortingVisualizer = () => {
    const [array, setArray] = useState<number[]>([]);
    const [sorting, setSorting] = useState(false);
    const [algorithm, setAlgorithm] = useState('parallel-quick');
    const [speed, setSpeed] = useState(50);
    const [size, setSize] = useState(50);
    const [comparisons, setComparisons] = useState(0);
    const [swaps, setSwaps] = useState(0);
    const [highlightedLine, setHighlightedLine] = useState<number>(0);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'visualization' | 'theory' | 'examples'>('visualization');

    const algorithmCodes = {
        'parallel-quick': `// Parallel Quick Sort in C
void parallelQuickSort(int *arr, int low, int high) {
    if (low < high) {
        #pragma omp parallel
        {
            #pragma omp single nowait
            {
                int pivot = partition(arr, low, high);
                
                #pragma omp task
                parallelQuickSort(arr, low, pivot - 1);
                
                #pragma omp task
                parallelQuickSort(arr, pivot + 1, high);
            }
        }
    }
}

int partition(int *arr, int low, int high) {
    int pivot = arr[high];
    int i = low - 1;
    
    for (int j = low; j < high; j++) {
        if (arr[j] < pivot) {
            i++;
            swap(&arr[i], &arr[j]);
        }
    }
    swap(&arr[i + 1], &arr[high]);
    return (i + 1);
}`,
        'parallel-merge': `// Parallel Merge Sort in C
void parallelMergeSort(int *arr, int left, int right) {
    if (left < right) {
        int mid = left + (right - left) / 2;
        
        #pragma omp parallel sections
        {
            #pragma omp section
            parallelMergeSort(arr, left, mid);
            
            #pragma omp section
            parallelMergeSort(arr, mid + 1, right);
        }
        
        merge(arr, left, mid, right);
    }
}

void merge(int *arr, int left, int mid, int right) {
    int leftSize = mid - left + 1;
    int rightSize = right - mid;
    
    int *leftArr = (int*)malloc(leftSize * sizeof(int));
    int *rightArr = (int*)malloc(rightSize * sizeof(int));
    
    for (int i = 0; i < leftSize; i++)
        leftArr[i] = arr[left + i];
    for (int j = 0; j < rightSize; j++)
        rightArr[j] = arr[mid + 1 + j];
    
    int i = 0, j = 0, k = left;
    
    while (i < leftSize && j < rightSize) {
        if (leftArr[i] <= rightArr[j])
            arr[k++] = leftArr[i++];
        else
            arr[k++] = rightArr[j++];
    }
    
    while (i < leftSize)
        arr[k++] = leftArr[i++];
    
    while (j < rightSize)
        arr[k++] = rightArr[j++];
    
    free(leftArr);
    free(rightArr);
}`,
        'parallel-bucket': `// Parallel Bucket Sort in C
void parallelBucketSort(int *arr, int n) {
    #pragma omp parallel
    {
        // Determine number of buckets and local bucket size
        int threadCount = omp_get_num_threads();
        int bucketCount = threadCount;
        int *bucketSizes = (int*)calloc(bucketCount, sizeof(int));
        
        // Distribute elements across buckets
        #pragma omp for
        for (int i = 0; i < n; i++) {
            int bucketIndex = arr[i] * bucketCount / (100 + 1);
            bucketSizes[bucketIndex]++;
        }
        
        // Allocate bucket memory
        int **buckets = (int**)malloc(bucketCount * sizeof(int*));
        int *bucketIndices = (int*)calloc(bucketCount, sizeof(int));
        
        for (int i = 0; i < bucketCount; i++) {
            buckets[i] = (int*)malloc(bucketSizes[i] * sizeof(int));
        }
        
        // Distribute elements into buckets
        #pragma omp for
        for (int i = 0; i < n; i++) {
            int bucketIndex = arr[i] * bucketCount / (100 + 1);
            int localIndex;
            
            #pragma omp atomic capture
            localIndex = bucketIndices[bucketIndex]++;
            
            buckets[bucketIndex][localIndex] = arr[i];
        }
        
        // Sort individual buckets
        #pragma omp for
        for (int i = 0; i < bucketCount; i++) {
            quickSort(buckets[i], 0, bucketSizes[i] - 1);
        }
        
        // Merge buckets back into original array
        #pragma omp single
        {
            int index = 0;
            for (int i = 0; i < bucketCount; i++) {
                for (int j = 0; j < bucketSizes[i]; j++) {
                    arr[index++] = buckets[i][j];
                }
                free(buckets[i]);
            }
            free(buckets);
            free(bucketSizes);
            free(bucketIndices);
        }
    }
}

void quickSort(int *arr, int low, int high) {
    if (low < high) {
        int pivot = partition(arr, low, high);
        quickSort(arr, low, pivot - 1);
        quickSort(arr, pivot + 1, high);
    }
}

int partition(int *arr, int low, int high) {
    int pivot = arr[high];
    int i = low - 1;
    
    for (int j = low; j < high; j++) {
        if (arr[j] < pivot) {
            i++;
            swap(&arr[i], &arr[j]);
        }
    }
    swap(&arr[i + 1], &arr[high]);
    return (i + 1);
}

void swap(int *a, int *b) {
    int temp = *a;
    *a = *b;
    *b = temp;
}`
    };



    const generateArray = () => {
        const newArray = Array.from({ length: size }, () =>
            Math.floor(Math.random() * 100) + 1
        );
        setArray(newArray);
        setComparisons(0);
        setSwaps(0);
    };

    useEffect(() => {
        generateArray();
    }, [size]);

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const parallelQuickSort = async (arr: number[], start: number, end: number) => {
        if (start >= end) return;

        setHighlightedLine(2);
        let pivot = arr[end];
        let i = start - 1;

        for (let j = start; j < end; j++) {
            setHighlightedLine(8);
            setComparisons(prev => prev + 1);
            await delay(100 - speed);

            if (arr[j] < pivot) {
                i++;
                setHighlightedLine(10);
                setSwaps(prev => prev + 1);
                [arr[i], arr[j]] = [arr[j], arr[i]];
                setArray([...arr]);
            }
        }

        setHighlightedLine(14);
        [arr[i + 1], arr[end]] = [arr[end], arr[i + 1]];
        setArray([...arr]);

        await Promise.all([
            parallelQuickSort(arr, start, i),
            parallelQuickSort(arr, i + 2, end)
        ]);
    };

    const parallelMergeSort = async (arr: number[], start: number, end: number) => {
        if (start >= end) return;

        const mid = Math.floor((start + end) / 2);
        setHighlightedLine(3);
        await Promise.all([
            parallelMergeSort(arr, start, mid),
            parallelMergeSort(arr, mid + 1, end)
        ]);

        await merge(arr, start, mid, end);
    };

    const merge = async (arr: number[], start: number, mid: number, end: number) => {
        const left = arr.slice(start, mid + 1);
        const right = arr.slice(mid + 1, end + 1);
        let i = 0, j = 0, k = start;

        while (i < left.length && j < right.length) {
            setHighlightedLine(18);
            setComparisons(prev => prev + 1);
            await delay(100 - speed);

            if (left[i] <= right[j]) {
                arr[k] = left[i];
                i++;
            } else {
                arr[k] = right[j];
                j++;
            }
            setSwaps(prev => prev + 1);
            setArray([...arr]);
            k++;
        }

        while (i < left.length) {
            arr[k] = left[i];
            setArray([...arr]);
            i++;
            k++;
            await delay(100 - speed);
        }

        while (j < right.length) {
            arr[k] = right[j];
            setArray([...arr]);
            j++;
            k++;
            await delay(100 - speed);
        }
    };

    const parallelBucketSort = async (arr: number[]) => {
        const n = arr.length;
        const bucketCount = 5; // Number of buckets
        const buckets: number[][] = Array.from({ length: bucketCount }, () => []);

        // Distribute elements into buckets
        for (let i = 0; i < n; i++) {
            const bucketIndex = Math.floor(arr[i] * bucketCount / 101);
            buckets[bucketIndex].push(arr[i]);
        }

        // Sort each bucket
        for (let i = 0; i < bucketCount; i++) {
            buckets[i].sort((a, b) => a - b);
            setHighlightedLine(14);
            await delay(100 - speed);
        }

        // Merge buckets back into original array
        let index = 0;
        for (let i = 0; i < bucketCount; i++) {
            for (let j = 0; j < buckets[i].length; j++) {
                arr[index] = buckets[i][j];
                index++;
                setSwaps(prev => prev + 1);
                setArray([...arr]);
                await delay(100 - speed);
            }
        }
    };

    const startSort = async () => {
        setSorting(true);
        const arrCopy = [...array];

        try {
            switch (algorithm) {
                case 'parallel-quick':
                    await parallelQuickSort(arrCopy, 0, arrCopy.length - 1);
                    break;
                case 'parallel-merge':
                    await parallelMergeSort(arrCopy, 0, arrCopy.length - 1);
                    break;
                case 'parallel-bucket':
                    await parallelBucketSort(arrCopy);
                    break;
            }
        } catch (error) {
            console.error('Sorting error:', error);
        }

        setSorting(false);
    };

    const getBarColor = (value: number) => {
        // Theme-consistent gradient from dark to brand color
        const intensity = value / 100;
        const r = Math.floor(16 + (34 - 16) * intensity);  // 16 to 34 (dark to green)
        const g = Math.floor(185 + (197 - 185) * intensity); // 185 to 197
        const b = Math.floor(129 + (94 - 129) * intensity);  // 129 to 94
        return `rgb(${r}, ${g}, ${b})`;
    };

    return (
        <div className="dark">
            <div className="w-full min-h-screen bg-gradient-to-br from-(--brand-start) via-(--brand-via) to-(--brand-end) px-6 py-10">
                <div className="max-w-6xl mx-auto">
                    <h1 className="text-4xl md:text-5xl font-bold text-brand-primary mb-8 text-center">
                        Multithreaded Sorting Visualizer
                    </h1>

                {/* Navigation Tabs */}
                <div className="flex justify-center mb-8">
                    <div className="inline-flex rounded-lg bg-surface-secondary/70 backdrop-blur-sm border border-border p-1">
                        <button
                            onClick={() => setActiveTab('visualization')}
                            className={`px-6 py-2 rounded-md transition-all duration-200 ${
                                activeTab === 'visualization' 
                                    ? 'bg-brand-primary/20 text-brand-primary shadow-lg' 
                                    : 'text-muted-foreground hover:bg-accent'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <GanttChart className="h-5 w-5" />
                                Visualization
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('theory')}
                            className={`px-6 py-2 rounded-md transition-all duration-200 ${
                                activeTab === 'theory' 
                                    ? 'bg-brand-primary/20 text-brand-primary shadow-lg' 
                                    : 'text-muted-foreground hover:bg-accent'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <BarChart3 className="h-5 w-5" />
                                Theory
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('examples')}
                            className={`px-6 py-2 rounded-md transition-all duration-200 ${
                                activeTab === 'examples' 
                                    ? 'bg-brand-primary/20 text-brand-primary shadow-lg' 
                                    : 'text-muted-foreground hover:bg-accent'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <AlertCircle className="h-5 w-5" />
                                Examples
                            </div>
                        </button>
                    </div>
                </div>

                {activeTab === 'visualization' && (
                <>
                {/* Controls Section */}
                <div className="flex flex-wrap gap-4 mb-8">
                    <div className="relative">
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="px-4 py-2 bg-accent border border-border rounded-lg text-foreground flex items-center justify-between gap-3 min-w-[200px] hover:bg-brand-primary/20 transition-all duration-200"
                        >
                            <span>{algorithm === "parallel-quick" ? "Parallel Quick Sort" :
                                algorithm === "parallel-merge" ? "Parallel Merge Sort" :
                                    "Parallel Bucket Sort"}</span>
                            <svg 
                                className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        <div className={`absolute top-full left-0 w-full mt-1 bg-surface-secondary/95 backdrop-blur-sm border border-border rounded-lg overflow-hidden z-10 shadow-xl transition-all duration-200 origin-top ${
                            isDropdownOpen ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0 pointer-events-none'
                        }`}>
                            {["parallel-quick", "parallel-merge", "parallel-bucket"].map((algo) => (
                                <button
                                    key={algo}
                                    className="w-full px-4 py-2 text-left text-muted-foreground hover:text-brand-primary hover:bg-brand-primary/10 transition-all duration-150 border-b border-border last:border-b-0"
                                    onClick={() => {
                                        setAlgorithm(algo);
                                        setIsDropdownOpen(false);
                                    }}
                                >
                                    {algo.replace('parallel-', '').charAt(0).toUpperCase() +
                                        algo.replace('parallel-', '').slice(1)} Sort
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={sorting ? () => setSorting(false) : startSort}
                        disabled={sorting}
                        className="px-4 py-2 bg-brand-primary text-foreground rounded-lg hover:bg-brand-primary/80 disabled:opacity-50 transition-all duration-200"
                    >
                        {sorting ? "Pause" : "Start"}
                    </button>

                    <button
                        onClick={generateArray}
                        disabled={sorting}
                        className="px-4 py-2 bg-accent text-foreground rounded-lg hover:bg-accent/80 disabled:opacity-50 transition-all duration-200"
                    >
                        Reset
                    </button>

                    <div className="flex flex-col gap-2 min-w-[200px]">
                        <label className="text-muted-foreground text-sm">Animation Speed</label>
                        <input
                            type="range"
                            min="1"
                            max="100"
                            value={speed}
                            onChange={(e) => setSpeed(Number(e.target.value))}
                            className="w-full h-2 bg-accent rounded-lg appearance-none cursor-pointer accent-brand-primary"
                            disabled={sorting}
                        />
                    </div>

                    <div className="flex flex-col gap-2 min-w-[200px]">
                        <label className="text-muted-foreground text-sm">Array Size</label>
                        <input
                            type="range"
                            min="10"
                            max="100"
                            value={size}
                            onChange={(e) => setSize(Number(e.target.value))}
                            className="w-full h-2 bg-accent rounded-lg appearance-none cursor-pointer accent-brand-primary"
                            disabled={sorting}
                        />
                    </div>
                </div>

                {/* Grid Layout for Visualization and Code */}
                <div className="grid grid-cols-[1fr_1fr] gap-8 w-full">
                    {/* Visualization Section */}
                    <div>
                        <div className="h-64 bg-surface-secondary/70 backdrop-blur-sm border border-border rounded-lg p-4 flex items-end gap-[2px]">
                            {array.map((value, index) => (
                                <div
                                    key={index}
                                    className="transition-all duration-200"
                                    style={{
                                        height: `${value}%`,
                                        backgroundColor: getBarColor(value),
                                        width: `${100 / array.length}%`,
                                    }}
                                />
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-8">
                            <div className="bg-surface-secondary/70 backdrop-blur-sm border border-border p-4 rounded-lg">
                                <p className="text-muted-foreground">Comparisons</p>
                                <p className="text-2xl font-bold text-brand-primary">{comparisons}</p>
                            </div>
                            <div className="bg-surface-secondary/70 backdrop-blur-sm border border-border p-4 rounded-lg">
                                <p className="text-muted-foreground">Swaps</p>
                                <p className="text-2xl font-bold text-brand-primary">{swaps}</p>
                            </div>
                        </div>
                    </div>

                    {/* Code Section */}
                    <div className="bg-surface-secondary/70 backdrop-blur-sm border border-border rounded-lg p-4 overflow-y-auto">
                        <pre className="text-sm font-mono">
                            {algorithmCodes[algorithm as keyof typeof algorithmCodes]
                                .split("\n")
                                .map((line, index) => (
                                    <code
                                        key={index}
                                        className={`block ${index + 1 === highlightedLine ? "bg-gray-700" : ""
                                            } px-2 text-brand-primary`} 
                                    >
                                        {line}
                                    </code>
                                ))}
                        </pre>
                    </div>

                </div>
                </>
                )}

                {activeTab === 'theory' && (
                    <div className="space-y-8">
                        <div className="bg-surface-secondary/70 backdrop-blur-sm border border-border p-8 rounded-xl shadow-lg">
                            <h2 className="text-3xl font-bold text-brand-primary mb-6">Multithreaded Sorting Theory</h2>
                            
                            <div className="space-y-6 text-muted-foreground">
                                <p className="text-lg leading-relaxed">
                                    <span className="text-brand-primary font-semibold">Parallel sorting</span> leverages multiple processor cores to divide sorting work across threads, dramatically improving performance for large datasets. By processing different parts of the array simultaneously, we can achieve significant speedups over sequential algorithms.
                                </p>
                                
                                <div className="bg-gray-900/50 rounded-lg p-6 border-l-4 border-green-500">
                                    <h3 className="text-xl font-semibold text-brand-primary mb-3">Real-World Analogy</h3>
                                    <p>
                                        Imagine sorting a massive library with thousands of books. One librarian would take days, but with 10 librarians working on different sections simultaneously, the job gets done much faster. Each librarian sorts their section, then they merge the sections together - that's parallel sorting!
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-surface-secondary/70 backdrop-blur-sm border border-border p-8 rounded-xl shadow-lg">
                            <h2 className="text-3xl font-bold text-brand-primary mb-6">Why Parallel Sorting?</h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-gray-900/50 rounded-lg p-6 hover:bg-gray-900/70 transition-all duration-300">
                                    <div className="text-4xl mb-3">⚡</div>
                                    <h3 className="text-xl font-semibold text-brand-primary mb-3">Speed</h3>
                                    <p className="text-muted-foreground leading-relaxed">
                                        Modern CPUs have multiple cores sitting idle. Parallel sorting can achieve near-linear speedup by utilizing all available cores effectively.
                                    </p>
                                </div>

                                <div className="bg-gray-900/50 rounded-lg p-6 hover:bg-gray-900/70 transition-all duration-300">
                                    <div className="text-4xl mb-3">📊</div>
                                    <h3 className="text-xl font-semibold text-brand-primary mb-3">Big Data</h3>
                                    <p className="text-muted-foreground leading-relaxed">
                                        With datasets growing exponentially, sequential sorting becomes impractical. Parallel algorithms make large-scale data processing feasible.
                                    </p>
                                </div>

                                <div className="bg-gray-900/50 rounded-lg p-6 hover:bg-gray-900/70 transition-all duration-300">
                                    <div className="text-4xl mb-3">🎯</div>
                                    <h3 className="text-xl font-semibold text-brand-primary mb-3">Efficiency</h3>
                                    <p className="text-muted-foreground leading-relaxed">
                                        Better resource utilization means lower energy costs and faster response times for time-critical applications.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-surface-secondary/70 backdrop-blur-sm border border-border p-8 rounded-xl shadow-lg">
                            <h2 className="text-3xl font-bold text-brand-primary mb-6">Parallel Sorting Algorithms</h2>
                            
                            <div className="space-y-6">
                                <div className="bg-gray-900/50 rounded-lg p-6">
                                    <h3 className="text-2xl font-semibold text-brand-primary mb-3">Parallel Quick Sort</h3>
                                    <p className="text-muted-foreground mb-4">
                                        Divides the array around a pivot, then sorts the two partitions in parallel using separate threads.
                                    </p>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="bg-gray-800/50 rounded p-4">
                                            <h4 className="font-semibold text-brand-primary mb-3 text-base">How It Works:</h4>
                                            <ol className="text-muted-foreground space-y-2 list-decimal list-inside">
                                                <li>Choose a pivot element</li>
                                                <li>Partition array around pivot</li>
                                                <li>Spawn threads to sort left & right partitions</li>
                                                <li>Recursively repeat until sorted</li>
                                            </ol>
                                        </div>
                                        <div className="bg-gray-800/50 rounded p-4">
                                            <h4 className="font-semibold text-brand-primary mb-3 text-base">Performance:</h4>
                                            <ul className="text-muted-foreground space-y-2">
                                                <li>⏱️ Time: O(n log n) average</li>
                                                <li>💾 Space: O(log n)</li>
                                                <li>🧵 Parallelism: High</li>
                                                <li>✓ Best for: General purpose</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-900/50 rounded-lg p-6">
                                    <h3 className="text-2xl font-semibold text-brand-primary mb-3">Parallel Merge Sort</h3>
                                    <p className="text-muted-foreground mb-4">
                                        Recursively divides the array into halves, sorts them in parallel, then merges the sorted halves.
                                    </p>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="bg-gray-800/50 rounded p-4">
                                            <h4 className="font-semibold text-brand-primary mb-3 text-base">How It Works:</h4>
                                            <ol className="text-muted-foreground space-y-2 list-decimal list-inside">
                                                <li>Divide array into two halves</li>
                                                <li>Spawn threads to sort each half</li>
                                                <li>Merge sorted halves in parallel</li>
                                                <li>Continue until fully sorted</li>
                                            </ol>
                                        </div>
                                        <div className="bg-gray-800/50 rounded p-4">
                                            <h4 className="font-semibold text-brand-primary mb-3 text-base">Performance:</h4>
                                            <ul className="text-muted-foreground space-y-2">
                                                <li>⏱️ Time: O(n log n) guaranteed</li>
                                                <li>💾 Space: O(n)</li>
                                                <li>🧵 Parallelism: Excellent</li>
                                                <li>✓ Best for: Stable sorting</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-900/50 rounded-lg p-6">
                                    <h3 className="text-2xl font-semibold text-brand-primary mb-3">Parallel Bucket Sort</h3>
                                    <p className="text-muted-foreground mb-4">
                                        Distributes elements into buckets, sorts each bucket in parallel, then concatenates results.
                                    </p>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="bg-gray-800/50 rounded p-4">
                                            <h4 className="font-semibold text-brand-primary mb-3 text-base">How It Works:</h4>
                                            <ol className="text-muted-foreground space-y-2 list-decimal list-inside">
                                                <li>Create buckets for value ranges</li>
                                                <li>Distribute elements to buckets</li>
                                                <li>Sort each bucket in parallel</li>
                                                <li>Concatenate sorted buckets</li>
                                            </ol>
                                        </div>
                                        <div className="bg-gray-800/50 rounded p-4">
                                            <h4 className="font-semibold text-brand-primary mb-3 text-base">Performance:</h4>
                                            <ul className="text-muted-foreground space-y-2">
                                                <li>⏱️ Time: O(n + k) best case</li>
                                                <li>💾 Space: O(n + k)</li>
                                                <li>🧵 Parallelism: Very High</li>
                                                <li>✓ Best for: Uniformly distributed data</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-surface-secondary/70 backdrop-blur-sm border border-border p-8 rounded-xl shadow-lg">
                            <h2 className="text-3xl font-bold text-brand-primary mb-6">Parallel Programming Concepts</h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-gray-900/50 rounded-lg p-6">
                                    <h3 className="text-xl font-semibold text-brand-primary mb-3">Threads & Tasks</h3>
                                    <p className="text-muted-foreground mb-4 leading-relaxed">
                                        Threads are independent execution units that can run simultaneously on different CPU cores.
                                    </p>
                                    <div className="bg-gray-800/50 rounded p-4">
                                        <code className="text-brand-primary text-base">#pragma omp parallel</code>
                                        <p className="mt-2 text-muted-foreground">Creates parallel region where multiple threads execute</p>
                                    </div>
                                </div>

                                <div className="bg-gray-900/50 rounded-lg p-6">
                                    <h3 className="text-xl font-semibold text-brand-primary mb-3">Load Balancing</h3>
                                    <p className="text-muted-foreground mb-4 leading-relaxed">
                                        Distributing work evenly across threads to maximize efficiency and minimize idle time.
                                    </p>
                                    <div className="bg-gray-800/50 rounded p-4">
                                        <code className="text-brand-primary text-base">#pragma omp task</code>
                                        <p className="mt-2 text-muted-foreground">Creates task that can be scheduled dynamically</p>
                                    </div>
                                </div>

                                <div className="bg-gray-900/50 rounded-lg p-6">
                                    <h3 className="text-xl font-semibold text-brand-primary mb-3">Synchronization</h3>
                                    <p className="text-muted-foreground mb-4 leading-relaxed">
                                        Coordinating threads to prevent race conditions and ensure correct results.
                                    </p>
                                    <div className="bg-gray-800/50 rounded p-4">
                                        <code className="text-brand-primary text-base">#pragma omp barrier</code>
                                        <p className="mt-2 text-muted-foreground">All threads wait until everyone reaches this point</p>
                                    </div>
                                </div>

                                <div className="bg-gray-900/50 rounded-lg p-6">
                                    <h3 className="text-xl font-semibold text-brand-primary mb-3">Amdahl's Law</h3>
                                    <p className="text-muted-foreground mb-4 leading-relaxed">
                                        Maximum speedup is limited by the sequential portion of the algorithm.
                                    </p>
                                    <div className="bg-gray-800/50 rounded p-4">
                                        <p className="text-brand-primary text-base font-mono">Speedup ≤ 1 / (s + p/n)</p>
                                        <p className="mt-2 text-muted-foreground text-sm">s=sequential, p=parallel, n=threads</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-surface-secondary/70 backdrop-blur-sm border border-border p-8 rounded-xl shadow-lg">
                            <h2 className="text-3xl font-bold text-brand-primary mb-6">Comparison Table</h2>
                            <div className="overflow-x-auto">
                                <table className="min-w-full border-collapse">
                                    <thead>
                                        <tr className="bg-green-900/50">
                                            <th className="p-3 text-left text-brand-primary border border-gray-700">Algorithm</th>
                                            <th className="p-3 text-left text-brand-primary border border-gray-700">Best Case</th>
                                            <th className="p-3 text-left text-brand-primary border border-gray-700">Average Case</th>
                                            <th className="p-3 text-left text-brand-primary border border-gray-700">Space</th>
                                            <th className="p-3 text-left text-brand-primary border border-gray-700">Scalability</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-muted-foreground">
                                        <tr className="hover:bg-gray-700/50">
                                            <td className="p-3 border border-gray-700 font-medium">Parallel Quick Sort</td>
                                            <td className="p-3 border border-gray-700">O(n log n)</td>
                                            <td className="p-3 border border-gray-700">O(n log n)</td>
                                            <td className="p-3 border border-gray-700">O(log n)</td>
                                            <td className="p-3 border border-gray-700">Good</td>
                                        </tr>
                                        <tr className="hover:bg-gray-700/50">
                                            <td className="p-3 border border-gray-700 font-medium">Parallel Merge Sort</td>
                                            <td className="p-3 border border-gray-700">O(n log n)</td>
                                            <td className="p-3 border border-gray-700">O(n log n)</td>
                                            <td className="p-3 border border-gray-700">O(n)</td>
                                            <td className="p-3 border border-gray-700">Excellent</td>
                                        </tr>
                                        <tr className="hover:bg-gray-700/50">
                                            <td className="p-3 border border-gray-700 font-medium">Parallel Bucket Sort</td>
                                            <td className="p-3 border border-gray-700">O(n + k)</td>
                                            <td className="p-3 border border-gray-700">O(n + k)</td>
                                            <td className="p-3 border border-gray-700">O(n + k)</td>
                                            <td className="p-3 border border-gray-700">Very High</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'examples' && (
                    <div className="space-y-8">
                        <div className="bg-surface-secondary/70 backdrop-blur-sm border border-border p-8 rounded-xl shadow-lg">
                            <h2 className="text-3xl font-bold text-brand-primary mb-6">Multithreaded Sorting Examples</h2>
                            <p className="text-muted-foreground mb-6">
                                See how parallel sorting algorithms perform in real-world scenarios and learn when to use each approach.
                            </p>

                            <div className="grid grid-cols-1 gap-6">
                                {/* Example 1: Small Dataset */}
                                <div className="bg-surface-secondary/50 backdrop-blur-sm rounded-lg p-6 border border-border">
                                    <h3 className="text-2xl font-semibold text-brand-primary mb-4">Example 1: Small Dataset (100 elements)</h3>
                                    <div className="space-y-4 text-muted-foreground">
                                        <p><strong className="text-brand-primary">Scenario:</strong> Sorting a small array of 100 random integers</p>
                                        
                                        <div className="bg-gray-800/50 rounded p-4">
                                            <p className="mb-2"><strong>Array:</strong> [45, 23, 89, 12, 67, 34, 91, 56, ...]</p>
                                            <p><strong>Threads Available:</strong> 4 cores</p>
                                        </div>

                                        <div className="grid md:grid-cols-3 gap-4">
                                            <div className="bg-gray-800/30 rounded p-4">
                                                <h4 className="font-semibold text-brand-primary mb-2">Sequential Sort:</h4>
                                                <p className="text-sm">Time: ~2ms</p>
                                                <p className="text-sm text-yellow-400">Often faster for small datasets!</p>
                                            </div>
                                            <div className="bg-gray-800/30 rounded p-4">
                                                <h4 className="font-semibold text-brand-primary mb-2">Parallel Quick Sort:</h4>
                                                <p className="text-sm">Time: ~3ms</p>
                                                <p className="text-sm text-red-400">Thread overhead outweighs benefits</p>
                                            </div>
                                            <div className="bg-gray-800/30 rounded p-4">
                                                <h4 className="font-semibold text-brand-primary mb-2">Lesson:</h4>
                                                <p className="text-sm">Parallel sorting adds overhead. Use sequential for small datasets.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Example 2: Large Dataset */}
                                <div className="bg-surface-secondary/50 backdrop-blur-sm rounded-lg p-6 border border-border">
                                    <h3 className="text-2xl font-semibold text-brand-primary mb-4">Example 2: Large Dataset (10 Million elements)</h3>
                                    <div className="space-y-4 text-muted-foreground">
                                        <p><strong className="text-brand-primary">Scenario:</strong> Sorting 10 million random integers on 8-core processor</p>
                                        
                                        <div className="bg-gray-800/50 rounded p-4 space-y-2">
                                            <p><strong>Dataset Size:</strong> 10,000,000 integers</p>
                                            <p><strong>Hardware:</strong> 8 CPU cores</p>
                                        </div>

                                        <div className="grid md:grid-cols-4 gap-3">
                                            <div className="bg-gray-800/30 rounded p-4">
                                                <h4 className="font-semibold text-brand-primary mb-2">Sequential:</h4>
                                                <p className="text-sm">⏱️ 1200ms</p>
                                                <p className="text-sm text-gray-400">Baseline</p>
                                            </div>
                                            <div className="bg-gray-800/30 rounded p-4">
                                                <h4 className="font-semibold text-brand-primary mb-2">Parallel Quick:</h4>
                                                <p className="text-sm">⏱️ 180ms</p>
                                                <p className="text-sm text-brand-primary">6.7x speedup!</p>
                                            </div>
                                            <div className="bg-gray-800/30 rounded p-4">
                                                <h4 className="font-semibold text-brand-primary mb-2">Parallel Merge:</h4>
                                                <p className="text-sm">⏱️ 165ms</p>
                                                <p className="text-sm text-brand-primary">7.3x speedup!</p>
                                            </div>
                                            <div className="bg-gray-800/30 rounded p-4">
                                                <h4 className="font-semibold text-brand-primary mb-2">Parallel Bucket:</h4>
                                                <p className="text-sm">⏱️ 145ms</p>
                                                <p className="text-sm text-brand-primary">8.3x speedup!</p>
                                            </div>
                                        </div>

                                        <div className="bg-gradient-to-r from-green-900/20 to-green-800/20 rounded p-4 border-l-4 border-green-500">
                                            <p className="font-semibold text-brand-primary mb-2">Key Insight:</p>
                                            <p className="text-sm">
                                                With large datasets, parallel algorithms shine. Bucket sort performs best here due to excellent load distribution and minimal thread synchronization.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Example 3: Real-Time Analytics */}
                                <div className="bg-surface-secondary/50 backdrop-blur-sm rounded-lg p-6 border border-border">
                                    <h3 className="text-2xl font-semibold text-brand-primary mb-4">Example 3: Real-Time Analytics Dashboard</h3>
                                    <div className="space-y-4 text-muted-foreground">
                                        <p><strong className="text-brand-primary">Scenario:</strong> Sorting user activity logs for live dashboard updates</p>
                                        
                                        <div className="bg-gray-800/50 rounded p-4 space-y-2">
                                            <p><strong>Requirement:</strong> Sort 500,000 events every second</p>
                                            <p><strong>Constraint:</strong> Maximum 100ms latency</p>
                                            <p><strong>Data Pattern:</strong> Mostly sorted with new events at end</p>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="bg-gray-800/30 rounded p-4">
                                                <h4 className="font-semibold text-brand-primary mb-2">❌ Bad Choice: Parallel Bucket Sort</h4>
                                                <p className="text-sm mb-2">Time: ~120ms</p>
                                                <p className="text-sm text-red-400">
                                                    Doesn't leverage existing order. Distributes all elements even though most are already sorted.
                                                </p>
                                            </div>
                                            <div className="bg-gray-800/30 rounded p-4">
                                                <h4 className="font-semibold text-brand-primary mb-2">✅ Good Choice: Parallel Merge Sort</h4>
                                                <p className="text-sm mb-2">Time: ~45ms</p>
                                                <p className="text-sm text-brand-primary">
                                                    Efficiently merges pre-sorted sections. Predictable performance meets latency requirements.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Example 4: Machine Learning */}
                                <div className="bg-surface-secondary/50 backdrop-blur-sm rounded-lg p-6 border border-border">
                                    <h3 className="text-2xl font-semibold text-brand-primary mb-4">Example 4: Machine Learning Data Preprocessing</h3>
                                    <div className="space-y-4 text-muted-foreground">
                                        <p><strong className="text-brand-primary">Scenario:</strong> Preparing training data by sorting feature vectors</p>
                                        
                                        <div className="bg-gray-800/50 rounded p-4 space-y-2">
                                            <p><strong>Dataset:</strong> 50 million data points with 100 features each</p>
                                            <p><strong>Task:</strong> Sort by specific feature for gradient descent optimization</p>
                                            <p><strong>Hardware:</strong> GPU with 32 parallel processors</p>
                                        </div>

                                        <div className="bg-gradient-to-r from-green-900/20 to-green-800/20 rounded p-4 border-l-4 border-green-500">
                                            <p className="font-semibold text-brand-primary mb-2">Optimal Strategy: Hybrid Approach</p>
                                            <ol className="text-sm space-y-2 list-decimal list-inside ml-2">
                                                <li>Use Parallel Bucket Sort to distribute across 32 processors</li>
                                                <li>Each processor sorts its bucket with optimized Quick Sort</li>
                                                <li>Parallel merge of sorted buckets</li>
                                            </ol>
                                            <p className="text-sm mt-3 italic">
                                                Result: 28x speedup compared to sequential sorting, reducing preprocessing from 15 minutes to 32 seconds!
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Example 5: Database Query */}
                                <div className="bg-surface-secondary/50 backdrop-blur-sm rounded-lg p-6 border border-border">
                                    <h3 className="text-2xl font-semibold text-brand-primary mb-4">Example 5: Database Query Optimization</h3>
                                    <div className="space-y-4 text-muted-foreground">
                                        <p><strong className="text-brand-primary">Scenario:</strong> SQL ORDER BY on 2 million records</p>
                                        
                                        <div className="bg-gray-800/50 rounded p-4 space-y-2">
                                            <p><strong>Query:</strong> SELECT * FROM users ORDER BY signup_date</p>
                                            <p><strong>Records:</strong> 2,000,000 rows</p>
                                            <p><strong>Context:</strong> User-facing web application</p>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="bg-gray-800/30 rounded p-4">
                                                <h4 className="font-semibold text-brand-primary mb-2">Sequential Sort:</h4>
                                                <p className="text-sm mb-2">Query Time: 3.2 seconds</p>
                                                <p className="text-sm text-red-400">Too slow! Users would abandon the page</p>
                                            </div>
                                            <div className="bg-gray-800/30 rounded p-4">
                                                <h4 className="font-semibold text-brand-primary mb-2">Parallel Merge Sort:</h4>
                                                <p className="text-sm mb-2">Query Time: 0.5 seconds</p>
                                                <p className="text-sm text-brand-primary">Acceptable! 6.4x improvement</p>
                                            </div>
                                        </div>

                                        <div className="bg-gradient-to-r from-green-900/20 to-green-800/20 rounded p-4 border-l-4 border-green-500">
                                            <p className="text-sm">
                                                <strong>Why Merge Sort?</strong> Database systems favor merge sort for its guaranteed O(n log n) performance and stability - preserving the order of equal elements, crucial for secondary sorting keys.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Performance Tips */}
                                <div className="bg-gradient-to-br from-green-900/20 via-gray-900/50 to-green-800/20 rounded-lg p-6 border-2 border-green-600/50">
                                    <h3 className="text-2xl font-semibold text-brand-primary mb-4">💡 Performance Tips</h3>
                                    <div className="space-y-3 text-muted-foreground">
                                        <div className="bg-gray-800/50 rounded p-4">
                                            <h4 className="font-semibold text-brand-primary mb-2">When to Use Parallel Sorting:</h4>
                                            <ul className="space-y-2 text-sm list-disc list-inside ml-2">
                                                <li>Dataset size &gt; 10,000 elements</li>
                                                <li>Multiple CPU cores available</li>
                                                <li>Sorting is a performance bottleneck</li>
                                                <li>Not in memory-constrained environment</li>
                                            </ul>
                                        </div>
                                        
                                        <div className="bg-gray-800/50 rounded p-4">
                                            <h4 className="font-semibold text-brand-primary mb-2">Algorithm Selection Guide:</h4>
                                            <ul className="space-y-2 text-sm list-disc list-inside ml-2">
                                                <li><strong>Parallel Quick Sort:</strong> General purpose, good all-around performance</li>
                                                <li><strong>Parallel Merge Sort:</strong> Need stability, predictable performance</li>
                                                <li><strong>Parallel Bucket Sort:</strong> Uniformly distributed data, maximum parallelism</li>
                                            </ul>
                                        </div>

                                        <div className="bg-gradient-to-r from-green-900/30 to-green-800/30 rounded p-4 mt-4">
                                            <p className="text-lg font-semibold text-brand-primary mb-2">🎮 Try It Yourself!</p>
                                            <p className="text-sm">
                                                Switch to the <strong>Visualization</strong> tab and experiment with different algorithms and array sizes. 
                                                Watch how the parallel sorting algorithms divide work across sections. 
                                                Notice the performance differences with small vs. large datasets!
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                </div>
            </div>
        </div>
    );
};

export default SortingVisualizer;
