import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as d3 from 'd3';

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
}

const DeadlockDetection: React.FC = () => {
    const [processes, setProcesses] = useState<ResourceAllocation[]>([]);
    const [available, setAvailable] = useState<number[]>([]);
    const [isSafe, setIsSafe] = useState<boolean | null>(null);
    const [safeSequence, setSafeSequence] = useState<string[]>([]);
    const [log, setLog] = useState<string[]>([]);
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

        const links: GraphLink[] = processes.flatMap(({ process, allocation }) =>
            allocation.map((value, i) => ({
                source: `R${i}`,
                target: process,
                value
            })).filter(link => link.value > 0)
        );

        setGraphData({
            nodes: [...resourceNodes, ...processNodes],
            links
        });
    }, [processes, available]);

    // D3 Force Directed Graph
    useEffect(() => {
        if (!svgRef.current || !graphData.nodes.length) return;

        const width = 800;
        const height = 500;
        
        d3.select(svgRef.current).selectAll("*").remove();
        
        const svg = d3.select(svgRef.current)
            .attr("viewBox", `0 0 ${width} ${height}`);

        const simulation = d3.forceSimulation(graphData.nodes as any)
            .force("link", d3.forceLink(graphData.links)
                .id((d: any) => d.id)
                .distance(100))
            .force("charge", d3.forceManyBody().strength(-300))
            .force("center", d3.forceCenter(width / 2, height / 2));

        const link = svg.append("g")
            .selectAll("line")
            .data(graphData.links)
            .join("line")
            .attr("stroke", "#666")
            .attr("stroke-width", d => Math.sqrt(d.value));

        const node = svg.append("g")
            .selectAll("g")
            .data(graphData.nodes)
            .join("g");

        node.append("circle")
            .attr("r", 20)
            .attr("fill", d => d.type === 'process' ? "#4CAF50" : "#2196F3");

        node.append("text")
            .text(d => d.id)
            .attr("text-anchor", "middle")
            .attr("dy", ".35em")
            .attr("fill", "white");

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

            node.attr("transform", d => `translate(${d.x},${d.y})`);
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
    }, [graphData]);

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

    return (
        <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-green-900 p-6">
            <div className="max-w-[1200px] mx-auto space-y-8">
                {/* Header Section */}
                <div className="text-center space-y-2">
                    <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-300">
                        Deadlock Detection System
                    </h1>
                    <p className="text-gray-400">Advanced resource management and detection tool</p>
                </div>
    
                {/* Resources Card */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-gray-700">
                    <h2 className="text-2xl font-semibold text-emerald-400 mb-4">Available Resources</h2>
                    <input
                        className="w-full p-3 rounded-lg bg-gray-900/50 border border-gray-600 text-gray-200 
                                 placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent
                                 transition duration-200"
                        type="text"
                        placeholder="Enter available resources (comma-separated)"
                        onChange={(e) =>
                            setAvailable(e.target.value.split(',').map((v) => parseInt(v.trim())) || [])
                        }
                    />
                </div>
    
                {/* Process Addition Card */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-gray-700">
                    <h2 className="text-2xl font-semibold text-emerald-400 mb-4">Add New Process</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {['Process Name', 'Allocation', 'Max', 'Priority'].map((label) => (
                            <input
                                key={label}
                                className="p-3 rounded-lg bg-gray-900/50 border border-gray-600 text-gray-200 
                                         placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent
                                         transition duration-200"
                                type={label === 'Priority' ? 'number' : 'text'}
                                id={label.toLowerCase().replace(' ', '')}
                                placeholder={label}
                            />
                        ))}
                    </div>
                    <button
                        className="mt-4 px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white 
                                 font-semibold rounded-lg hover:from-emerald-700 hover:to-green-700 
                                 transition duration-200 shadow-lg"
                        onClick={handleProcessSubmit}
                    >
                        Add Process
                    </button>
                </div>
    
                {/* Process List */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-gray-700">
                    <h2 className="text-2xl font-semibold text-emerald-400 mb-4">Active Processes</h2>
                    <div className="space-y-3">
                        {processes.map(({ process, allocation, max, need, priority }) => (
                            <div key={process} 
                                 className="p-4 rounded-lg bg-gray-900/50 border border-gray-700
                                            hover:border-emerald-500 transition duration-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-lg font-semibold text-emerald-400">{process}</span>
                                        <div className="text-gray-400 mt-1 space-x-4">
                                            <span>Priority: {priority}</span>
                                            <span>Allocation: {allocation.join(', ')}</span>
                                            <span>Max: {max.join(', ')}</span>
                                            <span>Need: {need.join(', ')}</span>
                                        </div>
                                    </div>
                                    <button
                                        className="px-4 py-2 bg-red-500/80 hover:bg-red-600 text-white 
                                                 font-semibold rounded-lg transition duration-200"
                                        onClick={() => releaseResources(process)}
                                    >
                                        Release
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
    
                {/* Safety Check Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-gray-700">
                        <h2 className="text-2xl font-semibold text-emerald-400 mb-4">Safety Analysis</h2>
                        <button
                            className="w-full px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 
                                     text-white font-semibold rounded-lg hover:from-emerald-700 
                                     hover:to-green-700 transition duration-200 shadow-lg"
                            onClick={runBankersAlgorithm}
                        >
                            Run Banker's Algorithm
                        </button>
                        {isSafe !== null && (
                            <div className="mt-4 p-4 rounded-lg bg-gray-900/50">
                                {isSafe ? (
                                    <p className="text-emerald-400 font-medium">
                                        System Status: <span className="font-bold">Safe</span>
                                        <br />
                                        Safe Sequence: {safeSequence.join(' → ')}
                                    </p>
                                ) : (
                                    <p className="text-red-400 font-medium">
                                        System Status: <span className="font-bold">Deadlocked</span>
                                        <br />
                                        No safe sequence available
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
    
                    {/* System Log */}
                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-gray-700">
                        <h2 className="text-2xl font-semibold text-emerald-400 mb-4">System Log</h2>
                        <div className="h-64 overflow-y-auto rounded-lg bg-gray-900/50 p-4 border border-gray-700">
                            <ul className="space-y-2">
                                {log.map((entry, index) => (
                                    <li key={index} className="text-gray-400 font-mono text-sm">
                                        {entry}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
    
                {/* Resource Allocation Graph */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-gray-700">
                    <h2 className="text-2xl font-semibold text-emerald-400 mb-4">Resource Allocation Graph</h2>
                    <div className="bg-gray-900/50 rounded-lg border border-gray-700 p-4">
                        <svg 
                            ref={svgRef}
                            className="w-full"
                            style={{ minHeight: "500px" }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
    
};

export default DeadlockDetection;