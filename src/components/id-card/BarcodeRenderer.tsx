import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeRendererProps {
  value: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  className?: string;
}

export const BarcodeRenderer: React.FC<BarcodeRendererProps> = ({
  value,
  width = 1.6,
  height = 42,
  displayValue = true,
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          width,
          height,
          displayValue,
          font: 'monospace',
          fontSize: 11,
          textMargin: 3,
          margin: 6,
          background: 'transparent',
          lineColor: '#0f172a',
        });
      } catch (err) {
        console.error('JsBarcode rendering error:', err);
      }
    }
  }, [value, width, height, displayValue]);

  return <svg ref={svgRef} className={`max-w-full ${className}`} />;
};
