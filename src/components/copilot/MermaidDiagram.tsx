"use client";

import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
    fontFamily: 'Inter',
});

interface MermaidDiagramProps {
    chart: string;
}

import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, Maximize, RotateCcw } from 'lucide-react';

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [svg, setSvg] = useState('');
    const [isParsed, setIsParsed] = useState(false);

    useEffect(() => {
        setIsParsed(false);
        if (chart && ref.current) {
            const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
            mermaid.render(id, chart).then(({ svg }) => {
                setSvg(svg);
                setIsParsed(true);
            }).catch((error) => {
                console.error('Mermaid parsing failed:', error);
                setSvg(`<div class="text-red-400 text-xs">Generating diagram...</div>`);
            });
        }
    }, [chart]);

    // Cleanup SVG string to remove fixed width/height for better scaling
    const responsiveSvg = svg.replace(/width=".*?"/, 'width="100%"').replace(/height=".*?"/, 'height="100%"').replace(/max-width=".*?"/, '');

    return (
        <div className="w-full h-full relative group overflow-hidden bg-muted/30 rounded-lg border border-border/50">
            {isParsed ? (
                <TransformWrapper
                    initialScale={1}
                    minScale={0.5}
                    maxScale={4}
                    centerOnInit
                    limitToBounds={false}
                >
                    {({ zoomIn, zoomOut, resetTransform, centerView }) => (
                        <>
                            <div className="absolute top-2 right-2 flex flex-col gap-1 z-20">
                                <button onClick={() => zoomIn()} className="p-1.5 bg-background/80 backdrop-blur text-foreground border border-border/50 rounded-md hover:bg-muted shadow-sm transition-all" title="Zoom In">
                                    <ZoomIn className="w-4 h-4" />
                                </button>
                                <button onClick={() => zoomOut()} className="p-1.5 bg-background/80 backdrop-blur text-foreground border border-border/50 rounded-md hover:bg-muted shadow-sm transition-all" title="Zoom Out">
                                    <ZoomOut className="w-4 h-4" />
                                </button>
                                <button onClick={() => centerView()} className="p-1.5 bg-background/80 backdrop-blur text-foreground border border-border/50 rounded-md hover:bg-muted shadow-sm transition-all" title="Fit to Screen">
                                    <Maximize className="w-4 h-4" />
                                </button>
                                <button onClick={() => resetTransform()} className="p-1.5 bg-background/80 backdrop-blur text-foreground border border-border/50 rounded-md hover:bg-muted shadow-sm transition-all" title="Reset">
                                    <RotateCcw className="w-4 h-4" />
                                </button>
                            </div>

                            <TransformComponent
                                wrapperClass="!w-full !h-full"
                                contentClass="!w-full !h-full flex items-center justify-center"
                            >
                                <div
                                    ref={ref}
                                    dangerouslySetInnerHTML={{ __html: responsiveSvg }}
                                    className="w-full h-full flex items-center justify-center p-8"
                                    style={{ width: '100%', height: '100%' }}
                                />
                            </TransformComponent>
                        </>
                    )}
                </TransformWrapper>
            ) : (
                <div
                    ref={ref}
                    className="w-full h-full flex items-center justify-center p-4 text-muted-foreground/50 animate-pulse"
                    dangerouslySetInnerHTML={{ __html: svg }}
                />
            )}
        </div>
    );
};
