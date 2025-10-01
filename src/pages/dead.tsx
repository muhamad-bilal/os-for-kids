import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as d3 from 'd3';
import { Cpu, BookOpen, AlertCircle } from 'lucide-react';

// TypeScript interfaces
interface ResourceAllocation {
    process: string;
    allocation: number[];
    max: number[];
    need: number[];
    priority: number;
}

interface GraphNode {
    id: string;
    type: 'process' | 'resource';
    allocation?: number[];
    max?: number[];
    x?: number;  // Added for D3 simulation
    y?: number;
}

interface GraphLink {
    source: string;
    target: string;
    value: number;
    type?: 'allocation' | 'request';
}

const DeadlockDetection: React.FC = () => {
    const [processes, setProcesses] = useState<ResourceAllocation[]>([]);
    const [available, setAvailable] = useState<number[]>([]);
    const [isSafe, setIsSafe] = useState<boolean | null>(null);
    const [safeSequence, setSafeSequence] = useState<string[]>([]);
    const [log, setLog] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<'visualization' | 'theory' | 'examples'>('visualization');
    const svgRef = useRef<SVGSVGElement>(null);
    const [graphData, setGraphData] = useState<{nodes: GraphNode[], links: GraphLink[]}>({
        nodes: [],
        links: []
    });

    const calculateNeed = useCallback((allocation: number[], max: number[]) => {
        return max.map((m, i) => m - allocation[i]);
    }, []);

    const addProcess = useCallback((processName: string, allocation: number[], max: number[], priority: number) => {
        const need = calculateNeed(allocation, max);
        const newProcess = { process: processName, allocation, max, need, priority };
        setProcesses(prev => [...prev, newProcess]);
        setLog(prevLog => [
            ...prevLog,
            `Process ${processName} added with allocation ${allocation}, max ${max}, and priority ${priority}`
        ]);
    }, [calculateNeed]);

    const releaseResources = useCallback((processName: string) => {
        const processIndex = processes.findIndex((p) => p.process === processName);
        if (processIndex !== -1) {
            const process = processes[processIndex];
            const updatedAvailable = available.map((a, i) => a + process.allocation[i]);
            setAvailable(updatedAvailable);
            setProcesses(prev => prev.filter((_, i) => i !== processIndex));
            setLog(prevLog => [...prevLog, `Resources released from process ${processName}`]);
        }
    }, [processes, available]);

    const runBankersAlgorithm = useCallback(() => {
        const work = [...available];
        const finish = Array(processes.length).fill(false);
        const sequence: string[] = [];
        const sortedProcesses = [...processes].sort((a, b) => a.priority - b.priority);

        let progress = true;
        while (progress) {
            progress = false;
            for (let i = 0; i < sortedProcesses.length; i++) {
                if (!finish[i]) {
                    const { process, allocation, need } = sortedProcesses[i];
                    if (need.every((n, j) => n <= work[j])) {
                        work.forEach((_, j) => (work[j] += allocation[j]));
                        finish[i] = true;
                        sequence.push(process);
                        setLog(prevLog => [...prevLog, `Process ${process} executed successfully`]);
                        progress = true;
                    }
                }
            }
        }

        const allFinished = finish.every((f) => f);
        setIsSafe(allFinished);
        setSafeSequence(allFinished ? sequence : []);
        setLog(prevLog => [
            ...prevLog,
            allFinished 
                ? `System is in a safe state with sequence: ${sequence.join(' -> ')}`
                : 'System is in a deadlock state.'
        ]);
    }, [processes, available]);

    // Update graph data when processes or available resources change
    useEffect(() => {
        const resourceNodes: GraphNode[] = available.map((_, index) => ({
            id: `R${index}`,
            type: 'resource'
        }));

        const processNodes: GraphNode[] = processes.map(p => ({
            id: p.process,
            type: 'process',
            allocation: p.allocation,
            max: p.max
        }));

        // Create allocation edges (resource -> process)
        const allocationLinks: GraphLink[] = processes.flatMap(({ process, allocation }) =>
            allocation.map((value, i) => ({
                source: `R${i}`,
                target: process,
                value,
                type: 'allocation' as const
            })).filter(link => link.value > 0)
        );

        // Create request edges (process -> resource) based on need
        const requestLinks: GraphLink[] = processes.flatMap(({ process, need }) =>
            need.map((value, i) => ({
                source: process,
                target: `R${i}`,
                value,
                type: 'request' as const
            })).filter(link => link.value > 0)
        );

        setGraphData({
            nodes: [...resourceNodes, ...processNodes],
            links: [...allocationLinks, ...requestLinks]
        });
    }, [processes, available]);


    // D3 Force Directed Graph
    useEffect(() => {
        if (!svgRef.current || !graphData.nodes.length) return;

        const width = 1000;
        const height = 600;
        
        d3.select(svgRef.current).selectAll("*").remove();
        
        const svg = d3.select(svgRef.current)
            .attr("viewBox", `0 0 ${width} ${height}`);

        // Add definitions for arrowheads
        const defs = svg.append("defs");
        
        // Allocation arrow (solid)
        defs.append("marker")
            .attr("id", "allocation-arrow")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 25)
            .attr("refY", 0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .attr("fill", "#10b981");

        // Request arrow (dashed)
        defs.append("marker")
            .attr("id", "request-arrow")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 25)
            .attr("refY", 0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .attr("fill", "#f59e0b");

        const simulation = d3.forceSimulation(graphData.nodes as any)
            .force("link", d3.forceLink(graphData.links)
                .id((d: any) => d.id)
                .distance(180))
            .force("charge", d3.forceManyBody().strength(-600))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide().radius(40));

        // Create links with different styles for allocation vs request
        const link = svg.append("g")
            .selectAll("line")
            .data(graphData.links)
            .join("line")
            .attr("stroke", (d: any) => d.type === 'allocation' ? "#10b981" : "#f59e0b")
            .attr("stroke-width", (d: any) => Math.max(2, Math.sqrt(d.value) * 2))
            .attr("stroke-dasharray", (d: any) => d.type === 'request' ? "5,5" : "none")
            .attr("marker-end", (d: any) => d.type === 'allocation' ? "url(#allocation-arrow)" : "url(#request-arrow)")
            .attr("opacity", 0.8);


        const node = svg.append("g")
            .selectAll("g")
            .data(graphData.nodes)
            .join("g");

        // Enhanced node styling
        node.append("circle")
            .attr("r", (d: any) => d.type === 'resource' ? 25 : 20)
            .attr("fill", (d: any) => d.type === 'process' ? "#059669" : "#1e40af")
            .attr("stroke", (d: any) => d.type === 'process' ? "#10b981" : "#3b82f6")
            .attr("stroke-width", 3);

        // Add resource instance indicators for resource nodes
        node.filter((d: any) => d.type === 'resource')
            .each(function(d: any) {
                const resourceIndex = parseInt(d.id.substring(1));
                const instances = available[resourceIndex] || 0;
                
                // Add small circles inside resource nodes to show available instances
                for (let j = 0; j < Math.min(instances, 5); j++) {
                    d3.select(this).append("circle")
                        .attr("r", 3)
                        .attr("cx", -10 + (j * 5))
                        .attr("cy", 0)
                        .attr("fill", "#60a5fa");
                }
            });

        node.append("text")
            .text((d: any) => d.id)
            .attr("text-anchor", "middle")
            .attr("dy", ".35em")
            .attr("fill", "white")
            .attr("font-weight", "bold")
            .attr("font-size", "12px");


        node.call(d3.drag<any, any>()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

        simulation.on("tick", () => {
            link
                .attr("x1", (d: any) => (d.source as any).x || 0)
                .attr("y1", (d: any) => (d.source as any).y || 0)
                .attr("x2", (d: any) => (d.target as any).x || 0)
                .attr("y2", (d: any) => (d.target as any).y || 0);

            node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
        });

        function dragstarted(event: any) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }

        function dragged(event: any) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }

        function dragended(event: any) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }

        return () => {
            simulation.stop();
        };
    }, [graphData, available, processes]);

    const handleProcessSubmit = () => {
        const processName = (document.getElementById('processName') as HTMLInputElement)?.value.trim();
        const allocation = (document.getElementById('allocation') as HTMLInputElement)?.value
            .split(',')
            .map((v) => parseInt(v.trim()));
        const max = (document.getElementById('max') as HTMLInputElement)?.value
            .split(',')
            .map((v) => parseInt(v.trim()));
        const priority = parseInt((document.getElementById('priority') as HTMLInputElement)?.value.trim());

        if (
            processName &&
            allocation?.every((num) => !isNaN(num)) &&
            max?.every((num) => !isNaN(num)) &&
            !isNaN(priority)
        ) {
            addProcess(processName, allocation, max, priority);
        } else {
            alert('Invalid input for process data. Please check and try again.');
        }
    };

    const loadExample = (exampleData: { available: number[], processes: Omit<ResourceAllocation, 'need'>[] }) => {
        // Clear existing data
        setProcesses([]);
        setAvailable(exampleData.available);
        setIsSafe(null);
        setSafeSequence([]);
        setLog(['Example loaded successfully']);

        // Add processes with calculated need
        exampleData.processes.forEach(proc => {
            const need = calculateNeed(proc.allocation, proc.max);
            const newProcess = { ...proc, need };
            setProcesses(prev => [...prev, newProcess]);
        });

        // Switch to visualization tab
        setActiveTab('visualization');
    };

    return (
        <div className="dark">
            <div className="w-full min-h-screen bg-gradient-to-br from-(--brand-start) via-(--brand-via) to-(--brand-end) px-6 py-10">
                <div className="max-w-6xl mx-auto">
                    <h1 className="text-4xl md:text-5xl font-bold text-brand-primary mb-8 text-center">
                        Deadlock Detection & Prevention
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
                                <Cpu className="h-5 w-5" />
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
                                <BookOpen className="h-5 w-5" />
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

                {activeTab === 'examples' ? (
                    // Examples Section
                    <div className="space-y-8">
                        <div className="bg-surface-secondary/70 backdrop-blur-sm border border-border rounded-xl p-8 shadow-lg">
                            <h2 className="text-3xl font-bold text-brand-primary mb-6">
                                Sample Scenarios
                            </h2>
                            <p className="text-muted-foreground mb-8">
                                Load predefined examples to quickly explore different deadlock scenarios. Click any example to automatically populate the simulator.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Big Safe Example */}
                                <div className="bg-surface-secondary/50 backdrop-blur-sm rounded-lg p-6 hover:bg-surface-secondary/70 transition-all duration-300 border border-border">
                                    <h3 className="text-xl font-semibold text-brand-primary mb-3">Big Safe Example</h3>
                                    <p className="text-muted-foreground mb-4 text-sm">
                                        A complex safe scenario with 5 processes and 3 resource types.
                                    </p>
                                    <div className="bg-accent/30 rounded p-3 mb-4 text-xs h-32">
                                        <div className="text-brand-primary font-semibold mb-2">Resources Available: [3, 3, 2]</div>
                                        <div className="space-y-1 text-foreground">
                                            <div>P0: Allocation=[0,1,0], Max=[7,5,3], Priority=1</div>
                                            <div>P1: Allocation=[2,0,0], Max=[3,2,2], Priority=2</div>
                                            <div>P2: Allocation=[3,0,2], Max=[9,0,2], Priority=3</div>
                                            <div>P3: Allocation=[2,1,1], Max=[2,2,2], Priority=4</div>
                                            <div>P4: Allocation=[0,0,2], Max=[4,3,3], Priority=5</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => loadExample({
                                            available: [3, 3, 2],
                                            processes: [
                                                { process: 'P0', allocation: [0, 1, 0], max: [7, 5, 3], priority: 1 },
                                                { process: 'P1', allocation: [2, 0, 0], max: [3, 2, 2], priority: 2 },
                                                { process: 'P2', allocation: [3, 0, 2], max: [9, 0, 2], priority: 3 },
                                                { process: 'P3', allocation: [2, 1, 1], max: [2, 2, 2], priority: 4 },
                                                { process: 'P4', allocation: [0, 0, 2], max: [4, 3, 3], priority: 5 }
                                            ]
                                        })}
                                        className="w-full px-4 py-2 bg-brand-primary text-foreground font-medium rounded hover:bg-brand-primary/80 transition-colors"
                                    >
                                        Load Example
                                    </button>
                                </div>

                                {/* Small Safe Example */}
                                <div className="bg-surface-secondary/50 backdrop-blur-sm rounded-lg p-6 hover:bg-surface-secondary/70 transition-all duration-300 border border-border">
                                    <h3 className="text-xl font-semibold text-brand-primary mb-3">Small Safe Example</h3>
                                    <p className="text-muted-foreground mb-4 text-sm">
                                        A simple safe scenario with 3 processes and 2 resource types.
                                    </p>
                                    <div className="bg-gray-800/50 rounded p-3 mb-4 text-xs h-32">
                                        <div className="text-brand-primary font-semibold mb-2">Resources Available: [2, 1]</div>
                                        <div className="space-y-1 text-white">
                                            <div>P0: Allocation=[1,0], Max=[3,2], Priority=1</div>
                                            <div>P1: Allocation=[0,1], Max=[2,2], Priority=2</div>
                                            <div>P2: Allocation=[1,1], Max=[2,3], Priority=3</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => loadExample({
                                            available: [2, 1],
                                            processes: [
                                                { process: 'P0', allocation: [1, 0], max: [3, 2], priority: 1 },
                                                { process: 'P1', allocation: [0, 1], max: [2, 2], priority: 2 },
                                                { process: 'P2', allocation: [1, 1], max: [2, 3], priority: 3 }
                                            ]
                                        })}
                                        className="w-full px-4 py-2 bg-brand-primary text-foreground font-medium rounded hover:bg-brand-primary/80 transition-colors"
                                    >
                                        Load Example
                                    </button>
                                </div>

                                {/* Big Deadlock Example */}
                                <div className="bg-surface-secondary/50 backdrop-blur-sm rounded-lg p-6 hover:bg-surface-secondary/70 transition-all duration-300 border border-border">
                                    <h3 className="text-xl font-semibold text-red-400 mb-3">Big Deadlock Example</h3>
                                    <p className="text-muted-foreground mb-4 text-sm">
                                        A complex deadlock scenario with 4 processes and 3 resource types.
                                    </p>
                                    <div className="bg-gray-800/50 rounded p-3 mb-4 text-xs h-32">
                                        <div className="text-brand-primary font-semibold mb-2">Resources Available: [0, 0, 1]</div>
                                        <div className="space-y-1 text-white">
                                            <div>P0: Allocation=[2,1,0], Max=[4,3,2], Priority=1</div>
                                            <div>P1: Allocation=[1,2,1], Max=[3,4,3], Priority=2</div>
                                            <div>P2: Allocation=[2,0,2], Max=[4,2,4], Priority=3</div>
                                            <div>P3: Allocation=[1,1,1], Max=[3,3,3], Priority=4</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => loadExample({
                                            available: [0, 0, 1],
                                            processes: [
                                                { process: 'P0', allocation: [2, 1, 0], max: [4, 3, 2], priority: 1 },
                                                { process: 'P1', allocation: [1, 2, 1], max: [3, 4, 3], priority: 2 },
                                                { process: 'P2', allocation: [2, 0, 2], max: [4, 2, 4], priority: 3 },
                                                { process: 'P3', allocation: [1, 1, 1], max: [3, 3, 3], priority: 4 }
                                            ]
                                        })}
                                        className="w-full px-4 py-2 bg-brand-primary text-foreground font-medium rounded hover:bg-brand-primary/80 transition-colors"
                                    >
                                        Load Example
                                    </button>
                                </div>

                                {/* Small Deadlock Example */}
                                <div className="bg-surface-secondary/50 backdrop-blur-sm rounded-lg p-6 hover:bg-surface-secondary/70 transition-all duration-300 border border-border">
                                    <h3 className="text-xl font-semibold text-red-400 mb-3">Small Deadlock Example</h3>
                                    <p className="text-muted-foreground mb-4 text-sm">
                                        A simple deadlock scenario with 2 processes and 2 resource types.
                                    </p>
                                    <div className="bg-gray-800/50 rounded p-3 mb-4 text-xs h-32">
                                        <div className="text-brand-primary font-semibold mb-2">Resources Available: [0, 0]</div>
                                        <div className="space-y-1 text-white">
                                            <div>P0: Allocation=[1,0], Max=[2,1], Priority=1</div>
                                            <div>P1: Allocation=[0,1], Max=[1,2], Priority=2</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => loadExample({
                                            available: [0, 0],
                                            processes: [
                                                { process: 'P0', allocation: [1, 0], max: [2, 1], priority: 1 },
                                                { process: 'P1', allocation: [0, 1], max: [1, 2], priority: 2 }
                                            ]
                                        })}
                                        className="w-full px-4 py-2 bg-brand-primary text-foreground font-medium rounded hover:bg-brand-primary/80 transition-colors"
                                    >
                                        Load Example
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'theory' ? (
                    // Theory Section
                    <div className="space-y-8">
                        <div className="bg-surface-secondary/70 backdrop-blur-sm border border-border rounded-xl p-8 shadow-lg">
                            <h2 className="text-3xl font-bold text-brand-primary mb-6">
                                Understanding Deadlocks
                            </h2>
                            <div className="space-y-6 text-muted-foreground">
                                <p className="text-lg leading-relaxed">
                                    A <span className="text-brand-primary font-semibold">deadlock</span> is a situation in operating systems where two or more processes are unable to proceed because each is waiting for the other to release a resource. It's like a traffic jam where cars are blocking each other and no one can move.
                                </p>
                                
                                <div className="bg-gray-900/50 rounded-lg p-6 border-l-4 border-emerald-500">
                                    <h3 className="text-xl font-semibold text-brand-primary mb-3">Real-World Analogy</h3>
                                    <p>
                                        Imagine two people trying to cross a narrow bridge from opposite ends, each carrying a large box. 
                                        Person A reaches the middle and needs Person B to move back so they can pass. 
                                        Person B also reaches the middle and needs Person A to move back. 
                                        Neither can proceed without the other moving first - this is a deadlock!
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-surface-secondary/70 backdrop-blur-sm border border-border rounded-xl p-8 shadow-lg">
                            <h2 className="text-3xl font-bold text-brand-primary mb-6">
                                Four Conditions for Deadlock
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-gray-900/50 rounded-lg p-6 hover:bg-gray-900/70 transition-all duration-300">
                                    <h3 className="text-xl font-semibold text-brand-primary mb-3">1. Mutual Exclusion</h3>
                                    <p className="text-muted-foreground">
                                        Resources cannot be shared - only one process can use a resource at a time.
                                    </p>
                                </div>
                                <div className="bg-gray-900/50 rounded-lg p-6 hover:bg-gray-900/70 transition-all duration-300">
                                    <h3 className="text-xl font-semibold text-brand-primary mb-3">2. Hold and Wait</h3>
                                    <p className="text-muted-foreground">
                                        A process holds at least one resource while waiting for additional resources.
                                    </p>
                                </div>
                                <div className="bg-gray-900/50 rounded-lg p-6 hover:bg-gray-900/70 transition-all duration-300">
                                    <h3 className="text-xl font-semibold text-brand-primary mb-3">3. No Preemption</h3>
                                    <p className="text-muted-foreground">
                                        Resources cannot be forcibly taken away from a process - they must be released voluntarily.
                                    </p>
                                </div>
                                <div className="bg-gray-900/50 rounded-lg p-6 hover:bg-gray-900/70 transition-all duration-300">
                                    <h3 className="text-xl font-semibold text-brand-primary mb-3">4. Circular Wait</h3>
                                    <p className="text-muted-foreground">
                                        A circular chain of processes exists where each process waits for a resource held by the next process.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-surface-secondary/70 backdrop-blur-sm border border-border rounded-xl p-8 shadow-lg">
                            <h2 className="text-3xl font-bold text-brand-primary mb-6">
                                Banker's Algorithm
                            </h2>
                            <div className="space-y-6 text-muted-foreground">
                                <p className="text-lg leading-relaxed">
                                    The <span className="text-brand-primary font-semibold">Banker's Algorithm</span> is a deadlock avoidance algorithm that ensures the system never enters an unsafe state. It's like a careful banker who only lends money if they're sure all customers can eventually pay back their loans.
                                </p>
                                
                                <div className="bg-gray-900/50 rounded-lg p-6">
                                    <h3 className="text-xl font-semibold text-brand-primary mb-4">How It Works:</h3>
                                    <ol className="space-y-3 list-decimal list-inside">
                                        <li><strong>Available:</strong> Resources currently available in the system</li>
                                        <li><strong>Allocation:</strong> Resources currently allocated to each process</li>
                                        <li><strong>Max:</strong> Maximum resources each process may need</li>
                                        <li><strong>Need:</strong> Additional resources each process may need (Max - Allocation)</li>
                                    </ol>
                                </div>

                                <div className="bg-gradient-to-r from-emerald-900/20 to-green-900/20 rounded-lg p-6 border border-emerald-500/30">
                                    <h3 className="text-xl font-semibold text-brand-primary mb-3">Safety Check Process</h3>
                                    <p className="mb-3">
                                        The algorithm simulates resource allocation to find a safe sequence where all processes can complete:
                                    </p>
                                    <ul className="space-y-2 list-disc list-inside text-sm">
                                        <li>Find a process whose need can be satisfied with available resources</li>
                                        <li>Simulate completing that process and releasing its resources</li>
                                        <li>Repeat until all processes complete (safe) or no process can proceed (unsafe)</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="bg-surface-secondary/70 backdrop-blur-sm border border-border rounded-xl p-8 shadow-lg">
                            <h2 className="text-3xl font-bold text-brand-primary mb-6">
                                Prevention vs Detection vs Avoidance
                            </h2>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="border-b border-gray-600">
                                            <th className="text-left p-4 text-brand-primary font-semibold">Approach</th>
                                            <th className="text-left p-4 text-brand-primary font-semibold">Strategy</th>
                                            <th className="text-left p-4 text-brand-primary font-semibold">Pros</th>
                                            <th className="text-left p-4 text-brand-primary font-semibold">Cons</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-muted-foreground">
                                        <tr className="border-b border-gray-700 hover:bg-gray-900/30">
                                            <td className="p-4 font-semibold text-brand-primary">Prevention</td>
                                            <td className="p-4">Eliminate one of the four deadlock conditions</td>
                                            <td className="p-4">No deadlocks possible</td>
                                            <td className="p-4">Low resource utilization</td>
                                        </tr>
                                        <tr className="border-b border-gray-700 hover:bg-gray-900/30">
                                            <td className="p-4 font-semibold text-brand-primary">Avoidance</td>
                                            <td className="p-4">Use algorithms like Banker's to stay in safe states</td>
                                            <td className="p-4">Better utilization than prevention</td>
                                            <td className="p-4">Requires advance knowledge of resource needs</td>
                                        </tr>
                                        <tr className="hover:bg-gray-900/30">
                                            <td className="p-4 font-semibold text-brand-primary">Detection</td>
                                            <td className="p-4">Allow deadlocks, then detect and recover</td>
                                            <td className="p-4">High resource utilization</td>
                                            <td className="p-4">Recovery can be expensive</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : (
                    // Visualization Section (existing content)
                    <div className="space-y-8">
                        <div className="mb-8">
                            <h2 className="text-xl text-brand-primary mb-2">Available Resources</h2>
                            <input
                                className="w-full p-2 rounded bg-accent border border-border text-foreground placeholder:text-muted-foreground focus:border-brand-primary focus:outline-none"
                                type="text"
                                placeholder="Enter available resources (comma-separated)"
                                onChange={(e) =>
                                    setAvailable(e.target.value.split(',').map((v) => parseInt(v.trim())) || [])
                                }
                            />
                        </div>

                        <div className="mb-8">
                            <h2 className="text-xl text-brand-primary mb-2">Add Process</h2>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <input
                                    className="p-2 rounded bg-accent border border-border text-foreground placeholder:text-muted-foreground focus:border-brand-primary focus:outline-none"
                                    type="text"
                                    id="processName"
                                    placeholder="Process Name"
                                />
                                <input
                                    className="p-2 rounded bg-accent border border-border text-foreground placeholder:text-muted-foreground focus:border-brand-primary focus:outline-none"
                                    type="text"
                                    id="allocation"
                                    placeholder="Allocation (comma-separated)"
                                />
                                <input
                                    className="p-2 rounded bg-accent border border-border text-foreground placeholder:text-muted-foreground focus:border-brand-primary focus:outline-none"
                                    type="text"
                                    id="max"
                                    placeholder="Max (comma-separated)"
                                />
                                <input
                                    className="p-2 rounded bg-accent border border-border text-foreground placeholder:text-muted-foreground focus:border-brand-primary focus:outline-none"
                                    type="number"
                                    id="priority"
                                    placeholder="Priority"
                                />
                            </div>
                            <button
                                className="mt-4 px-4 py-2 bg-brand-primary text-foreground font-bold rounded hover:bg-brand-primary/80"
                                onClick={handleProcessSubmit}
                            >
                                Add Process
                            </button>
                        </div>

                        <div className="mb-8">
                            <h2 className="text-xl text-brand-primary mb-2">Processes</h2>
                            <ul className="space-y-4">
                                {processes.map(({ process, allocation, max, need, priority }) => (
                                    <li key={process} className="p-4 rounded bg-surface-secondary/70 backdrop-blur-sm border border-border">
                                        <strong className="text-brand-primary">{process}</strong>
                                        <span className="ml-2 text-muted-foreground">
                                            Priority: {priority} |
                                            Allocation: {allocation.join(', ')} |
                                            Max: {max.join(', ')} |
                                            Need: {need.join(', ')}
                                        </span>
                                        <button
                                            className="ml-4 px-2 py-1 bg-red-500 text-black font-bold rounded hover:bg-red-600"
                                            onClick={() => releaseResources(process)}
                                        >
                                            Release
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="mb-8">
                            <h2 className="text-xl text-brand-primary mb-2">Check Safety</h2>
                            <button
                                className="px-4 py-2 bg-brand-primary text-foreground font-bold rounded hover:bg-brand-primary/80"
                                onClick={runBankersAlgorithm}
                            >
                                Run Banker's Algorithm
                            </button>
                            {isSafe !== null && (
                                <div className="mt-4">
                                    {isSafe ? (
                                        <p className="text-brand-primary">
                                            The system is in a <strong>safe state</strong>.
                                            Safe sequence: {safeSequence.join(' -> ')}.
                                        </p>
                                    ) : (
                                        <p className="text-red-500">
                                            The system is in a <strong>deadlock state</strong>.
                                            No safe sequence exists.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="mb-8">
                            <h2 className="text-xl text-brand-primary mb-2">System Log</h2>
                            <div className="p-4 rounded bg-surface-secondary/70 backdrop-blur-sm border border-border h-64 overflow-auto">
                                <ul className="space-y-2">
                                    {log.map((entry, index) => (
                                        <li key={index} className="text-gray-400">
                                            {entry}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div className="mb-8">
                            <h2 className="text-xl text-brand-primary mb-2">Resource Allocation Graph</h2>
                            <div className="bg-surface-secondary/70 backdrop-blur-sm border border-border rounded-lg p-6 shadow-lg">
                                <h3 className="text-xl font-semibold text-brand-primary mb-4">Resource Allocation Graph</h3>
                            
                            {/* Legend */}
                                <div className="mb-4 p-4 bg-accent/30 rounded-lg border border-border">
                                    <h4 className="text-sm font-semibold text-muted-foreground mb-3">Legend</h4>
                                    <div className="grid grid-cols-2 gap-6 text-xs">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 rounded-full bg-emerald-600 border-2 border-emerald-400"></div>
                                                <span className="text-muted-foreground">Process Node</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 rounded-full bg-blue-700 border-2 border-blue-400 flex items-center justify-center">
                                                    <div className="w-1 h-1 bg-blue-300 rounded-full"></div>
                                                </div>
                                                <span className="text-muted-foreground">Resource Node (dots = available)</span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center">
                                                    <div className="w-6 h-0.5 bg-emerald-500"></div>
                                                    <div className="w-0 h-0 border-l-2 border-l-emerald-500 border-t border-t-transparent border-b border-b-transparent ml-1"></div>
                                                </div>
                                                <span className="text-muted-foreground">Allocation Edge (solid)</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center">
                                                    <div className="w-6 h-0.5 bg-amber-500 border-dashed" style={{borderStyle: 'dashed', borderWidth: '1px 0'}}></div>
                                                    <div className="w-0 h-0 border-l-2 border-l-amber-500 border-t border-t-transparent border-b border-b-transparent ml-1"></div>
                                                </div>
                                                <span className="text-muted-foreground">Request Edge (dashed)</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <svg ref={svgRef} className="w-full h-[500px] border border-gray-600 rounded bg-gray-900"></svg>
                            </div>
                        </div>
                    </div>
                )}
                </div>
            </div>
        </div>
    );
};

export default DeadlockDetection;
