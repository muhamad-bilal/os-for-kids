import { useState, useEffect } from 'react';

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
        const hue = (value / 100) * 120;
        return `hsl(${hue}, 70%, 50%)`;
    };

    return (
        <div className="w-full flex justify-center items-start bg-gradient-to-br from-black via-gray-900 to-green-900 min-h-screen p-6">
            <div className="max-w-[1200px] w-full">
                <h1 className="text-4xl font-bold text-emerald-400 mb-8 text-center">
                    Parallel Sorting Visualizer
                </h1>

                {/* Controls Section */}
                <div className="flex flex-wrap gap-4 mb-8">
                    <div className="relative">
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white flex items-center justify-between min-w-[150px] hover:bg-green-800 transition-colors"
                        >
                            {algorithm === "parallel-quick" ? "Parallel Quick Sort" :
                                algorithm === "parallel-merge" ? "Parallel Merge Sort" :
                                    "Parallel Bucket Sort"}
                            <span>{isDropdownOpen ? "▲" : "▼"}</span>
                        </button>
                        {isDropdownOpen && (
                            <div className="absolute top-full left-0 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden z-10">
                                {["parallel-quick", "parallel-merge", "parallel-bucket"].map((algo) => (
                                    <button
                                        key={algo}
                                        className="w-full px-4 py-2 text-left text-white hover:bg-green-800 transition-colors"
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
                        )}
                    </div>

                    <button
                        onClick={sorting ? () => setSorting(false) : startSort}
                        disabled={sorting}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                    >
                        {sorting ? "Pause" : "Start"}
                    </button>

                    <button
                        onClick={generateArray}
                        disabled={sorting}
                        className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors"
                    >
                        Reset
                    </button>

                    <div className="flex flex-col gap-2 min-w-[200px]">
                        <label className="text-gray-400 text-sm">Animation Speed</label>
                        <input
                            type="range"
                            min="1"
                            max="100"
                            value={speed}
                            onChange={(e) => setSpeed(Number(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            disabled={sorting}
                        />
                    </div>

                    <div className="flex flex-col gap-2 min-w-[200px]">
                        <label className="text-gray-400 text-sm">Array Size</label>
                        <input
                            type="range"
                            min="10"
                            max="100"
                            value={size}
                            onChange={(e) => setSize(Number(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            disabled={sorting}
                        />
                    </div>
                </div>

                {/* Grid Layout for Visualization and Code */}
                <div className="grid grid-cols-[1fr_1fr] gap-8 w-full">
                    {/* Visualization Section */}
                    <div>
                        <div className="h-64 bg-gray-800 rounded-lg p-4 flex items-end gap-[2px]">
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
                            <div className="bg-gray-800 p-4 rounded-lg">
                                <p className="text-gray-400">Comparisons</p>
                                <p className="text-2xl font-bold text-emerald-400">{comparisons}</p>
                            </div>
                            <div className="bg-gray-800 p-4 rounded-lg">
                                <p className="text-gray-400">Swaps</p>
                                <p className="text-2xl font-bold text-emerald-400">{swaps}</p>
                            </div>
                        </div>
                    </div>

                    {/* Code Section */}
                    <div className="bg-gray-800 rounded-lg p-4 overflow-y-auto">
                        <pre className="text-sm font-mono">
                            {algorithmCodes[algorithm as keyof typeof algorithmCodes]
                                .split("\n")
                                .map((line, index) => (
                                    <code
                                        key={index}
                                        className={`block ${index + 1 === highlightedLine ? "bg-gray-700" : ""
                                            } px-2 text-green-300`} 
                                    >
                                        {line}
                                    </code>
                                ))}
                        </pre>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default SortingVisualizer;

