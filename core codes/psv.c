#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <limits.h>

#define MAX_PROCESSES 100

typedef struct {
    int process_id;
    int arrival_time;
    int burst_time;
    int priority;
    int remaining_time;
    int completion_time;
    int waiting_time;
    int turnaround_time;
} Process;

typedef struct {
    int process_id;
    int start_time;
    int duration;
} ExecutionStep;

// Function prototypes
void fcfs(Process processes[], int n, ExecutionStep steps[], int *step_count);
void sjf(Process processes[], int n, ExecutionStep steps[], int *step_count);
void priority_scheduling(Process processes[], int n, ExecutionStep steps[], int *step_count);
void round_robin(Process processes[], int n, int quantum, ExecutionStep steps[], int *step_count);
void sort_by_arrival(Process processes[], int n);
void sort_by_burst_time(Process processes[], int n);
void sort_by_priority(Process processes[], int n);

// First Come First Serve
void fcfs(Process processes[], int n, ExecutionStep steps[], int *step_count) {
    sort_by_arrival(processes, n);
    int current_time = 0;
    *step_count = 0;

    for (int i = 0; i < n; i++) {
        if (current_time < processes[i].arrival_time) {
            current_time = processes[i].arrival_time;
        }

        steps[*step_count].process_id = processes[i].process_id;
        steps[*step_count].start_time = current_time;
        steps[*step_count].duration = processes[i].burst_time;
        (*step_count)++;

        current_time += processes[i].burst_time;
        processes[i].completion_time = current_time;
        processes[i].turnaround_time = processes[i].completion_time - processes[i].arrival_time;
        processes[i].waiting_time = processes[i].turnaround_time - processes[i].burst_time;
    }
}

// Shortest Job First (Non-preemptive)
void sjf(Process processes[], int n, ExecutionStep steps[], int *step_count) {
    Process temp[MAX_PROCESSES];
    memcpy(temp, processes, n * sizeof(Process));
    int current_time = 0;
    int completed = 0;
    *step_count = 0;

    while (completed < n) {
        int shortest_job = -1;
        int min_burst = INT_MAX;

        for (int i = 0; i < n; i++) {
            if (temp[i].arrival_time <= current_time && temp[i].remaining_time > 0) {
                if (temp[i].burst_time < min_burst) {
                    min_burst = temp[i].burst_time;
                    shortest_job = i;
                }
            }
        }

        if (shortest_job == -1) {
            current_time++;
            continue;
        }

        steps[*step_count].process_id = temp[shortest_job].process_id;
        steps[*step_count].start_time = current_time;
        steps[*step_count].duration = temp[shortest_job].burst_time;
        (*step_count)++;

        current_time += temp[shortest_job].burst_time;
        temp[shortest_job].remaining_time = 0;
        completed++;
    }
}

// Priority Scheduling (Non-preemptive)
void priority_scheduling(Process processes[], int n, ExecutionStep steps[], int *step_count) {
    Process temp[MAX_PROCESSES];
    memcpy(temp, processes, n * sizeof(Process));
    int current_time = 0;
    int completed = 0;
    *step_count = 0;

    while (completed < n) {
        int highest_priority = -1;
        int min_priority = INT_MAX;

        for (int i = 0; i < n; i++) {
            if (temp[i].arrival_time <= current_time && temp[i].remaining_time > 0) {
                if (temp[i].priority < min_priority) {
                    min_priority = temp[i].priority;
                    highest_priority = i;
                }
            }
        }

        if (highest_priority == -1) {
            current_time++;
            continue;
        }

        steps[*step_count].process_id = temp[highest_priority].process_id;
        steps[*step_count].start_time = current_time;
        steps[*step_count].duration = temp[highest_priority].burst_time;
        (*step_count)++;

        current_time += temp[highest_priority].burst_time;
        temp[highest_priority].remaining_time = 0;
        completed++;
    }
}

// Round Robin
void round_robin(Process processes[], int n, int quantum, ExecutionStep steps[], int *step_count) {
    Process temp[MAX_PROCESSES];
    memcpy(temp, processes, n * sizeof(Process));
    int current_time = 0;
    int completed = 0;
    *step_count = 0;

    while (completed < n) {
        int flag = 0;
        for (int i = 0; i < n; i++) {
            if (temp[i].remaining_time > 0 && temp[i].arrival_time <= current_time) {
                flag = 1;
                int execution_time = (temp[i].remaining_time < quantum) ? 
                                   temp[i].remaining_time : quantum;

                steps[*step_count].process_id = temp[i].process_id;
                steps[*step_count].start_time = current_time;
                steps[*step_count].duration = execution_time;
                (*step_count)++;

                temp[i].remaining_time -= execution_time;
                current_time += execution_time;

                if (temp[i].remaining_time == 0) {
                    completed++;
                }
            }
        }
        if (!flag) current_time++;
    }
}

// Utility functions
void sort_by_arrival(Process processes[], int n) {
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - i - 1; j++) {
            if (processes[j].arrival_time > processes[j + 1].arrival_time) {
                Process temp = processes[j];
                processes[j] = processes[j + 1];
                processes[j + 1] = temp;
            }
        }
    }
}

void sort_by_burst_time(Process processes[], int n) {
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - i - 1; j++) {
            if (processes[j].burst_time > processes[j + 1].burst_time) {
                Process temp = processes[j];
                processes[j] = processes[j + 1];
                processes[j + 1] = temp;
            }
        }
    }
}

void sort_by_priority(Process processes[], int n) {
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - i - 1; j++) {
            if (processes[j].priority > processes[j + 1].priority) {
                Process temp = processes[j];
                processes[j] = processes[j + 1];
                processes[j + 1] = temp;
            }
        }
    }
}

// Example main function to demonstrate usage
int main() {
    Process processes[MAX_PROCESSES];
    ExecutionStep steps[MAX_PROCESSES * 2];  // Extra space for RR algorithm
    int step_count = 0;
    int n = 3;  // Number of processes

    // Example process initialization
    processes[0] = (Process){1, 0, 4, 2, 4, 0, 0, 0};
    processes[1] = (Process){2, 1, 3, 1, 3, 0, 0, 0};
    processes[2] = (Process){3, 2, 2, 3, 2, 0, 0, 0};

    // Example usage of different algorithms
    // fcfs(processes, n, steps, &step_count);
    // sjf(processes, n, steps, &step_count);
    // priority_scheduling(processes, n, steps, &step_count);
    round_robin(processes, n, 2, steps, &step_count);  // quantum = 2

    // Print results
    printf("Execution Steps:\n");
    for (int i = 0; i < step_count; i++) {
        printf("Process %d: Start Time = %d, Duration = %d\n",
               steps[i].process_id, steps[i].start_time, steps[i].duration);
    }

    return 0;
}