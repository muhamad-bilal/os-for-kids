#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include <string.h>

#define MAX_RESOURCES 10
#define MAX_PROCESSES 10

typedef struct {
    char processName[20];
    int allocation[MAX_RESOURCES];
    int max[MAX_RESOURCES];
    int need[MAX_RESOURCES];
    int priority;
} ResourceAllocation;

int available[MAX_RESOURCES];
ResourceAllocation processes[MAX_PROCESSES];
int processCount = 0;
int resourceCount = 0;

void calculateNeed(ResourceAllocation *process, int resourceCount) {
    for (int i = 0; i < resourceCount; i++) {
        process->need[i] = process->max[i] - process->allocation[i];
    }
}

void addProcess(const char *processName, int *allocation, int *max, int priority) {
    if (processCount >= MAX_PROCESSES) {
        printf("Cannot add more processes. Limit reached.\n");
        return;
    }

    ResourceAllocation *process = &processes[processCount];
    strcpy(process->processName, processName);
    memcpy(process->allocation, allocation, sizeof(int) * resourceCount);
    memcpy(process->max, max, sizeof(int) * resourceCount);
    process->priority = priority;

    calculateNeed(process, resourceCount);

    processCount++;
    printf("Process %s added successfully.\n", processName);
}

void releaseResources(const char *processName) {
    for (int i = 0; i < processCount; i++) {
        if (strcmp(processes[i].processName, processName) == 0) {
            for (int j = 0; j < resourceCount; j++) {
                available[j] += processes[i].allocation[j];
            }
            for (int k = i; k < processCount - 1; k++) {
                processes[k] = processes[k + 1];
            }
            processCount--;
            printf("Resources from process %s released.\n", processName);
            return;
        }
    }
    printf("Process %s not found.\n", processName);
}

void runBankersAlgorithm() {
    int work[MAX_RESOURCES];
    bool finish[MAX_PROCESSES] = {false};
    char safeSequence[MAX_PROCESSES][20];
    int safeSequenceCount = 0;

    memcpy(work, available, sizeof(int) * resourceCount);

    bool progress = true;
    while (progress) {
        progress = false;
        for (int i = 0; i < processCount; i++) {
            if (!finish[i]) {
                bool canProceed = true;
                for (int j = 0; j < resourceCount; j++) {
                    if (processes[i].need[j] > work[j]) {
                        canProceed = false;
                        break;
                    }
                }
                if (canProceed) {
                    for (int j = 0; j < resourceCount; j++) {
                        work[j] += processes[i].allocation[j];
                    }
                    finish[i] = true;
                    strcpy(safeSequence[safeSequenceCount++], processes[i].processName);
                    progress = true;
                }
            }
        }
    }

    bool allFinished = true;
    for (int i = 0; i < processCount; i++) {
        if (!finish[i]) {
            allFinished = false;
            break;
        }
    }

    if (allFinished) {
        printf("System is in a safe state.\nSafe sequence: ");
        for (int i = 0; i < safeSequenceCount; i++) {
            printf("%s%s", safeSequence[i], i == safeSequenceCount - 1 ? "\n" : " -> ");
        }
    } else {
        printf("System is in a deadlock state.\n");
    }
}

int main() {
    // Example inputs
    resourceCount = 3;  // Assume 3 types of resources
    available[0] = 10;
    available[1] = 5;
    available[2] = 7;

    int allocation1[] = {1, 0, 0};
    int max1[] = {7, 5, 3};
    addProcess("P1", allocation1, max1, 1);

    int allocation2[] = {2, 1, 1};
    int max2[] = {3, 2, 2};
    addProcess("P2", allocation2, max2, 2);

    runBankersAlgorithm();

    releaseResources("P1");

    runBankersAlgorithm();

    return 0;
}
