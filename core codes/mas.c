#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <time.h>

#define MAX_BLOCKS 1024
#define MAX_PROCESSES 1024
#define MAX_NAME_LENGTH 64

typedef enum {
    FIRST_FIT,
    BEST_FIT,
    WORST_FIT,
    NEXT_FIT
} AllocationStrategy;

typedef struct {
    char id[32];
    char name[MAX_NAME_LENGTH];
    int size;
    int start_time;
    int allocated_at;
    int deallocated_at;
} Process;

typedef struct {
    char id[32];
    int start;
    int end;
    int size;
    bool is_free;
    Process* process;
} MemoryBlock;

typedef struct {
    MemoryBlock blocks[MAX_BLOCKS];
    int block_count;
    int total_memory;
    int next_fit_pointer;
    AllocationStrategy strategy;
    Process processes[MAX_PROCESSES];
    int process_count;
    double fragmentation;
    int current_time;
} MemoryManager;

// Function prototypes
void init_memory_manager(MemoryManager* manager, int total_memory);
char* generate_random_id(char* buffer);
int find_suitable_block(MemoryManager* manager, int size);
bool allocate_memory(MemoryManager* manager, Process* process);
void deallocate_process(MemoryManager* manager, const char* process_id);
void merge_free_blocks(MemoryManager* manager);
void calculate_fragmentation(MemoryManager* manager);
void print_memory_state(MemoryManager* manager);

// Initialize memory manager
void init_memory_manager(MemoryManager* manager, int total_memory) {
    manager->total_memory = total_memory;
    manager->block_count = 1;
    manager->process_count = 0;
    manager->next_fit_pointer = 0;
    manager->strategy = BEST_FIT;
    manager->current_time = 0;
    manager->fragmentation = 0.0;

    // Initialize first block as free
    generate_random_id(manager->blocks[0].id);
    manager->blocks[0].start = 0;
    manager->blocks[0].end = total_memory;
    manager->blocks[0].size = total_memory;
    manager->blocks[0].is_free = true;
    manager->blocks[0].process = NULL;
}

// Generate random ID
char* generate_random_id(char* buffer) {
    static const char charset[] = "abcdefghijklmnopqrstuvwxyz0123456789";
    int length = 9;
    
    for (int i = 0; i < length; i++) {
        int index = rand() % (sizeof(charset) - 1);
        buffer[i] = charset[index];
    }
    buffer[length] = '\0';
    return buffer;
}

// Find suitable block based on strategy
int find_suitable_block(MemoryManager* manager, int size) {
    int selected_block = -1;

    switch (manager->strategy) {
        case FIRST_FIT:
            for (int i = 0; i < manager->block_count; i++) {
                if (manager->blocks[i].is_free && manager->blocks[i].size >= size) {
                    selected_block = i;
                    break;
                }
            }
            break;

        case BEST_FIT: {
            int min_suitable_size = manager->total_memory + 1;
            for (int i = 0; i < manager->block_count; i++) {
                if (manager->blocks[i].is_free && manager->blocks[i].size >= size) {
                    if (manager->blocks[i].size < min_suitable_size) {
                        min_suitable_size = manager->blocks[i].size;
                        selected_block = i;
                    }
                }
            }
            break;
        }

        case WORST_FIT: {
            int max_suitable_size = -1;
            for (int i = 0; i < manager->block_count; i++) {
                if (manager->blocks[i].is_free && manager->blocks[i].size >= size) {
                    if (manager->blocks[i].size > max_suitable_size) {
                        max_suitable_size = manager->blocks[i].size;
                        selected_block = i;
                    }
                }
            }
            break;
        }

        case NEXT_FIT: {
            int start_point = manager->next_fit_pointer;
            for (int i = 0; i < manager->block_count; i++) {
                int index = (start_point + i) % manager->block_count;
                if (manager->blocks[index].is_free && manager->blocks[index].size >= size) {
                    selected_block = index;
                    manager->next_fit_pointer = (index + 1) % manager->block_count;
                    break;
                }
            }
            break;
        }
    }

    return selected_block;
}

// Allocate memory for process
bool allocate_memory(MemoryManager* manager, Process* process) {
    int block_index = find_suitable_block(manager, process->size);
    
    if (block_index == -1) {
        return false;
    }

    MemoryBlock* selected_block = &manager->blocks[block_index];

    // Split block if necessary
    if (selected_block->size > process->size) {
        // Create new free block
        MemoryBlock new_block;
        generate_random_id(new_block.id);
        new_block.start = selected_block->start + process->size;
        new_block.end = selected_block->end;
        new_block.size = selected_block->size - process->size;
        new_block.is_free = true;
        new_block.process = NULL;

        // Update selected block
        selected_block->end = selected_block->start + process->size;
        selected_block->size = process->size;
        
        // Insert new block
        for (int i = manager->block_count; i > block_index + 1; i--) {
            manager->blocks[i] = manager->blocks[i - 1];
        }
        manager->blocks[block_index + 1] = new_block;
        manager->block_count++;
    }

    // Update selected block with process
    selected_block->is_free = false;
    selected_block->process = process;
    process->allocated_at = manager->current_time;
    
    // Add process to process list
    manager->processes[manager->process_count++] = *process;
    
    calculate_fragmentation(manager);
    return true;
}

// Deallocate process
void deallocate_process(MemoryManager* manager, const char* process_id) {
    for (int i = 0; i < manager->block_count; i++) {
        if (!manager->blocks[i].is_free && 
            manager->blocks[i].process != NULL && 
            strcmp(manager->blocks[i].process->id, process_id) == 0) {
            
            manager->blocks[i].is_free = true;
            manager->blocks[i].process->deallocated_at = manager->current_time;
            manager->blocks[i].process = NULL;
            break;
        }
    }

    merge_free_blocks(manager);
    calculate_fragmentation(manager);
}

// Merge adjacent free blocks
void merge_free_blocks(MemoryManager* manager) {
    int i = 0;
    while (i < manager->block_count - 1) {
        if (manager->blocks[i].is_free && manager->blocks[i + 1].is_free) {
            // Merge blocks
            manager->blocks[i].end = manager->blocks[i + 1].end;
            manager->blocks[i].size += manager->blocks[i + 1].size;

            // Remove the second block
            for (int j = i + 1; j < manager->block_count - 1; j++) {
                manager->blocks[j] = manager->blocks[j + 1];
            }
            manager->block_count--;
        } else {
            i++;
        }
    }
}

// Calculate memory fragmentation
void calculate_fragmentation(MemoryManager* manager) {
    int total_free_space = 0;
    int largest_free_block = 0;

    for (int i = 0; i < manager->block_count; i++) {
        if (manager->blocks[i].is_free) {
            total_free_space += manager->blocks[i].size;
            if (manager->blocks[i].size > largest_free_block) {
                largest_free_block = manager->blocks[i].size;
            }
        }
    }

    if (largest_free_block > 0) {
        manager->fragmentation = ((double)(total_free_space - largest_free_block) / manager->total_memory) * 100.0;
    } else {
        manager->fragmentation = 0.0;
    }
}

// Print current memory state
void print_memory_state(MemoryManager* manager) {
    printf("\nMemory State (Total: %d MB):\n", manager->total_memory);
    printf("Fragmentation: %.2f%%\n", manager->fragmentation);
    printf("Active Processes: %d\n", manager->process_count);
    
    for (int i = 0; i < manager->block_count; i++) {
        printf("Block %d: [%d-%d] %d MB - %s\n",
            i,
            manager->blocks[i].start,
            manager->blocks[i].end,
            manager->blocks[i].size,
            manager->blocks[i].is_free ? "Free" : 
                manager->blocks[i].process ? manager->blocks[i].process->name : "Unknown"
        );
    }
}

// Example usage
int main() {
    MemoryManager manager;
    init_memory_manager(&manager, 2048); // 2048 MB total memory

    // Example process creation and allocation
    Process p1 = {0};
    generate_random_id(p1.id);
    strcpy(p1.name, "Chrome");
    p1.size = 512;
    p1.start_time = manager.current_time;
    
    if (allocate_memory(&manager, &p1)) {
        printf("Process %s allocated successfully\n", p1.name);
    }

    print_memory_state(&manager);
    
    // Example deallocation
    deallocate_process(&manager, p1.id);
    print_memory_state(&manager);

    return 0;
}