#include <stdio.h>
#include <stdlib.h>
#include <omp.h>

// Function declarations
void parallelQuickSort(int *arr, int low, int high);
void parallelMergeSort(int *arr, int left, int right);
void parallelBucketSort(int *arr, int n);
void merge(int *arr, int left, int mid, int right);
void quickSort(int *arr, int low, int high);
int partition(int *arr, int low, int high);
void swap(int *a, int *b);
void printArray(int *arr, int n);

// Utility function to swap elements
void swap(int *a, int *b) {
    int temp = *a;
    *a = *b;
    *b = temp;
}

// Parallel Quick Sort Implementation
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
}

// Parallel Merge Sort Implementation
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
}

// Parallel Bucket Sort Implementation
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

// Helper function for bucket sort
void quickSort(int *arr, int low, int high) {
    if (low < high) {
        int pivot = partition(arr, low, high);
        quickSort(arr, low, pivot - 1);
        quickSort(arr, pivot + 1, high);
    }
}

// Utility function to print array
void printArray(int *arr, int n) {
    for (int i = 0; i < n; i++)
        printf("%d ", arr[i]);
    printf("\n");
}

// Main function with example usage
int main() {
    int n = 50; // Array size
    int *arr = (int*)malloc(n * sizeof(int));
    
    // Initialize array with random values
    for (int i = 0; i < n; i++) {
        arr[i] = rand() % 100 + 1;
    }
    
    printf("Original array:\n");
    printArray(arr, n);
    
    // Set number of threads for OpenMP
    omp_set_num_threads(4);
    
    // Choose which sorting algorithm to use
    parallelQuickSort(arr, 0, n-1);
    // OR parallelMergeSort(arr, 0, n-1);
    // OR parallelBucketSort(arr, n);
    
    printf("\nSorted array:\n");
    printArray(arr, n);
    
    free(arr);
    return 0;
}