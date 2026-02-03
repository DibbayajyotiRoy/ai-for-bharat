"use client";

import React, { useEffect, useRef, useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, Maximize, RotateCcw, BookOpen } from 'lucide-react';

interface D2DiagramProps {
    chart: string;
}

export const D2Diagram: React.FC<D2DiagramProps> = ({ chart }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [svg, setSvg] = useState('');
    const [isParsed, setIsParsed] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const sanitizeD2 = (code: string) => {
        if (!code) return '';
        // Remove markdown wrappers if present
        return code.replace(/```d2/g, '').replace(/```/g, '').trim();
    };

    useEffect(() => {
        let isMounted = true;
        const renderDiagram = async () => {
            setIsParsed(false);
            setError(null);

            const processedChart = sanitizeD2(chart);
            if (!processedChart) return;

            try {
                // Dynamically import D2 to ensure it only loads on the client
                const { D2 } = await import('@terrastruct/d2');
                const d2Instance = new D2();

                const response = await d2Instance.compile(processedChart, {
                    options: {
                        layout: 'dagre',
                        themeID: 200, // Dark theme (Deep Blue)
                    }
                });

                const svgString = await d2Instance.render(response.diagram, {
                    themeID: 200,
                    noXMLTag: true
                });

                if (isMounted) {
                    setSvg(svgString);
                    setIsParsed(true);
                }
            } catch (err: any) {
                console.error('D2 rendering failed:', err);
                if (isMounted) {
                    setError(err.message || 'Syntax Error');
                    setSvg(`<div class="flex flex-col items-center justify-center gap-2 p-4 text-center">
                        <div class="text-red-400 text-sm font-medium">D2 Render Failed</div>
                        <div class="text-muted-foreground text-[10px] leading-tight max-w-[200px] font-mono break-all opacity-70">
                            ${processedChart.split('\n').slice(0, 3).join('\n')}
                        </div>
                        <div class="text-muted-foreground text-xs mt-1">The D2 syntax was invalid or too complex.</div>
                    </div>`);
                }
            }
        };

        renderDiagram();
        return () => { isMounted = false; };
    }, [chart]);

    // Cleanup SVG string if needed (D2 SVGs are usually well-formed)
    const responsiveSvg = svg.replace(/width=".*?"/, 'width="100%"').replace(/height=".*?"/, 'height="100%"');

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
