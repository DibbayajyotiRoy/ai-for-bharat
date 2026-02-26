"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, Gauge } from 'lucide-react';
import type { AnimationData, AnimationStep } from '@/lib/ai/animation';

interface Node {
  id: string;
  value: any;
  x: number;
  y: number;
  highlighted: boolean;
  color?: string;
}

interface Edge {
  from: string;
  to: string;
  label?: string;
}

interface AnimationPlayerProps {
  data: AnimationData;
}

export function AnimationPlayer({ data }: AnimationPlayerProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Reset animation when data changes
  useEffect(() => {
    reset();
  }, [data]);

  // Auto-play logic
  useEffect(() => {
    if (isPlaying && currentStep < data.steps.length) {
      intervalRef.current = setTimeout(() => {
        nextStep();
      }, 1500 / speed);
    } else if (currentStep >= data.steps.length) {
      setIsPlaying(false);
    }

    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
    };
  }, [isPlaying, currentStep, speed]);

  const reset = () => {
    setCurrentStep(0);
    setIsPlaying(false);
    setNodes([]);
    setEdges([]);
  };

  const nextStep = () => {
    if (currentStep < data.steps.length) {
      applyStep(data.steps[currentStep]);
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      replayUpToStep(currentStep - 1);
    }
  };

  const replayUpToStep = (stepIndex: number) => {
    setNodes([]);
    setEdges([]);
    for (let i = 0; i <= stepIndex; i++) {
      applyStepImmediately(data.steps[i]);
    }
  };

  const applyStep = (step: AnimationStep) => {
    applyStepImmediately(step);
  };

  const applyStepImmediately = (step: AnimationStep) => {
    switch (step.action) {
      case 'create_node':
        if (step.nodeId && step.position) {
          setNodes(prev => [...prev, {
            id: step.nodeId!,
            value: step.value,
            x: step.position!.x,
            y: step.position!.y,
            highlighted: false,
          }]);
        }
        break;

      case 'create_edge':
        if (step.fromId && step.toId) {
          setEdges(prev => [...prev, {
            from: step.fromId!,
            to: step.toId!,
            label: step.label,
          }]);
        }
        break;

      case 'highlight':
        if (step.nodeId) {
          setNodes(prev => prev.map(node =>
            node.id === step.nodeId
              ? { ...node, highlighted: true, color: step.color || '#3b82f6' }
              : { ...node, highlighted: false }
          ));
        }
        break;

      case 'unhighlight':
        if (step.nodeId) {
          setNodes(prev => prev.map(node =>
            node.id === step.nodeId
              ? { ...node, highlighted: false, color: undefined }
              : node
          ));
        }
        break;

      case 'update_value':
        if (step.nodeId) {
          setNodes(prev => prev.map(node =>
            node.id === step.nodeId
              ? { ...node, value: step.value }
              : node
          ));
        }
        break;

      case 'delete_node':
        if (step.nodeId) {
          setNodes(prev => prev.filter(node => node.id !== step.nodeId));
          setEdges(prev => prev.filter(edge =>
            edge.from !== step.nodeId && edge.to !== step.nodeId
          ));
        }
        break;

      case 'swap':
        if (step.fromId && step.toId) {
          setNodes(prev => {
            const newNodes = [...prev];
            const idx1 = newNodes.findIndex(n => n.id === step.fromId);
            const idx2 = newNodes.findIndex(n => n.id === step.toId);
            if (idx1 !== -1 && idx2 !== -1) {
              const temp = newNodes[idx1].value;
              newNodes[idx1].value = newNodes[idx2].value;
              newNodes[idx2].value = temp;
            }
            return newNodes;
          });
        }
        break;
    }
  };

  const togglePlay = () => setIsPlaying(!isPlaying);

  const currentStepData = data.steps[currentStep - 1];

  return (
    <div className="flex flex-col h-full bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border bg-muted/20">
        <h3 className="font-semibold text-foreground mb-1">{data.title}</h3>
        <p className="text-sm text-muted-foreground">{data.description}</p>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative bg-background/50 overflow-hidden">
        <svg className="w-full h-full" viewBox="0 0 800 400">
          {/* Edges */}
          {edges.map((edge, i) => {
            const fromNode = nodes.find(n => n.id === edge.from);
            const toNode = nodes.find(n => n.id === edge.to);
            if (!fromNode || !toNode) return null;

            return (
              <g key={`edge-${i}`}>
                <motion.line
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5 }}
                  x1={fromNode.x}
                  y1={fromNode.y}
                  x2={toNode.x}
                  y2={toNode.y}
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-muted-foreground"
                  markerEnd="url(#arrowhead)"
                />
                {edge.label && (
                  <text
                    x={(fromNode.x + toNode.x) / 2}
                    y={(fromNode.y + toNode.y) / 2 - 10}
                    className="text-xs fill-muted-foreground"
                    textAnchor="middle"
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Arrow marker */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" className="fill-muted-foreground" />
            </marker>
          </defs>

          {/* Nodes */}
          {nodes.map((node) => (
            <motion.g
              key={node.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <motion.circle
                cx={node.x}
                cy={node.y}
                r="30"
                className={node.highlighted ? '' : 'fill-card stroke-border'}
                fill={node.highlighted ? node.color : undefined}
                stroke={node.highlighted ? node.color : undefined}
                strokeWidth="3"
                animate={{
                  scale: node.highlighted ? [1, 1.1, 1] : 1,
                }}
                transition={{ duration: 0.3 }}
              />
              <text
                x={node.x}
                y={node.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className={`text-sm font-semibold ${node.highlighted ? 'fill-white' : 'fill-foreground'}`}
              >
                {node.value}
              </text>
            </motion.g>
          ))}
        </svg>

        {/* Step Description Overlay */}
        <AnimatePresence mode="wait">
          {currentStepData && (
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute bottom-4 left-4 right-4 bg-card/95 backdrop-blur border border-border rounded-lg p-3 shadow-lg"
            >
              <p className="text-sm text-foreground">{currentStepData.description}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="p-4 border-t border-border bg-muted/20">
        <div className="flex items-center justify-between gap-4">
          {/* Playback Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className="p-2 rounded-lg hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Previous Step"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={togglePlay}
              disabled={currentStep >= data.steps.length}
              className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            <button
              onClick={nextStep}
              disabled={currentStep >= data.steps.length}
              className="p-2 rounded-lg hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Next Step"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              onClick={reset}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Progress */}
          <div className="flex-1 flex items-center gap-3">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${(currentStep / data.steps.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {currentStep} / {data.steps.length}
            </span>
          </div>

          {/* Speed Control */}
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-muted-foreground" />
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="text-xs bg-muted border border-border rounded px-2 py-1 text-foreground"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={1.5}>1.5x</option>
              <option value={2}>2x</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
